jest.mock('../utils/prisma', () => ({
  translation: { findMany: jest.fn(), count: jest.fn() },
}));

const prisma = require('../utils/prisma');
const { toExportRecord, fetchTranslationsForExport } = require('../services/exportService');

// ── toExportRecord ────────────────────────────────────────────────────────────

const BASE_ROW = {
  id:              'trans-1',
  target_language: 'kpelle',
  dialect:         'central_kpelle',
  translated_text: 'Kpuu translation text.',
  is_validated:    true,
  quality_score:   0.87,
  audio_path:      'uploads/audio/kpelle/s1/c1/kpelle.webm',
  gold_sim_score:  0.75,
  sample: {
    text:       'Wash your hands.',
    domain:     'health',
    difficulty: 'easy',
    audio_path: null,
  },
  contributor: {
    region_of_origin: 'Bong County',
    age_group:        'age_18_35',
    is_l1_speaker:    true,
  },
};

describe('toExportRecord', () => {
  test('maps all required HuggingFace fields correctly', () => {
    const record = toExportRecord(BASE_ROW);
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
    expect(record.audio_target_path).toBe('uploads/audio/kpelle/s1/c1/kpelle.webm');
    expect(record.audio_source_path).toBeNull();
  });

  test('sets dialect to null when missing', () => {
    const record = toExportRecord({ ...BASE_ROW, dialect: null });
    expect(record.dialect).toBeNull();
    const record2 = toExportRecord({ ...BASE_ROW, dialect: undefined });
    expect(record2.dialect).toBeNull();
  });

  test('sets audio_target_path to null when no audio uploaded', () => {
    const record = toExportRecord({ ...BASE_ROW, audio_path: null });
    expect(record.audio_target_path).toBeNull();
  });

  test('sets audio_source_path from sample.audio_path', () => {
    const record = toExportRecord({
      ...BASE_ROW,
      sample: { ...BASE_ROW.sample, audio_path: 'uploads/audio/en/sample1.wav' },
    });
    expect(record.audio_source_path).toBe('uploads/audio/en/sample1.wav');
  });

  test('does not include gold_sim_score (internal field must stay hidden)', () => {
    const record = toExportRecord(BASE_ROW);
    expect(record.gold_sim_score).toBeUndefined();
  });

  test('source_lang is always "en"', () => {
    const record = toExportRecord({ ...BASE_ROW, target_language: 'bassa' });
    expect(record.source_lang).toBe('en');
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
    expect(prisma.translation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  test('filters by language when provided', async () => {
    prisma.translation.findMany.mockResolvedValue([]);
    await fetchTranslationsForExport({ language: 'kpelle' });
    const callArg = prisma.translation.findMany.mock.calls[0][0];
    expect(callArg.where.target_language).toBe('kpelle');
  });

  test('filters by is_validated when validatedOnly is true', async () => {
    prisma.translation.findMany.mockResolvedValue([]);
    await fetchTranslationsForExport({ validatedOnly: true });
    const callArg = prisma.translation.findMany.mock.calls[0][0];
    expect(callArg.where.is_validated).toBe(true);
  });

  test('combines language and validatedOnly filters', async () => {
    prisma.translation.findMany.mockResolvedValue([]);
    await fetchTranslationsForExport({ language: 'bassa', validatedOnly: true });
    const callArg = prisma.translation.findMany.mock.calls[0][0];
    expect(callArg.where.target_language).toBe('bassa');
    expect(callArg.where.is_validated).toBe(true);
  });

  test('does NOT set is_validated when validatedOnly is false', async () => {
    prisma.translation.findMany.mockResolvedValue([]);
    await fetchTranslationsForExport({ validatedOnly: false });
    const callArg = prisma.translation.findMany.mock.calls[0][0];
    expect(callArg.where.is_validated).toBeUndefined();
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
    expect(callArg.include.sample).toBe(true);
    expect(callArg.include.contributor).toBeDefined();
  });
});
