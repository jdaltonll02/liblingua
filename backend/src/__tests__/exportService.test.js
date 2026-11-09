jest.mock('../utils/prisma', () => ({
  translation: { findMany: jest.fn(), count: jest.fn() },
}));

const prisma = require('../utils/prisma');
const { toExportRecord, fetchTranslationsForExport } = require('../services/exportService');

// ── toExportRecord ────────────────────────────────────────────────────────────

const BASE_ROW = {
  id:              'trans-1',
  sample_id:       'sample-1',
  target_language: 'kpelle',
  dialect:         'central_kpelle',
  translated_text: 'Kpuu translation text.',
  is_validated:    true,
  quality_score:   0.87,
  audio_path:      'uploads/audio/kpelle/s1/c1/kpelle.webm',
  gold_sim_score:  0.75,
  sample: {
    id:         'sample-1',
    text:       'Wash your hands.',
    domain:     'health',
    difficulty: 'easy',
    audio_path: null,
  },
  contributor: {
    region_of_origin: 'Bong County',
    age_group:        'age_18_35',
    is_l1_speaker:    true,
    consentStates:    [{ target_audio: true, english_audio: true }],
  },
};

describe('toExportRecord', () => {
  test('maps all required HuggingFace fields correctly', () => {
    const record = toExportRecord(BASE_ROW, { accessTier: 'CONTROLLED' });
    expect(record.id).toBe('trans-1');
    expect(record.source_lang).toBe('en');
    expect(record.target_lang).toBe('kpelle');
    expect(record.dialect).toBe('central_kpelle');
    expect(record.source_text).toBe('Wash your hands.');
    expect(record.target_text).toBe('Kpuu translation text.');
    expect(record.domain).toBe('health');
    expect(record.difficulty).toBe('easy');
    expect(record.contributor_region).toBe('Bong County');
    expect(record.contributor_age_group).toBe('age_18_35');
    expect(record.is_l1_speaker).toBe(true);
    expect(record.is_validated).toBe(true);
    expect(record.quality_score).toBe(0.87);
    expect(record.audio_target_url).toBe('/uploads/audio/kpelle/s1/c1/kpelle.webm');
    expect(record.audio_source_url).toBeNull();
  });

  test('sets dialect to null when missing', () => {
    const record = toExportRecord({ ...BASE_ROW, dialect: null });
    expect(record.dialect).toBeNull();
    const record2 = toExportRecord({ ...BASE_ROW, dialect: undefined });
    expect(record2.dialect).toBeNull();
  });

  test('sets audio_target_url to null when no audio uploaded', () => {
    const record = toExportRecord({ ...BASE_ROW, audio_path: null }, { accessTier: 'CONTROLLED' });
    expect(record.audio_target_url).toBeNull();
  });

  test('sets audio_source_url from sample.audio_path', () => {
    const record = toExportRecord({
      ...BASE_ROW,
      sample: { ...BASE_ROW.sample, audio_path: 'uploads/audio/en/sample1.wav' },
    }, { accessTier: 'CONTROLLED' });
    expect(record.audio_source_url).toBe('/uploads/audio/en/sample1.wav');
  });

  test('does not include gold_sim_score (internal field must stay hidden)', () => {
    const record = toExportRecord(BASE_ROW);
    expect(record.gold_sim_score).toBeUndefined();
  });

  test('public exports suppress demographics, recording URLs, and exact timestamps', () => {
    const record = toExportRecord(BASE_ROW);
    expect(record.contributor_region).toBeUndefined();
    expect(record.contributor_age_group).toBeUndefined();
    expect(record.is_l1_speaker).toBeUndefined();
    expect(record.audio_target_url).toBeUndefined();
    expect(record.audio_source_url).toBeUndefined();
    expect(record.created_at).toBeUndefined();
  });

  test('registered research exports expose only coarse approved demographics', () => {
    const record = toExportRecord(BASE_ROW, { accessTier: 'REGISTERED_RESEARCH' });
    expect(record.contributor_age_group).toBe('age_18_35');
    expect(record.is_l1_speaker).toBe(true);
    expect(record.contributor_region).toBeUndefined();
    expect(record.audio_target_url).toBeUndefined();
  });

  test('raw serialization fails closed outside internal access', () => {
    expect(() => toExportRecord(BASE_ROW, { raw: true, accessTier: 'CONTROLLED' }))
      .toThrow(/INTERNAL/i);
  });

  test('source_lang is always "en"', () => {
    const record = toExportRecord({ ...BASE_ROW, target_language: 'bassa' });
    expect(record.source_lang).toBe('en');
  });

  test('all translations of one source sample receive the same split', () => {
    const first = toExportRecord({ ...BASE_ROW, id: 'translation-a' });
    const second = toExportRecord({ ...BASE_ROW, id: 'translation-b' });
    expect(first.split).toBe(second.split);
  });

  test('fails closed when a record has no source-group identifier', () => {
    expect(() => toExportRecord({
      ...BASE_ROW,
      sample_id: undefined,
      sample: { ...BASE_ROW.sample, id: undefined },
    })).toThrow(/source-group ID/i);
  });

  test('quality_score is null when not yet scored', () => {
    const record = toExportRecord({ ...BASE_ROW, quality_score: null });
    expect(record.quality_score).toBeNull();
  });
});

// ── fetchTranslationsForExport ────────────────────────────────────────────────

describe('fetchTranslationsForExport', () => {
  beforeEach(() => jest.clearAllMocks());

  test('fetches all translations when no filters given', async () => {
    prisma.translation.findMany.mockResolvedValue([]);
    await fetchTranslationsForExport({});
    expect(prisma.translation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        sample: { source_release_eligible: true },
        linguistic_metadata_complete: true,
      }),
    }));
  });

  test('filters by language when provided', async () => {
    prisma.translation.findMany.mockResolvedValue([]);
    await fetchTranslationsForExport({ language: 'kpelle' });
    const callArg = prisma.translation.findMany.mock.calls[0][0];
    expect(callArg.where.target_language).toBe('kpelle');
  });

  test('always excludes translations whose source rights are not release eligible', async () => {
    prisma.translation.findMany.mockResolvedValue([]);
    await fetchTranslationsForExport({ validatedOnly: false });
    const callArg = prisma.translation.findMany.mock.calls[0][0];
    expect(callArg.where.sample.source_release_eligible).toBe(true);
  });

  test('filters by approved review state when validatedOnly is true', async () => {
    prisma.translation.findMany.mockResolvedValue([]);
    await fetchTranslationsForExport({ validatedOnly: true });
    const callArg = prisma.translation.findMany.mock.calls[0][0];
    expect(callArg.where.review_state).toBe('APPROVED');
  });

  test('combines language and validatedOnly filters', async () => {
    prisma.translation.findMany.mockResolvedValue([]);
    await fetchTranslationsForExport({ language: 'bassa', validatedOnly: true });
    const callArg = prisma.translation.findMany.mock.calls[0][0];
    expect(callArg.where.target_language).toBe('bassa');
    expect(callArg.where.review_state).toBe('APPROVED');
  });

  test('does NOT require approved review state when validatedOnly is false', async () => {
    prisma.translation.findMany.mockResolvedValue([]);
    await fetchTranslationsForExport({ validatedOnly: false });
    const callArg = prisma.translation.findMany.mock.calls[0][0];
    expect(callArg.where.review_state).toBeUndefined();
  });

  test('orders results by created_at ascending', async () => {
    prisma.translation.findMany.mockResolvedValue([]);
    await fetchTranslationsForExport({});
    const callArg = prisma.translation.findMany.mock.calls[0][0];
    expect(callArg.orderBy).toEqual({ created_at: 'asc' });
  });

  test('includes sample and contributor in the query', async () => {
    prisma.translation.findMany.mockResolvedValue([]);
    await fetchTranslationsForExport({});
    const callArg = prisma.translation.findMany.mock.calls[0][0];
    expect(callArg.include.sample.select).toEqual(expect.objectContaining({ text: true }));
    expect(callArg.include.contributor).toBeDefined();
  });
});
