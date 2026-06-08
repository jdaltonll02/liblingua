const logger = require('../utils/logger');
const { verifyToken } = require('../utils/jwt');

// These 401s are expected normal browser behaviour — suppress to keep logs clean
const SILENT_401_PATHS = new Set(['/api/auth/me']);

module.exports = function activityLogger(req, res, next) {
  // Skip static file serving
  if (req.originalUrl.startsWith('/uploads')) return next();

  const startAt = process.hrtime();

  let userId = null;
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (token) userId = verifyToken(token)?.id ?? null;
  } catch { /* unauthenticated */ }

  res.on('finish', () => {
    // Suppress expected unauthenticated session checks — they are not errors
    if (res.statusCode === 401 && SILENT_401_PATHS.has(req.originalUrl.split('?')[0])) return;

    const [sec, ns] = process.hrtime(startAt);
    const ms = parseFloat((sec * 1e3 + ns / 1e6).toFixed(2));

    const level =
      res.statusCode >= 500 ? 'error' :
      res.statusCode >= 400 ? 'warn'  : 'http';

    logger[level]('request', {
      method:    req.method,
      path:      req.originalUrl,   // full path, e.g. /api/auth/login?foo=bar
      status:    res.statusCode,
      ms,
      ip:        req.ip || req.socket?.remoteAddress,
      userId,
      userAgent: req.get('user-agent') || undefined,
    });
  });

  next();
};
