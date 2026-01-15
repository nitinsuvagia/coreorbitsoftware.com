/**
 * Master Database Client
 */

// Import from the Prisma generated client location at workspace root
import { PrismaClient, Prisma } from '../../../../node_modules/.prisma/master-client';

// Export as MasterPrismaClient to avoid name collision with tenant client
export { PrismaClient as MasterPrismaClient, Prisma as MasterPrisma };
export type MasterPrismaClientType = PrismaClient;

// Create singleton instance
export const masterPrisma = new PrismaClient();

// Helper function to get master prisma client
export function getMasterPrisma(): PrismaClient {
  return masterPrisma;
}
