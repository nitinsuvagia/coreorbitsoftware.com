/**
 * Tenant Database Manager
 * 
 * Manages dynamic database connections for multi-tenant architecture.
 * - Caches Prisma client instances per tenant
 * - Handles connection pooling
 * - Provides tenant context for requests
 */

import { LRUCache } from 'lru-cache';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { 
  TenantDbConfig, 
  getDefaultConfig, 
  buildTenantDatabaseUrl,
  TenantConnectionInfo 
} from './config';

// Import Prisma clients directly - these are generated and available at runtime
// @ts-ignore - These are generated at build time
import { PrismaClient as TenantPrismaClientClass } from '.prisma/tenant-client';
// @ts-ignore - These are generated at build time  
import { PrismaClient as MasterPrismaClientClass } from '.prisma/master-client';

// ============================================================================
// TYPES
// ============================================================================

// Generic Prisma client interface for type safety
type PrismaClient = any;

/**
 * Get the tenant Prisma client class
 * This is loaded dynamically at runtime after Prisma generate has run
 */
function getTenantPrismaClientClass(): new (options?: any) => PrismaClient {
  return TenantPrismaClientClass;
}

/**
 * Get the master Prisma client class
 */
function getMasterPrismaClientClass(): new (options?: any) => PrismaClient {
  return MasterPrismaClientClass;
}

/**
 * Tenant Prisma Client with metadata
 */
interface TenantPrismaClientWrapper {
  client: PrismaClient;
  info: TenantConnectionInfo;
}

/**
 * Tenant lookup result from master database
 */
export interface TenantLookupResult {
  id: string;
  slug: string;
  name: string;
  status: string;
  databaseName: string;
  databaseHost?: string | null;
  databasePort?: number | null;
}

/**
 * Tenant not found error
 */
export class TenantNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Tenant not found: ${identifier}`);
    this.name = 'TenantNotFoundError';
  }
}

/**
 * Tenant suspended error
 */
export class TenantSuspendedError extends Error {
  constructor(tenantSlug: string) {
    super(`Tenant is suspended: ${tenantSlug}`);
    this.name = 'TenantSuspendedError';
  }
}

/**
 * Database connection error
 */
export class DatabaseConnectionError extends Error {
  constructor(tenantSlug: string, cause?: Error) {
    super(`Failed to connect to tenant database: ${tenantSlug}`);
    this.name = 'DatabaseConnectionError';
    this.cause = cause;
  }
}

// ============================================================================
// TENANT DATABASE MANAGER
// ============================================================================

export class TenantDbManager {
  private config: TenantDbConfig;
  private masterClient: PrismaClient | null = null;
  private tenantCache: LRUCache<string, TenantPrismaClientWrapper>;
  private tenantLookupCache: LRUCache<string, TenantLookupResult>;
  
  constructor(config: Partial<TenantDbConfig> = {}) {
    // Get fresh default config at construction time (after dotenv has loaded)
    const freshDefaultConfig = getDefaultConfig();
    this.config = { ...freshDefaultConfig, ...config };
    
    // Initialize tenant client cache
    this.tenantCache = new LRUCache<string, TenantPrismaClientWrapper>({
      max: this.config.cacheMaxSize,
      ttl: this.config.cacheTtlMs,
      dispose: async (value) => {
        // Disconnect Prisma client when evicted from cache
        try {
          await value.client.$disconnect();
        } catch (error) {
          console.error(`Error disconnecting tenant client: ${value.info.tenantSlug}`, error);
        }
      },
    });
    
    // Initialize tenant lookup cache (5 minute TTL)
    this.tenantLookupCache = new LRUCache<string, TenantLookupResult>({
      max: 500,
      ttl: 5 * 60 * 1000,
    });
  }
  
  // ==========================================================================
  // MASTER DATABASE
  // ==========================================================================
  
  /**
   * Get master database client
   */
  getMasterClient(): PrismaClient {
    if (!this.masterClient) {
      // Always read masterDatabaseUrl fresh from env
      const masterUrl = process.env.MASTER_DATABASE_URL || this.config.masterDatabaseUrl || 'postgresql://postgres:password@localhost:5432/oms_master';
      const MasterPrismaClient = getMasterPrismaClientClass();
      this.masterClient = new MasterPrismaClient({
        datasources: {
          db: { url: masterUrl },
        },
        log: ['error'], // Only errors to prevent query spam
      });
    }
    return this.masterClient;
  }
  
  // ==========================================================================
  // TENANT LOOKUP
  // ==========================================================================
  
  /**
   * Look up tenant by slug from master database
   * @param slug - Tenant slug
   * @param options - Optional settings
   * @param options.verifyIfSuspended - If true and cached status is SUSPENDED, verify against database
   */
  async getTenantBySlug(slug: string, options?: { verifyIfSuspended?: boolean }): Promise<TenantLookupResult> {
    // Check cache first
    const cached = this.tenantLookupCache.get(`slug:${slug}`);
    if (cached) {
      // If requested and tenant appears suspended, verify against database
      // This prevents stale cache from blocking logins after reactivation
      if (options?.verifyIfSuspended && (cached.status === 'SUSPENDED' || cached.status === 'TERMINATED')) {
        return this.refreshTenantStatus(slug);
      }
      return cached;
    }
    
    const master = this.getMasterClient();
    
    // Query master database for tenant
    const tenant = await (master as any).tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        databaseName: true,
        databaseHost: true,
        databasePort: true,
      },
    });
    
    if (!tenant) {
      throw new TenantNotFoundError(slug);
    }
    
    // Cache the result
    this.tenantLookupCache.set(`slug:${slug}`, tenant);
    this.tenantLookupCache.set(`id:${tenant.id}`, tenant);
    
    return tenant;
  }
  
  /**
   * Look up tenant by ID from master database
   */
  async getTenantById(id: string): Promise<TenantLookupResult> {
    // Check cache first
    const cached = this.tenantLookupCache.get(`id:${id}`);
    if (cached) {
      return cached;
    }
    
    const master = this.getMasterClient();
    
    const tenant = await (master as any).tenant.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        databaseName: true,
        databaseHost: true,
        databasePort: true,
      },
    });
    
    if (!tenant) {
      throw new TenantNotFoundError(id);
    }
    
    // Cache the result
    this.tenantLookupCache.set(`slug:${tenant.slug}`, tenant);
    this.tenantLookupCache.set(`id:${id}`, tenant);
    
    return tenant;
  }
  
  // ==========================================================================
  // TENANT DATABASE CONNECTIONS
  // ==========================================================================
  
  /**
   * Get Prisma client for a tenant by slug
   * @param slug - Tenant slug
   * @param options - Optional settings
   * @param options.skipStatusCheck - If true, don't throw error for suspended/terminated tenants
   */
  async getClientBySlug(slug: string, options?: { skipStatusCheck?: boolean }): Promise<PrismaClient> {
    // Check if we already have a cached client
    const cached = this.tenantCache.get(slug);
    if (cached) {
      // Update last accessed time
      cached.info.lastAccessedAt = new Date();
      return cached.client;
    }
    
    // Look up tenant in master database
    let tenant = await this.getTenantBySlug(slug);
    
    // Check tenant status (unless bypassed for reactivation)
    if (!options?.skipStatusCheck && (tenant.status === 'SUSPENDED' || tenant.status === 'TERMINATED')) {
      // Verify against database directly in case cache is stale
      // This prevents false rejections after reactivation when cache invalidation fails
      const freshTenant = await this.refreshTenantStatus(slug);
      if (freshTenant.status === 'ACTIVE' || freshTenant.status === 'TRIAL') {
        tenant = freshTenant;
      } else {
        throw new TenantSuspendedError(slug);
      }
    }
    
    // Create new Prisma client for this tenant
    return this.createTenantClient(tenant);
  }
  
  /**
   * Refresh tenant status from database (bypasses cache)
   */
  private async refreshTenantStatus(slug: string): Promise<TenantLookupResult> {
    const master = this.getMasterClient();
    
    const tenant = await (master as any).tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        databaseName: true,
        databaseHost: true,
        databasePort: true,
      },
    });
    
    if (!tenant) {
      throw new TenantNotFoundError(slug);
    }
    
    // Update cache with fresh data
    this.tenantLookupCache.set(`slug:${slug}`, tenant);
    this.tenantLookupCache.set(`id:${tenant.id}`, tenant);
    
    return tenant;
  }
  
  /**
   * Get Prisma client for a tenant by ID
   */
  async getClientById(tenantId: string): Promise<PrismaClient> {
    // Look up tenant first
    const tenant = await this.getTenantById(tenantId);
    
    // Check cache using slug
    const cached = this.tenantCache.get(tenant.slug);
    if (cached) {
      cached.info.lastAccessedAt = new Date();
      return cached.client;
    }
    
    // Check tenant status
    if (tenant.status === 'SUSPENDED' || tenant.status === 'TERMINATED') {
      throw new TenantSuspendedError(tenant.slug);
    }
    
    return this.createTenantClient(tenant);
  }
  
  /**
   * Create a new Prisma client for a tenant
   */
  private async createTenantClient(tenant: TenantLookupResult): Promise<PrismaClient> {
    // Build database URL
    const databaseUrl = this.buildDatabaseUrl(tenant);
    
    try {
      // Get the tenant Prisma client class dynamically
      const TenantPrismaClient = getTenantPrismaClientClass();
      
      // Create Prisma client
      const client = new TenantPrismaClient({
        datasources: {
          db: { url: databaseUrl },
        },
        log: ['error'], // Only errors to prevent query spam
      });
      
      // Test connection
      await client.$connect();
      
      // Cache the client
      const connectionInfo: TenantConnectionInfo = {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        databaseName: tenant.databaseName,
        databaseUrl,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };
      
      this.tenantCache.set(tenant.slug, {
        client,
        info: connectionInfo,
      });
      
      return client;
      
    } catch (error) {
      throw new DatabaseConnectionError(tenant.slug, error as Error);
    }
  }
  
  /**
   * Build database URL for a tenant
   */
  private buildDatabaseUrl(tenant: TenantLookupResult): string {
    // If tenant has custom database host, use it
    if (tenant.databaseHost) {
      const port = tenant.databasePort || this.config.tenantDbPort;
      let url = `postgresql://${this.config.tenantDbUser}:${encodeURIComponent(this.config.tenantDbPassword)}`;
      url += `@${tenant.databaseHost}:${port}/${tenant.databaseName}`;
      
      if (this.config.sslEnabled) {
        url += '?sslmode=require';
      }
      
      return url;
    }
    
    // Use default configuration
    return buildTenantDatabaseUrl(tenant.slug, this.config);
  }
  
  // ==========================================================================
  // TENANT DATABASE PROVISIONING
  // ==========================================================================
  
  /**
   * Create a new database for a tenant
   * Called during tenant onboarding
   */
  async createTenantDatabase(tenantSlug: string): Promise<string> {
    const databaseName = `${this.config.tenantDbPrefix}${tenantSlug}`;
    const master = this.getMasterClient();
    
    // Use raw query to create database
    // Note: This needs to be executed with admin privileges
    await master.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
    
    return databaseName;
  }
  
  /**
   * Run migrations on a tenant database
   */
  async migrateTenantDatabase(tenantSlug: string): Promise<void> {
    const execAsync = promisify(exec);
    
    // Build the tenant database URL
    const databaseName = `${this.config.tenantDbPrefix}${tenantSlug}`;
    let databaseUrl = `postgresql://${this.config.tenantDbUser}:${encodeURIComponent(this.config.tenantDbPassword)}`;
    databaseUrl += `@${this.config.tenantDbHost}:${this.config.tenantDbPort}/${databaseName}`;
    
    // Find the tenant schema directory
    // In Docker, this should be in the node_modules or a mounted volume
    const schemaPath = path.resolve(__dirname, '../../database/prisma/tenant/schema.prisma');
    const altSchemaPath = '/app/packages/database/prisma/tenant/schema.prisma';
    
    // Try different schema paths for local dev vs Docker
    const schemaPaths = [
      schemaPath,
      altSchemaPath,
      path.resolve(process.cwd(), 'packages/database/prisma/tenant/schema.prisma'),
      path.resolve(process.cwd(), 'node_modules/@oms/database/prisma/tenant/schema.prisma'),
    ];
    
    let schemaFound = false;
    let usedSchemaPath = '';
    
    for (const sp of schemaPaths) {
      try {
        const { existsSync } = await import('fs');
        if (existsSync(sp)) {
          usedSchemaPath = sp;
          schemaFound = true;
          break;
        }
      } catch {
        // Continue to next path
      }
    }
    
    if (!schemaFound) {
      console.error('Could not find tenant schema.prisma in any of:', schemaPaths);
      throw new Error('Tenant schema not found. Please ensure @oms/database is properly installed.');
    }
    
    // Run prisma db push to create schema
    try {
      const { stdout, stderr } = await execAsync(
        `npx prisma db push --schema="${usedSchemaPath}" --skip-generate --accept-data-loss`,
        {
          env: {
            ...process.env,
            TENANT_DATABASE_URL: databaseUrl,
          },
          timeout: 60000, // 60 second timeout
        }
      );
    } catch (error: any) {
      console.error(`Failed to migrate tenant database: ${error.message}`);
      if (error.stdout) console.error(`stdout: ${error.stdout}`);
      if (error.stderr) console.error(`stderr: ${error.stderr}`);
      throw new Error(`Failed to run database migrations: ${error.message}`);
    }
  }
  
  /**
   * Seed initial data for a tenant
   */
  async seedTenantDatabase(tenantSlug: string, seedData: TenantSeedData): Promise<void> {
    const client = await this.getClientBySlug(tenantSlug);
    
    // Create default roles
    await this.createDefaultRoles(client);
    
    // Create default departments
    await this.createDefaultDepartments(client);
    
    // Create default designations
    await this.createDefaultDesignations(client);
    
    // Create admin user (after departments exist)
    await this.createAdminUser(client, seedData);
  }
  
  private async createDefaultDepartments(client: PrismaClient): Promise<void> {
    const departments = [
      { name: 'Engineering', code: 'ENG', description: 'Software development, architecture, and DevOps' },
      { name: 'Product', code: 'PROD', description: 'Product management and UX/UI design' },
      { name: 'Quality Assurance', code: 'QA', description: 'Testing, automation, and quality control' },
      { name: 'Human Resources', code: 'HR', description: 'Recruitment, employee relations, and payroll' },
      { name: 'Finance & Accounts', code: 'FIN', description: 'Accounting, budgeting, and financial planning' },
      { name: 'Operations', code: 'OPS', description: 'IT infrastructure, facilities, and administration' },
      { name: 'Sales', code: 'SALES', description: 'Business development and client acquisition' },
      { name: 'Marketing', code: 'MKT', description: 'Digital marketing, branding, and content' },
      { name: 'Customer Success', code: 'CS', description: 'Support, client management, and onboarding' },
      { name: 'Legal & Compliance', code: 'LEGAL', description: 'Contracts, compliance, and data privacy' },
    ];
    
    for (const department of departments) {
      await (client as any).department.upsert({
        where: { code: department.code },
        create: department,
        update: {},
      });
    }
  }

  private async createDefaultRoles(client: PrismaClient): Promise<void> {
    const roles = [
      { name: 'Tenant Admin', slug: 'tenant_admin', isSystem: true, description: 'Full access to tenant' },
      { name: 'HR Manager', slug: 'hr_manager', isSystem: true, description: 'Manage employees, attendance, leaves' },
      { name: 'Project Manager', slug: 'project_manager', isSystem: true, description: 'Manage projects and tasks' },
      { name: 'Team Lead', slug: 'team_lead', isSystem: true, description: 'Manage team members and tasks' },
      { name: 'Employee', slug: 'employee', isSystem: true, isDefault: true, description: 'Basic employee access' },
      { name: 'Viewer', slug: 'viewer', isSystem: true, description: 'Read-only access' },
    ];
    
    for (const role of roles) {
      await (client as any).role.upsert({
        where: { slug: role.slug },
        create: role,
        update: {},
      });
    }
  }
  
  private async createAdminUser(client: PrismaClient, seedData: TenantSeedData): Promise<void> {
    // Create admin user and employee
    const employee = await (client as any).employee.create({
      data: {
        employeeCode: 'EMP001',
        firstName: seedData.adminFirstName,
        lastName: seedData.adminLastName,
        displayName: `${seedData.adminFirstName} ${seedData.adminLastName}`,
        email: seedData.adminEmail,
        joinDate: new Date(),
        status: 'ACTIVE',
      },
    });
    
    const adminRole = await (client as any).role.findUnique({
      where: { slug: 'tenant_admin' },
    });
    
    const user = await (client as any).user.create({
      data: {
        employeeId: employee.id,
        email: seedData.adminEmail,
        firstName: seedData.adminFirstName,
        lastName: seedData.adminLastName,
        displayName: `${seedData.adminFirstName} ${seedData.adminLastName}`,
        passwordHash: seedData.adminPasswordHash,
        status: 'ACTIVE',
        roles: {
          create: {
            roleId: adminRole.id,
          },
        },
      },
    });
  }
  
  private async createDefaultDesignations(client: PrismaClient): Promise<void> {
    const designations = [
      // C-Suite (Level 1)
      { name: 'Chief Executive Officer', code: 'CEO', level: 1 },
      { name: 'Chief Technology Officer', code: 'CTO', level: 1 },
      { name: 'Chief Financial Officer', code: 'CFO', level: 1 },
      { name: 'Chief Operating Officer', code: 'COO', level: 1 },
      { name: 'Chief Product Officer', code: 'CPO', level: 1 },
      { name: 'Chief Marketing Officer', code: 'CMO', level: 1 },
      // Directors (Level 2)
      { name: 'Director of Engineering', code: 'DIR_ENG', level: 2 },
      { name: 'Director of Product', code: 'DIR_PROD', level: 2 },
      { name: 'Director of HR', code: 'DIR_HR', level: 2 },
      { name: 'Director of Sales', code: 'DIR_SALES', level: 2 },
      { name: 'Director of QA', code: 'DIR_QA', level: 2 },
      { name: 'Director of Operations', code: 'DIR_OPS', level: 2 },
      // Managers (Level 3)
      { name: 'Engineering Manager', code: 'MGR_ENG', level: 3 },
      { name: 'Project Manager', code: 'MGR_PROJ', level: 3 },
      { name: 'Product Manager', code: 'MGR_PROD', level: 3 },
      { name: 'HR Manager', code: 'MGR_HR', level: 3 },
      { name: 'QA Manager', code: 'MGR_QA', level: 3 },
      { name: 'Account Manager', code: 'MGR_ACC', level: 3 },
      { name: 'Operations Manager', code: 'MGR_OPS', level: 3 },
      // Team Leads (Level 4)
      { name: 'Technical Lead', code: 'TECH_LEAD', level: 4 },
      { name: 'Team Lead', code: 'TEAM_LEAD', level: 4 },
      { name: 'QA Lead', code: 'QA_LEAD', level: 4 },
      // Senior Level (Level 5)
      { name: 'Senior Software Engineer', code: 'SR_SWE', level: 5 },
      { name: 'Senior Frontend Developer', code: 'SR_FE', level: 5 },
      { name: 'Senior Backend Developer', code: 'SR_BE', level: 5 },
      { name: 'Senior Full Stack Developer', code: 'SR_FS', level: 5 },
      { name: 'Senior DevOps Engineer', code: 'SR_DEVOPS', level: 5 },
      { name: 'Senior QA Engineer', code: 'SR_QA', level: 5 },
      { name: 'Senior UI/UX Designer', code: 'SR_DESIGN', level: 5 },
      { name: 'Senior Data Analyst', code: 'SR_DATA', level: 5 },
      { name: 'Senior Business Analyst', code: 'SR_BA', level: 5 },
      // Mid Level (Level 6)
      { name: 'Software Engineer', code: 'SWE', level: 6 },
      { name: 'Frontend Developer', code: 'FE_DEV', level: 6 },
      { name: 'Backend Developer', code: 'BE_DEV', level: 6 },
      { name: 'Full Stack Developer', code: 'FS_DEV', level: 6 },
      { name: 'DevOps Engineer', code: 'DEVOPS', level: 6 },
      { name: 'QA Engineer', code: 'QA_ENG', level: 6 },
      { name: 'UI/UX Designer', code: 'DESIGNER', level: 6 },
      { name: 'Data Analyst', code: 'DATA_ANALYST', level: 6 },
      { name: 'Business Analyst', code: 'BA', level: 6 },
      { name: 'Technical Writer', code: 'TECH_WRITER', level: 6 },
      // Junior Level (Level 7)
      { name: 'Junior Software Engineer', code: 'JR_SWE', level: 7 },
      { name: 'Junior Developer', code: 'JR_DEV', level: 7 },
      { name: 'Junior QA Engineer', code: 'JR_QA', level: 7 },
      { name: 'Associate Designer', code: 'ASSOC_DESIGN', level: 7 },
      // Entry/Intern (Level 8)
      { name: 'Trainee', code: 'TRAINEE', level: 8 },
      { name: 'Intern', code: 'INTERN', level: 8 },
      // Support/Admin Roles (Level 6)
      { name: 'HR Executive', code: 'HR_EXEC', level: 6 },
      { name: 'Accountant', code: 'ACCOUNTANT', level: 6 },
      { name: 'Executive Assistant', code: 'EXEC_ASST', level: 6 },
      { name: 'Office Administrator', code: 'OFFICE_ADMIN', level: 6 },
      { name: 'Technical Support Engineer', code: 'TECH_SUPPORT', level: 6 },
      { name: 'Sales Executive', code: 'SALES_EXEC', level: 6 },
      { name: 'Marketing Executive', code: 'MKT_EXEC', level: 6 },
      { name: 'Content Writer', code: 'CONTENT_WRITER', level: 6 },
      { name: 'Recruiter', code: 'RECRUITER', level: 6 },
    ];
    
    for (const designation of designations) {
      await (client as any).designation.upsert({
        where: { code: designation.code },
        create: designation,
        update: {},
      });
    }
  }
  
  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  
  /**
   * Disconnect a specific tenant client
   */
  async disconnectTenant(slug: string): Promise<void> {
    const cached = this.tenantCache.get(slug);
    if (cached) {
      await cached.client.$disconnect();
      this.tenantCache.delete(slug);
    }
  }
  
  /**
   * Disconnect all clients and cleanup
   */
  async disconnectAll(): Promise<void> {
    // Disconnect master client
    if (this.masterClient) {
      await this.masterClient.$disconnect();
      this.masterClient = null;
    }
    
    // Disconnect all tenant clients
    for (const [slug, { client }] of this.tenantCache.entries()) {
      try {
        await client.$disconnect();
      } catch (error) {
        console.error(`Error disconnecting tenant client: ${slug}`, error);
      }
    }
    
    this.tenantCache.clear();
    this.tenantLookupCache.clear();
  }
  
  /**
   * Invalidate cache for a specific tenant
   * Use this after tenant status changes (e.g., reactivation)
   */
  invalidateTenantCache(tenantSlug: string): void {
    // Remove from lookup cache (by slug)
    this.tenantLookupCache.delete(`slug:${tenantSlug}`);
    
    // Also remove the client cache for this tenant
    const cached = this.tenantCache.get(tenantSlug);
    if (cached) {
      this.tenantLookupCache.delete(`id:${cached.info.tenantId}`);
      this.tenantCache.delete(tenantSlug);
    }
  }
  
  // ==========================================================================
  // STATS
  // ==========================================================================
  
  /**
   * Get connection pool stats
   */
  getStats(): TenantDbManagerStats {
    return {
      activeTenantConnections: this.tenantCache.size,
      maxCacheSize: this.config.cacheMaxSize,
      cacheTtlMs: this.config.cacheTtlMs,
      tenantLookupCacheSize: this.tenantLookupCache.size,
    };
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface TenantSeedData {
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPasswordHash: string;
}

export interface TenantDbManagerStats {
  activeTenantConnections: number;
  maxCacheSize: number;
  cacheTtlMs: number;
  tenantLookupCacheSize: number;
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: TenantDbManager | null = null;

/**
 * Get singleton instance of TenantDbManager
 */
export function getTenantDbManager(config?: Partial<TenantDbConfig>): TenantDbManager {
  if (!instance) {
    instance = new TenantDbManager(config);
  }
  return instance;
}

/**
 * Reset singleton instance (for testing)
 */
export async function resetTenantDbManager(): Promise<void> {
  if (instance) {
    await instance.disconnectAll();
    instance = null;
  }
}

/**
 * Initialize the tenant database manager (convenience function for services)
 */
export async function initializeTenantDbManager(options: {
  masterDatabaseUrl: string;
  maxConnections?: number;
  connectionTimeout?: number;
}): Promise<TenantDbManager> {
  const manager = getTenantDbManager({
    masterDatabaseUrl: options.masterDatabaseUrl,
    cacheMaxSize: options.maxConnections ?? 100,
  });
  return manager;
}

/**
 * Shutdown the tenant database manager (convenience function for services)
 */
export async function shutdownTenantDbManager(): Promise<void> {
  await resetTenantDbManager();
}

export default TenantDbManager;
