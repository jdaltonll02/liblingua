jest.mock('../utils/prisma', () => ({
  language:      { findUnique: jest.fn() },
  englishSample: { findMany: jest.fn() },
  $queryRaw:     jest.fn(),
}));

const prisma = require('../utils/prisma');
const { pickSampleForContributor, getLanguageProgress, weightedRandom } = require('../services/sampleService');

const ACTIVE_LANG = { value: 'kpelle', is_active: true };
const CONTRIB_ID  = 'contrib-1';

beforeEach(() => jest.clearAllMocks());

// ── getLanguageProgress ───────────────────────────────────────────────────────

describe('getLanguageProgress', () => {
  test('returns correct total, locked, and remaining', async () => {
    prisma.language.findUnique.mockResolvedValue(ACTIVE_LANG);
    prisma.englishSample.count = jest.fn().mockResolvedValue(50);
    // patch count onto the mock
    const origModule = require('../utils/prisma');
    origModule.englishSample.count = jest.fn().mockResolvedValue(50);
    prisma.$queryRaw.mockResolvedValue([{ cnt: 12 }]);

    const result = await getLanguageProgress('kpelle');
    expect(result.total).toBe(50);
    expect(result.locked).toBe(12);
    expect(result.remaining).toBe(38);
    expect(result.language).toBe('kpelle');
  });

  test('remaining equals total when no samples are locked', async () => {
    prisma.language.findUnique.mockResolvedValue(ACTIVE_LANG);
    const origModule = require('../utils/prisma');
    origModule.englishSample.count = jest.fn().mockResolvedValue(20);
    prisma.$queryRaw.mockResolvedValue([{ cnt: 0 }]);

    const result = await getLanguageProgress('kpelle');
    expect(result.remaining).toBe(20);
  });

  test('throws 400 for unknown language', async () => {
    prisma.language.findUnique.mockResolvedValue(null);
    await expect(getLanguageProgress('elvish')).rejects.toMatchObject({ status: 400 });
  });

  test('throws 400 for inactive language', async () => {
    prisma.language.findUnique.mockResolvedValue({ value: 'kpelle', is_active: false });
    await expect(getLanguageProgress('kpelle')).rejects.toMatchObject({ status: 400 });
  });
});

// ── pickSampleForContributor ──────────────────────────────────────────────────

describe('pickSampleForContributor', () => {
  test('throws 400 for unknown language', async () => {
    prisma.language.findUnique.mockResolvedValue(null);
    await expect(pickSampleForContributor(CONTRIB_ID, 'klingon')).rejects.toMatchObject({ status: 400 });
  });

  test('returns null when no candidates available', async () => {
    prisma.language.findUnique.mockResolvedValue(ACTIVE_LANG);
    // gold check — no gold candidates
    prisma.englishSample.findMany.mockResolvedValue([]);
    // domain counts query
    prisma.$queryRaw
      .mockResolvedValueOnce([]) // domainCounts
      .mockResolvedValueOnce([]) // domain candidates
      .mockResolvedValueOnce([]); // fallback candidates
    const result = await pickSampleForContributor(CONTRIB_ID, 'kpelle');
    expect(result).toBeNull();
  });

  test('returns a sample from domain-weighted candidates', async () => {
    prisma.language.findUnique.mockResolvedValue(ACTIVE_LANG);
    prisma.englishSample.findMany.mockResolvedValue([]); // no gold injection
    prisma.$queryRaw
      .mockResolvedValueOnce([{ domain: 'health', cnt: 0 }]) // domainCounts
      .mockResolvedValueOnce([{ id: 's1', text: 'A health sample.', domain: 'health' }]); // candidates
    const result = await pickSampleForContributor(CONTRIB_ID, 'kpelle');
    expect(result.id).toBe('s1');
  });

  test('uses fallback when chosen domain has no candidates', async () => {
    prisma.language.findUnique.mockResolvedValue(ACTIVE_LANG);
    prisma.englishSample.findMany.mockResolvedValue([]);
    prisma.$queryRaw
      .mockResolvedValueOnce([]) // domainCounts — empty (no domain data)
      .mockResolvedValueOnce([]) // chosen domain returns nothing
      .mockResolvedValueOnce([{ id: 's2', text: 'Fallback sample.', domain: 'general' }]); // fallback
    const result = await pickSampleForContributor(CONTRIB_ID, 'kpelle');
    expect(result.id).toBe('s2');
  });

  test('strips is_gold_standard before returning (done at controller level — service returns raw)', async () => {
    // The service returns the raw DB row; stripping happens in the controller.
    // This test confirms the service does NOT strip it, so the controller test can verify stripping.
    prisma.language.findUnique.mockResolvedValue(ACTIVE_LANG);
    prisma.englishSample.findMany.mockResolvedValue([]);
    prisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 's3', is_gold_standard: false }])
    const result = await pickSampleForContributor(CONTRIB_ID, 'kpelle');
    expect(result).toHaveProperty('is_gold_standard');
  });
});

// ── weightedRandom edge cases (supplement sampleService.test.js) ─────────────

describe('weightedRandom — additional edge cases', () => {
  test('never returns an item with weight 0 when total > 0 (stress test)', () => {
    for (let i = 0; i < 500; i++) {
      const result = weightedRandom(['never', 'always'], [0, 1]);
      expect(result).toBe('always');
    }
  });

  test('distributes uniformly when all weights are equal', () => {
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 3000; i++) {
      counts[weightedRandom(['a', 'b', 'c'], [1, 1, 1])]++;
    }
    // Each should be roughly 1000 ± 200
    for (const v of Object.values(counts)) {
      expect(v).toBeGreaterThan(700);
      expect(v).toBeLessThan(1300);
    }
  });
});
