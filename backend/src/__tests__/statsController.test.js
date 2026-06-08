jest.mock('../utils/prisma', () => ({
  englishSample: {
    count:   jest.fn(),
    groupBy: jest.fn(),
  },
  contributor: { count: jest.fn() },
  translation:  { aggregate: jest.fn() },
  $queryRaw: jest.fn(),
}));

const prisma = require('../utils/prisma');
const { getStats } = require('../controllers/statsController');

function mockRes() {
  const res = {};
  res.json   = jest.fn();
  res.status = jest.fn().mockReturnValue(res);
  return res;
}

function setupMocks({
  samples        = 50,
  contributors   = 5,
  perLang        = [],
  avgQuality     = null,
  lockedByLang   = [],
  domainBreakdown = [],
} = {}) {
  prisma.englishSample.count.mockResolvedValue(samples);
  prisma.contributor.count.mockResolvedValue(contributors);
  prisma.$queryRaw
    .mockResolvedValueOnce(perLang)       // translationsPerLanguage
    .mockResolvedValueOnce(lockedByLang); // lockedByLanguage
  prisma.translation.aggregate.mockResolvedValue({ _avg: { quality_score: avgQuality } });
  prisma.englishSample.groupBy.mockResolvedValue(domainBreakdown);
}

beforeEach(() => jest.clearAllMocks());

describe('getStats', () => {
  test('returns correct top-level shape', async () => {
    setupMocks();
    const res = mockRes();
    await getStats({}, res, jest.fn());
    const body = res.json.mock.calls[0][0];
    expect(body).toHaveProperty('total_samples');
    expect(body).toHaveProperty('total_contributors');
    expect(body).toHaveProperty('total_translations');
    expect(body).toHaveProperty('average_quality_score');
    expect(body).toHaveProperty('per_language');
    expect(body).toHaveProperty('domain_breakdown');
  });

  test('reflects DB counts correctly', async () => {
    setupMocks({ samples: 100, contributors: 12 });
    const res = mockRes();
    await getStats({}, res, jest.fn());
    const body = res.json.mock.calls[0][0];
    expect(body.total_samples).toBe(100);
    expect(body.total_contributors).toBe(12);
  });

  test('per_language contains all 8 languages as keys', async () => {
    setupMocks();
    const res = mockRes();
    await getStats({}, res, jest.fn());
    const { per_language } = res.json.mock.calls[0][0];
    const EXPECTED = ['kpelle', 'bassa', 'grebo', 'vai', 'mende', 'loma', 'krahn', 'dan'];
    for (const lang of EXPECTED) {
      expect(per_language).toHaveProperty(lang);
    }
  });

  test('per_language defaults to zeros when no translations exist', async () => {
    setupMocks();
    const res = mockRes();
    await getStats({}, res, jest.fn());
    const { per_language } = res.json.mock.calls[0][0];
    expect(per_language.kpelle).toEqual({ total: 0, validated: 0, locked_samples: 0 });
  });

  test('per_language merges translation counts correctly', async () => {
    setupMocks({
      perLang: [
        { target_language: 'kpelle', total: 42, validated: 30 },
        { target_language: 'bassa',  total: 10, validated: 5 },
      ],
      lockedByLang: [
        { target_language: 'kpelle', locked_count: 7 },
      ],
    });
    const res = mockRes();
    await getStats({}, res, jest.fn());
    const { per_language } = res.json.mock.calls[0][0];
    expect(per_language.kpelle).toEqual({ total: 42, validated: 30, locked_samples: 7 });
    expect(per_language.bassa).toEqual({ total: 10, validated: 5, locked_samples: 0 });
    expect(per_language.grebo).toEqual({ total: 0, validated: 0, locked_samples: 0 });
  });

  test('total_translations sums all language totals', async () => {
    setupMocks({
      perLang: [
        { target_language: 'kpelle', total: 10, validated: 0 },
        { target_language: 'bassa',  total: 5,  validated: 0 },
      ],
    });
    const res = mockRes();
    await getStats({}, res, jest.fn());
    expect(res.json.mock.calls[0][0].total_translations).toBe(15);
  });

  test('ignores unknown language in DB rows (no crash)', async () => {
    setupMocks({
      perLang: [{ target_language: 'elvish', total: 99, validated: 0 }],
    });
    const res  = mockRes();
    const next = jest.fn();
    await getStats({}, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  test('average_quality_score is null when no scored translations', async () => {
    setupMocks({ avgQuality: null });
    const res = mockRes();
    await getStats({}, res, jest.fn());
    expect(res.json.mock.calls[0][0].average_quality_score).toBeNull();
  });

  test('domain_breakdown maps groupBy result correctly', async () => {
    setupMocks({
      domainBreakdown: [
        { domain: 'health',  _count: { id: 10 } },
        { domain: 'general', _count: { id: 8  } },
      ],
    });
    const res = mockRes();
    await getStats({}, res, jest.fn());
    const { domain_breakdown } = res.json.mock.calls[0][0];
    expect(domain_breakdown).toContainEqual({ domain: 'health',  sample_count: 10 });
    expect(domain_breakdown).toContainEqual({ domain: 'general', sample_count: 8 });
  });

  test('calls next(err) on prisma failure', async () => {
    prisma.englishSample.count.mockRejectedValue(new Error('DB down'));
    const next = jest.fn();
    await getStats({}, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
