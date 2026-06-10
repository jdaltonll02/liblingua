'use strict';

/**
 * Security Test Suite 2 — Authorization / Access Control
 *
 * Covers: RBAC enforcement, privilege escalation prevention, IDOR,
 * role boundary checks (CONTRIBUTOR vs ADMIN vs SUPER_ADMIN),
 * cross-user data access.
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
  apiKey: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
  language: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), findUnique: jest.fn() },
  auditLog: { create: jest.fn(), findMany: jest.fn() },
  campaign: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  contributorBadge: { findMany: jest.fn() },
  supportTicket: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), groupBy: jest.fn() },
  datasetPublication: { findMany: jest.fn(), upsert: jest.fn(), update: jest.fn(), delete: jest.fn() },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
}));

jest.mock('../../src/services/emailService', () => ({
  sendVerificationEmail:       jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail:      jest.fn().mockResolvedValue(undefined),
  sendEmailChangeVerification: jest.fn().mockResolvedValue(undefined),
  sendInvitationEmail:         jest.fn().mockResolvedValue(undefined),
}));

jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('$2a$12$testhash'),
  compare: jest.fn().mockResolvedValue(true),
}));

const request   = require('supertest');
const createApp = require('../helpers/createApp');
const {
  CONTRIBUTOR, ADMIN_USER, SUPER_ADMIN, MODERATOR,
  tokenFor,
} = require('../helpers/fixtures');

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
// 1. CONTRIBUTOR CANNOT ACCESS ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

describe('CONTRIBUTOR: blocked from admin routes', () => {
  let contributorToken;
  beforeEach(() => { contributorToken = tokenFor(CONTRIBUTOR); });

  it('GET /api/admin/users → 403', async () => {
    const res = await request(app).get('/api/admin/users')
      .set('Authorization', `Bearer ${contributorToken}`);
    expect(res.status).toBe(403);
  });

  it('POST /api/admin/users → 403', async () => {
    const res = await request(app).post('/api/admin/users')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({ name: 'Hacker', email: 'hack@x.com', role: 'ADMIN' });
    expect(res.status).toBe(403);
  });

  it('DELETE /api/admin/users/:id → 403', async () => {
    const res = await request(app).delete('/api/admin/users/victim-id')
      .set('Authorization', `Bearer ${contributorToken}`);
    expect(res.status).toBe(403);
  });

  it('POST /api/samples → 403 (admin-only sample creation)', async () => {
    const res = await request(app).post('/api/samples')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({ text: 'Sample text', domain: 'general', difficulty: 'easy' });
    expect(res.status).toBe(403);
  });

  it('POST /api/samples/bulk → 403', async () => {
    const res = await request(app).post('/api/samples/bulk')
      .set('Authorization', `Bearer ${contributorToken}`)
      .set('Content-Type', 'text/csv')
      .send('text,domain,difficulty\nHello,general,easy');
    expect(res.status).toBe(403);
  });

  it('PATCH /api/translations/:id/validate → 403', async () => {
    const res = await request(app).patch('/api/translations/any-id/validate')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({ is_validated: true, quality_score: 1.0 });
    expect(res.status).toBe(403);
  });

  it('POST /api/dataset/publish → 403', async () => {
    const res = await request(app).post('/api/dataset/publish')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({ language: 'kpelle' });
    expect(res.status).toBe(403);
  });

  it('POST /api/languages → 403', async () => {
    const res = await request(app).post('/api/languages')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({ value: 'newlang', label: 'New Language' });
    expect(res.status).toBe(403);
  });

  it('DELETE /api/languages/:id → 403', async () => {
    const res = await request(app).delete('/api/languages/lang-id')
      .set('Authorization', `Bearer ${contributorToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/audit-logs → 403', async () => {
    const res = await request(app).get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${contributorToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/users/:id → 403 (cannot view other users\' admin profiles)', async () => {
    const res = await request(app).get('/api/admin/users/other-user-id')
      .set('Authorization', `Bearer ${contributorToken}`);
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ROLE ESCALATION PREVENTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Role escalation prevention', () => {
  it('ADMIN cannot update another user\'s role (SUPER_ADMIN only)', async () => {
    const adminToken = tokenFor(ADMIN_USER);
    const res = await request(app).patch('/api/admin/users/target-id/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'SUPER_ADMIN' });
    expect(res.status).toBe(403);
  });

  it('ADMIN cannot delete users (SUPER_ADMIN only)', async () => {
    const adminToken = tokenFor(ADMIN_USER);
    const res = await request(app).delete('/api/admin/users/target-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it('MODERATOR (requireAdmin) can access sample creation', async () => {
    // MODERATOR has elevated role — requireAdmin allows it
    const modToken = tokenFor(MODERATOR);
    prismaMock.englishSample = {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'sample-1', text: 'Hello', domain: 'general', difficulty: 'easy' }),
      createMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };
    // Override global mock with local
    Object.assign(prismaMock, {
      englishSample: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'sample-1', text: 'Hello', domain: 'general', difficulty: 'easy' }),
        createMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    });
    const res = await request(app).post('/api/samples')
      .set('Authorization', `Bearer ${modToken}`)
      .send({ text: 'Hello world test sentence', domain: 'general', difficulty: 'easy' });
    // 200/201 means authorization passed (content may fail if service is not fully mocked)
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('MODERATOR cannot access SUPER_ADMIN-only user role update', async () => {
    const modToken = tokenFor(MODERATOR);
    const res = await request(app).patch('/api/admin/users/target-id/role')
      .set('Authorization', `Bearer ${modToken}`)
      .send({ role: 'ADMIN' });
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. IDOR — INSECURE DIRECT OBJECT REFERENCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('IDOR: cross-user data access', () => {
  it('/api/translations/mine only returns the authenticated user\'s translations', async () => {
    const token = tokenFor(CONTRIBUTOR);
    const myTranslation = { id: 'trans-1', contributor_id: CONTRIBUTOR.id, translated_text: 'my text' };
    const otherTranslation = { id: 'trans-2', contributor_id: 'other-user', translated_text: 'other text' };
    prismaMock.translation.findMany.mockResolvedValue([myTranslation]);
    const res = await request(app).get('/api/translations/mine')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Verify the query was scoped to this user
    const callArgs = prismaMock.translation.findMany.mock.calls[0][0];
    expect(callArgs.where.contributor_id).toBe(CONTRIBUTOR.id);
    // The other user's translation must not appear in the response
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(otherTranslation.translated_text);
  });

  it('CONTRIBUTOR cannot access admin user detail endpoint to view another user', async () => {
    const token = tokenFor(CONTRIBUTOR);
    const res = await request(app).get(`/api/admin/users/${ADMIN_USER.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PUBLIC vs PROTECTED ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Public endpoints: accessible without auth', () => {
  beforeEach(() => {
    prismaMock.language.findMany.mockResolvedValue([{ id: '1', value: 'kpelle', label: 'Kpelle', is_active: true }]);
  });

  it('GET /api/languages → 200 (public)', async () => {
    const res = await request(app).get('/api/languages');
    expect(res.status).toBe(200);
  });

  it('GET /api/health → 200 (public)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('GET /api/contributors → 200 (public)', async () => {
    prismaMock.contributor.findMany.mockResolvedValue([]);
    prismaMock.contributor.count.mockResolvedValue(0);
    const res = await request(app).get('/api/contributors');
    expect(res.status).toBe(200);
  });

  it('GET /api/campaigns → 200 (public)', async () => {
    prismaMock.campaign.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/campaigns');
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ADMIN PROMOTE ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin promote endpoint', () => {
  it('CONTRIBUTOR cannot call POST /api/auth/promote', async () => {
    const token = tokenFor(CONTRIBUTOR);
    const res = await request(app).post('/api/auth/promote')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'victim@example.com' });
    expect(res.status).toBe(403);
  });

  it('SUPER_ADMIN can call POST /api/auth/promote (controller requires SUPER_ADMIN beyond requireAdmin)', async () => {
    const token = tokenFor(SUPER_ADMIN);
    prismaMock.contributor.findUnique.mockResolvedValue(CONTRIBUTOR);
    prismaMock.contributor.update.mockResolvedValue({ ...CONTRIBUTOR, is_admin: true });
    prismaMock.auditLog.create.mockResolvedValue({});
    const res = await request(app).post('/api/auth/promote')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: CONTRIBUTOR.email });
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});
