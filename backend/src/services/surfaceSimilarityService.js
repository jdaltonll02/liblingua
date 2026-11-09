const prisma = require('../utils/prisma');
const { ngramSimilarity } = require('../utils/similarity');

const METHOD = 'character_3gram_jaccard';

async function computeSurfaceSimilarity(sampleId, language, db = prisma) {
  const translations = await db.translation.findMany({
    where: { sample_id: sampleId, target_language: language },
    select: { translated_text: true },
  });
  if (translations.length < 2) return null;

  const scores = [];
  for (let i = 0; i < translations.length; i++) {
    for (let j = i + 1; j < translations.length; j++) {
      scores.push(ngramSimilarity(translations[i].translated_text, translations[j].translated_text));
    }
  }
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

async function recordSurfaceSimilaritySignal(sampleId, language) {
  try {
    const score = await computeSurfaceSimilarity(sampleId, language);
    if (score == null) return null;
    return prisma.surfaceSimilaritySignal.upsert({
      where: {
        sample_id_target_language_method: {
          sample_id: sampleId,
          target_language: language,
          method: METHOD,
        },
      },
      create: {
        sample_id: sampleId,
        target_language: language,
        method: METHOD,
        score: Math.round(score * 10000) / 10000,
      },
      update: {
        score: Math.round(score * 10000) / 10000,
        computed_at: new Date(),
      },
    });
  } catch (err) {
    console.error('Surface-similarity signal failed:', err.message);
    return null;
  }
}

module.exports = { METHOD, computeSurfaceSimilarity, recordSurfaceSimilaritySignal };
