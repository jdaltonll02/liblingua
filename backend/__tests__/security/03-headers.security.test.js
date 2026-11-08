'use strict';

/**
 * Security Test Suite 3 — HTTP Security Headers & CORS
 *
 * Covers: X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy,
 * CORS origin whitelist, credentials not reflected to untrusted origins,
 * rate-limit headers presence, no server version leakage.
 */

jest.mock('../../src/utils/prisma', () => ({
  contributor:       { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  language:          { findMany: jest.fn() },
  campaign:          { findMany: jest.fn() },
  contributorBadge:  { findMany: jest.fn() },
  $queryRaw:         jest.fn(),
}));

jest.mock('../../src/services/emailService', () => ({
  sendVerificationEmail:    jest.fn(),
  sendPasswordResetEmail:   jest.fn(),
  sendEmailChangeVerification: jest.fn(),
  sendInvitationEmail:      jest.fn(),
}));

const request   = require('supertest');
const createApp = require('../helpers/createApp');
const prismaMock = require('../../src/utils/prisma');

let app;
beforeAll(() => {
  app = createApp();
  prismaMock.language.findMany.mockResolvedValue([]);
  prismaMock.contributor.findMany.mockResolvedValue([]);
  prismaMock.contributor.count.mockResolvedValue(0);
  prismaMock.campaign.findMany.mockResolvedValue([]);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SECURITY HEADERS — present on every response
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security headers: present on all responses', () => {
  const endpoints = [
    ['GET',  '/api/health'],
    ['GET',  '/api/languages'],
    ['GET',  '/api/contributors'],
    ['POST', '/api/auth/login'],
    ['GET',  '/api/stats'],
  ];

  endpoints.forEach(([method, path]) => {
    it(`${method} ${path} has X-Content-Type-Options: nosniff`, async () => {
      const res = await request(app)[method.toLowerCase()](path);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it(`${method} ${path} has X-Frame-Options: DENY`, async () => {
      const res = await request(app)[method.toLowerCase()](path);
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it(`${method} ${path} has Content-Security-Policy`, async () => {
      const res = await request(app)[method.toLowerCase()](path);
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });

    it(`${method} ${path} has Referrer-Policy`, async () => {
      const res = await request(app)[method.toLowerCase()](path);
      expect(res.headers['referrer-policy']).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SERVER INFORMATION LEAKAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Server information: no version leakage', () => {
  it('does not expose X-Powered-By header', async () => {
    const res = await request(app).get('/api/health');
    // Express sets this by default unless explicitly removed
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CORS — ORIGIN WHITELIST
// ═══════════════════════════════════════════════════════════════════════════════

describe('CORS: origin enforcement', () => {
  it('reflects Access-Control-Allow-Origin for the allowed origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('does NOT reflect ACAO for a disallowed origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil-attacker.com');
    // Should either be absent or not equal to the evil origin
    const acao = res.headers['access-control-allow-origin'];
    expect(acao).not.toBe('https://evil-attacker.com');
  });

  it('does NOT set Access-Control-Allow-Credentials for untrusted origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil-attacker.com');
    // If ACAO is not the evil origin, ACAC doesn't matter, but verify it's not "true" with wrong origin
    const acao  = res.headers['access-control-allow-origin'];
    const acac  = res.headers['access-control-allow-credentials'];
    if (acao === 'https://evil-attacker.com') {
      // This would be a vulnerability — ACAO must not echo untrusted origins when credentials are enabled
      expect(acac).not.toBe('true');
    }
    // If acao is not the evil origin, we pass
  });

  it('OPTIONS preflight from disallowed origin does not reflect that origin', async () => {
    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'https://evil.com')
      .set('Access-Control-Request-Method', 'POST');
    const acao = res.headers['access-control-allow-origin'];
    expect(acao).not.toBe('https://evil.com');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. RATE-LIMIT HEADERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rate limiting: headers present', () => {
  it('auth endpoints include RateLimit headers', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'x@x.com', password: 'pass' });
    // express-rate-limit with standardHeaders: true sets RateLimit-* headers
    const hasRateLimitHeader =
      res.headers['ratelimit-limit'] !== undefined ||
      res.headers['ratelimit-remaining'] !== undefined ||
      res.headers['x-ratelimit-limit'] !== undefined;
    expect(hasRateLimitHeader).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 404 ERRORS DON'T LEAK STACK TRACES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Error responses: no stack trace leakage', () => {
  it('unknown route returns JSON, not HTML with stack trace', async () => {
    const res = await request(app).get('/api/does-not-exist');
    // Should be 404 and not contain a stack trace
    expect(res.headers['content-type']).toMatch(/application\/json/);
    if (res.body) {
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('at Object.<anonymous>');
      expect(body).not.toContain('node_modules');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CSP FRAME-ANCESTORS PREVENTS CLICKJACKING
// ═══════════════════════════════════════════════════════════════════════════════

describe('Clickjacking prevention', () => {
  it("CSP contains frame-ancestors 'none'", async () => {
    const res = await request(app).get('/api/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('X-Frame-Options is DENY', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });
});
