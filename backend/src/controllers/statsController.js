const prisma = require('../utils/prisma');

const LANGUAGES = ['kpelle', 'bassa', 'grebo', 'vai', 'mende', 'loma', 'krahn', 'dan'];

async function getStats(_req, res, next) {
  try {
    const [
      totalSamples,
      totalContributors,
      translationsPerLanguage,
      avgQuality,
      lockedByLanguage,
      domainBreakdown,
      audioCount,
      textOnlyCount,
      totalValidated,
      audioPerLanguage,
    ] = await Promise.all([
      prisma.englishSample.count(),
      prisma.contributor.count({
        where: {
          is_active:    true,
          translations: { some: { is_validated: true } },
        },
      }),
      prisma.$queryRaw`
        SELECT target_language, COUNT(*)::int AS total,
               SUM(CASE WHEN is_validated THEN 1 ELSE 0 END)::int AS validated
        FROM translations
        GROUP BY target_language
      `,
      prisma.translation.aggregate({
        _avg: { quality_score: true },
        where: { quality_score: { not: null } },
      }),
      prisma.$queryRaw`
        SELECT t.target_language, COUNT(DISTINCT t.sample_id)::int AS locked_count
        FROM translations t
        WHERE t.sample_id IN (
          SELECT sample_id FROM translations
          GROUP BY sample_id, target_language
          HAVING COUNT(*) >= 3
        )
        GROUP BY t.target_language
      `,
      prisma.englishSample.groupBy({ by: ['domain'], _count: { id: true } }),
      // Audio recordings submitted
      prisma.translation.count({ where: { audio_path: { not: null } } }),
      // Text-only (no audio)
      prisma.translation.count({ where: { audio_path: null } }),
      // Total validated
      prisma.translation.count({ where: { is_validated: true } }),
      // Audio count per language
      prisma.$queryRaw`
        SELECT target_language, COUNT(*)::int AS audio_count
        FROM translations
        WHERE audio_path IS NOT NULL
        GROUP BY target_language
      `,
    ]);

    // Build per-language map
    const langStats = {};
    for (const lang of LANGUAGES) {
      langStats[lang] = { total: 0, validated: 0, locked_samples: 0 };
    }
    for (const row of translationsPerLanguage) {
      if (langStats[row.target_language]) {
        langStats[row.target_language].total = row.total;
        langStats[row.target_language].validated = row.validated;
      }
    }
    for (const row of lockedByLanguage) {
      if (langStats[row.target_language]) {
        langStats[row.target_language].locked_samples = row.locked_count;
      }
    }
    for (const row of audioPerLanguage) {
      if (langStats[row.target_language]) {
        langStats[row.target_language].audio_count = row.audio_count;
      }
    }

    const totalTranslations = Object.values(langStats).reduce((s, l) => s + l.total, 0);

    res.json({
      total_samples:         totalSamples,
      total_contributors:    totalContributors,
      total_translations:    totalTranslations,
      total_validated:       totalValidated,
      audio_recordings:      audioCount,
      text_only:             textOnlyCount,
      validation_rate:       totalTranslations > 0
        ? Math.round((totalValidated / totalTranslations) * 100)
        : 0,
      average_quality_score: avgQuality._avg.quality_score,
      per_language: langStats,
      domain_breakdown: domainBreakdown.map((d) => ({
        domain: d.domain,
        sample_count: d._count.id,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats };
