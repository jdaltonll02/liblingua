jest.mock('../utils/prisma', () => ({
  englishSample: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  translation: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock('../services/reviewService', () => ({ reviseTranslation: jest.fn() }));

const prisma = require('../utils/prisma');
const { createManualTranslation } = require('../controllers/manualTranslationController');
const { reviseTranslation } = require('../services/reviewService');

function request(overrides = {}) {
  return {
    user: { id: 'author-1' },
    body: {
      source_text: '  A source sentence.  ',
      domain: 'general',
      difficulty: 'medium',
      target_language: 'kpelle',
      dialect: 'Central',
      translated_text: '  Target sentence.  ',
      quality_score: 1,
      is_gold_standard: true,
      ...overrides,
    },
  };
}

function response() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('createManualTranslation research safeguards', () => {
  beforeEach(() => jest.clearAllMocks());

  test('new manual annotations are pending and cannot self-assign quality or gold status', async () => {
    const sample = { id: 'sample-1', text: 'A source sentence.', is_gold_standard: false };
    prisma.englishSample.findFirst.mockResolvedValue(null);
    prisma.englishSample.create.mockResolvedValue(sample);
    prisma.translation.findUnique.mockResolvedValue(null);
    prisma.translation.create.mockImplementation(async ({ data }) => ({ id: 'translation-1', ...data }));
    prisma.englishSample.update.mockResolvedValue(sample);
    const res = response();

    await createManualTranslation(request(), res, jest.fn());

    expect(prisma.englishSample.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ is_gold_standard: false }),
    }));
    expect(prisma.translation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ is_validated: false, quality_score: null }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringMatching(/independent review/i),
    }));
  });

  test('editing a previously validated annotation invalidates it for re-review', async () => {
    const sample = { id: 'sample-1', text: 'A source sentence.', is_gold_standard: false };
    prisma.englishSample.findFirst.mockResolvedValue(sample);
    prisma.translation.findUnique.mockResolvedValue({ id: 'translation-1', is_validated: true, quality_score: 0.9 });
    reviseTranslation.mockResolvedValue({
      id: 'translation-1', is_validated: false, quality_score: null, review_state: 'PENDING_REVIEW',
    });
    const res = response();

    await createManualTranslation(request(), res, jest.fn());

    expect(reviseTranslation).toHaveBeenCalledWith(expect.objectContaining({
      translationId: 'translation-1',
      contributorId: 'author-1',
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
