const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prisma');
const { errors } = require('../utils/errors');
const logger = require('../utils/logger');
const { sendInvitationEmail } = require('../services/emailService');

async function listUsers(req, res, next) {
  try {
    const { page = '1', limit = '20', role, is_active, search } = req.query;
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const where = {};
    if (role) where.role = role;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.contributor.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true,
          created_at: true,
          _count: { select: { translations: true } },
        },
        orderBy: { created_at: 'desc' },
        take,
        skip,
      }),
      prisma.contributor.count({ where }),
    ]);

    res.json({
      data: users,
      meta: { total, page: parseInt(page, 10) || 1, limit: take, pages: Math.ceil(total / take) },
    });
  } catch (err) {
    next(err);
  }
}

async function getUserDetail(req, res, next) {
  try {
    const user = await prisma.contributor.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        native_language: true,
        native_dialect: true,
        region_of_origin: true,
        age_group: true,
        is_l1_speaker: true,
        reputation_score: true,
        photo_url: true,
        profession: true,
        affiliation: true,
        orcid_id: true,
        linkedin_url: true,
        researcher_bio: true,
        is_featured_researcher: true,
        created_at: true,
        email_verified: true,
        _count: { select: { translations: true } },
      },
    });

    if (!user) throw errors.NOT_FOUND('User');

    const auditHistory = await prisma.auditLog.findMany({
      where: { target_id: req.params.id },
      select: {
        action: true,
        created_at: true,
        actor: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    res.json({ ...user, auditHistory });
  } catch (err) {
    next(err);
  }
}

const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'ANALYST', 'RESEARCHER', 'CONTRIBUTOR'];

async function createUser(req, res, next) {
  try {
    const { name, email, role = 'CONTRIBUTOR', native_language } = req.body;

    if (!name?.trim() || !email?.trim()) {
      throw errors.VALIDATION_ERROR('name and email are required');
    }
    if (!VALID_ROLES.includes(role)) {
      throw errors.VALIDATION_ERROR('Invalid role');
    }

    const existing = await prisma.contributor.findUnique({ where: { email } });
    if (existing) throw errors.CONFLICT('User with this email already exists');

    const reset_token = uuidv4();
    const reset_token_expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const user = await prisma.contributor.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        native_language: native_language || null,
        is_profile_complete: true,
        role,
        email_verified: true,
        reset_token,
        reset_token_expires_at,
      },
    });

    sendInvitationEmail(user.email, user.name, reset_token).catch(console.error);
    await logAction('user_created', req.user.id, user.id, 'User', { role }, req.ip);

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      message: `Invitation sent to ${user.email}. They must set a password before signing in.`,
    });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { name, native_language, native_dialect, region_of_origin, age_group, is_l1_speaker, photo_url, profession } = req.body;
    const id = req.params.id;

    const user = await prisma.contributor.findUnique({ where: { id } });
    if (!user) throw errors.NOT_FOUND('User');

    const updates = {};
    const changes = {};

    const UPDATABLE = [
      'name', 'native_language', 'native_dialect', 'region_of_origin', 'age_group',
      'is_l1_speaker', 'photo_url', 'profession',
      'affiliation', 'orcid_id', 'linkedin_url', 'researcher_bio', 'is_featured_researcher',
    ];

    const BOOL_FIELDS = new Set(['is_l1_speaker', 'is_featured_researcher']);
    UPDATABLE.forEach((field) => {
      if (req.body[field] !== undefined) {
        let newVal = req.body[field];
        if (BOOL_FIELDS.has(field)) newVal = newVal === true || newVal === 'true';
        if (user[field] !== newVal) {
          changes[field] = { old: user[field], new: newVal };
          updates[field] = newVal;
        }
      }
    });

    if (req.file) {
      const newPhotoUrl = req.file.location
        ?? req.file.path.replace(/\\/g, '/').replace(/^.*uploads\//, 'uploads/');
      if (user.photo_url !== newPhotoUrl) {
        changes.photo_url = { old: user.photo_url, new: newPhotoUrl };
        updates.photo_url = newPhotoUrl;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.json(user);
    }

    const updated = await prisma.contributor.update({ where: { id }, data: updates });
    await logAction('user_updated', req.user.id, id, 'User', changes, req.ip);

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    const id = req.params.id;

    if (!VALID_ROLES.includes(role)) {
      throw errors.VALIDATION_ERROR('Invalid role');
    }

    const user = await prisma.contributor.findUnique({ where: { id } });
    if (!user) throw errors.NOT_FOUND('User');

    if (user.role === role) {
      return res.json(user);
    }

    const updated = await prisma.contributor.update({ where: { id }, data: { role, is_admin: role === 'SUPER_ADMIN' } });
    await logAction('role_changed', req.user.id, id, 'User', { role: { old: user.role, new: role } }, req.ip);

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deactivateUser(req, res, next) {
  try {
    const { reason } = req.body;
    const id = req.params.id;

    const user = await prisma.contributor.findUnique({ where: { id } });
    if (!user) throw errors.NOT_FOUND('User');

    if (!user.is_active) {
      return res.json(user);
    }

    const updated = await prisma.contributor.update({ where: { id }, data: { is_active: false } });
    await logAction('user_deactivated', req.user.id, id, 'User', { reason, is_active: { old: true, new: false } }, req.ip);

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function activateUser(req, res, next) {
  try {
    const id = req.params.id;

    const user = await prisma.contributor.findUnique({ where: { id } });
    if (!user) throw errors.NOT_FOUND('User');

    if (user.is_active) {
      return res.json(user);
    }

    const updated = await prisma.contributor.update({ where: { id }, data: { is_active: true } });
    await logAction('user_activated', req.user.id, id, 'User', { is_active: { old: false, new: true } }, req.ip);

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { cascade } = req.query;
    const id = req.params.id;

    const user = await prisma.contributor.findUnique({ where: { id } });
    if (!user) throw errors.NOT_FOUND('User');

    if (cascade === 'true') {
      await prisma.$transaction([
        prisma.translation.deleteMany({ where: { contributor_id: id } }),
        prisma.apiKey.deleteMany({ where: { contributor_id: id } }),
        prisma.contributor.delete({ where: { id } }),
      ]);
    } else {
      await prisma.contributor.delete({ where: { id } });
    }

    await logAction('user_deleted', req.user.id, id, 'User', { cascade: cascade === 'true' }, req.ip);

    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
}

async function logAction(action, actor_id, target_id, resource_type, changes, ip_address) {
  try {
    await prisma.auditLog.create({
      data: { action, actor_id, target_id, resource_type, changes, ip_address },
    });
  } catch (err) {
    logger.error('audit_log_failed', { error: err.message, action, actor_id, target_id });
  }
}

module.exports = {
  listUsers,
  getUserDetail,
  createUser,
  updateUser,
  updateUserRole,
  deactivateUser,
  activateUser,
  deleteUser,
  logAction,
};
