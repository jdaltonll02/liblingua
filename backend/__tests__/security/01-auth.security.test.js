'use strict';

/**
 * Security Test Suite 1 — Authentication
 *
 * Covers: JWT forgery, algorithm confusion, token expiry, password strength,
 * credential stuffing surface, email verification enforcement, password reset
 * token security, cookie attributes, logout, deactivated accounts.
 */

// ── Mocks (hoisted by Jest before any require) ────────────────────────────────

jest.mock('../../src/utils/prisma', () => ({
  contributor: {
    findUnique:  jest.fn(),
    findFirst:   jest.fn(),
    findMany:    jest.fn(),
    create:      jest.fn(),
    update:      jest.fn(),
    updateMany:  jest.fn(),
    delete:      jest.fn(),
    count:       jest.fn(),
    aggregate:   jest.fn(),
  },
  apiKey:      { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
  translation: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), aggregate: jest.fn() },
  auditLog:    { create: jest.fn(), findMany: jest.fn() },
  language:    { findMany: jest.fn() },
  $queryRaw:   jest.fn(),
  $transaction: jest.fn(),
}));

jest.mock('../../src/services/emailService', () => ({
  sendVerificationEmail:    jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail:   jest.fn().mockResolvedValue(undefined),
  sendEmailChangeVerification: jest.fn().mockResolvedValue(undefined),
  sendInvitationEmail:      jest.fn().mockResolvedValue(undefined),
}));

jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('$2a$12$testhash'),
  compare: jest.fn(),
}));

jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn().mockReturnValue('TESTSECRET'),
    keyuri:         jest.fn().mockReturnValue('otpauth://totp/test'),
    verify:         jest.fn().mockReturnValue(true),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,test'),
}));

// ── Test setup ────────────────────────────────────────────────────────────────

const request  = require('supertest');
const createApp = require('../helpers/createApp');
const {
  CONTRIBUTOR, ADMIN_USER, DEACTIVATED_USER, UNVERIFIED_USER,
  tokenFor, expiredToken, forgedToken, algNoneToken,
} = require('../helpers/fixtures');

const prismaMock = require('../../src/utils/prisma');
const bcrypt     = require('bcryptjs');

let app;
beforeAll(() => { app = createApp(); });

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no user found (safe baseline — tests opt-in to returning data)
  prismaMock.contributor.findUnique.mockResolvedValue(null);
  prismaMock.contributor.create.mockResolvedValue(CONTRIBUTOR);
  prismaMock.contributor.update.mockResolvedValue(CONTRIBUTOR);
  prismaMock.auditLog.create.mockResolvedValue({});
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PROTECTED ROUTE ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Protected route: no token', () => {
  it('GET /api/auth/me → 401 without any token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });

  it('GET /api/samples/random → 401 without token', async () => {
    const res = await request(app).get('/api/samples/random');
    expect(res.status).toBe(401);
  });

  it('GET /api/translations → 401 without token', async () => {
    const res = await request(app).get('/api/translations');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/users → 401 without token', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. JWT FORGERY & ALGORITHM ATTACKS
// ═══════════════════════════════════════════════════════════════════════════════

describe('JWT: token integrity', () => {
  it('rejects a token signed with the wrong secret', async () => {
    const forged = forgedToken(CONTRIBUTOR);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it('rejects alg:none (unsigned) token', async () => {
    const badToken = algNoneToken(CONTRIBUTOR);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const expired = expiredToken(CONTRIBUTOR);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it('rejects a completely malformed string', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.jwt.at.all');
    expect(res.status).toBe(401);
  });

  it('rejects a token missing the Bearer prefix', async () => {
    const token = tokenFor(CONTRIBUTOR);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', token);   // no "Bearer " prefix
    expect(res.status).toBe(401);
  });

  it('rejects a token with "Bearer" and empty value', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });

  it('accepts a valid token via Authorization header', async () => {
    prismaMock.contributor.findUnique.mockResolvedValue(CONTRIBUTOR);
    const token = tokenFor(CONTRIBUTOR);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('accepts a valid token via httpOnly cookie', async () => {
    prismaMock.contributor.findUnique.mockResolvedValue(CONTRIBUTOR);
    const token = tokenFor(CONTRIBUTOR);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`);
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DEACTIVATED ACCOUNT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Deactivated account', () => {
  it('rejects a valid JWT for a deactivated account', async () => {
    // The JWT itself is valid, but is_active flag is false
    const token = tokenFor(DEACTIVATED_USER);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/deactivated/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. REGISTRATION — INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Registration: password strength enforcement', () => {
  const validBase = {
    name: 'Test User',
    email: 'new@example.com',
    native_language: 'kpelle',
    region_of_origin: 'Bong County',
    age_group: '18_35',
    is_l1_speaker: true,
  };

  it('rejects password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ ...validBase, password: 'Sh0rt' });
    expect(res.status).toBe(422);
  });

  it('rejects password with no uppercase letter', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ ...validBase, password: 'alllower123' });
    expect(res.status).toBe(422);
  });

  it('rejects password with no lowercase letter', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ ...validBase, password: 'ALLUPPER123' });
    expect(res.status).toBe(422);
  });

  it('rejects password with no digit', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ ...validBase, password: 'NoDigitsHere' });
    expect(res.status).toBe(422);
  });

  it('rejects invalid email format', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ ...validBase, password: 'Valid1Pass!', email: 'not-an-email' });
    expect(res.status).toBe(422);
  });

  it('rejects invalid age_group enum value', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ ...validBase, password: 'Valid1Pass!', age_group: 'infant' });
    expect(res.status).toBe(422);
  });

  it('rejects missing required fields', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'x@x.com', password: 'Valid1Pass!' });
    expect(res.status).toBe(422);
  });

  it('rejects duplicate email with 409', async () => {
    prismaMock.contributor.findUnique.mockResolvedValue(CONTRIBUTOR);
    const res = await request(app).post('/api/auth/register')
      .send({ ...validBase, email: CONTRIBUTOR.email, password: 'Valid1Pass!' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. LOGIN — CREDENTIAL SECURITY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Login: credential checks', () => {
  it('rejects login for non-existent email with 401 (not 404 — no enumeration)', async () => {
    prismaMock.contributor.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'SecurePass123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('rejects login with wrong password', async () => {
    prismaMock.contributor.findUnique.mockResolvedValue(CONTRIBUTOR);
    bcrypt.compare.mockResolvedValue(false);
    const res = await request(app).post('/api/auth/login')
      .send({ email: CONTRIBUTOR.email, password: 'WrongPass999' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('rejects login for unverified email with specific message', async () => {
    prismaMock.contributor.findUnique.mockResolvedValue({
      ...CONTRIBUTOR,
      email_verified: false,
      password_hash: '$2a$12$testhash',
    });
    bcrypt.compare.mockResolvedValue(true);
    const res = await request(app).post('/api/auth/login')
      .send({ email: CONTRIBUTOR.email, password: 'SecurePass123' });
    // Login controller returns 403 (Forbidden) for verified-but-unverified-email: credentials
    // are correct but account access is forbidden until email is confirmed.
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/verify your email/i);
  });

  it('rejects login for deactivated account', async () => {
    prismaMock.contributor.findUnique.mockResolvedValue({
      ...CONTRIBUTOR,
      is_active: false,
      email_verified: true,
      password_hash: '$2a$12$testhash',
    });
    bcrypt.compare.mockResolvedValue(true);
    const res = await request(app).post('/api/auth/login')
      .send({ email: CONTRIBUTOR.email, password: 'SecurePass123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/deactivated/i);
  });

  it('returns a set-cookie header on successful login', async () => {
    prismaMock.contributor.findUnique.mockResolvedValue({
      ...CONTRIBUTOR,
      password_hash: '$2a$12$testhash',
      email_verified: true,
      is_active: true,
    });
    bcrypt.compare.mockResolvedValue(true);
    const res = await request(app).post('/api/auth/login')
      .send({ email: CONTRIBUTOR.email, password: 'SecurePass123' });
    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookie).toContain('token=');
    expect(cookie.toLowerCase()).toContain('httponly');
  });

  it('signals "needs_password_setup" for an invited user who has not yet set password', async () => {
    prismaMock.contributor.findUnique.mockResolvedValue({
      ...CONTRIBUTOR,
      password_hash: null,
      reset_token: 'some-invite-token',
    });
    const res = await request(app).post('/api/auth/login')
      .send({ email: CONTRIBUTOR.email, password: 'AnyPass123' });
    expect(res.status).toBe(401);
    expect(res.body.needs_password_setup).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PASSWORD RESET TOKEN SECURITY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Password reset: token security', () => {
  it('forgot-password does NOT reveal whether the email exists', async () => {
    prismaMock.contributor.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that email exists/i);
  });

  it('reset-password rejects an invalid token', async () => {
    prismaMock.contributor.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token: 'bogus-token', password: 'NewPass123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it('reset-password rejects an expired token', async () => {
    prismaMock.contributor.findUnique.mockResolvedValue({
      ...CONTRIBUTOR,
      reset_token: 'expired-token',
      reset_token_expires_at: new Date(Date.now() - 10000), // 10 seconds in the past
    });
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token: 'expired-token', password: 'NewPass123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it('reset-password enforces password strength', async () => {
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token: 'valid-token', password: 'weak' });
    expect(res.status).toBe(422);
  });

  it('reset-password rejects missing token', async () => {
    const res = await request(app).post('/api/auth/reset-password')
      .send({ password: 'NewPass123' });
    expect(res.status).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. LOGOUT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Logout: session termination', () => {
  it('clears the auth cookie on logout', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    // Cookie should be cleared (expires in the past or empty value)
    expect(cookie).toContain('token=');
    expect(cookie).toMatch(/expires=Thu, 01 Jan 1970|Max-Age=0/i);
  });
});
