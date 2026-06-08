const { stringify: csvStringify } = require('csv-stringify/sync');
const prisma = require('../utils/prisma');

const LANGUAGES = ['kpelle', 'bassa', 'grebo', 'vai', 'mende', 'loma', 'krahn', 'dan'];

// ── Public: list published languages ─────────────────────────────────────────

async function listPublished(req, res, next) {
  try {
    const pubs = await prisma.datasetPublication.findMany({
      where:   { is_active: true },
      orderBy: { record_count: 'desc' },
    });
    res.json(pubs);
  } catch (err) {
    next(err);
  }
}

// ── Public dataset download (requires API key) ────────────────────────────────

async function getDataset(req, res, next) {
  try {
    const { language, format = 'json', page = '1', limit = '1000' } = req.query;

    if (!language) return res.status(400).json({ error: 'language query param is required' });

    const pub = await prisma.datasetPublication.findUnique({
      where: { language },
    });
    if (!pub || !pub.is_active) {
      return res.status(403).json({ error: `Dataset for language "${language}" is not published` });
    }

    const take = Math.min(parseInt(limit, 10) || 1000, 5000);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const translations = await prisma.translation.findMany({
      where: {
        target_language: language,
        is_validated:    true,
      },
      include: {
        sample:      { select: { text: true, domain: true, difficulty: true } },
        contributor: { select: { native_language: true, region_of_origin: true, is_l1_speaker: true } },
      },
      orderBy: { created_at: 'desc' },
      take,
      skip,
    });

    const records = translations.map(t => ({
      id:                          t.id,
      english_text:                t.sample.text,
      english_audio_url:           t.english_audio_path || null,
      translation:                 t.translated_text,
      audio_url:                   t.audio_path || null,
      language:                    t.target_language,
      dialect:                     t.dialect || null,
      domain:                      t.sample.domain,
      difficulty:                  t.sample.difficulty,
      contributor_native_language: t.contributor.native_language,
      contributor_region:          t.contributor.region_of_origin || null,
      is_l1_speaker:               t.contributor.is_l1_speaker,
      quality_score:               t.quality_score,
      created_at:                  t.created_at,
    }));

    if (format === 'csv') {
      const csv = csvStringify(records, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${language}_dataset.csv"`);
      return res.send(csv);
    }

    if (format === 'jsonl') {
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Content-Disposition', `attachment; filename="${language}_dataset.jsonl"`);
      return res.send(records.map(r => JSON.stringify(r)).join('\n'));
    }

    // Default: JSON
    res.json({
      data: records,
      meta: { language, total: pub.record_count, page: parseInt(page, 10) || 1, limit: take },
    });
  } catch (err) {
    next(err);
  }
}

// ── Admin: publish / unpublish ────────────────────────────────────────────────

async function publishLanguage(req, res, next) {
  try {
    const { language } = req.body;
    if (!LANGUAGES.includes(language)) {
      return res.status(400).json({ error: `language must be one of: ${LANGUAGES.join(', ')}` });
    }

    const where = { target_language: language, is_validated: true };

    const [record_count, audio_count, text_only_count, qualityAgg, domainRows, existing] = await Promise.all([
      prisma.translation.count({ where }),
      prisma.translation.count({ where: { ...where, audio_path: { not: null } } }),
      prisma.translation.count({ where: { ...where, audio_path: null } }),
      prisma.translation.aggregate({ where, _avg: { quality_score: true } }),
      prisma.$queryRaw`
        SELECT es.domain, COUNT(t.id)::int AS cnt
        FROM translations t
        JOIN english_samples es ON es.id = t.sample_id
        WHERE t.target_language = ${language} AND t.is_validated = true
        GROUP BY es.domain
      `,
      prisma.datasetPublication.findUnique({ where: { language }, select: { version: true } }),
    ]);

    const domain_dist = {};
    for (const r of domainRows) domain_dist[r.domain] = r.cnt;

    const pub = await prisma.datasetPublication.upsert({
      where:  { language },
      create: {
        language, is_active: true, record_count, audio_count, text_only_count,
        avg_quality: qualityAgg._avg.quality_score ?? null,
        domain_dist,
        version: 1,
        published_by: req.user.id,
      },
      update: {
        is_active: true, record_count, audio_count, text_only_count,
        avg_quality: qualityAgg._avg.quality_score ?? null,
        domain_dist,
        version:     (existing?.version ?? 0) + 1,
        published_by: req.user.id,
        published_at: new Date(),
      },
    });

    res.json(pub);
  } catch (err) {
    next(err);
  }
}

async function unpublishLanguage(req, res, next) {
  try {
    const { lang } = req.params;
    const pub = await prisma.datasetPublication.findUnique({ where: { language: lang } });
    if (!pub) return res.status(404).json({ error: 'Language not published' });

    const updated = await prisma.datasetPublication.update({
      where: { language: lang },
      data:  { is_active: false },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deletePublication(req, res, next) {
  try {
    const { lang } = req.params;
    const pub = await prisma.datasetPublication.findUnique({ where: { language: lang } });
    if (!pub) return res.status(404).json({ error: 'No publication record found for that language' });
    await prisma.datasetPublication.delete({ where: { language: lang } });
    res.json({ deleted: true, language: lang });
  } catch (err) {
    next(err);
  }
}

module.exports = { listPublished, getDataset, publishLanguage, unpublishLanguage, deletePublication };
