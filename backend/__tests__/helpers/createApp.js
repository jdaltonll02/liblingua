'use strict';

/**
 * Builds a fresh Express app that mirrors index.js (minus app.listen and Sentry)
 * for use in security tests. Call once per test suite in beforeAll().
 *
 * Prisma and email must be mocked BEFORE calling createApp — jest.mock() hoisting
 * ensures the mocks are in place when the routes are first required.
 */

process.env.NODE_ENV  = 'test';
process.env.FRONTEND_URL = 'http://localhost:3000';
// Use the library's fallback secret so signToken/verifyToken work without extra setup
// (jwt.js: const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me')
process.env.JWT_SECRET = 'dev-secret-change-me';

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes        = require('../../src/routes/auth');
const sampleRoutes      = require('../../src/routes/samples');
const translationRoutes = require('../../src/routes/translations');
const exportRoutes      = require('../../src/routes/export');
const statsRoutes       = require('../../src/routes/stats');
const apiKeyRoutes      = require('../../src/routes/apiKeys');
const datasetRoutes     = require('../../src/routes/dataset');
const languageRoutes    = require('../../src/routes/languages');
const contributorRoutes = require('../../src/routes/contributors');
const userRoutes        = require('../../src/routes/admin/users');
const auditRoutes       = require('../../src/routes/admin/audit');
const ticketRoutes      = require('../../src/routes/tickets');
const campaignRoutes    = require('../../src/routes/campaigns');
const badgeRoutes       = require('../../src/routes/badges');

const {
  authLimiter,
  translationLimiter,
  generalLimiter,
  exportLimiter,
} = require('../../src/middleware/rateLimiter');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(cors({ origin: ['http://localhost:3000'], credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.text({ type: ['text/csv', 'text/plain'] }));

  // Security headers — exact replica of index.js
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    next();
  });

  app.use('/api/auth',                      authLimiter,        authRoutes);
  app.use('/api/samples',                   generalLimiter,     sampleRoutes);
  app.use('/api/translations',              translationLimiter, translationRoutes);
  app.use('/api/export',                    exportLimiter,      exportRoutes);
  app.use('/api/stats',                     generalLimiter,     statsRoutes);
  app.use('/api/keys',                      generalLimiter,     apiKeyRoutes);
  app.use('/api/dataset',                   generalLimiter,     datasetRoutes);
  app.use('/api/languages',                 generalLimiter,     languageRoutes);
  app.use('/api/contributors',              generalLimiter,     contributorRoutes);
  app.use('/api/admin/users',               generalLimiter,     userRoutes);
  app.use('/api/admin/audit-logs',          generalLimiter,     auditRoutes);
  app.use('/api/tickets',                   generalLimiter,     ticketRoutes);
  app.use('/api/campaigns',                 generalLimiter,     campaignRoutes);
  app.use('/api/badges',                    generalLimiter,     badgeRoutes);

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // 404 handler — must return JSON (mirrors index.js)
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler — mirrors index.js
  app.use((err, _req, res, _next) => {
    const multer = require('multer');
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: err.message });
    }
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
