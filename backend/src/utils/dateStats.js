function utcDay(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function distinctUtcDays(rows) {
  return new Set(rows.map((row) => utcDay(row.created_at)));
}

function consecutiveUtcDayStreak(rows, now = new Date()) {
  const days = [...distinctUtcDays(rows)].sort().reverse();
  if (days.length === 0) return 0;

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const newest = new Date(`${days[0]}T00:00:00.000Z`);
  if (Math.round((today - newest) / 86400000) > 1) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const previous = new Date(`${days[i - 1]}T00:00:00.000Z`);
    const current = new Date(`${days[i]}T00:00:00.000Z`);
    if (Math.round((previous - current) / 86400000) !== 1) break;
    streak++;
  }
  return streak;
}

module.exports = { distinctUtcDays, consecutiveUtcDayStreak };
