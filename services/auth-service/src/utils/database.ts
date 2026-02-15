/**
 * Auth Service - Database Utilities
 */

// Import directly from Prisma generated client to avoid bundling issues
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { PrismaClient } = require('.prisma/master-client');
type PrismaClientType = InstanceType<typeof PrismaClient>;

import { config } from '../config';

let masterPrisma: PrismaClientType | null = null;

/**
 * Get master database Prisma client
 */
export function getMasterPrisma(): PrismaClientType {
  if (!masterPrisma) {
    masterPrisma = new PrismaClient({
      datasources: {
        db: { url: config.masterDatabaseUrl },
      },
      log: ['error'], // Only log errors to prevent infinite query loops
    });
  }
  return masterPrisma;
}

/**
 * Disconnect master database
 */
export async function disconnectMaster(): Promise<void> {
  if (masterPrisma) {
    await masterPrisma.$disconnect();
    masterPrisma = null;
  }
}

export default {
  getMasterPrisma,
  disconnectMaster,
};
