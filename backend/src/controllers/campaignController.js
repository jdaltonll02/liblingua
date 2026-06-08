const prisma = require('../utils/prisma');

const VALID_LANGS    = ['kpelle','bassa','grebo','vai','mende','loma','krahn','dan'];
const VALID_DOMAINS  = ['general','health','legal','education','news','conversational'];
const VALID_STATUSES = ['UPCOMING','ACTIVE','COMPLETED','CANCELLED'];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function refreshProgress(campaign) {
  const where = {
    target_language: campaign.language,
    created_at: { gte: campaign.start_date, lte: campaign.end_date },
  };
  if (campaign.domain) where.sample = { domain: campaign.domain };
  const count = await prisma.translation.count({ where });
  return count;
}

function deriveStatus(campaign) {
  const now = new Date();
  if (!campaign.is_active) return 'CANCELLED';
  if (now < new Date(campaign.start_date)) return 'UPCOMING';
  if (now > new Date(campaign.end_date))   return 'COMPLETED';
  return 'ACTIVE';
}

// ── Public ────────────────────────────────────────────────────────────────────

async function listCampaigns(req, res, next) {
  try {
    const { status, language } = req.query;
    const where = { is_active: true };
    if (language) where.language = language;

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: [{ status: 'asc' }, { start_date: 'asc' }],
      include: { creator: { select: { name: true } } },
    });

    // Refresh progress and compute derived status for each
    const enriched = await Promise.all(campaigns.map(async (c) => {
      const progress = await refreshProgress(c);
      return {
        ...c,
        progress,
        derived_status: deriveStatus(c),
        pct: c.goal > 0 ? Math.min(100, Math.round((progress / c.goal) * 100)) : 0,
      };
    }));

    const filtered = status
      ? enriched.filter((c) => c.derived_status === status.toUpperCase())
      : enriched;

    res.json(filtered);
  } catch (err) { next(err); }
}

async function getCampaign(req, res, next) {
  try {
    const c = await prisma.campaign.findUnique({
      where:   { id: req.params.id },
      include: { creator: { select: { name: true } } },
    });
    if (!c) return res.status(404).json({ error: 'Campaign not found' });
    const progress = await refreshProgress(c);
    res.json({ ...c, progress, derived_status: deriveStatus(c), pct: c.goal > 0 ? Math.min(100, Math.round((progress / c.goal) * 100)) : 0 });
  } catch (err) { next(err); }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function createCampaign(req, res, next) {
  try {
    const { title, description, language, domain, goal, start_date, end_date, badge_slug } = req.body;
    if (!title?.trim())    return res.status(400).json({ error: 'title is required' });
    if (!VALID_LANGS.includes(language)) return res.status(400).json({ error: `language must be one of: ${VALID_LANGS.join(', ')}` });
    if (!goal || goal < 1) return res.status(400).json({ error: 'goal must be >= 1' });
    if (!start_date || !end_date) return res.status(400).json({ error: 'start_date and end_date are required' });
    if (domain && !VALID_DOMAINS.includes(domain)) return res.status(400).json({ error: 'invalid domain' });

    const c = await prisma.campaign.create({
      data: {
        title:       title.trim(),
        description: description?.trim() || null,
        language,
        domain:      domain || null,
        goal:        parseInt(goal, 10),
        start_date:  new Date(start_date),
        end_date:    new Date(end_date),
        badge_slug:  badge_slug || null,
        created_by:  req.user.id,
      },
    });
    res.status(201).json(c);
  } catch (err) { next(err); }
}

async function updateCampaign(req, res, next) {
  try {
    const { title, description, goal, start_date, end_date, is_active, badge_slug } = req.body;
    const data = {};
    if (title       != null) data.title       = title.trim();
    if (description != null) data.description = description.trim() || null;
    if (goal        != null) data.goal        = parseInt(goal, 10);
    if (start_date  != null) data.start_date  = new Date(start_date);
    if (end_date    != null) data.end_date    = new Date(end_date);
    if (is_active   != null) data.is_active   = Boolean(is_active);
    if (badge_slug  != null) data.badge_slug  = badge_slug || null;

    const c = await prisma.campaign.update({ where: { id: req.params.id }, data });
    res.json(c);
  } catch (err) { next(err); }
}

async function deleteCampaign(req, res, next) {
  try {
    await prisma.campaign.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (err) { next(err); }
}

module.exports = { listCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign };
