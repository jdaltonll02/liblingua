const { stringify } = require('csv-stringify');
const {
  streamTranslationsForExport,
  fetchTranslationsForExport,
  toExportRecord,
} = require('../services/exportService');

const LANGUAGES    = ['kpelle', 'bassa', 'grebo', 'vai', 'mende', 'loma', 'krahn', 'dan'];
const JSON_PAGE_SIZE = 1000;

function parseExportParams(req) {
  const { language, validated_only, min_quality } = req.query;
  if (language && !LANGUAGES.includes(language)) {
    const err = new Error(`Unknown language: ${language}. Must be one of: ${LANGUAGES.join(', ')}`);
    err.status = 400;
    throw err;
  }
  const minQuality = min_quality != null ? parseFloat(min_quality) : undefined;
  if (minQuality != null && (isNaN(minQuality) || minQuality < 0 || minQuality > 1)) {
    const err = new Error('min_quality must be a float between 0 and 1');
    err.status = 400;
    throw err;
  }
  // Use the configured base URL rather than trusting request headers (prevents SSRF)
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const raw = req.query.raw === 'true';
  return { language, validatedOnly: validated_only === 'true', minQuality, baseUrl, raw };
}

// ── CSV — streamed, never loads full dataset into memory ──────────────────────

async function exportCsv(req, res, next) {
  try {
    const { language, validatedOnly, minQuality, baseUrl, raw } = parseExportParams(req);
    const suffix = [validatedOnly ? 'validated' : '', raw ? 'raw' : ''].filter(Boolean).join('_');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${language || 'all'}${suffix ? '_' + suffix : ''}_liblingua_dataset.csv"`);

    const csvStream = stringify({ header: true });
    csvStream.pipe(res);

    for await (const t of streamTranslationsForExport({ language, validatedOnly, minQuality })) {
      csvStream.write(toExportRecord(t, { baseUrl, raw }));
    }
    csvStream.end();
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// ── JSON — paginated, returns one page at a time ──────────────────────────────

async function exportJson(req, res, next) {
  try {
    const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit  = Math.min(JSON_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || JSON_PAGE_SIZE));
    const offset = (page - 1) * limit;

    const { language: lang, validatedOnly, minQuality, baseUrl, raw } = parseExportParams(req);
    const { rows, total } = await fetchTranslationsForExport({
      language: lang, validatedOnly, minQuality, skip: offset, take: limit,
    });

    res.setHeader('Content-Disposition', `attachment; filename="${lang || 'all'}_liblingua_dataset_p${page}.json"`);
    res.json({
      data:  rows.map((t) => toExportRecord(t, { baseUrl, raw })),
      meta: {
        total,
        page,
        limit,
        pages:    Math.ceil(total / limit),
        has_more: offset + rows.length < total,
        mode: raw ? 'raw' : 'preprocessed',
        ...(raw ? {} : {
          preprocessing: {
            splits: 'train(80%)/validation(10%)/test(10%) — deterministic, based on record ID',
            language_codes: 'ISO 639-3 and BCP-47 included per record',
            text: 'whitespace normalised',
            validated_only: validatedOnly,
            min_quality_score: minQuality ?? null,
          },
        }),
      },
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// ── HuggingFace JSONL — streamed, one JSON object per line ───────────────────

async function exportHuggingFace(req, res, next) {
  try {
    const { language, validatedOnly, minQuality, baseUrl, raw } = parseExportParams(req);
    const suffix = [validatedOnly ? 'validated' : '', raw ? 'raw' : ''].filter(Boolean).join('_');
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Content-Disposition', `attachment; filename="${language || 'all'}${suffix ? '_' + suffix : ''}_liblingua_dataset.jsonl"`);

    for await (const t of streamTranslationsForExport({ language, validatedOnly, minQuality })) {
      res.write(JSON.stringify(toExportRecord(t, { baseUrl, raw })) + '\n');
    }
    res.end();
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

module.exports = { exportCsv, exportJson, exportHuggingFace };
