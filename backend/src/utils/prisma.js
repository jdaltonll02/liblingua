// Prisma's query engine starts one tokio worker thread per CPU core. On shared
// hosting (e.g. Hostinger: 48 cores, low per-account thread limit) it cannot
// spawn them and queries hang or panic ("timer has gone away"). Cap it before
// the engine loads; override with the TOKIO_WORKER_THREADS env var.
if (!process.env.TOKIO_WORKER_THREADS) process.env.TOKIO_WORKER_THREADS = '2';

const { PrismaClient } = require('@prisma/client');

// Pool size: default Prisma pool is num_cpus*2+1 which can exhaust under load.
// Explicit cap keeps connections predictable. Tune via env for larger deployments.
const POOL_SIZE = parseInt(process.env.DB_POOL_SIZE, 10) || 10;

function connectionUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;
  const separator = raw.includes('?') ? '&' : '?';
  return `${raw}${separator}connection_limit=${POOL_SIZE}&pool_timeout=30`;
}

const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl(),
    },
  },
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
