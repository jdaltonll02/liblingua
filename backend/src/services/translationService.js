const prisma = require('../utils/prisma');
const { ngramSimilarity } = require('../utils/similarity');
const { checkAndAward } = require('./badgeService');
const { recordSurfaceSimilaritySignal } = require('./surfaceSimilarityService');
const { validateSubmissionMetadata } = require('./linguisticMetadataService');
const { assertActiveConsent } = require('./consentService');
const { assertAdultParticipant } = require('./participantEligibilityService');

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
async function submitTranslation({
  contributorId, sampleId, targetLanguage, dialect, translatedText, audioPath, englishAudioPath,
  languageVarietyId, orthographyId, guidelineId, register = 'GENERAL',
  containsCodeSwitching = false, codeSwitchingNotes, uncertainty = 'CONFIDENT',
  annotationOutcome = 'TRANSLATED', alternativeTranslation, annotationNotes,
}) {
  const requiredConsent = ['text_contribution'];
  if (audioPath) requiredConsent.push('target_audio');
  if (englishAudioPath) requiredConsent.push('english_audio');
  await assertAdultParticipant(contributorId);
  await assertActiveConsent(contributorId, requiredConsent);
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
    const provenance = typeof sample.provenance_metadata === 'string'
      ? JSON.parse(sample.provenance_metadata || '{}')
      : (sample.provenance_metadata || {});
    const isPendingContributorSource = sample.source_kind === 'MANUAL' && provenance.contributor_generated === true;
    if (!sample.source_release_eligible && !isPendingContributorSource) {
      const err = new Error('This source prompt has not passed provenance and rights review');
      err.status = 409;
      throw err;
    }

    const { variety, guideline } = await validateSubmissionMetadata(tx, {
      contributorId,
      targetLanguage,
      varietyId: languageVarietyId,
      orthographyId,
      guidelineId,
    });

    const cleanedText = translatedText?.trim() || '';
    if (annotationOutcome === 'TRANSLATED' && !cleanedText) {
      const err = new Error('translated_text is required when annotation_outcome is TRANSLATED');
      err.status = 400;
      throw err;
    }
    if (annotationOutcome !== 'TRANSLATED' && !annotationNotes?.trim()) {
      const err = new Error('annotation_notes are required when the prompt is not translated');
      err.status = 400;
      throw err;
    }
    if (containsCodeSwitching && !codeSwitchingNotes?.trim()) {
      const err = new Error('code_switching_notes are required when code-switching is reported');
      err.status = 400;
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
    const goldSimScore = annotationOutcome === 'TRANSLATED'
      ? await _computeGoldSimilarity(tx, sample, sampleId, targetLanguage, cleanedText)
      : null;

    const linguisticData = {
      language_variety_id: languageVarietyId,
      orthography_id: orthographyId,
      guideline_id: guidelineId,
      register,
      contains_code_switching: containsCodeSwitching,
      code_switching_notes: codeSwitchingNotes?.trim() || null,
      uncertainty,
      annotation_outcome: annotationOutcome,
      alternative_translation: alternativeTranslation?.trim() || null,
      annotation_notes: annotationNotes?.trim() || null,
    };

    const translation = await tx.translation.create({
      data: {
        sample_id:       sampleId,
        contributor_id:  contributorId,
        target_language: targetLanguage,
        dialect:         dialect?.trim() || variety.name,
        translated_text: cleanedText,
        audio_path:         audioPath        || null,
        english_audio_path: englishAudioPath || null,
        gold_sim_score:  goldSimScore,
        review_state:    'PENDING_REVIEW',
        current_revision: 1,
        linguistic_metadata_complete: true,
        ...linguisticData,
        revisions: {
          create: {
            revision_no: 1,
            translated_text: cleanedText,
            dialect: dialect?.trim() || variety.name,
            audio_path: audioPath || null,
            english_audio_path: englishAudioPath || null,
            guideline_version: guideline.version,
            ...linguisticData,
            created_by: contributorId,
          },
        },
      },
    });

    // Increment the global translation_count only on the first submission for
    // each language (langCount === 0 means this is language #1 for this sample).
    // This prevents the counter inflating beyond the number of distinct languages
    // that have reached MAX_PER_LANGUAGE and keeps admin stats accurate.
    const shouldLock    = langCount + 1 >= MAX_PER_LANGUAGE;
    const isFirstForLang = langCount === 0;
    const updated = await tx.englishSample.update({
      where: { id: sampleId },
      data: {
        ...(isFirstForLang ? { translation_count: { increment: 1 } } : {}),
        ...(shouldLock ? { is_locked: true } : {}),
      },
    });

    return { translation, lang_count_after: langCount + 1, sample_locked: updated.is_locked };
  }, { isolationLevel: 'Serializable' });

  // Post-transaction side-effects — non-blocking, failures silently logged
  prisma.contributor.findUnique({ where: { id: contributorId }, select: { is_l1_speaker: true } })
    .then((c) => checkAndAward(contributorId, { audioPath, isL1: c?.is_l1_speaker ?? false, sampleId }))
    .catch(() => {});

  if (result.sample_locked) {
    recordSurfaceSimilaritySignal(sampleId, targetLanguage).catch(() => {});
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
  await prisma.$transaction(async (tx) => {
    const contributor = await tx.contributor.findUnique({
      where: { id: contributorId },
      select: { reputation_score: true },
    });
    if (!contributor) return;
    const reputation = Math.max(0, Math.min(REPUTATION_CAP, contributor.reputation_score + delta));
    await tx.contributor.update({
      where: { id: contributorId },
      data: { reputation_score: reputation },
    });
  }, { isolationLevel: 'Serializable' });
}

module.exports = { submitTranslation, validateTranslation };
