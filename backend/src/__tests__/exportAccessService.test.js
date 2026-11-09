const {
  grantedExportTier,
  resolveExportAccess,
  hasTier,
} = require('../services/exportAccessService');

function req(role, query = {}, isAdmin = false) {
  return { user: { role, is_admin: isAdmin }, query };
}

describe('export access tiers', () => {
  test('contributors and missing roles receive public access only', () => {
    expect(grantedExportTier({ role: 'CONTRIBUTOR' })).toBe('PUBLIC');
    expect(grantedExportTier({})).toBe('PUBLIC');
  });

  test('research roles receive registered research access', () => {
    expect(grantedExportTier({ role: 'RESEARCHER' })).toBe('REGISTERED_RESEARCH');
    expect(grantedExportTier({ role: 'ANALYST' })).toBe('REGISTERED_RESEARCH');
  });

  test('administrators may explicitly request internal access', () => {
    expect(resolveExportAccess(req('ADMIN', { access_tier: 'internal' }))).toMatchObject({
      granted: 'INTERNAL',
      requested: 'INTERNAL',
    });
  });

  test('requesting a higher tier than granted is rejected', () => {
    expect(() => resolveExportAccess(req('CONTRIBUTOR', { access_tier: 'controlled' })))
      .toThrow(/approved for PUBLIC/i);
  });

  test('raw exports require an explicit internal request', () => {
    expect(() => resolveExportAccess(req('ADMIN', { raw: 'true' }))).toThrow(/raw.*INTERNAL/i);
    expect(resolveExportAccess(req('ADMIN', { raw: 'true', access_tier: 'INTERNAL' })).requested)
      .toBe('INTERNAL');
  });

  test('tier comparisons are ordered', () => {
    expect(hasTier('CONTROLLED', 'REGISTERED_RESEARCH')).toBe(true);
    expect(hasTier('PUBLIC', 'REGISTERED_RESEARCH')).toBe(false);
  });
});
