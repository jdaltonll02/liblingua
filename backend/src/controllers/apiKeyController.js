const crypto = require('crypto');
const prisma  = require('../utils/prisma');

function generateKey() {
  const raw    = 'ldlib_' + crypto.randomBytes(32).toString('hex'); // 70 chars
  const hash   = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 14); // "ldlib_" + first 8 hex chars
  return { raw, hash, prefix };
}

async function createKey(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const { raw, hash, prefix } = generateKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        key_hash:       hash,
        prefix,
        name:           String(name).trim(),
        contributor_id: req.user.id,
      },
    });

    // raw_key is returned ONCE — never stored
    res.status(201).json({
      id:         apiKey.id,
      prefix:     apiKey.prefix,
      name:       apiKey.name,
      created_at: apiKey.created_at,
      raw_key:    raw,
    });
  } catch (err) {
    next(err);
  }
}

async function listKeys(req, res, next) {
  try {
    const keys = await prisma.apiKey.findMany({
      where:   { contributor_id: req.user.id },
      select:  { id: true, prefix: true, name: true, is_active: true, last_used_at: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });
    res.json(keys);
  } catch (err) {
    next(err);
  }
}

async function revokeKey(req, res, next) {
  try {
    const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
    if (!key) return res.status(404).json({ error: 'API key not found' });
    if (key.contributor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await prisma.apiKey.update({ where: { id: req.params.id }, data: { is_active: false } });
    res.json({ revoked: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { createKey, listKeys, revokeKey };
