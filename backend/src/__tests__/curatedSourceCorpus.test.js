const corpus = require('../data/curatedSourceCorpus');

describe('curated source corpus', () => {
  test('provides a substantial, diverse pool of reviewed non-specialist prompts', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(90);
    expect(new Set(corpus.map((item) => item.text.toLowerCase())).size).toBe(corpus.length);
    expect(new Set(corpus.map((item) => item.domain))).toEqual(
      new Set(['conversational', 'education', 'general', 'news']),
    );
    for (const prompt of corpus) {
      expect(prompt.text.length).toBeGreaterThanOrEqual(10);
      expect(prompt.text.length).toBeLessThanOrEqual(1000);
      expect(['easy', 'medium', 'hard']).toContain(prompt.difficulty);
    }
  });
});
