const prisma = require('../utils/prisma');
const { ngramSimilarity } = require('../utils/similarity');
const { checkAndAward } = require('./badgeService');
const { recordIAAOnLock } = require('./iaaService');

const MAX_PER_LANGUAGE         = 3;
const REPUTATION_INCREASE      = 0.1;
const REPUTATION_DECREASE      = 0.05;
const REPUTATION_CAP           = 5.0;
const QUALITY_REJECT_THRESHOLD = 0.4;

/**
 * Submits a translation atomically.
 *
 * All DB writes run inside a single serializable transaction so that two
 * concurrent requests for the same (sample, language) pair cannot both pass
 * the count check and push the total over MAX_PER_LANGUAGE.
 *
 * The unique index on (sample_id, contributor_id, target_language) is the
 * final backstop against duplicates — P2002 is still caught by the controller.
 */
async function submitTranslation({ contributorId, sampleId, targetLanguage, dialect, translatedText, audioPath, englishAudioPath }) {
  const result = await prisma.$transaction(async (tx) => {
    // Lock the sample row for the duration of this transaction so concurrent
    // submissions for the same (sample, language) are serialized.
    const [sample] = await tx.$queryRaw`
      SELECT * FROM english_samples WHERE id = ${sampleId} FOR UPDATE
    `;
    if (!sample) {
      const err = new Error('Sample not found');
      err.status = 404;
      throw err;
    }

    const langCount = await tx.translation.count({
      where: { sample_id: sampleId, target_language: targetLanguage },
    });
    if (langCount >= MAX_PER_LANGUAGE) {
      const err = new Error('This sample has reached the maximum translations for this language');
      err.status = 409;
      throw err;
    }

    // Compute gold standard similarity outside the lock-critical path
    // (read-only, so safe inside or outside the transaction)
    const goldSimScore = await _computeGoldSimilarity(tx, sample, sampleId, targetLanguage, translatedText);

    const translation = await tx.translation.create({
      data: {
        sample_id:       sampleId,
        contributor_id:  contributorId,
        target_language: targetLanguage,
        dialect:         dialect || null,
        translated_text: translatedText,
        audio_path:         audioPath        || null,
        english_audio_path: englishAudioPath || null,
        gold_sim_score:  goldSimScore,
      },
    });

    // Increment the global translation_count only on the first submission for
    // each language (langCount === 0 means this is language #1 for this sample).
    // This prevents the counter inflating beyond the number of distinct languages
    // that have reached MAX_PER_LANGUAGE and keeps admin stats accurate.
    const shouldLock    = langCount + 1 >= MAX_PER_LANGUAGE;
    const isFirstForLang = langCount === 0;
    const [updated] = await tx.$queryRaw`
      UPDATE english_samples
      SET translation_count = translation_count + CASE WHEN ${isFirstForLang} THEN 1 ELSE 0 END,
          is_locked = CASE WHEN ${shouldLock} THEN true ELSE is_locked END
      WHERE id = ${sampleId}
      RETURNING *
    `;

    return { translation, lang_count_after: langCount + 1, sample_locked: updated.is_locked };
  }, { isolationLevel: 'Serializable' });

  // Post-transaction side-effects — non-blocking, failures silently logged
  prisma.contributor.findUnique({ where: { id: contributorId }, select: { is_l1_speaker: true } })
    .then((c) => checkAndAward(contributorId, { audioPath, isL1: c?.is_l1_speaker ?? false, sampleId }))
    .catch(() => {});

  if (result.sample_locked) {
    recordIAAOnLock(sampleId, targetLanguage).catch(() => {});
  }

  return result;
}


async function _computeGoldSimilarity(tx, sample, sampleId, targetLanguage, translatedText) {
  if (!sample.is_gold_standard) return null;
  const gold = await tx.goldStandard.findFirst({
    where: { sample_id: sampleId, target_language: targetLanguage },
  });
  return gold ? ngramSimilarity(translatedText, gold.reference_translation) : null;
}

/**
 * Validates (or rejects) a translation and adjusts contributor reputation.
 *
 * Reputation is updated atomically using a single SQL expression so
 * concurrent validations for the same contributor cannot race.
 *
 * The score is clamped to [0, REPUTATION_CAP] database-side via LEAST/GREATEST.
 */
async function validateTranslation(translationId, { is_validated, quality_score }) {
  const translation = await prisma.translation.findUnique({
    where:   { id: translationId },
    include: { contributor: true },
  });
  if (!translation) {
    const err = new Error('Translation not found');
    err.status = 404;
    throw err;
  }

  const updated = await prisma.translation.update({
    where: { id: translationId },
    data:  {
      is_validated:  Boolean(is_validated),
      quality_score: quality_score != null ? parseFloat(quality_score) : undefined,
    },
  });

  if (is_validated && quality_score != null) {
    await _adjustReputationAtomic(translation.contributor_id, parseFloat(quality_score));
  }

  return updated;
}

async function _adjustReputationAtomic(contributorId, qualityScore) {
  const delta = qualityScore < QUALITY_REJECT_THRESHOLD ? -REPUTATION_DECREASE : REPUTATION_INCREASE;
  // Single atomic UPDATE: no read-modify-write race possible
  await prisma.$executeRaw`
    UPDATE contributors
    SET reputation_score = GREATEST(0, LEAST(${REPUTATION_CAP}, reputation_score + ${delta}))
    WHERE id = ${contributorId}
  `;
}

module.exports = { submitTranslation, validateTranslation };
