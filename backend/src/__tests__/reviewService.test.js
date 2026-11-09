jest.mock('../utils/prisma', () => ({ $transaction: jest.fn() }));

const {
  validateReviewInput,
  reviewQuality,
  deriveReviewOutcome,
} = require('../services/reviewService');

const APPROVAL = {
  decision: 'APPROVE',
  adequacy: 5,
  fluency: 4,
  orthography: 4,
  dialect_fit: 5,
  cultural_appropriateness: 5,
};

describe('independent review rules', () => {
  test('approval requires every text rubric dimension', () => {
    expect(() => validateReviewInput({ ...APPROVAL, adequacy: undefined }))
      .toThrow(/adequacy is required/i);
  });

  test('rubric values must be integers from one to five', () => {
    expect(() => validateReviewInput({ ...APPROVAL, fluency: 5.5 })).toThrow(/integer from 1 to 5/i);
    expect(() => validateReviewInput({ ...APPROVAL, fluency: 6 })).toThrow(/integer from 1 to 5/i);
  });

  test('audio approval additionally requires intelligibility', () => {
    expect(() => validateReviewInput(APPROVAL, true)).toThrow(/audio_intelligibility is required/i);
    expect(validateReviewInput({ ...APPROVAL, audio_intelligibility: 4 }, true))
      .toMatchObject({ audio_intelligibility: 4 });
  });

  test('negative decisions require an explanation', () => {
    expect(() => validateReviewInput({ decision: 'REJECT' })).toThrow(/comments are required/i);
    expect(() => validateReviewInput({ decision: 'REQUEST_CHANGES' })).toThrow(/comments are required/i);
  });

  test('one approval cannot validate a translation', () => {
    expect(deriveReviewOutcome([APPROVAL])).toMatchObject({
      review_state: 'IN_REVIEW', is_validated: false,
    });
  });

  test('two independent approvals validate and derive a rubric score', () => {
    const outcome = deriveReviewOutcome([
      APPROVAL,
      { ...APPROVAL, adequacy: 4, dialect_fit: 4 },
    ]);
    expect(outcome.review_state).toBe('APPROVED');
    expect(outcome.is_validated).toBe(true);
    expect(outcome.quality_score).toBeGreaterThan(0.8);
    expect(outcome.quality_score).toBeLessThanOrEqual(1);
  });

  test('conflicting substantive reviews require adjudication', () => {
    expect(deriveReviewOutcome([
      APPROVAL,
      { decision: 'REJECT', comments: 'Meaning differs' },
    ])).toMatchObject({ review_state: 'ADJUDICATION_REQUIRED', is_validated: false });
  });

  test('two change requests return the annotation to its author', () => {
    expect(deriveReviewOutcome([
      { decision: 'REQUEST_CHANGES', comments: 'Orthography' },
      { decision: 'REQUEST_CHANGES', comments: 'Dialect' },
    ])).toMatchObject({ review_state: 'CHANGES_REQUESTED', is_validated: false });
  });

  test('quality is the normalized mean of supplied rubric dimensions', () => {
    expect(reviewQuality(APPROVAL)).toBeCloseTo(0.92, 5);
  });
});
