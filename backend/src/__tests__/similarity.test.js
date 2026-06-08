const { ngramSimilarity } = require('../utils/similarity');

describe('ngramSimilarity', () => {
  test('identical strings return 1', () => {
    expect(ngramSimilarity('hello world', 'hello world')).toBe(1);
  });

  test('completely different strings return 0', () => {
    expect(ngramSimilarity('abc', 'xyz')).toBe(0);
  });

  test('empty strings both empty return 1', () => {
    expect(ngramSimilarity('', '')).toBe(1);
  });

  test('one empty string returns 0', () => {
    expect(ngramSimilarity('hello', '')).toBe(0);
    expect(ngramSimilarity('', 'hello')).toBe(0);
  });

  test('partial overlap returns value between 0 and 1', () => {
    const score = ngramSimilarity('hello world', 'hello there');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  test('case insensitive', () => {
    expect(ngramSimilarity('HELLO', 'hello')).toBe(1);
  });

  test('longer n increases specificity', () => {
    const score3 = ngramSimilarity('the cat sat', 'the cat mat', 3);
    const score5 = ngramSimilarity('the cat sat', 'the cat mat', 5);
    // larger n → fewer overlapping grams → lower or equal score
    expect(score5).toBeLessThanOrEqual(score3);
  });

  test('symmetry — a vs b equals b vs a', () => {
    const ab = ngramSimilarity('foo bar baz', 'foo baz qux');
    const ba = ngramSimilarity('foo baz qux', 'foo bar baz');
    expect(ab).toBeCloseTo(ba);
  });
});
