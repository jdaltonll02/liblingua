const prisma = require('../utils/prisma');

const CONSENT_SCOPES = Object.freeze([
  'text_contribution',
  'target_audio',
  'english_audio',
  'model_training',
  'public_release',
  'commercial_use',
  'future_research',
]);
const PARTICIPANT_CONSENT_POLICY_KEY = 'participant_consent';

function normaliseScopes(scopes) {
  if (!Array.isArray(scopes)) throw new Error('Consent scopes must be an array');
  const unique = [...new Set(scopes.map((scope) => String(scope).trim()))];
  if (unique.length === 0) throw new Error('At least one consent scope is required');
  const invalid = unique.filter((scope) => !CONSENT_SCOPES.includes(scope));
  if (invalid.length) throw new Error(`Unknown consent scope: ${invalid.join(', ')}`);
  return unique;
}

function resolveEffectiveConsent(events = []) {
  const effective = Object.fromEntries(CONSENT_SCOPES.map((scope) => [scope, false]));
  const ordered = [...events].sort((a, b) => {
    const time = new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime();
    return time || String(a.id).localeCompare(String(b.id));
  });

  for (const event of ordered) {
    const scopes = normaliseScopes(event.scopes);
    const granted = event.decision === 'GRANTED';
    if (!granted && event.decision !== 'WITHDRAWN') {
      throw new Error(`Unknown consent decision: ${event.decision}`);
    }
    for (const scope of scopes) effective[scope] = granted;
  }
  return effective;
}

async function listActivePolicies(now = new Date()) {
  return prisma.researchPolicy.findMany({
    where: {
      status: 'ACTIVE',
      effective_at: { lte: now },
      OR: [{ retired_at: null }, { retired_at: { gt: now } }],
    },
    orderBy: [{ policy_key: 'asc' }, { effective_at: 'desc' }],
  });
}

async function recordConsentEvent({
  contributorId,
  policyId,
  decision,
  scopes,
  reason,
  ipAddress,
  userAgent,
}) {
  if (!['GRANTED', 'WITHDRAWN'].includes(decision)) {
    throw new Error('Consent decision must be GRANTED or WITHDRAWN');
  }
  const cleanScopes = normaliseScopes(scopes);
  const policy = await prisma.researchPolicy.findUnique({ where: { id: policyId } });
  if (!policy) throw new Error('Consent policy not found');
  if (policy.policy_key && policy.policy_key !== PARTICIPANT_CONSENT_POLICY_KEY) {
    throw new Error('Consent records must reference the participant_consent policy');
  }
  if (decision === 'GRANTED' && policy.status !== 'ACTIVE') {
    throw new Error('Consent can only be granted against an active policy');
  }

  return prisma.$transaction(async (tx) => {
    const previous = await tx.consentRecord.findFirst({
      where: { contributor_id: contributorId, policy_id: policyId },
      orderBy: [{ recorded_at: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });
    const record = await tx.consentRecord.create({
      data: {
        contributor_id: contributorId,
        policy_id: policyId,
        decision,
        scopes: cleanScopes,
        supersedes_id: previous?.id || null,
        reason: reason?.trim() || null,
        ip_address: ipAddress || null,
        user_agent: userAgent ? String(userAgent).slice(0, 1000) : null,
      },
    });
    const events = await tx.consentRecord.findMany({
      where: { contributor_id: contributorId, policy_id: policyId },
      orderBy: [{ recorded_at: 'asc' }, { id: 'asc' }],
    });
    const effective = resolveEffectiveConsent(events);
    await tx.consentState.upsert({
      where: { contributor_id_policy_id: { contributor_id: contributorId, policy_id: policyId } },
      create: { contributor_id: contributorId, policy_id: policyId, ...effective },
      update: effective,
    });
    if (decision === 'WITHDRAWN' && cleanScopes.some((scope) => [
      'text_contribution', 'target_audio', 'english_audio', 'model_training', 'public_release',
    ].includes(scope))) {
      const affected = await tx.releasePseudonym.findMany({
        where: { contributor_id: contributorId, release: { status: 'PUBLISHED' } },
        select: { release_id: true, pseudonym: true },
      });
      const releaseIds = [...new Set(affected.map((item) => item.release_id))];
      if (releaseIds.length) {
        await tx.datasetRelease.updateMany({
          where: { id: { in: releaseIds }, status: 'PUBLISHED' },
          data: { status: 'RESTRICTED', restricted_at: new Date() },
        });
        await tx.datasetCorrection.createMany({
          data: releaseIds.map((releaseId) => ({
            release_id: releaseId,
            correction_type: 'PARTICIPANT_WITHDRAWAL',
            description: 'Release restricted after a participant withdrew one or more applicable consent scopes.',
            affected_ids: affected.filter((item) => item.release_id === releaseId).map((item) => item.pseudonym),
            created_by: contributorId,
          })),
        });
      }
    }
    return record;
  });
}

async function assertActiveConsent(contributorId, requiredScopes) {
  const scopes = normaliseScopes(requiredScopes);
  const state = await prisma.consentState.findFirst({
    where: {
      contributor_id: contributorId,
      policy: {
        policy_key: PARTICIPANT_CONSENT_POLICY_KEY,
        status: 'ACTIVE',
        effective_at: { lte: new Date() },
        OR: [{ retired_at: null }, { retired_at: { gt: new Date() } }],
      },
    },
    orderBy: { policy: { effective_at: 'desc' } },
  });
  if (!state) {
    const error = new Error('Accept the active participant consent document before contributing');
    error.status = 403;
    throw error;
  }
  const missing = scopes.filter((scope) => !state[scope]);
  if (missing.length) {
    const error = new Error(`Required consent has not been granted: ${missing.join(', ')}`);
    error.status = 403;
    throw error;
  }
  return state;
}

async function getContributorConsent(contributorId) {
  const policies = await listActivePolicies();
  const results = [];
  for (const policy of policies) {
    const events = await prisma.consentRecord.findMany({
      where: { contributor_id: contributorId, policy_id: policy.id },
      orderBy: [{ recorded_at: 'asc' }, { id: 'asc' }],
    });
    results.push({ policy, effective: resolveEffectiveConsent(events), events });
  }
  return results;
}

module.exports = {
  CONSENT_SCOPES,
  normaliseScopes,
  resolveEffectiveConsent,
  listActivePolicies,
  recordConsentEvent,
  getContributorConsent,
  assertActiveConsent,
  PARTICIPANT_CONSENT_POLICY_KEY,
};
