const prisma = require('../utils/prisma');
const { distinctUtcDays } = require('../utils/dateStats');

// ── Badge definitions ─────────────────────────────────────────────────────────
// Stored as code, not DB rows — simpler and never stale.

const BADGES = {
  first_translation:  { name: 'First Words',      icon: '🌱', desc: 'Submitted your first translation.' },
  translations_10:    { name: 'Getting Started',   icon: '✏️',  desc: '10 translations submitted.' },
  translations_50:    { name: 'Dedicated',         icon: '📚', desc: '50 translations submitted.' },
  translations_100:   { name: 'Century',           icon: '💯', desc: '100 translations submitted.' },
  translations_500:   { name: 'Prolific',          icon: '🚀', desc: '500 translations submitted.' },
  audio_pioneer:      { name: 'Audio Pioneer',     icon: '🎙️', desc: 'Submitted your first spoken recording.' },
  l1_speaker:         { name: 'Native Voice',      icon: '🗣️', desc: 'Verified L1 speaker contributor.' },
  gold_quality:       { name: 'Gold Standard',     icon: '⭐', desc: 'Maintained an average quality score above 0.85.' },
  campaign_hero:      { name: 'Campaign Hero',     icon: '🏆', desc: 'Contributed to an active campaign.' },
  streak_7:           { name: 'Week Warrior',      icon: '🔥', desc: 'Translated every day for 7 consecutive days.' },
  streak_30:          { name: 'Month Champion',    icon: '🔥🔥', desc: 'Translated every day for 30 consecutive days.' },
  validated_10:       { name: 'Quality Proven',    icon: '✅', desc: '10 of your translations have been validated.' },
};

exports.BADGES = BADGES;

// Return metadata for a slug (safe to call with unknown slugs)
exports.getBadge = (slug) => BADGES[slug] || { name: slug, icon: '🏅', desc: '' };

// ── Award a badge (idempotent) ────────────────────────────────────────────────

async function award(contributorId, slug) {
  if (!BADGES[slug]) return;
  try {
    await prisma.contributorBadge.create({
      data: { contributor_id: contributorId, slug },
    });
  } catch (err) {
    // P2002 = unique violation = already awarded, safe to ignore
    if (err.code !== 'P2002') throw err;
  }
}

// ── Check and award all eligible badges after a translation is submitted ──────

exports.checkAndAward = async (contributorId, { audioPath, isL1, sampleId }) => {
  const since30 = new Date(Date.now() - 30 * 86400000);
  const [totalCount, validatedCount, avgQuality, recent] = await Promise.all([
    prisma.translation.count({ where: { contributor_id: contributorId } }),
    prisma.translation.count({ where: { contributor_id: contributorId, review_state: 'APPROVED' } }),
    prisma.translation.aggregate({
      where: { contributor_id: contributorId, quality_score: { not: null } },
      _avg: { quality_score: true },
    }),
    prisma.translation.findMany({
      where: { contributor_id: contributorId, created_at: { gte: since30 } },
      select: { created_at: true },
    }),
  ]);

  const total     = totalCount;
  const validated = validatedCount;
  const avg       = avgQuality._avg.quality_score;
  const recentDays = distinctUtcDays(recent).size;

  // Count milestones
  if (total === 1)   await award(contributorId, 'first_translation');
  if (total >= 10)   await award(contributorId, 'translations_10');
  if (total >= 50)   await award(contributorId, 'translations_50');
  if (total >= 100)  await award(contributorId, 'translations_100');
  if (total >= 500)  await award(contributorId, 'translations_500');

  // Audio recording submitted
  if (audioPath)     await award(contributorId, 'audio_pioneer');

  // L1 speaker
  if (isL1)          await award(contributorId, 'l1_speaker');

  // Quality
  if (avg !== null && avg >= 0.85 && validated >= 5) {
    await award(contributorId, 'gold_quality');
  }

  // Validated count
  if (validated >= 10) await award(contributorId, 'validated_10');

  // Streak (approximate: count distinct days in last 7 / 30)
  const since7 = Date.now() - 7 * 86400000;
  const recent7Days = distinctUtcDays(recent.filter((row) => new Date(row.created_at).getTime() >= since7)).size;
  if (recent7Days >= 7)   await award(contributorId, 'streak_7');
  if (recentDays >= 30)   await award(contributorId, 'streak_30');
};

// ── Get all badges for a contributor ─────────────────────────────────────────

exports.getContributorBadges = async (contributorId) => {
  const rows = await prisma.contributorBadge.findMany({
    where:   { contributor_id: contributorId },
    orderBy: { awarded_at: 'asc' },
  });
  return rows.map((r) => ({ ...r, ...(BADGES[r.slug] || {}) }));
};
