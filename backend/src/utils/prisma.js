const { PrismaClient } = require('@prisma/client');

// Pool size: default Prisma pool is num_cpus*2+1 which can exhaust under load.
// Explicit cap keeps connections predictable. Tune via env for larger deployments.
const POOL_SIZE = parseInt(process.env.DB_POOL_SIZE, 10) || 10;

const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: `${process.env.DATABASE_URL}?connection_limit=${POOL_SIZE}&pool_timeout=30`,
    },
  },
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
