jest.mock('../utils/prisma', () => {
  const authority = {
    findFirst: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(), create: jest.fn(),
  };
  return {
    researchPolicy: { findUnique: jest.fn() },
    governanceApproval: { create: jest.fn(), findMany: jest.fn() },
    governanceAuthorityAssignment: authority,
    contributor: { findUnique: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((callback) => callback({ governanceAuthorityAssignment: authority })),
    _authority: authority,
  };
});

const prisma = require('../utils/prisma');
const {
  recordApproval,
  assignGovernanceAuthority,
  assertGovernanceApprovals,
} = require('../services/linguisticMetadataService');

describe('governance signing authorities', () => {
  beforeEach(() => jest.clearAllMocks());

  test('an administrator without the assigned authority cannot record an approval', async () => {
    prisma.researchPolicy.findUnique.mockResolvedValue({ id: 'policy-1' });
    prisma._authority.findFirst.mockResolvedValue(null);
    await expect(recordApproval({
      resourceType: 'RESEARCH_POLICY', resourceId: 'policy-1', authorityRole: 'COMMUNITY',
      decision: 'APPROVED', approverId: 'admin-1',
    })).rejects.toMatchObject({ status: 403 });
    expect(prisma.governanceApproval.create).not.toHaveBeenCalled();
  });

  test('the assigned signer can record only their authority decision', async () => {
    prisma.researchPolicy.findUnique.mockResolvedValue({ id: 'policy-1' });
    prisma._authority.findFirst.mockResolvedValue({ contributor_id: 'community-1', authority_role: 'COMMUNITY' });
    prisma.governanceApproval.create.mockResolvedValue({ id: 'approval-1' });
    await expect(recordApproval({
      resourceType: 'RESEARCH_POLICY', resourceId: 'policy-1', authorityRole: 'COMMUNITY',
      decision: 'APPROVED', approverId: 'community-1',
    })).resolves.toEqual({ id: 'approval-1' });
  });

  test('one account cannot be assigned to both authority roles', async () => {
    prisma.contributor.findUnique.mockResolvedValue({ id: 'person-1', is_active: true, email_verified: true });
    prisma._authority.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ contributor_id: 'person-1', authority_role: 'COMMUNITY' });
    await expect(assignGovernanceAuthority({
      authorityRole: 'RESEARCH', contributorId: 'person-1', assignedBy: 'super-1',
    })).rejects.toMatchObject({ status: 409 });
  });

  test('activation ignores decisions not made by the currently assigned signers', async () => {
    prisma.governanceApproval.findMany.mockResolvedValue([
      { authority_role: 'COMMUNITY', approver_id: 'wrong-admin', decision: 'APPROVED', decided_at: new Date('2026-11-09') },
      { authority_role: 'RESEARCH', approver_id: 'research-1', decision: 'APPROVED', decided_at: new Date('2026-11-09') },
    ]);
    prisma._authority.findMany.mockResolvedValue([
      { authority_role: 'COMMUNITY', contributor_id: 'community-1', assigned_at: new Date('2026-11-01') },
      { authority_role: 'RESEARCH', contributor_id: 'research-1', assigned_at: new Date('2026-11-01') },
    ]);
    await expect(assertGovernanceApprovals('RESEARCH_POLICY', 'policy-1'))
      .rejects.toThrow(/community governance decision/i);
  });
});
