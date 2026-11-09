const ACCESS_TIERS = Object.freeze(['PUBLIC', 'REGISTERED_RESEARCH', 'CONTROLLED', 'INTERNAL']);
const ACCESS_RANK = Object.freeze(Object.fromEntries(ACCESS_TIERS.map((tier, index) => [tier, index])));

function grantedExportTier(user = {}) {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.is_admin) return 'INTERNAL';
  if (['RESEARCHER', 'ANALYST', 'MODERATOR'].includes(user.role)) return 'REGISTERED_RESEARCH';
  return 'PUBLIC';
}

function resolveExportAccess(req) {
  const granted = grantedExportTier(req.user);
  const requested = String(req.query.access_tier || 'PUBLIC').toUpperCase();
  if (!ACCESS_TIERS.includes(requested)) {
    const err = new Error(`access_tier must be one of: ${ACCESS_TIERS.join(', ')}`);
    err.status = 400;
    throw err;
  }
  if (ACCESS_RANK[requested] > ACCESS_RANK[granted]) {
    const err = new Error(`Your account is approved for ${granted} exports, not ${requested}`);
    err.status = 403;
    throw err;
  }
  if (req.query.raw === 'true' && requested !== 'INTERNAL') {
    const err = new Error('Raw database exports require INTERNAL access');
    err.status = 403;
    throw err;
  }
  return { granted, requested };
}

function hasTier(actual, required) {
  return ACCESS_RANK[actual] >= ACCESS_RANK[required];
}

module.exports = { ACCESS_TIERS, ACCESS_RANK, grantedExportTier, resolveExportAccess, hasTier };
