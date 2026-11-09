const {
  CONSENT_SCOPES,
  listActivePolicies,
  recordConsentEvent,
  getContributorConsent,
} = require('../services/consentService');

async function activePolicies(req, res, next) {
  try {
    const policies = await listActivePolicies();
    res.json({ policies, scopes: CONSENT_SCOPES });
  } catch (err) {
    next(err);
  }
}

async function allPolicies(req, res, next) {
  try {
    const policies = await require('../utils/prisma').researchPolicy.findMany({
      orderBy: [{ policy_key: 'asc' }, { created_at: 'desc' }],
    });
    res.json({ policies });
  } catch (err) { next(err); }
}

async function myConsent(req, res, next) {
  try {
    res.json({ consent: await getContributorConsent(req.user.id), scopes: CONSENT_SCOPES });
  } catch (err) {
    next(err);
  }
}

async function createConsentEvent(req, res, next) {
  try {
    const record = await recordConsentEvent({
      contributorId: req.user.id,
      policyId: req.body.policy_id,
      decision: req.body.decision,
      scopes: req.body.scopes,
      reason: req.body.reason,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json({ record });
  } catch (err) {
    if (/scope|decision|policy/i.test(err.message)) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { activePolicies, allPolicies, myConsent, createConsentEvent };
