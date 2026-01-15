/**
 * Tenant Database Manager - Configuration
 * 
 * Configuration for database connections, pooling, and caching
 */

export interface TenantDbConfig {
  // Master Database
  masterDatabaseUrl: string;
  
  // Tenant Database Template
  tenantDbHost: string;
  tenantDbPort: number;
  tenantDbUser: string;
  tenantDbPassword: string;
  tenantDbPrefix: string;      // e.g., "oms_tenant_"
  
  // Connection Pool
  poolMin: number;
  poolMax: number;
  poolIdleTimeoutMs: number;
  poolAcquireTimeoutMs: number;
  
  // Cache
  cacheMaxSize: number;        // Max number of tenant connections to cache
  cacheTtlMs: number;          // TTL for cached connections
  
  // SSL
  sslEnabled: boolean;
  sslCa?: string;
  sslCert?: string;
  sslKey?: string;
}

/**
 * Get default configuration - evaluated at runtime to ensure env vars are loaded
 */
export function getDefaultConfig(): TenantDbConfig {
  return {
    masterDatabaseUrl: process.env.MASTER_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/oms_master',
    
    tenantDbHost: process.env.TENANT_DB_HOST || 'localhost',
    tenantDbPort: parseInt(process.env.TENANT_DB_PORT || '5432'),
    tenantDbUser: process.env.TENANT_DB_USER || 'postgres',
    tenantDbPassword: process.env.TENANT_DB_PASSWORD || 'password',
    tenantDbPrefix: process.env.TENANT_DB_PREFIX || 'oms_tenant_',
    
    poolMin: parseInt(process.env.POOL_MIN || '2'),
    poolMax: parseInt(process.env.POOL_MAX || '10'),
    poolIdleTimeoutMs: parseInt(process.env.POOL_IDLE_TIMEOUT_MS || '30000'),
    poolAcquireTimeoutMs: parseInt(process.env.POOL_ACQUIRE_TIMEOUT_MS || '10000'),
    
    cacheMaxSize: parseInt(process.env.CACHE_MAX_SIZE || '100'),
    cacheTtlMs: parseInt(process.env.CACHE_TTL_MS || '3600000'), // 1 hour
    
    sslEnabled: process.env.DB_SSL_ENABLED === 'true',
    sslCa: process.env.DB_SSL_CA,
    sslCert: process.env.DB_SSL_CERT,
    sslKey: process.env.DB_SSL_KEY,
  };
}

/**
 * Default configuration - always returns fresh config reading current env vars
 */
export const defaultConfig: TenantDbConfig = {
  get masterDatabaseUrl() { return process.env.MASTER_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/oms_master'; },
  get tenantDbHost() { return process.env.TENANT_DB_HOST || 'localhost'; },
  get tenantDbPort() { return parseInt(process.env.TENANT_DB_PORT || '5432'); },
  get tenantDbUser() { return process.env.TENANT_DB_USER || 'postgres'; },
  get tenantDbPassword() { return process.env.TENANT_DB_PASSWORD || 'password'; },
  get tenantDbPrefix() { return process.env.TENANT_DB_PREFIX || 'oms_tenant_'; },
  get poolMin() { return parseInt(process.env.POOL_MIN || '2'); },
  get poolMax() { return parseInt(process.env.POOL_MAX || '10'); },
  get poolIdleTimeoutMs() { return parseInt(process.env.POOL_IDLE_TIMEOUT_MS || '30000'); },
  get poolAcquireTimeoutMs() { return parseInt(process.env.POOL_ACQUIRE_TIMEOUT_MS || '10000'); },
  get cacheMaxSize() { return parseInt(process.env.CACHE_MAX_SIZE || '100'); },
  get cacheTtlMs() { return parseInt(process.env.CACHE_TTL_MS || '3600000'); },
  get sslEnabled() { return process.env.DB_SSL_ENABLED === 'true'; },
  get sslCa() { return process.env.DB_SSL_CA; },
  get sslCert() { return process.env.DB_SSL_CERT; },
  get sslKey() { return process.env.DB_SSL_KEY; },
};

/**
 * Build tenant database URL
 */
export function buildTenantDatabaseUrl(
  tenantSlug: string,
  config: TenantDbConfig = defaultConfig
): string {
  const databaseName = `${config.tenantDbPrefix}${tenantSlug}`;
  
  let url = `postgresql://${config.tenantDbUser}:${encodeURIComponent(config.tenantDbPassword)}`;
  url += `@${config.tenantDbHost}:${config.tenantDbPort}/${databaseName}`;
  
  const params: string[] = [];
  
  if (config.sslEnabled) {
    params.push('sslmode=require');
  }
  
  params.push(`connection_limit=${config.poolMax}`);
  params.push(`pool_timeout=${Math.floor(config.poolAcquireTimeoutMs / 1000)}`);
  
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  
  return url;
}

/**
 * Tenant connection info
 */
export interface TenantConnectionInfo {
  tenantId: string;
  tenantSlug: string;
  databaseName: string;
  databaseUrl: string;
  createdAt: Date;
  lastAccessedAt: Date;
}

export default {
  defaultConfig,
  buildTenantDatabaseUrl,
};
