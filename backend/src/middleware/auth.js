const { verifyToken } = require('../utils/jwt');

function extractToken(req) {
  // 1. httpOnly cookie (browser clients)
  if (req.cookies?.token) return req.cookies.token;
  // 2. Authorization header (API / script clients)
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = verifyToken(token);
    if (!req.user.is_active) return res.status(401).json({ error: 'Account deactivated' });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    });
  };
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    // Accept either a proper admin role OR the legacy is_admin boolean flag
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role) && !req.user.is_admin) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin, requireRole };
