const Sentry = require('@sentry/node');

function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not set. Error tracking disabled.');
    return false;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({
        request: true,
        serverName: true,
        transaction: 'path',
      }),
    ],
    beforeSend(event, hint) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Sentry Event:', event);
      }
      return event;
    },
  });
  return true;
}

function getSentryMiddleware() {
  const isSentryEnabled = process.env.SENTRY_DSN ? true : false;

  if (isSentryEnabled) {
    return [
      Sentry.Handlers.requestHandler(),
      Sentry.Handlers.errorHandler(),
    ];
  }

  return [
    (req, res, next) => next(),
    (err, req, res, next) => next(err),
  ];
}

module.exports = { initSentry, getSentryMiddleware };

