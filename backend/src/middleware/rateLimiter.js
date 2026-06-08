const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

// Strict limiter for auth endpoints — prevents credential stuffing and fake registrations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please wait 15 minutes and try again.' },
});

// Moderate limiter for translation submission — prevents bulk spam
// A real contributor translates maybe 30–60 sentences per session
const translationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Translation rate limit reached. Please slow down.' },
});

// Light limiter for general API reads
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// Strict limiter for export endpoints — prevents bulk data scraping
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 500 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Export rate limit reached. Please wait before exporting again.' },
});

module.exports = { authLimiter, translationLimiter, generalLimiter, exportLimiter };
