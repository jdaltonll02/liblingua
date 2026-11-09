const { computeSurfaceSimilarity } = require('../services/surfaceSimilarityService');

describe('surface similarity triage signal', () => {
  test('is language-specific and returns null with fewer than two annotations', async () => {
    const db = { translation: { findMany: jest.fn().mockResolvedValue([{ translated_text: 'one' }]) } };
    await expect(computeSurfaceSimilarity('sample-1', 'kpelle', db)).resolves.toBeNull();
    expect(db.translation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { sample_id: 'sample-1', target_language: 'kpelle' },
    }));
  });

  test('identical surface forms score one without claiming semantic agreement', async () => {
    const db = { translation: { findMany: jest.fn().mockResolvedValue([
      { translated_text: 'same translation' },
      { translated_text: 'same translation' },
    ]) } };
    await expect(computeSurfaceSimilarity('sample-1', 'kpelle', db)).resolves.toBe(1);
  });

  test('averages every pair for triage', async () => {
    const db = { translation: { findMany: jest.fn().mockResolvedValue([
      { translated_text: 'alpha beta gamma' },
      { translated_text: 'alpha beta delta' },
      { translated_text: 'different words here' },
    ]) } };
    const score = await computeSurfaceSimilarity('sample-1', 'kpelle', db);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(1);
  });
});
