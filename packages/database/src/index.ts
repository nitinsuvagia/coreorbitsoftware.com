/**
 * Database Package - Prisma Clients Export
 */

// Re-export Prisma clients
export * from './master';
export * from './tenant';

// Re-export tenant utilities from tenant-db-manager for convenience
// This allows services to import getTenantPrisma from either package
export { 
  getTenantDbManager,
  TenantDbManager,
  TenantNotFoundError,
  TenantSuspendedError,
  DatabaseConnectionError,
} from '@oms/tenant-db-manager';

/**
 * Get Prisma client for a tenant by slug
 * Convenience function that uses the singleton TenantDbManager
 */
export async function getTenantPrisma(tenantSlug: string): Promise<any> {
  const { getTenantDbManager } = await import('@oms/tenant-db-manager');
  const manager = getTenantDbManager();
  return manager.getClientBySlug(tenantSlug);
}
