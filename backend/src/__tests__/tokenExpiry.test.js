// Unit tests for email verification token expiry logic.
// Prisma is mocked — no DB required.

jest.mock('../utils/prisma', () => ({
  contributor: {
    findUnique: jest.fn(),
    update:     jest.fn(),
  },
}));

// Mock emailService so register doesn't try to send real email
jest.mock('../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const prisma = require('../utils/prisma');

const FRESH_TOKEN   = 'fresh-token-uuid';
const EXPIRED_TOKEN = 'expired-token-uuid';

const MS_25H = 25 * 60 * 60 * 1000;
const now    = Date.now();

const freshContributor = {
  id:                    'uid-1',
  email:                 'user@test.com',
  is_admin:              false,
  role:                  'CONTRIBUTOR',
  is_active:             true,
  email_verified:        false,
  verification_token:    FRESH_TOKEN,
  verification_sent_at:  new Date(now - 1 * 60 * 60 * 1000), // 1 hour ago — valid
};

const expiredContributor = {
  ...freshContributor,
  id:                    'uid-2',
  verification_token:    EXPIRED_TOKEN,
  verification_sent_at:  new Date(now - MS_25H), // 25 hours ago — expired
};

beforeEach(() => jest.clearAllMocks());

describe('verifyEmail — token expiry', () => {
  // Import the controller function directly
  const { verifyEmail } = require('../controllers/authController');

  function mockReq(token) {
    return { params: { token } };
  }

  function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
  }

  test('accepts a token sent less than 24 hours ago', async () => {
    prisma.contributor.findUnique.mockResolvedValue(freshContributor);
    prisma.contributor.update.mockResolvedValue({
      ...freshContributor,
      email_verified:       true,
      verification_token:   null,
      verification_sent_at: null,
    });

    const res = mockRes();
    await verifyEmail(mockReq(FRESH_TOKEN), res, jest.fn());

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email verified. Welcome!' })
    );
  });

  test('rejects a token older than 24 hours', async () => {
    prisma.contributor.findUnique.mockResolvedValue(expiredContributor);
    prisma.contributor.update.mockResolvedValue({ ...expiredContributor, verification_token: null });

    const res = mockRes();
    await verifyEmail(mockReq(EXPIRED_TOKEN), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ expired: true, email: expiredContributor.email })
    );
    // Token should be cleared so resend works cleanly
    expect(prisma.contributor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { verification_token: null } })
    );
  });

  test('returns 400 for a completely unknown token', async () => {
    prisma.contributor.findUnique.mockResolvedValue(null);

    const res = mockRes();
    await verifyEmail(mockReq('bogus-token'), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Invalid') })
    );
  });
});
