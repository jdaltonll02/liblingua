const prisma = require('../utils/prisma');
const { BADGES, getContributorBadges } = require('../services/badgeService');

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
    const rows = await prisma.$queryRaw`
      SELECT DATE(created_at AT TIME ZONE 'UTC') AS day
      FROM translations
      WHERE contributor_id = ${req.user.id}
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 60
    `;
    let streak = 0;
    let prev   = null;
    for (const row of rows) {
      const d = new Date(row.day);
      if (!prev) {
        const today = new Date(); today.setHours(0,0,0,0);
        const diff  = Math.round((today - d) / 86400000);
        if (diff > 1) break; // gap before today
        streak = 1;
      } else {
        const diff = Math.round((prev - d) / 86400000);
        if (diff === 1) streak++;
        else break;
      }
      prev = d;
    }
    res.json({ streak });
  } catch (err) { next(err); }
}

module.exports = { listBadgeDefinitions, myBadges, contributorBadges, myStreak };
