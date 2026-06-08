const request = require('supertest');
const app = require('../index');
const prisma = require('../utils/prisma');
const { signToken } = require('../utils/jwt');

let contributorId;
let sampleId;
let authCookie;

beforeAll(async () => {
  // Ensure languages exist
  const langs = ['kpelle', 'bassa', 'grebo', 'vai', 'mende', 'loma', 'krahn', 'dan'];
  for (const value of langs) {
    await prisma.language.upsert({
      where:  { value },
      update: {},
      create: { value, label: value.charAt(0).toUpperCase() + value.slice(1), sort_order: langs.indexOf(value) + 1 },
    });
  }

  // Create a test contributor (pre-verified)
  const bcrypt = require('bcryptjs');
  const contributor = await prisma.contributor.create({
    data: {
      name:               'Sample Tester',
      email:              `sampletest_${Date.now()}@example.com`,
      password_hash:      await bcrypt.hash('testpass123', 10),
      native_language:    'kpelle',
      region_of_origin:   'Bong County',
      age_group:          'age_18_35',
      is_l1_speaker:      true,
      email_verified:     true,
      is_profile_complete: true,
    },
  });
  contributorId = contributor.id;

  // Sign a JWT and pack it into a cookie
  const token = signToken({ id: contributor.id, email: contributor.email, is_admin: false, role: 'CONTRIBUTOR', is_active: true });
  authCookie = `token=${token}`;

  // Create a test sample
  const sample = await prisma.englishSample.create({
    data: {
      text:       `Test sentence ${Date.now()}`,
      domain:     'general',
      difficulty: 'easy',
    },
  });
  sampleId = sample.id;
});

afterAll(async () => {
  await prisma.translation.deleteMany({ where: { contributor_id: contributorId } });
  await prisma.englishSample.delete({ where: { id: sampleId } }).catch(() => {});
  await prisma.contributor.delete({ where: { id: contributorId } }).catch(() => {});
  await prisma.$disconnect();
});

// ── Samples ───────────────────────────────────────────────────────────────────

describe('GET /api/samples/random', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/samples/random?language=kpelle');
    expect(res.status).toBe(401);
  });

  it('returns 400 for unknown language', async () => {
    const res = await request(app)
      .get('/api/samples/random?language=elvish')
      .set('Cookie', authCookie);
    expect(res.status).toBe(400);
  });

  it('returns a sample for a valid language', async () => {
    const res = await request(app)
      .get('/api/samples/random?language=kpelle')
      .set('Cookie', authCookie);
    // 200 with sample OR 404 if DB is empty — both are valid
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.text).toBeDefined();
      expect(res.body.is_gold_standard).toBeUndefined(); // must be stripped
    }
  });
});

describe('GET /api/samples/:id', () => {
  it('returns the sample by ID', async () => {
    const res = await request(app)
      .get(`/api/samples/${sampleId}`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(sampleId);
  });

  it('returns 404 for non-existent ID', async () => {
    const res = await request(app)
      .get('/api/samples/00000000-0000-0000-0000-000000000000')
      .set('Cookie', authCookie);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/samples/progress', () => {
  it('returns progress data for a valid language', async () => {
    const res = await request(app)
      .get('/api/samples/progress?language=kpelle')
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: expect.any(Number), remaining: expect.any(Number) });
  });
});

// ── Translations ──────────────────────────────────────────────────────────────

describe('POST /api/translations', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/translations').send({});
    expect(res.status).toBe(401);
  });

  it('submits a translation successfully', async () => {
    const res = await request(app)
      .post('/api/translations')
      .set('Cookie', authCookie)
      .field('sample_id', sampleId)
      .field('target_language', 'kpelle')
      .field('translated_text', 'Kpuu test sentence kpelle.');
    expect(res.status).toBe(201);
    expect(res.body.translation.target_language).toBe('kpelle');
  });

  it('returns 409 on duplicate submission', async () => {
    const res = await request(app)
      .post('/api/translations')
      .set('Cookie', authCookie)
      .field('sample_id', sampleId)
      .field('target_language', 'kpelle')
      .field('translated_text', 'Duplicate attempt.');
    expect(res.status).toBe(409);
  });
});

describe('GET /api/translations/mine', () => {
  it('returns translations for the authenticated user', async () => {
    const res = await request(app)
      .get('/api/translations/mine')
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
