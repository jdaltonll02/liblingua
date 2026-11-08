const prisma = require('../utils/prisma');
const { BADGES, getContributorBadges } = require('../services/badgeService');
const { consecutiveUtcDayStreak } = require('../utils/dateStats');

// All defined badge types (for UI reference)
async function listBadgeDefinitions(_req, res, next) {
  try {
    res.json(Object.entries(BADGES).map(([slug, meta]) => ({ slug, ...meta })));
  } catch (err) { next(err); }
}

// Badges earned by the requesting contributor
async function myBadges(req, res, next) {
  try {
    const badges = await getContributorBadges(req.user.id);
    res.json(badges);
  } catch (err) { next(err); }
}

// Badges earned by any contributor (public)
async function contributorBadges(req, res, next) {
  try {
    const badges = await getContributorBadges(req.params.id);
    res.json(badges);
  } catch (err) { next(err); }
}

// Contributor streak (days in a row with at least one translation)
async function myStreak(req, res, next) {
  try {
    const since = new Date(Date.now() - 61 * 86400000);
    const rows = await prisma.translation.findMany({
      where: { contributor_id: req.user.id, created_at: { gte: since } },
      select: { created_at: true },
      orderBy: { created_at: 'desc' },
    });
    res.json({ streak: consecutiveUtcDayStreak(rows) });
  } catch (err) { next(err); }
}

module.exports = { listBadgeDefinitions, myBadges, contributorBadges, myStreak };
