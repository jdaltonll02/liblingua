const {
  exactTextHash,
  initialSourceFields,
  evaluateSourceEligibility,
  validateProvenancePatch,
} = require('../services/sourceProvenanceService');

describe('source provenance service', () => {
  test('exact hashes are stable across case, Unicode normalization, and whitespace', () => {
    expect(exactTextHash('  Wash   Your Hands. ')).toBe(exactTextHash('wash your hands.'));
    expect(exactTextHash('Cafe\u0301')).toBe(exactTextHash('CAFÉ'));
  });

  test('new manual sources fail closed until their rights are reviewed', () => {
    const fields = initialSourceFields({
      text: 'A sentence.',
      domain: 'general',
      importedBy: 'admin-1',
    });
    expect(fields.source_kind).toBe('MANUAL');
    expect(fields.copyright_status).toBe('UNKNOWN');
    expect(fields.source_release_eligible).toBe(false);
    expect(fields.specialist_review_status).toBe('NOT_REQUIRED');
    expect(fields.text_hash).toHaveLength(64);
  });

  test('health and legal prompts require specialist approval', () => {
    const candidate = {
      text_hash: exactTextHash('Health prompt'),
      original_text: 'Health prompt',
      domain: 'health',
      copyright_status: 'PUBLIC_DOMAIN',
      source_citation: 'Liberia Ministry of Health, 2026',
      specialist_review_status: 'PENDING',
    };
    expect(evaluateSourceEligibility(candidate)).toMatchObject({ eligible: false });
    expect(evaluateSourceEligibility({ ...candidate, specialist_review_status: 'APPROVED' }))
      .toEqual({ eligible: true, reason: null });
  });

  test('licensed sources require a named license and license URL', () => {
    const candidate = {
      text_hash: exactTextHash('Licensed prompt'),
      original_text: 'Licensed prompt',
      domain: 'general',
      copyright_status: 'LICENSED',
      source_citation: 'Example corpus',
      specialist_review_status: 'NOT_REQUIRED',
    };
    expect(evaluateSourceEligibility(candidate).eligible).toBe(false);
    expect(evaluateSourceEligibility({
      ...candidate,
      source_license: 'CC BY 4.0',
      source_license_url: 'https://creativecommons.org/licenses/by/4.0/',
    }).eligible).toBe(true);
  });

  test('restricted or unknown sources can never be approved for release', () => {
    const base = {
      text_hash: exactTextHash('Restricted'),
      original_text: 'Restricted',
      domain: 'general',
      source_citation: 'Restricted source',
      specialist_review_status: 'NOT_REQUIRED',
    };
    expect(evaluateSourceEligibility({ ...base, copyright_status: 'UNKNOWN' }).eligible).toBe(false);
    expect(evaluateSourceEligibility({ ...base, copyright_status: 'RESTRICTED' }).eligible).toBe(false);
  });

  test('rejects invalid controlled vocabulary values', () => {
    expect(() => validateProvenancePatch({ copyright_status: 'FREE_ON_GOOGLE' })).toThrow(/invalid/i);
    expect(() => validateProvenancePatch({ specialist_review_status: 'MAYBE' })).toThrow(/invalid/i);
  });
});
