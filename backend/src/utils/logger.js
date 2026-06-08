const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Default: <project-root>/logs  — overrideable via LOG_DIR env var
const LOG_DIR = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : path.join(__dirname, '../../../logs');

// Ensure the directory exists at startup
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// ── File format: newline-delimited JSON ───────────────────────────────────────
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),   // include stack traces for Error objects
  json()
);

// ── Console format: readable one-liner ───────────────────────────────────────
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ timestamp, level, message, ...meta }) => {
    const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} [${level}] ${message}${extra}`;
  })
);

// ── Shared rotation options ───────────────────────────────────────────────────
const rotateBase = {
  dirname: LOG_DIR,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,   // gzip old files to save space
  maxSize: '20m',
};

const logger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  transports: [
    // Activity log — info, warn, http (everything except debug)
    new DailyRotateFile({
      ...rotateBase,
      filename: 'activity-%DATE%.log',
      level: 'http',
      maxFiles: '30d',
    }),
    // Error log — errors only, kept 90 days
    new DailyRotateFile({
      ...rotateBase,
      filename: 'error-%DATE%.log',
      level: 'error',
      maxFiles: '90d',
    }),
  ],
});

// Console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'http',
  }));
}

// Expose the resolved log directory so startup can print it
logger.logDir = LOG_DIR;

module.exports = logger;
