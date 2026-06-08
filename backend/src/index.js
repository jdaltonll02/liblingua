require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const path         = require('path');

const { initSentry, getSentryMiddleware } = require('./utils/sentry');
const logger         = require('./utils/logger');
const activityLogger = require('./middleware/activityLogger');

const authRoutes        = require('./routes/auth');
const sampleRoutes      = require('./routes/samples');
const translationRoutes = require('./routes/translations');
const exportRoutes      = require('./routes/export');
const statsRoutes       = require('./routes/stats');
const apiKeyRoutes      = require('./routes/apiKeys');
const datasetRoutes     = require('./routes/dataset');
const languageRoutes    = require('./routes/languages');
const contributorRoutes = require('./routes/contributors');
const userRoutes              = require('./routes/admin/users');
const auditRoutes             = require('./routes/admin/audit');
const adminManualTransRoutes  = require('./routes/admin/manualTranslation');
const ticketRoutes      = require('./routes/tickets');
const donationRoutes    = require('./routes/donations');
const campaignRoutes    = require('./routes/campaigns');
const badgeRoutes       = require('./routes/badges');
const { authLimiter, translationLimiter, generalLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust the first proxy (nginx) so express-rate-limit can read the real
// client IP from X-Forwarded-For instead of throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set('trust proxy', 1);

// Initialize Sentry early
initSentry();
const [sentryRequest, sentryError] = getSentryMiddleware();
app.use(sentryRequest);

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: ['text/csv', 'text/plain'] }));

// ── Security headers ──────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'"
  );
  next();
});

// ── Activity logging (before routes so every request is captured) ─────────────
app.use(activityLogger);

// Serve uploaded audio files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         authLimiter,        authRoutes);
app.use('/api/samples',      generalLimiter,     sampleRoutes);
app.use('/api/translations', translationLimiter, translationRoutes);
app.use('/api/export',       generalLimiter,     exportRoutes);
app.use('/api/stats',        generalLimiter,     statsRoutes);
app.use('/api/keys',         generalLimiter,     apiKeyRoutes);
app.use('/api/dataset',      generalLimiter,     datasetRoutes);
app.use('/api/languages',    generalLimiter,     languageRoutes);
app.use('/api/contributors', generalLimiter,     contributorRoutes);
app.use('/api/admin/users',               generalLimiter, userRoutes);
app.use('/api/admin/audit-logs',          generalLimiter, auditRoutes);
app.use('/api/admin/manual-translations', generalLimiter, adminManualTransRoutes);
app.use('/api/tickets',      generalLimiter,     ticketRoutes);
app.use('/api/donations',    generalLimiter,     donationRoutes);
app.use('/api/campaigns',    generalLimiter,     campaignRoutes);
app.use('/api/badges',       generalLimiter,     badgeRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn('not_found', { method: req.method, path: req.path });
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(sentryError);

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  logger.error('unhandled_error', {
    status,
    code,
    message: err.message,
    stack:   err.stack,
    method:  req.method,
    path:    req.path,
    userId:  req.user?.id,
  });

  res.status(status).json({
    error: err.message || 'Internal server error',
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
// Guard so that importing this file in tests does not attempt to bind the port.
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    logger.info('server_start', { port: PORT, env: process.env.NODE_ENV || 'development' });
    logger.info(`Logs writing to: ${logger.logDir}`);
  });
}

module.exports = app;
