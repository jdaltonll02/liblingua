const logger = require('./src/utils/logger');
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

// Prisma validates the datasource URL when modules are loaded, even in tests
// that never make a database query. Never fall back to the deployment database:
// integration tests opt in with an explicit TEST_DATABASE_URL, while unit tests
// receive a syntactically valid, unreachable local URL.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  || 'mysql://liblingua_test:liblingua_test@127.0.0.1:3307/liblingua_test';

beforeAll(() => {
  logger.transports.forEach((t) => { t.silent = true; });
  // Suppress expected SENTRY_DSN warning — not an error in test environment
});

afterAll(() => {
  logger.transports.forEach((t) => { t.silent = false; });
  consoleWarnSpy.mockRestore();
});
