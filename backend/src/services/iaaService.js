const prisma = require('../utils/prisma');
const { ngramSimilarity } = require('../utils/similarity');

/**
 * Computes pairwise n-gram Jaccard similarity across all translations
 * for a (sample, language) pair and returns the mean agreement score [0,1].
 *
 * A score of 1.0 means all translations are identical.
 * A score near 0 means high disagreement — flag for expert review.
 */
async function computeIAA(sampleId, language) {
  const translations = await prisma.translation.findMany({
    where:  { sample_id: sampleId, target_language: language },
    select: { translated_text: true },
  });

  if (translations.length < 2) return null;

  const texts = translations.map((t) => t.translated_text);
  const scores = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      scores.push(ngramSimilarity(texts[i], texts[j]));
    }
  }

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Called when a sample is locked (hits MAX_PER_LANGUAGE translations).
 * Computes IAA for that (sample, language) pair and stores it on the sample.
 * Uses average across all languages that have >= 2 translations.
 */
async function recordIAAOnLock(sampleId, language) {
  try {
    const iaa = await computeIAA(sampleId, language);
    if (iaa === null) return;

    // Average with existing IAA score if already set (multi-language samples)
    const sample = await prisma.englishSample.findUnique({
      where:  { id: sampleId },
      select: { iaa_score: true },
    });

    const newScore = sample?.iaa_score != null
      ? (sample.iaa_score + iaa) / 2
      : iaa;

    await prisma.englishSample.update({
      where: { id: sampleId },
      data:  { iaa_score: Math.round(newScore * 10000) / 10000 },
    });
  } catch (err) {
    // Non-critical — log and continue
    console.error('IAA computation failed:', err.message);
  }
}

module.exports = { computeIAA, recordIAAOnLock };
