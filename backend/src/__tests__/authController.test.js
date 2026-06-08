jest.mock('../utils/prisma', () => ({
  contributor: {
    findUnique: jest.fn(),
    create:     jest.fn(),
  },
}));

jest.mock('../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const prisma       = require('../utils/prisma');
const emailService = require('../services/emailService');
const { register, login } = require('../controllers/authController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
}

const VALID_BODY = {
  name:             'Jallah Kamara',
  email:            'jallah@example.com',
  password:         'securepass123',
  native_language:  'kpelle',
  region_of_origin: 'Bong County',
  age_group:        '18_35',
  is_l1_speaker:    true,
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no SMTP configured → dev mode
  delete process.env.SMTP_HOST;
});

// ── register ──────────────────────────────────────────────────────────────────

describe('register', () => {
  test('returns 409 when email already registered', async () => {
    prisma.contributor.findUnique.mockResolvedValue({ id: 'existing' });
    const res = mockRes();
    await register({ body: VALID_BODY }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/already registered/i) }));
  });

  test('dev mode: auto-verifies, sets cookie, returns contributor', async () => {
    prisma.contributor.findUnique.mockResolvedValue(null); // no existing user
    prisma.contributor.create.mockResolvedValue({
      id: 'new-id', email: VALID_BODY.email, name: VALID_BODY.name,
      is_admin: false, role: 'CONTRIBUTOR', is_active: true,
      email_verified: true, is_profile_complete: true,
    });

    const res = mockRes();
    await register({ body: VALID_BODY }, res, jest.fn());

    // Cookie must be set
    expect(res.cookie).toHaveBeenCalled();
    // Contributor returned in body
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ contributor: expect.objectContaining({ email: VALID_BODY.email }) })
    );
    // Status is 201
    expect(res.status).toHaveBeenCalledWith(201);
    // Email NOT sent in dev mode
    expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  test('prod mode: does not set cookie, sends verification email', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    prisma.contributor.findUnique.mockResolvedValue(null);
    prisma.contributor.create.mockResolvedValue({
      id: 'new-id', email: VALID_BODY.email, name: VALID_BODY.name,
      is_admin: false, role: 'CONTRIBUTOR', is_active: true,
      email_verified: false, is_profile_complete: true,
    });

    const res = mockRes();
    await register({ body: VALID_BODY }, res, jest.fn());

    expect(res.cookie).not.toHaveBeenCalled();
    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
      VALID_BODY.email, VALID_BODY.name, expect.any(String)
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ email: VALID_BODY.email })
    );
  });

  test('stores a hashed password, not plaintext', async () => {
    prisma.contributor.findUnique.mockResolvedValue(null);
    prisma.contributor.create.mockResolvedValue({
      id: 'new-id', email: VALID_BODY.email, is_admin: false,
      role: 'CONTRIBUTOR', is_active: true, email_verified: true, is_profile_complete: true,
    });

    await register({ body: VALID_BODY }, mockRes(), jest.fn());

    const createCall = prisma.contributor.create.mock.calls[0][0].data;
    expect(createCall.password_hash).toBeDefined();
    expect(createCall.password_hash).not.toBe(VALID_BODY.password);
    // bcrypt hashes start with $2
    expect(createCall.password_hash).toMatch(/^\$2/);
  });
});

// ── login ─────────────────────────────────────────────────────────────────────

describe('login', () => {
  const bcrypt = require('bcryptjs');

  async function makeContributor(overrides = {}) {
    return {
      id:             'u1',
      email:          VALID_BODY.email,
      password_hash:  await bcrypt.hash(VALID_BODY.password, 10),
      is_admin:       false,
      role:           'CONTRIBUTOR',
      is_active:      true,
      email_verified: true,
      ...overrides,
    };
  }

  test('returns 401 for non-existent email', async () => {
    prisma.contributor.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await login({ body: { email: 'nobody@x.com', password: 'pw' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 401 for wrong password', async () => {
    prisma.contributor.findUnique.mockResolvedValue(await makeContributor());
    const res = mockRes();
    await login({ body: { email: VALID_BODY.email, password: 'wrongpass' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 403 with email_unverified flag when email not verified', async () => {
    prisma.contributor.findUnique.mockResolvedValue(
      await makeContributor({ email_verified: false })
    );
    const res = mockRes();
    await login({ body: { email: VALID_BODY.email, password: VALID_BODY.password } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ email_unverified: true })
    );
  });

  test('returns contributor and sets cookie on valid credentials', async () => {
    prisma.contributor.findUnique.mockResolvedValue(await makeContributor());
    const res = mockRes();
    await login({ body: { email: VALID_BODY.email, password: VALID_BODY.password } }, res, jest.fn());
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ contributor: expect.objectContaining({ email: VALID_BODY.email }) })
    );
  });

  test('returns 401 for SSO-only account (no password_hash)', async () => {
    prisma.contributor.findUnique.mockResolvedValue(
      await makeContributor({ password_hash: null })
    );
    const res = mockRes();
    await login({ body: { email: VALID_BODY.email, password: VALID_BODY.password } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('does not expose password_hash in login response', async () => {
    prisma.contributor.findUnique.mockResolvedValue(await makeContributor());
    const res = mockRes();
    await login({ body: { email: VALID_BODY.email, password: VALID_BODY.password } }, res, jest.fn());
    const body = res.json.mock.calls[0][0];
    expect(JSON.stringify(body)).not.toContain('password_hash');
  });
});
