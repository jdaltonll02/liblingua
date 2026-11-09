const { stringify: csvStringify } = require('csv-stringify/sync');
const prisma = require('../utils/prisma');
const { resolveExportAccess, hasTier } = require('../services/exportAccessService');
const { assertGovernanceApprovals } = require('../services/linguisticMetadataService');

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
  return res.status(410).json({
    error: 'Live-table datasets have been retired. Use /api/releases and a frozen release artifact.',
  });
  /* istanbul ignore next */
  try {
    const { language, format = 'json', page = '1', limit = '1000' } = req.query;
    const { requested: accessTier } = resolveExportAccess(req);

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
        review_state:    'APPROVED',
        linguistic_metadata_complete: true,
        contributor: { consentStates: { some: {
          text_contribution: true, model_training: true, public_release: true,
          policy: { policy_key: 'participant_consent', status: 'ACTIVE' },
        } } },
        sample:          { source_release_eligible: true },
      },
      include: {
        sample:      { select: {
          text: true, domain: true, difficulty: true,
          source_dataset: true, source_dataset_version: true,
          source_record_id: true, source_citation: true,
          source_license: true, text_hash: true,
        } },
        contributor: { select: {
          native_language: true, region_of_origin: true,
          age_group: true, is_l1_speaker: true,
          consentStates: {
            where: { policy: { policy_key: 'participant_consent', status: 'ACTIVE' } },
            select: { target_audio: true, english_audio: true },
          },
        } },
        languageVariety: { select: {
          code: true, name: true, autonym: true, iso639_3: true, glottocode: true, bcp47: true,
        } },
        orthography: { select: { code: true, name: true, script: true, version: true } },
        guideline: { select: { version: true, title: true, content_url: true, content_hash: true } },
      },
      orderBy: { created_at: 'desc' },
      take,
      skip,
    });

    const records = translations.map((t) => {
      const record = {
        id:                     t.id,
        english_text:           t.sample.text,
        translation:            t.translated_text,
        language:               t.target_language,
        dialect:                t.dialect || null,
        variety_code:           t.languageVariety?.code || null,
        variety_name:           t.languageVariety?.name || null,
        variety_autonym:        t.languageVariety?.autonym || null,
        target_language_iso639_3: t.languageVariety?.iso639_3 || null,
        target_language_glottocode: t.languageVariety?.glottocode || null,
        target_language_bcp47:  t.languageVariety?.bcp47 || null,
        orthography_code:       t.orthography?.code || null,
        orthography_name:       t.orthography?.name || null,
        script:                 t.orthography?.script || null,
        orthography_version:    t.orthography?.version || null,
        guideline_version:      t.guideline?.version || null,
        guideline_hash:         t.guideline?.content_hash || null,
        register:               t.register,
        contains_code_switching: t.contains_code_switching,
        uncertainty:            t.uncertainty,
        annotation_outcome:     t.annotation_outcome,
        alternative_translation: t.alternative_translation || null,
        domain:                 t.sample.domain,
        difficulty:             t.sample.difficulty,
        quality_score:          t.quality_score,
        source_dataset:         t.sample.source_dataset || null,
        source_dataset_version: t.sample.source_dataset_version || null,
        source_record_id:       t.sample.source_record_id || null,
        source_citation:        t.sample.source_citation || null,
        source_license:         t.sample.source_license || null,
        source_text_hash:       t.sample.text_hash || null,
      };
      if (hasTier(accessTier, 'REGISTERED_RESEARCH')) {
        record.contributor_age_group = t.contributor.age_group || null;
        record.is_l1_speaker = t.contributor.is_l1_speaker ?? null;
      }
      if (hasTier(accessTier, 'CONTROLLED')) {
        record.contributor_native_language = t.contributor.native_language;
        record.contributor_region = t.contributor.region_of_origin || null;
        const consent = t.contributor.consentStates?.[0];
        record.english_audio_url = consent?.english_audio ? (t.english_audio_path || null) : null;
        record.audio_url = consent?.target_audio ? (t.audio_path || null) : null;
      }
      if (hasTier(accessTier, 'INTERNAL')) record.created_at = t.created_at;
      return record;
    });

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
      meta: {
        language, total: pub.record_count, page: parseInt(page, 10) || 1,
        limit: take, access_tier: accessTier,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── Admin: publish / unpublish ────────────────────────────────────────────────

async function publishLanguage(req, res, next) {
  return res.status(410).json({
    error: 'Mutable publication has been retired. Create an immutable release candidate through /api/releases.',
  });
  /* istanbul ignore next */
  try {
    const { language } = req.body;
    if (!LANGUAGES.includes(language)) {
      return res.status(400).json({ error: `language must be one of: ${LANGUAGES.join(', ')}` });
    }

    const existing = await prisma.datasetPublication.findUnique({
      where: { language }, select: { version: true, published_at: true },
    });
    await assertGovernanceApprovals('DATASET_RELEASE_CANDIDATE', language, {
      since: existing?.published_at || undefined,
    });

    const where = {
      target_language: language,
      review_state: 'APPROVED',
      linguistic_metadata_complete: true,
      contributor: { consentStates: { some: {
        text_contribution: true, model_training: true, public_release: true,
        policy: { policy_key: 'participant_consent', status: 'ACTIVE' },
      } } },
      sample: { source_release_eligible: true },
    };

    const [record_count, audio_count, text_only_count, qualityAgg, domainRows] = await Promise.all([
      prisma.translation.count({ where }),
      prisma.translation.count({ where: { ...where, audio_path: { not: null } } }),
      prisma.translation.count({ where: { ...where, audio_path: null } }),
      prisma.translation.aggregate({ where, _avg: { quality_score: true } }),
      prisma.translation.findMany({
        where,
        select: { sample: { select: { domain: true } } },
      }),
    ]);

    const domain_dist = {};
    for (const row of domainRows) {
      const domain = row.sample.domain;
      domain_dist[domain] = (domain_dist[domain] || 0) + 1;
    }

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
