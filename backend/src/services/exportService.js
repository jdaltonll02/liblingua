const prisma = require('../utils/prisma');
const crypto = require('crypto');
const { hasTier } = require('./exportAccessService');

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
 * Deterministic split assignment based on a leakage group (currently the
 * English source sample ID), not the individual translation ID. A seeded
 * cryptographic hash avoids the bias of summing UUID digits and keeps every
 * translation of one source sentence in the same partition.
 */
const DEFAULT_SPLIT_SEED = 'liblingua-source-split-v1';
const CONSENT_FILTER = {
  some: {
    text_contribution: true,
    model_training: true,
    public_release: true,
    policy: { policy_key: 'participant_consent', status: 'ACTIVE' },
  },
};

function getSplit(groupId, seed = DEFAULT_SPLIT_SEED) {
  if (!groupId) throw new Error('A source-group ID is required for split assignment');
  const digest = crypto.createHash('sha256').update(`${seed}:${groupId}`).digest();
  const bucket = digest.readUInt32BE(0) % 100;
  if (bucket < 80) return 'train';
  if (bucket < 90) return 'validation';
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
function toPreprocessedRecord(t, { baseUrl = '', accessTier = 'PUBLIC' } = {}) {
  const lang = t.target_language;
  const surfaceSignal = t.sample.surfaceSimilaritySignals?.find(
    (signal) => signal.target_language === lang && signal.method === 'character_3gram_jaccard',
  );
  const record = {
    id:                    t.id,
    split:                 getSplit(t.sample_id || t.sample?.id),
    source_lang:           'en',
    source_lang_iso:       'eng',
    source_lang_bcp47:     'en',
    source_text:           normalise(t.sample.text),
    target_lang:           lang,
    target_lang_iso:       t.languageVariety?.iso639_3 || ISO_639_3[lang] || lang,
    target_lang_bcp47:     t.languageVariety?.bcp47 || BCP47[lang] || lang,
    target_text:           normalise(t.translated_text),
    dialect:               t.dialect || null,
    variety_code:          t.languageVariety?.code || null,
    variety_name:          t.languageVariety?.name || null,
    variety_autonym:       t.languageVariety?.autonym || null,
    variety_glottocode:    t.languageVariety?.glottocode || null,
    orthography_code:      t.orthography?.code || null,
    orthography_name:      t.orthography?.name || null,
    script:                t.orthography?.script || null,
    orthography_version:   t.orthography?.version || null,
    guideline_version:     t.guideline?.version || null,
    register:              t.register,
    contains_code_switching: t.contains_code_switching,
    uncertainty:           t.uncertainty,
    annotation_outcome:    t.annotation_outcome,
    alternative_translation: normalise(t.alternative_translation) || null,
    domain:                t.sample.domain,
    difficulty:            t.sample.difficulty,
    source_dataset:        t.sample.source_dataset         || null,
    source_dataset_version: t.sample.source_dataset_version || null,
    source_record_id:      t.sample.source_record_id       || null,
    source_citation:       t.sample.source_citation        || null,
    source_license:        t.sample.source_license         || null,
    source_text_hash:      t.sample.text_hash              || null,
    is_validated:          t.is_validated,
    quality_score:         t.quality_score    ?? null,
    surface_similarity_signal: surfaceSignal?.score ?? null,
    has_source_audio:      Boolean(t.sample.audio_path),
    has_target_audio:      Boolean(t.audio_path),
  };
  if (hasTier(accessTier, 'REGISTERED_RESEARCH')) {
    record.contributor_age_group = t.contributor.age_group || null;
    record.is_l1_speaker = t.contributor.is_l1_speaker ?? null;
  }
  if (hasTier(accessTier, 'CONTROLLED')) {
    record.contributor_region = t.contributor.region_of_origin || null;
    record.audio_source_url = resolveAudioUrl(t.sample.audio_path, baseUrl);
    record.audio_target_url = t.contributor.consentStates?.some((state) => state.target_audio)
      ? resolveAudioUrl(t.audio_path, baseUrl)
      : null;
  }
  if (hasTier(accessTier, 'INTERNAL')) record.created_at = t.created_at;
  return record;
}

/**
 * Raw record — exact DB values, no preprocessing applied.
 * No splits, no normalisation, no ISO codes, no resolved URLs.
 * Intended for researchers who want to apply their own preprocessing.
 */
function toRawRecord(t) {
  const surfaceSignal = t.sample.surfaceSimilaritySignals?.find(
    (signal) => signal.target_language === t.target_language && signal.method === 'character_3gram_jaccard',
  );
  return {
    id:                  t.id,
    source_lang:         'en',
    target_lang:         t.target_language,
    dialect:             t.dialect             || null,
    language_variety_id: t.language_variety_id || null,
    variety_code:        t.languageVariety?.code || null,
    orthography_id:      t.orthography_id || null,
    orthography_code:    t.orthography?.code || null,
    guideline_id:        t.guideline_id || null,
    guideline_version:   t.guideline?.version || null,
    register:            t.register,
    contains_code_switching: t.contains_code_switching,
    code_switching_notes: t.code_switching_notes || null,
    uncertainty:         t.uncertainty,
    annotation_outcome:  t.annotation_outcome,
    alternative_translation: t.alternative_translation || null,
    annotation_notes:    t.annotation_notes || null,
    source_text:         t.sample.text,
    target_text:         t.translated_text,
    domain:              t.sample.domain,
    difficulty:          t.sample.difficulty,
    source_dataset:      t.sample.source_dataset         || null,
    source_dataset_version: t.sample.source_dataset_version || null,
    source_record_id:    t.sample.source_record_id       || null,
    source_citation:     t.sample.source_citation        || null,
    source_license:      t.sample.source_license         || null,
    source_text_hash:    t.sample.text_hash              || null,
    contributor_region:  t.contributor.region_of_origin || null,
    contributor_age_group: t.contributor.age_group      || null,
    is_l1_speaker:       t.contributor.is_l1_speaker    ?? null,
    is_validated:        t.is_validated,
    quality_score:       t.quality_score    ?? null,
    surface_similarity_signal: surfaceSignal?.score ?? null,
    audio_source_path:   t.sample.audio_path || null,
    audio_target_path:   t.audio_path        || null,
    created_at:          t.created_at,
  };
}

/** Dispatch to the right serialiser based on `raw` flag. */
function toExportRecord(t, { baseUrl = '', raw = false, accessTier = 'PUBLIC' } = {}) {
  if (raw && accessTier !== 'INTERNAL') {
    throw new Error('Raw export serialization requires INTERNAL access');
  }
  return raw ? toRawRecord(t) : toPreprocessedRecord(t, { baseUrl, accessTier });
}

// ── DB query helpers ──────────────────────────────────────────────────────────

const TRANSLATION_INCLUDE = {
  sample: {
    select: {
      id: true, text: true, domain: true, difficulty: true,
      source_dataset: true, source_dataset_version: true,
      source_record_id: true, source_citation: true,
      source_license: true, text_hash: true,
      audio_path: true,
      surfaceSimilaritySignals: {
        select: { target_language: true, method: true, score: true },
      },
    },
  },
  contributor: {
    select: {
      region_of_origin: true, age_group: true, is_l1_speaker: true,
      consentStates: {
        where: { policy: { policy_key: 'participant_consent', status: 'ACTIVE' } },
        select: { target_audio: true, english_audio: true },
      },
    },
  },
  languageVariety: {
    select: { code: true, name: true, autonym: true, iso639_3: true, glottocode: true, bcp47: true },
  },
  orthography: {
    select: { code: true, name: true, script: true, version: true },
  },
  guideline: {
    select: { version: true, title: true, content_url: true, content_hash: true },
  },
};

/**
 * Streams translations in batches — callers never hold the full dataset in memory.
 * Supports optional quality threshold filtering.
 */
async function* streamTranslationsForExport({ language, validatedOnly, minQuality } = {}) {
  const where = {
    sample: { source_release_eligible: true }, linguistic_metadata_complete: true,
    contributor: { consentStates: CONSENT_FILTER },
  };
  if (language)      where.target_language = language;
  if (validatedOnly) where.review_state = 'APPROVED';
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
  const where = {
    sample: { source_release_eligible: true }, linguistic_metadata_complete: true,
    contributor: { consentStates: CONSENT_FILTER },
  };
  if (language)      where.target_language = language;
  if (validatedOnly) where.review_state = 'APPROVED';
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
