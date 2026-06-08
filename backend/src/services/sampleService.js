const prisma = require('../utils/prisma');

const DOMAINS   = ['general', 'health', 'legal', 'education', 'news', 'conversational'];
const MAX_PER_LANGUAGE   = 3;
const GOLD_STANDARD_RATE = 0.05;

// Pure function — kept here so both the service and tests can use it directly.
function weightedRandom(items, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

async function _assertLanguageExists(language) {
  const lang = await prisma.language.findUnique({ where: { value: language } });
  if (!lang || !lang.is_active) {
    const err = new Error(`Unknown or inactive language: "${language}"`);
    err.status = 400;
    throw err;
  }
}

/**
 * Returns one English sample for the contributor to translate into `language`.
 */
async function pickSampleForContributor(contributorId, language) {
  await _assertLanguageExists(language);

  // ── 1. Gold standard injection ───────────────────────────────────────────
  if (Math.random() < GOLD_STANDARD_RATE) {
    const goldCandidates = await prisma.englishSample.findMany({
      where: {
        is_gold_standard: true,
        translations: { none: { contributor_id: contributorId, target_language: language } },
      },
      take: 10,
    });
    if (goldCandidates.length > 0) {
      return goldCandidates[Math.floor(Math.random() * goldCandidates.length)];
    }
  }

  // ── 2. Compute per-domain translation counts for this language ───────────
  const domainCounts = await prisma.$queryRaw`
    SELECT es.domain, COUNT(t.id)::int AS cnt
    FROM english_samples es
    LEFT JOIN translations t
      ON t.sample_id = es.id AND t.target_language = ${language}
    WHERE es.is_gold_standard = false
    GROUP BY es.domain
  `;

  const countMap = {};
  for (const row of domainCounts) countMap[row.domain] = row.cnt;

  const weights = DOMAINS.map((d) => 1 / ((countMap[d] ?? 0) + 1));
  const chosenDomain = weightedRandom(DOMAINS, weights);

  // ── 3. Fetch candidates in the chosen domain ─────────────────────────────
  const candidates = await _queryCandidates(contributorId, language, chosenDomain);

  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // ── 4. Fallback: any domain ──────────────────────────────────────────────
  const fallback = await _queryCandidates(contributorId, language, null);
  return fallback.length > 0
    ? fallback[Math.floor(Math.random() * fallback.length)]
    : null;
}

async function _queryCandidates(contributorId, language, domain) {
  if (domain) {
    return prisma.$queryRaw`
      SELECT es.*
      FROM english_samples es
      WHERE es.is_gold_standard = false
        AND es.domain = ${domain}::"Domain"
        AND NOT EXISTS (
          SELECT 1 FROM translations t
          WHERE t.sample_id = es.id
            AND t.contributor_id = ${contributorId}
            AND t.target_language = ${language}
        )
        AND (
          SELECT COUNT(*) FROM translations t2
          WHERE t2.sample_id = es.id
            AND t2.target_language = ${language}
        ) < ${MAX_PER_LANGUAGE}
      ORDER BY RANDOM()
      LIMIT 10
    `;
  }

  return prisma.$queryRaw`
    SELECT es.*
    FROM english_samples es
    WHERE es.is_gold_standard = false
      AND NOT EXISTS (
        SELECT 1 FROM translations t
        WHERE t.sample_id = es.id
          AND t.contributor_id = ${contributorId}
          AND t.target_language = ${language}
      )
      AND (
        SELECT COUNT(*) FROM translations t2
        WHERE t2.sample_id = es.id
          AND t2.target_language = ${language}
      ) < ${MAX_PER_LANGUAGE}
    ORDER BY RANDOM()
    LIMIT 1
  `;
}

/**
 * Returns { total, locked, remaining } sample counts for a given language.
 */
async function getLanguageProgress(language) {
  await _assertLanguageExists(language);

  const [total, lockedResult] = await Promise.all([
    prisma.englishSample.count({ where: { is_gold_standard: false } }),
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT es.id)::int AS cnt
      FROM english_samples es
      WHERE es.is_gold_standard = false
        AND (
          SELECT COUNT(*) FROM translations t
          WHERE t.sample_id = es.id
            AND t.target_language = ${language}
        ) >= ${MAX_PER_LANGUAGE}
    `,
  ]);

  const locked = lockedResult[0]?.cnt ?? 0;
  return { total, locked, remaining: total - locked, language };
}

module.exports = { pickSampleForContributor, getLanguageProgress, weightedRandom };
