const { parse: parseCsv } = require('csv-parse/sync');
const prisma = require('../utils/prisma');
const { pickSampleForContributor, getLanguageProgress: _getProgress } = require('../services/sampleService');

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
    const { text, domain, difficulty, audio_path, is_gold_standard } = req.body;
    const sample = await prisma.englishSample.create({
      data: {
        text, domain, difficulty,
        audio_path:      audio_path      || null,
        is_gold_standard: Boolean(is_gold_standard),
      },
    });
    res.status(201).json(sample);
  } catch (err) {
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
        is_gold_standard: s.is_gold_standard === true || s.is_gold_standard === 'true',
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

module.exports = { getRandomSample, getSampleById, createSample, bulkCreateSamples, getLanguageProgress, syncFromHuggingFace };
