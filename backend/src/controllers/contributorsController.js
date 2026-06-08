const prisma = require('../utils/prisma');

async function listContributors(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 24));
    const skip  = (page - 1) * limit;
    const lang  = req.query.language;
    const sort  = req.query.sort || 'reputation'; // reputation | contributions | newest

    // Only show users who have at least one validated translation — registration alone
    // does not make someone a contributor until their work has been accepted.
    const where = {
      is_active:            true,
      is_profile_complete:  true,
      translations:         { some: { is_validated: true } },
    };
    if (lang) where.native_language = lang;

    const orderBy = sort === 'contributions'
      ? { translations: { _count: 'desc' } }
      : sort === 'newest'
      ? { created_at: 'desc' }
      : { reputation_score: 'desc' };

    const [contributors, total] = await Promise.all([
      prisma.contributor.findMany({
        where,
        select: {
          id: true,
          name: true,
          photo_url: true,
          profession: true,
          native_language: true,
          native_dialect: true,
          region_of_origin: true,
          is_l1_speaker: true,
          reputation_score: true,
          created_at: true,
          _count: { select: { translations: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.contributor.count({ where }),
    ]);

    res.json({
      contributors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// Admin endpoint: list all contributors with full details
async function listContributorsAdmin(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';

    // Always exclude soft-deleted accounts (email anonymised to @deleted.invalid)
    const baseFilter = {
      NOT: { email: { endsWith: '@deleted.invalid' } },
    };

    const where = search
      ? {
          ...baseFilter,
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : baseFilter;

    const [contributors, total] = await Promise.all([
      prisma.contributor.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          is_admin: true,
          is_profile_complete: true,
          native_language: true,
          region_of_origin: true,
          reputation_score: true,
          created_at: true,
          _count: { select: { translations: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contributor.count({ where }),
    ]);

    res.json({
      contributors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// Admin endpoint: soft-delete a contributor
// Translations are preserved for dataset integrity.
// The contributor's account is deactivated and anonymised but not removed.
async function deleteContributor(req, res, next) {
  try {
    const { id } = req.params;

    const contributor = await prisma.contributor.findUnique({ where: { id } });
    if (!contributor) return res.status(404).json({ error: 'Contributor not found' });
    if (contributor.is_admin) {
      return res.status(403).json({ error: 'Admin accounts cannot be deleted this way. Use the user management panel.' });
    }

    // Soft-delete: deactivate account, revoke all API keys, anonymise PII.
    // Translations remain intact so validated dataset entries are not lost.
    await Promise.all([
      prisma.contributor.update({
        where: { id },
        data: {
          is_active:    false,
          email:        `deleted_${id}@deleted.invalid`,
          name:         '[Deleted User]',
          password_hash: null,
          photo_url:    null,
          profession:   null,
          google_id:    null,
          github_id:    null,
          verification_token: null,
        },
      }),
      prisma.apiKey.updateMany({
        where: { contributor_id: id },
        data:  { is_active: false },
      }),
    ]);

    res.json({ deleted: true, id, note: 'Account deactivated and anonymised. Translations preserved.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listContributors, listContributorsAdmin, deleteContributor };

