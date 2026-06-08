const prisma = require('../utils/prisma');

const VALID_CATEGORIES = ['GENERAL', 'TECHNICAL', 'TRANSLATION_QUALITY', 'ACCOUNT', 'DATA_REQUEST', 'FUNDING', 'OTHER'];
const VALID_STATUSES   = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const VALID_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

async function submitTicket(req, res, next) {
  try {
    const { name, email, subject, category = 'GENERAL', message } = req.body;

    if (!name?.trim())    return res.status(400).json({ error: 'Name is required' });
    if (!email?.trim())   return res.status(400).json({ error: 'Email is required' });
    if (!subject?.trim()) return res.status(400).json({ error: 'Subject is required' });
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        name:           name.trim(),
        email:          email.trim().toLowerCase(),
        subject:        subject.trim(),
        category,
        message:        message.trim(),
        contributor_id: req.user?.id || null,
      },
    });

    res.status(201).json({ ticket: { id: ticket.id, subject: ticket.subject, status: ticket.status } });
  } catch (err) {
    next(err);
  }
}

async function listTickets(req, res, next) {
  try {
    const { status, category, priority, page = 1, limit = 25 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status   && VALID_STATUSES.includes(status))     where.status   = status;
    if (category && VALID_CATEGORIES.includes(category)) where.category = category;
    if (priority && VALID_PRIORITIES.includes(priority)) where.priority = priority;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
        skip,
        take: Math.min(parseInt(limit), 100),
        include: { contributor: { select: { id: true, name: true, email: true } } },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    res.json({ tickets, total, page: parseInt(page) });
  } catch (err) {
    next(err);
  }
}

async function getTicket(req, res, next) {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where:   { id: req.params.id },
      include: { contributor: { select: { id: true, name: true, email: true, reputation_score: true } } },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
}

async function updateTicket(req, res, next) {
  try {
    const { status, priority, response } = req.body;

    const existing = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });

    const data = {};
    if (status   && VALID_STATUSES.includes(status))     data.status   = status;
    if (priority && VALID_PRIORITIES.includes(priority)) data.priority = priority;
    if (response != null) data.response = response.trim();

    if (status === 'RESOLVED' || status === 'CLOSED') {
      data.resolved_at = new Date();
    }

    const updated = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function getTicketStats(req, res, next) {
  try {
    const [byStatus, byCategory] = await Promise.all([
      prisma.supportTicket.groupBy({ by: ['status'],   _count: true }),
      prisma.supportTicket.groupBy({ by: ['category'], _count: true }),
    ]);
    res.json({ by_status: byStatus, by_category: byCategory });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitTicket, listTickets, getTicket, updateTicket, getTicketStats };
