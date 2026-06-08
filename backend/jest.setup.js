const logger = require('./src/utils/logger');

beforeAll(() => {
  logger.transports.forEach((t) => { t.silent = true; });
  // Suppress expected SENTRY_DSN warning — not an error in test environment
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  logger.transports.forEach((t) => { t.silent = false; });
  jest.restoreAllMocks();
});
