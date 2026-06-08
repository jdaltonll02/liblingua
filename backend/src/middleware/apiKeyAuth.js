const crypto = require('crypto');
const prisma  = require('../utils/prisma');

/**
 * Authenticates requests using an API key.
 *
 * Accepts the key via:
 *   Authorization: ApiKey ldlib_...
 *   ?api_key=ldlib_...
 *
 * On success sets req.apiContributor = { id, name } and calls next().
 * On failure returns 401.
 */
async function apiKeyAuth(req, res, next) {
  let raw = null;

  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('ApiKey ')) {
    raw = authHeader.slice(7).trim();
  } else if (req.query.api_key) {
    raw = String(req.query.api_key).trim();
  }

  if (!raw) {
    return res.status(401).json({ error: 'API key required. Pass via Authorization: ApiKey <key> or ?api_key=<key>' });
  }

  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  const apiKey = await prisma.apiKey.findUnique({
    where:   { key_hash: hash },
    include: { contributor: { select: { id: true, name: true } } },
  });

  if (!apiKey || !apiKey.is_active) {
    return res.status(401).json({ error: 'Invalid or revoked API key' });
  }

  // Fire-and-forget last_used_at update
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data:  { last_used_at: new Date() },
  }).catch(() => {});

  req.apiContributor = apiKey.contributor;
  next();
}

module.exports = { apiKeyAuth };
