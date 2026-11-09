jest.mock('../utils/prisma', () => {
  const tx = {
    consentRecord: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    consentState: { upsert: jest.fn() },
    releasePseudonym: { findMany: jest.fn().mockResolvedValue([]) },
    datasetRelease: { updateMany: jest.fn() },
    datasetCorrection: { createMany: jest.fn() },
  };
  return {
    contributor: { findUnique: jest.fn() },
    researchPolicy: { findUnique: jest.fn(), findMany: jest.fn() },
    consentRecord: tx.consentRecord,
    consentState: { findFirst: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx)),
    _tx: tx,
  };
});

const prisma = require('../utils/prisma');
const {
  normaliseScopes,
  resolveEffectiveConsent,
  recordConsentEvent,
} = require('../services/consentService');

describe('consent service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.contributor.findUnique.mockResolvedValue({ id: 'user-1', age_group: 'age_18_35' });
  });

  test('rejects unknown and empty scopes', () => {
    expect(() => normaliseScopes([])).toThrow(/at least one/i);
    expect(() => normaliseScopes(['sell_everything'])).toThrow(/unknown/i);
  });

  test('resolves partial grants and withdrawals without erasing unrelated choices', () => {
    const effective = resolveEffectiveConsent([
      { id: '1', recorded_at: '2026-01-01', decision: 'GRANTED', scopes: ['text_contribution', 'target_audio'] },
      { id: '2', recorded_at: '2026-01-02', decision: 'GRANTED', scopes: ['future_research'] },
      { id: '3', recorded_at: '2026-01-03', decision: 'WITHDRAWN', scopes: ['target_audio'] },
    ]);
    expect(effective.text_contribution).toBe(true);
    expect(effective.target_audio).toBe(false);
    expect(effective.future_research).toBe(true);
    expect(effective.commercial_use).toBe(false);
  });

  test('consent events append to history and point at the prior event', async () => {
    prisma.researchPolicy.findUnique.mockResolvedValue({ id: 'policy-1', status: 'ACTIVE' });
    prisma._tx.consentRecord.findFirst.mockResolvedValue({ id: 'prior-1' });
    prisma._tx.consentRecord.create.mockImplementation(async ({ data }) => ({ id: 'new-1', recorded_at: new Date(), ...data }));
    prisma._tx.consentRecord.findMany.mockResolvedValue([
      { id: 'new-1', recorded_at: new Date(), decision: 'WITHDRAWN', scopes: ['target_audio'] },
    ]);

    const result = await recordConsentEvent({
      contributorId: 'user-1',
      policyId: 'policy-1',
      decision: 'WITHDRAWN',
      scopes: ['target_audio'],
      reason: 'Changed my mind',
    });

    expect(result.supersedes_id).toBe('prior-1');
    expect(prisma._tx.consentRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ decision: 'WITHDRAWN', scopes: ['target_audio'] }),
    });
    expect(prisma._tx.consentState.upsert).toHaveBeenCalled();
  });

  test('cannot grant consent against a draft policy', async () => {
    prisma.researchPolicy.findUnique.mockResolvedValue({ id: 'policy-1', status: 'DRAFT' });
    await expect(recordConsentEvent({
      contributorId: 'user-1',
      policyId: 'policy-1',
      decision: 'GRANTED',
      scopes: ['text_contribution'],
    })).rejects.toThrow(/active policy/i);
  });

  test('does not allow a legacy under-18 account to grant research consent', async () => {
    prisma.researchPolicy.findUnique.mockResolvedValue({ id: 'policy-1', policy_key: 'participant_consent', status: 'ACTIVE' });
    prisma.contributor.findUnique.mockResolvedValue({ id: 'user-1', age_group: 'under_18' });
    await expect(recordConsentEvent({
      contributorId: 'user-1', policyId: 'policy-1', decision: 'GRANTED', scopes: ['text_contribution'],
    })).rejects.toMatchObject({ status: 403 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
