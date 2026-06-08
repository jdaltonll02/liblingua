const prisma = require('../utils/prisma');

const EXPORT_BATCH = 500; // rows fetched per DB round-trip

// ── Language metadata ─────────────────────────────────────────────────────────

/** ISO 639-3 codes for the 8 supported Liberian target languages */
const ISO_639_3 = {
  kpelle: 'kpe',
  bassa:  'bsq',
  grebo:  'grj',   // Southern Grebo
  vai:    'vai',
  mende:  'men',
  loma:   'lom',
  krahn:  'kqo',   // Western Krahn
  dan:    'dnj',   // Dan (Gio)
};

/** BCP-47 tags — language + script where script is non-Latin */
const BCP47 = {
  kpelle: 'kpe-LR', bassa: 'bsq-LR', grebo: 'grj-LR', vai: 'vai-Latn-LR',
  mende: 'men-LR', loma: 'lom-LR', krahn: 'kqo-LR', dan: 'dnj-CI',
};

// ── Train / validation / test split ──────────────────────────────────────────

/**
 * Deterministic split assignment based on UUID.
 * Sums hex digits of the ID mod 10 → reproducible across runs.
 *   0-7 (80%) → train
 *   8   (10%) → validation
 *   9   (10%) → test
 */
function getSplit(id) {
  const n = id.replace(/-/g, '').split('').reduce((s, c) => s + parseInt(c, 16), 0) % 10;
  if (n < 8) return 'train';
  if (n === 8) return 'validation';
  return 'test';
}

// ── Text normalisation ────────────────────────────────────────────────────────

function normalise(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')          // collapse runs of whitespace
    .replace(/[​-‍﻿]/g, '') // remove zero-width chars
    .trim();
}

// ── Audio URL resolution ──────────────────────────────────────────────────────

function resolveAudioUrl(path, baseUrl) {
  if (!path) return null;
  if (path.startsWith('http')) return path;                     // already absolute (S3)
  const cleaned = path.startsWith('/') ? path : `/${path}`;    // ensure leading slash
  return `${baseUrl}${cleaned}`;
}

// ── Core export record ────────────────────────────────────────────────────────

/**
 * Converts a raw Prisma translation row to the canonical export shape.
 * This is the ONLY place the export schema is defined — all endpoints share it.
 *
 * Preprocessing applied:
 *  • Text whitespace normalisation
 *  • Deterministic train/validation/test split tag
 *  • ISO 639-3 and BCP-47 language codes
 *  • Absolute audio URLs (when baseUrl provided)
 *  • Quality score null-coalesced to null (not undefined)
 */
/**
 * Preprocessed record — ready for ML training pipelines.
 * Includes deterministic train/val/test split, ISO language codes,
 * normalised text, absolute audio URLs, and quality signals.
 */
function toPreprocessedRecord(t, { baseUrl = '' } = {}) {
  const lang = t.target_language;
  return {
    id:                    t.id,
    split:                 getSplit(t.id),
    source_lang:           'en',
    source_lang_iso:       'eng',
    source_lang_bcp47:     'en',
    source_text:           normalise(t.sample.text),
    target_lang:           lang,
    target_lang_iso:       ISO_639_3[lang] || lang,
    target_lang_bcp47:     BCP47[lang]     || lang,
    target_text:           normalise(t.translated_text),
    dialect:               t.dialect || null,
    domain:                t.sample.domain,
    difficulty:            t.sample.difficulty,
    contributor_region:    t.contributor.region_of_origin || null,
    contributor_age_group: t.contributor.age_group        || null,
    is_l1_speaker:         t.contributor.is_l1_speaker    ?? null,
    is_validated:          t.is_validated,
    quality_score:         t.quality_score    ?? null,
    gold_sim_score:        t.gold_sim_score   ?? null,
    iaa_score:             t.sample.iaa_score ?? null,
    has_source_audio:      Boolean(t.sample.audio_path),
    has_target_audio:      Boolean(t.audio_path),
    audio_source_url:      resolveAudioUrl(t.sample.audio_path, baseUrl),
    audio_target_url:      resolveAudioUrl(t.audio_path, baseUrl),
    created_at:            t.created_at,
  };
}

/**
 * Raw record — exact DB values, no preprocessing applied.
 * No splits, no normalisation, no ISO codes, no resolved URLs.
 * Intended for researchers who want to apply their own preprocessing.
 */
function toRawRecord(t) {
  return {
    id:                  t.id,
    source_lang:         'en',
    target_lang:         t.target_language,
    dialect:             t.dialect             || null,
    source_text:         t.sample.text,
    target_text:         t.translated_text,
    domain:              t.sample.domain,
    difficulty:          t.sample.difficulty,
    contributor_region:  t.contributor.region_of_origin || null,
    contributor_age_group: t.contributor.age_group      || null,
    is_l1_speaker:       t.contributor.is_l1_speaker    ?? null,
    is_validated:        t.is_validated,
    quality_score:       t.quality_score    ?? null,
    gold_sim_score:      t.gold_sim_score   ?? null,
    iaa_score:           t.sample.iaa_score ?? null,
    audio_source_path:   t.sample.audio_path || null,
    audio_target_path:   t.audio_path        || null,
    created_at:          t.created_at,
  };
}

/** Dispatch to the right serialiser based on `raw` flag. */
function toExportRecord(t, { baseUrl = '', raw = false } = {}) {
  return raw ? toRawRecord(t) : toPreprocessedRecord(t, { baseUrl });
}

// ── DB query helpers ──────────────────────────────────────────────────────────

const TRANSLATION_INCLUDE = {
  sample: {
    select: {
      text: true, domain: true, difficulty: true,
      audio_path: true, iaa_score: true,
    },
  },
  contributor: {
    select: { region_of_origin: true, age_group: true, is_l1_speaker: true },
  },
};

/**
 * Streams translations in batches — callers never hold the full dataset in memory.
 * Supports optional quality threshold filtering.
 */
async function* streamTranslationsForExport({ language, validatedOnly, minQuality } = {}) {
  const where = {};
  if (language)      where.target_language = language;
  if (validatedOnly) where.is_validated    = true;
  if (minQuality != null) where.quality_score = { gte: parseFloat(minQuality) };

  let cursor;
  while (true) {
    const batch = await prisma.translation.findMany({
      where,
      include: TRANSLATION_INCLUDE,
      orderBy: { created_at: 'asc' },
      take:   EXPORT_BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const row of batch) yield row;
    if (batch.length < EXPORT_BATCH) break;
    cursor = batch[batch.length - 1].id;
  }
}

/** Non-streaming fetch for small paginated requests and tests. */
async function fetchTranslationsForExport({ language, validatedOnly, minQuality, skip = 0, take = 1000 } = {}) {
  const where = {};
  if (language)      where.target_language = language;
  if (validatedOnly) where.is_validated    = true;
  if (minQuality != null) where.quality_score = { gte: parseFloat(minQuality) };

  const [rows, total] = await Promise.all([
    prisma.translation.findMany({
      where, include: TRANSLATION_INCLUDE,
      orderBy: { created_at: 'asc' }, skip, take,
    }),
    prisma.translation.count({ where }),
  ]);

  return { rows, total };
}

module.exports = {
  streamTranslationsForExport,
  fetchTranslationsForExport,
  toExportRecord,
  getSplit,
  ISO_639_3,
  BCP47,
};
