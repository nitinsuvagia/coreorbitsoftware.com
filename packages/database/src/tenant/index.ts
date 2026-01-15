/**
 * Tenant Database Client
 */

// Import from the Prisma generated client location at workspace root
import { PrismaClient, Prisma } from '../../../../node_modules/.prisma/tenant-client';

// Export as TenantPrismaClient to avoid name collision with master client
export { PrismaClient as TenantPrismaClient, Prisma as TenantPrisma };
export type TenantPrismaClientType = PrismaClient;

// Create singleton instance
export const tenantPrisma = new PrismaClient();
