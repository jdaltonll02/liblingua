const { parse: parseCsv } = require('csv-parse/sync');
const prisma = require('../utils/prisma');
const { pickSampleForContributor, getLanguageProgress: _getProgress } = require('../services/sampleService');
const { assertAdultParticipant } = require('../services/participantEligibilityService');
const { assertActiveConsent } = require('../services/consentService');
const {
  initialSourceFields,
  evaluateSourceEligibility,
  validateProvenancePatch,
} = require('../services/sourceProvenanceService');

const DOMAINS     = ['general', 'health', 'legal', 'education', 'news', 'conversational'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

async function getRandomSample(req, res, next) {
  try {
    const sample = await pickSampleForContributor(req.user.id, req.query.language);
    if (!sample) {
      return res.status(404).json({ error: 'No more samples available for this language. Check back later!' });
    }
    // Strip is_gold_standard so contributors cannot detect gold checks
    const { is_gold_standard: _, ...safeFields } = sample;
    res.json(safeFields);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function getSampleById(req, res, next) {
  try {
    const sample = await prisma.englishSample.findUnique({
      where:   { id: req.params.id },
      include: { _count: { select: { translations: true } } },
    });
    if (!sample) return res.status(404).json({ error: 'Sample not found' });
    res.json(sample);
  } catch (err) {
    next(err);
  }
}

async function createSample(req, res, next) {
  try {
    const { text, domain, difficulty, audio_path } = req.body;
    const sample = await prisma.englishSample.create({
      data: {
        text, domain, difficulty,
        audio_path:      audio_path      || null,
        // Gold references require their own independent approval workflow.
        is_gold_standard: false,
        ...initialSourceFields({ text, domain, source: req.body, importedBy: req.user.id }),
      },
    });
    res.status(201).json(sample);
  } catch (err) {
    next(err);
  }
}

async function createContributorSample(req, res, next) {
  try {
    await assertAdultParticipant(req.user.id);
    await assertActiveConsent(req.user.id, ['text_contribution']);
    const text = String(req.body.text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    const domain = req.body.domain;
    const difficulty = req.body.difficulty || 'medium';
    const sourceFields = initialSourceFields({
      text,
      domain,
      importedBy: req.user.id,
      source: {
        source_kind: 'MANUAL',
        copyright_status: 'PERMISSION_GRANTED',
        source_citation: 'Original source sentence contributed directly by a LibLingua participant',
        source_usage_restrictions: 'Quarantined from dataset release until source and privacy review',
        provenance_metadata: { contributor_generated: true, originality_attested: true },
      },
    });
    const existing = await prisma.englishSample.findUnique({ where: { text_hash: sourceFields.text_hash } });
    if (existing) return res.json({ sample: existing, reused: true, pending_source_review: !existing.source_release_eligible });
    const sample = await prisma.englishSample.create({
      data: {
        text, domain, difficulty, is_gold_standard: false,
        ...sourceFields,
        copyright_status: 'PERMISSION_GRANTED',
        source_citation: 'Original source sentence contributed directly by a LibLingua participant',
        source_usage_restrictions: 'Quarantined from dataset release until source and privacy review',
      },
    });
    res.status(201).json({ sample, reused: false, pending_source_review: true });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'That source sentence already exists; request another random prompt instead.' });
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function bulkCreateSamples(req, res, next) {
  try {
    let items;
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      try {
        items = parseCsv(req.body, { columns: true, skip_empty_lines: true, trim: true });
      } catch {
        return res.status(400).json({ error: 'Invalid CSV. Expected columns: text, domain, difficulty' });
      }
    } else {
      items = req.body.samples;
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Provide a non-empty samples array (JSON) or CSV body' });
    }

    // Collect per-row errors instead of throwing on first bad row
    const rowErrors = [];
    const data = [];

    for (let i = 0; i < items.length; i++) {
      const s = items[i];
      const row = i + 1;
      if (!s.text) {
        rowErrors.push({ row, error: 'missing "text" field' });
        continue;
      }
      if (!DOMAINS.includes(s.domain)) {
        rowErrors.push({ row, error: `invalid domain "${s.domain}" — must be one of: ${DOMAINS.join(', ')}` });
        continue;
      }
      data.push({
        text:             s.text,
        domain:           s.domain,
        difficulty:       DIFFICULTIES.includes(s.difficulty) ? s.difficulty : 'medium',
        audio_path:       s.audio_path || null,
        is_gold_standard: false,
        ...initialSourceFields({
          text: s.text,
          domain: s.domain,
          source: { ...s, source_kind: s.source_kind || 'DATASET_IMPORT' },
          importedBy: req.user?.id || null,
        }),
      });
    }

    if (data.length === 0) {
      return res.status(400).json({
        error: 'All rows failed validation — nothing was imported.',
        row_errors: rowErrors,
      });
    }

    const result = await prisma.englishSample.createMany({ data, skipDuplicates: true });

    const response = {
      created:            result.count,
      skipped_duplicates: data.length - result.count,
      submitted:          data.length,
    };
    if (rowErrors.length > 0) {
      response.invalid_rows = rowErrors.length;
      response.row_errors   = rowErrors;
    }
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

async function getLanguageProgress(req, res, next) {
  try {
    const progress = await _getProgress(req.query.language);
    res.json(progress);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// ── HuggingFace FLORES-200 sync ───────────────────────────────────────────

const HF_DOMAIN_MAP = {
  news:        'news',
  health:      'health',
  legal:       'legal',
  education:   'education',
  conversational: 'conversational',
  // FLORES uses these — map to general
  wiki:        'general',
  travel:      'general',
  science:     'general',
  sports:      'general',
  government:  'general',
};

function mapHFDomain(raw, override) {
  if (override && DOMAINS.includes(override)) return override;
  return HF_DOMAIN_MAP[String(raw).toLowerCase()] || 'general';
}

async function syncFromHuggingFace(req, res, next) {
  try {
    // FLORES is now gated with evaluation-only/no-training redistribution
    // conditions. Importing it into a public training corpus would violate the
    // intended use, so this legacy sync is deliberately disabled.
    return res.status(410).json({
      error: 'FLORES import is disabled because its current access terms prohibit training use and unrestricted redistribution.',
      action: 'Import only a source corpus whose license and usage terms have been reviewed and recorded.',
    });

    /* istanbul ignore next -- retained temporarily for migration reference */
    const count          = Math.min(parseInt(req.body.count, 10) || 50, 1000);
    const split          = ['dev', 'devtest'].includes(req.body.split) ? req.body.split : 'dev';
    const domainOverride = req.body.domain_override || null;

    const hfApiKey = process.env.HF_API_KEY;
    const headers  = { Accept: 'application/json' };
    if (hfApiKey) headers['Authorization'] = `Bearer ${hfApiKey}`;

    const data = [];
    let   offset = 0;
    const PAGE   = 100;

    while (data.length < count) {
      const need = Math.min(PAGE, count - data.length);
      const url  = `https://datasets-server.huggingface.co/rows?dataset=facebook%2Fflores200&config=eng_Latn&split=${split}&offset=${offset}&length=${need}`;

      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        const text = await resp.text();
        return res.status(502).json({ error: `HuggingFace API error: ${resp.status} ${text.slice(0, 200)}` });
      }

      const json = await resp.json();
      const rows = json.rows || [];
      if (rows.length === 0) break; // no more rows

      for (const { row } of rows) {
        if (!row.sentence) continue;
        data.push({
          text:       row.sentence.trim(),
          domain:     mapHFDomain(row.domain, domainOverride),
          difficulty: 'medium',
        });
      }
      offset += rows.length;
      if (rows.length < need) break; // end of dataset
    }

    if (data.length === 0) {
      return res.status(502).json({ error: 'No rows returned from HuggingFace. Check dataset availability.' });
    }

    const result = await prisma.englishSample.createMany({ data, skipDuplicates: true });
    res.status(201).json({
      imported: result.count,
      skipped:  data.length - result.count,
      total_fetched: data.length,
    });
  } catch (err) {
    next(err);
  }
}

async function reviewSourceProvenance(req, res, next) {
  try {
    const current = await prisma.englishSample.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Sample not found' });

    const patch = validateProvenancePatch(req.body);
    const candidate = { ...current, ...patch };
    if (patch.specialist_review_status) {
      patch.specialist_reviewed_by = req.user.id;
      patch.specialist_reviewed_at = new Date();
      candidate.specialist_reviewed_by = req.user.id;
    }
    const assessment = evaluateSourceEligibility(candidate);
    patch.source_release_eligible = assessment.eligible;

    const sample = await prisma.englishSample.update({
      where: { id: current.id },
      data: patch,
    });
    res.json({ sample, eligibility: assessment });
  } catch (err) {
    if (/invalid/i.test(err.message)) return res.status(400).json({ error: err.message });
    next(err);
  }
}

async function listSourceReviewQueue(req, res, next) {
  try {
    const take = Math.min(Number.parseInt(req.query.limit, 10) || 100, 200);
    const samples = await prisma.englishSample.findMany({
      where: {
        source_release_eligible: false,
        source_kind: 'MANUAL',
        copyright_status: 'PERMISSION_GRANTED',
      },
      orderBy: { created_at: 'asc' },
      take,
    });
    res.json({ samples, count: samples.length });
  } catch (err) { next(err); }
}

module.exports = {
  getRandomSample,
  getSampleById,
  createSample,
  bulkCreateSamples,
  getLanguageProgress,
  syncFromHuggingFace,
  reviewSourceProvenance,
  createContributorSample,
  listSourceReviewQueue,
};
