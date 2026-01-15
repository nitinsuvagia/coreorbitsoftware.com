/**
 * Tenant DB Manager - Main Export
 */

// Configuration
export { 
  TenantDbConfig, 
  defaultConfig,
  getDefaultConfig,
  buildTenantDatabaseUrl,
  TenantConnectionInfo,
} from './config';

// Manager
export {
  TenantDbManager,
  TenantLookupResult,
  TenantNotFoundError,
  TenantSuspendedError,
  DatabaseConnectionError,
  TenantSeedData,
  TenantDbManagerStats,
  getTenantDbManager,
  resetTenantDbManager,
  initializeTenantDbManager,
  shutdownTenantDbManager,
} from './manager';

// Context
export {
  TenantContext,
  getTenantContext,
  getTenantContextOrNull,
  getTenantPrisma,
  getCurrentTenantId,
  getCurrentTenantSlug,
  runWithTenantContext,
  runWithTenantContextById,
  createTenantContext,
  runInTenantContext,
} from './context';
