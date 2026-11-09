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
        source_release_eligible: true,
        translations: { none: { contributor_id: contributorId, target_language: language } },
      },
      take: 10,
    });
    if (goldCandidates.length > 0) {
      return goldCandidates[Math.floor(Math.random() * goldCandidates.length)];
    }
  }

  // ── 2. Compute per-domain translation counts for this language ───────────
  const countMap = {};
  const translatedSamples = await prisma.translation.findMany({
    where: {
      target_language: language,
      sample: { is_gold_standard: false, source_release_eligible: true },
    },
    select: { sample: { select: { domain: true } } },
  });
  for (const row of translatedSamples) {
    const domain = row.sample.domain;
    countMap[domain] = (countMap[domain] || 0) + 1;
  }

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
  const rows = await prisma.englishSample.findMany({
    where: {
      is_gold_standard: false,
      source_release_eligible: true,
      ...(domain ? { domain } : {}),
      translations: {
        none: { contributor_id: contributorId, target_language: language },
      },
    },
    include: {
      translations: {
        where: { target_language: language },
        select: { id: true },
      },
    },
  });

  return rows
    .filter((row) => row.translations.length < MAX_PER_LANGUAGE)
    .map(({ translations, ...sample }) => sample);
}

/**
 * Returns { total, locked, remaining } sample counts for a given language.
 */
async function getLanguageProgress(language) {
  await _assertLanguageExists(language);

  const [total, translationGroups] = await Promise.all([
    prisma.englishSample.count({ where: { is_gold_standard: false, source_release_eligible: true } }),
    prisma.translation.groupBy({
      by: ['sample_id'],
      where: {
        target_language: language,
        sample: { is_gold_standard: false, source_release_eligible: true },
      },
      _count: { _all: true },
    }),
  ]);

  const locked = translationGroups.filter((row) => row._count._all >= MAX_PER_LANGUAGE).length;
  return { total, locked, remaining: total - locked, language };
}

module.exports = { pickSampleForContributor, getLanguageProgress, weightedRandom };
