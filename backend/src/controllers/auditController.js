const prisma = require('../utils/prisma');

async function listAuditLogs(req, res, next) {
  try {
    const { page = '1', limit = '50', action, target_id, actor_id, since, resource_type } = req.query;
    const take = Math.min(parseInt(limit, 10) || 50, 200);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const where = {};
    if (action) where.action = action;
    if (target_id) where.target_id = target_id;
    if (actor_id) where.actor_id = actor_id;
    if (resource_type) where.resource_type = resource_type;
    if (since) {
      where.created_at = { gte: new Date(since) };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          actor: { select: { id: true, name: true, email: true } },
          target_id: true,
          resource_type: true,
          changes: true,
          ip_address: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take,
        skip,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: logs,
      meta: { total, page: parseInt(page, 10) || 1, limit: take, pages: Math.ceil(total / take) },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAuditLogs };
