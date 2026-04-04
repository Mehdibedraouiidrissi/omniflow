// ============================================================================
// Omniflow - @omniflow/database
// PrismaClient singleton — safe for both serverless and long-running servers
// ============================================================================

import { PrismaClient } from '@prisma/client';

// Extend globalThis so HMR/hot-reload in dev doesn't create multiple instances
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
export default prisma;
