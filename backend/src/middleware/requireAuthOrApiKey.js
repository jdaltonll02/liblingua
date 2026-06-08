/**
 * Combined authentication middleware.
 *
 * Accepts either:
 *   1. Session cookie (browser users who are logged in)
 *   2. JWT Bearer token  (Authorization: Bearer <jwt>)
 *   3. API key           (Authorization: ApiKey <key>  or  ?api_key=<key>)
 *
 * This mirrors the HuggingFace model:
 *   - Logged-in users download directly from the website
 *   - Developers load data into code via their API key/token
 *
 * On success, sets req.user and calls next().
 * On failure, returns 401 with instructions for both auth methods.
 */

const crypto = require('crypto');
const prisma  = require('../utils/prisma');
const { verifyToken } = require('../utils/jwt');

async function requireAuthOrApiKey(req, res, next) {
  // ── 1. Session cookie (browser) ────────────────────────────────────────────
  if (req.cookies?.token) {
    try {
      const payload = verifyToken(req.cookies.token);
      if (payload?.is_active !== false) {
        req.user = payload;
        return next();
      }
    } catch { /* invalid/expired — fall through */ }
  }

  const authHeader = (req.headers['authorization'] || '').trim();

  // ── 2. JWT Bearer token (Authorization: Bearer <jwt>) ─────────────────────
  if (authHeader.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(authHeader.slice(7).trim());
      if (payload?.is_active !== false) {
        req.user = payload;
        return next();
      }
    } catch { /* invalid JWT — fall through to API key check */ }
  }

  // ── 3. API key (Authorization: ApiKey <key>  or  ?api_key=<key>) ──────────
  let rawKey = null;
  if (authHeader.startsWith('ApiKey ')) {
    rawKey = authHeader.slice(7).trim();
  } else if (req.query.api_key) {
    rawKey = String(req.query.api_key).trim();
  }

  if (rawKey) {
    const hash   = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await prisma.apiKey.findUnique({
      where:   { key_hash: hash },
      include: { contributor: { select: { id: true, name: true, is_active: true } } },
    }).catch(() => null);

    if (!apiKey || !apiKey.is_active || !apiKey.contributor?.is_active) {
      return res.status(401).json({ error: 'Invalid or revoked API key.' });
    }

    // Update last_used_at non-blockingly
    prisma.apiKey.update({ where: { id: apiKey.id }, data: { last_used_at: new Date() } }).catch(() => {});

    req.apiContributor = apiKey.contributor;
    // Normalise so controllers that check req.user still work
    req.user = { id: apiKey.contributor.id, is_active: true };
    return next();
  }

  // ── 4. Nothing provided ────────────────────────────────────────────────────
  return res.status(401).json({
    error: 'Authentication required.',
    hint:  [
      'Browser users: log in at the website, then download directly.',
      'Developers: generate an API key at /dashboard, then use:',
      '  Authorization: ApiKey <your-key>',
      '  or append ?api_key=<your-key> to the URL.',
    ].join('\n'),
  });
}

module.exports = { requireAuthOrApiKey };
