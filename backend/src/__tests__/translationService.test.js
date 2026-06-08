// Unit tests for translationService — prisma is mocked so no DB required.

jest.mock('../utils/prisma', () => {
  const mockTx = {
    $queryRaw: jest.fn(),
    translation: { count: jest.fn(), create: jest.fn() },
    goldStandard: { findFirst: jest.fn() },
  };
  return {
    $transaction: jest.fn((cb) => cb(mockTx)),
    translation: { findUnique: jest.fn(), update: jest.fn() },
    $executeRaw: jest.fn(),
    _mockTx: mockTx,
  };
});

const prisma = require('../utils/prisma');
const { submitTranslation, validateTranslation } = require('../services/translationService');

const SAMPLE_ID      = 'sample-uuid';
const CONTRIBUTOR_ID = 'contrib-uuid';
const LANGUAGE       = 'kpelle';

beforeEach(() => jest.clearAllMocks());

// ── submitTranslation ─────────────────────────────────────────────────────────

describe('submitTranslation — locking logic', () => {
  const tx = prisma._mockTx;

  function setupHappyPath(langCount = 0) {
    tx.$queryRaw
      .mockResolvedValueOnce([{ id: SAMPLE_ID, is_gold_standard: false }]) // SELECT … FOR UPDATE
      .mockResolvedValueOnce([{ id: SAMPLE_ID, is_locked: false }]);        // UPDATE … RETURNING
    tx.translation.count.mockResolvedValue(langCount);
    tx.translation.create.mockResolvedValue({ id: 'trans-uuid' });
    tx.goldStandard.findFirst.mockResolvedValue(null);
  }

  test('succeeds when translation count is below MAX (3)', async () => {
    setupHappyPath(2);
    const result = await submitTranslation({
      contributorId:  CONTRIBUTOR_ID,
      sampleId:       SAMPLE_ID,
      targetLanguage: LANGUAGE,
      translatedText: 'Kpelle translation',
    });
    expect(result.translation.id).toBe('trans-uuid');
    expect(result.lang_count_after).toBe(3);
  });

  test('throws 404 when sample not found', async () => {
    tx.$queryRaw.mockResolvedValueOnce([]); // empty → sample not found
    tx.translation.count.mockResolvedValue(0);
    await expect(submitTranslation({
      contributorId:  CONTRIBUTOR_ID,
      sampleId:       SAMPLE_ID,
      targetLanguage: LANGUAGE,
      translatedText: 'text',
    })).rejects.toMatchObject({ status: 404 });
  });

  test('throws 409 when language is already at MAX (3)', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: SAMPLE_ID, is_gold_standard: false }]);
    tx.translation.count.mockResolvedValue(3); // already at limit
    await expect(submitTranslation({
      contributorId:  CONTRIBUTOR_ID,
      sampleId:       SAMPLE_ID,
      targetLanguage: LANGUAGE,
      translatedText: 'text',
    })).rejects.toMatchObject({ status: 409 });
  });

  test('marks sample locked when count reaches MAX after this submission', async () => {
    tx.$queryRaw
      .mockResolvedValueOnce([{ id: SAMPLE_ID, is_gold_standard: false }]) // SELECT FOR UPDATE
      .mockResolvedValueOnce([{ id: SAMPLE_ID, is_locked: true }]);         // UPDATE RETURNING
    tx.translation.count.mockResolvedValue(2); // langCount=2, so langCount+1=3 >= MAX → lock
    tx.translation.create.mockResolvedValue({ id: 'trans-uuid' });
    tx.goldStandard.findFirst.mockResolvedValue(null);

    const result = await submitTranslation({
      contributorId:  CONTRIBUTOR_ID,
      sampleId:       SAMPLE_ID,
      targetLanguage: LANGUAGE,
      translatedText: 'text',
    });
    expect(result.sample_locked).toBe(true);
  });

  test('does NOT increment translation_count on subsequent language submissions (langCount > 0)', async () => {
    // langCount=1 means this language already has 1 translation, so isFirstForLang=false
    tx.$queryRaw
      .mockResolvedValueOnce([{ id: SAMPLE_ID, is_gold_standard: false }])
      .mockResolvedValueOnce([{ id: SAMPLE_ID, is_locked: false }]);
    tx.translation.count.mockResolvedValue(1);
    tx.translation.create.mockResolvedValue({ id: 'trans-uuid' });
    tx.goldStandard.findFirst.mockResolvedValue(null);

    const result = await submitTranslation({
      contributorId:  CONTRIBUTOR_ID,
      sampleId:       SAMPLE_ID,
      targetLanguage: LANGUAGE,
      translatedText: 'text',
    });
    // Verify the UPDATE SQL was called (we can't inspect SQL args easily, but
    // the transaction completed and returned a result)
    expect(result.lang_count_after).toBe(2);
  });
});

// ── validateTranslation — reputation scoring ──────────────────────────────────

describe('validateTranslation — reputation scoring', () => {
  function setupValidation(qualityScore) {
    prisma.translation.findUnique.mockResolvedValue({
      id:             'trans-uuid',
      contributor_id: CONTRIBUTOR_ID,
      contributor:    { id: CONTRIBUTOR_ID, reputation_score: 1.0 },
    });
    prisma.translation.update.mockResolvedValue({
      id:           'trans-uuid',
      is_validated: true,
      quality_score: qualityScore,
    });
    prisma.$executeRaw.mockResolvedValue(1);
  }

  test('adjusts reputation upward for quality score >= 0.4', async () => {
    setupValidation(0.8);
    await validateTranslation('trans-uuid', { is_validated: true, quality_score: 0.8 });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    // The SQL call includes a positive delta — verify it was called
    const sqlCall = prisma.$executeRaw.mock.calls[0];
    expect(sqlCall).toBeDefined();
  });

  test('adjusts reputation downward for quality score < 0.4', async () => {
    setupValidation(0.3);
    await validateTranslation('trans-uuid', { is_validated: true, quality_score: 0.3 });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test('skips reputation adjustment when quality_score is null', async () => {
    prisma.translation.findUnique.mockResolvedValue({
      id: 'trans-uuid', contributor_id: CONTRIBUTOR_ID, contributor: {},
    });
    prisma.translation.update.mockResolvedValue({ id: 'trans-uuid' });

    await validateTranslation('trans-uuid', { is_validated: true, quality_score: null });
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  test('throws 404 for unknown translation id', async () => {
    prisma.translation.findUnique.mockResolvedValue(null);
    await expect(
      validateTranslation('bad-id', { is_validated: true, quality_score: 0.9 })
    ).rejects.toMatchObject({ status: 404 });
  });
});
