// Jest auto-mock for uuid — replaces the ESM-only uuid@14 package in all tests.
// Node 15+ built-in crypto.randomUUID() is CJS-compatible and cryptographically sound.
const crypto = require('crypto');

module.exports = {
  v4: () => crypto.randomUUID(),
};
