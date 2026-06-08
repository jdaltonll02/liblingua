const request = require('supertest');
const app = require('../index');
const prisma = require('../utils/prisma');

const TEST_USER = {
  name: 'Test User',
  email: `test_${Date.now()}@example.com`,
  password: 'testpassword123',
  native_language: 'kpelle',
  region_of_origin: 'Bong County',
  age_group: '18_35',
  is_l1_speaker: true,
};

afterAll(async () => {
  await prisma.contributor.deleteMany({ where: { email: TEST_USER.email } });
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('creates a new contributor and returns 201', async () => {
    const res = await request(app).post('/api/auth/register').send(TEST_USER);
    expect(res.status).toBe(201);
    // dev mode: auto-verified, returns contributor
    // prod mode: returns email for verification
    const isDevMode = res.body.contributor !== undefined;
    if (isDevMode) {
      expect(res.body.contributor.email).toBe(TEST_USER.email);
    } else {
      expect(res.body.email).toBe(TEST_USER.email);
    }
  });

  it('returns 409 on duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(TEST_USER);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('returns 422 when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'bad@example.com' });
    expect(res.status).toBe(422);
    expect(res.body.details).toBeDefined();
  });

  it('returns 422 for invalid age_group', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...TEST_USER, email: 'other@example.com', age_group: 'baby' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns contributor on valid credentials (dev mode)', async () => {
    // Only testable when SMTP is not configured (dev mode auto-verifies)
    if (process.env.SMTP_HOST) return;
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });
    expect(res.status).toBe(200);
    expect(res.body.contributor.email).toBe(TEST_USER.email);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
