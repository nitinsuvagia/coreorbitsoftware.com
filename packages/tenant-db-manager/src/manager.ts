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
import * as fs from 'fs';
import { 
  TenantDbConfig, 
  getDefaultConfig, 
  buildTenantDatabaseUrl,
  TenantConnectionInfo 
} from './config';

// ============================================================================
// PRISMA CLIENT LOADING
// ============================================================================

// Use eval('require') to bypass esbuild's static analysis that converts require() to ESM imports
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-eval
const dynamicRequire = eval('require');

// Find monorepo root by looking for package.json with workspaces
// In Docker containers, use MONOREPO_ROOT env var or default to /app
function findMonorepoRoot(startDir: string): string {
  // Check for Docker environment or explicit override
  if (process.env.MONOREPO_ROOT) {
    return process.env.MONOREPO_ROOT;
  }
  
  // Check if we're in a Docker container (common indicator)
  const isDocker = fs.existsSync('/.dockerenv') || fs.existsSync('/app/node_modules/.prisma');
  if (isDocker) {
    return '/app';
  }
  
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.workspaces) {
          return dir;
        }
      } catch {
        // Continue searching
      }
    }
    dir = path.dirname(dir);
  }
  
  // Last resort: try /app for Docker
  if (fs.existsSync('/app/node_modules')) {
    return '/app';
  }
  
  throw new Error('Could not find monorepo root');
}

// Load Prisma clients from the monorepo root's node_modules
const monorepoRoot = findMonorepoRoot(__dirname);
const loadPrismaClient = (clientName: string) => {
  const prismaClientPath = path.join(monorepoRoot, 'node_modules', '.prisma', clientName);
  return dynamicRequire(prismaClientPath);
};

// Lazy load Prisma clients
let _TenantPrismaClientClass: any = null;
let _MasterPrismaClientClass: any = null;

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
  if (!_TenantPrismaClientClass) {
    _TenantPrismaClientClass = loadPrismaClient('tenant-client').PrismaClient;
  }
  return _TenantPrismaClientClass;
}

/**
 * Get the master Prisma client class
 */
function getMasterPrismaClientClass(): new (options?: any) => PrismaClient {
  if (!_MasterPrismaClientClass) {
    _MasterPrismaClientClass = loadPrismaClient('master-client').PrismaClient;
  }
  return _MasterPrismaClientClass;
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
    
    // Create default permissions and assign to roles
    await this.createDefaultPermissions(client);
    
    // Create default departments
    await this.createDefaultDepartments(client);
    
    // Create default designations
    await this.createDefaultDesignations(client);
    
    // Create default leave types
    await this.createDefaultLeaveTypes(client);
    
    // Create admin user (after departments exist)
    const adminUserId = await this.createAdminUser(client, seedData);
    
    // Create default document folders (needs admin user for createdBy)
    await this.createDefaultFolders(client, adminUserId);
  }
  
  private async createDefaultDepartments(client: PrismaClient): Promise<void> {
    const departments = [
      { name: 'Engineering', code: 'ENG', description: 'Software development, architecture, and DevOps' },
      { name: 'Finance & Accounts', code: 'FIN', description: 'Accounting, budgeting, and financial planning' },
      { name: 'Human Resources', code: 'HR', description: 'Recruitment, employee relations, and payroll' },
      { name: 'Legal & Compliance', code: 'LEGAL', description: 'Contracts, compliance, and data privacy' },
      { name: 'Marketing', code: 'MKT', description: 'Digital marketing, branding, and content' },
      { name: 'Operations', code: 'OPS', description: 'IT infrastructure, facilities, and administration' },
      { name: 'Product', code: 'PROD', description: 'Product management and UX/UI design' },
      { name: 'Quality Assurance', code: 'QA', description: 'Testing, automation, and quality control' },
      { name: 'Sales', code: 'SALES', description: 'Business development and client acquisition' },
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
      { name: 'Admin', slug: 'admin', isSystem: true, description: 'Administrator with full access except billing' },
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
  
  private async createDefaultPermissions(client: PrismaClient): Promise<void> {
    // Define all 39 permissions with exact IDs matching softqube database
    const permissions = [
      { id: 'perm-admin360-view', resource: 'admin_360', action: 'view', description: 'View Admin 360° overview' },
      { id: 'perm-attendance-read', resource: 'attendance', action: 'read', description: 'View all attendance records' },
      { id: 'perm-attendance-self', resource: 'attendance', action: 'self', description: 'View/mark own attendance' },
      { id: 'perm-attendance-write', resource: 'attendance', action: 'write', description: 'Manage attendance records' },
      { id: 'perm-billing-manage', resource: 'billing', action: 'manage', description: 'Manage billing/subscriptions' },
      { id: 'perm-billing-view', resource: 'billing', action: 'view', description: 'View billing information' },
      { id: 'perm-dashboard-view', resource: 'dashboard', action: 'view', description: 'View main dashboard' },
      { id: 'perm-documents-read', resource: 'documents', action: 'read', description: 'View all documents' },
      { id: 'perm-documents-self', resource: 'documents', action: 'self', description: 'View/upload own documents' },
      { id: 'perm-documents-write', resource: 'documents', action: 'write', description: 'Manage all documents' },
      { id: 'perm-employees-delete', resource: 'employees', action: 'delete', description: 'Delete/terminate employees' },
      { id: 'perm-employees-read', resource: 'employees', action: 'read', description: 'View employee list and profiles' },
      { id: 'perm-employees-write', resource: 'employees', action: 'write', description: 'Create and edit employees' },
      { id: 'perm-holidays-read', resource: 'holidays', action: 'read', description: 'View holidays calendar' },
      { id: 'perm-holidays-write', resource: 'holidays', action: 'write', description: 'Manage holidays' },
      { id: 'perm-hr-assessments-read', resource: 'hr_assessments', action: 'read', description: 'View assessments' },
      { id: 'perm-hr-assessments-write', resource: 'hr_assessments', action: 'write', description: 'Create/manage assessments' },
      { id: 'perm-hr-candidates-read', resource: 'hr_candidates', action: 'read', description: 'View candidates' },
      { id: 'perm-hr-candidates-write', resource: 'hr_candidates', action: 'write', description: 'Manage candidates' },
      { id: 'perm-hr-interviews-read', resource: 'hr_interviews', action: 'read', description: 'View interviews' },
      { id: 'perm-hr-interviews-write', resource: 'hr_interviews', action: 'write', description: 'Schedule/manage interviews' },
      { id: 'perm-hr-jobs-read', resource: 'hr_jobs', action: 'read', description: 'View job descriptions' },
      { id: 'perm-hr-jobs-write', resource: 'hr_jobs', action: 'write', description: 'Create/edit job descriptions' },
      { id: 'perm-leave-read', resource: 'leave', action: 'read', description: 'View all leave requests' },
      { id: 'perm-leave-self', resource: 'leave', action: 'self', description: 'Apply/view own leave' },
      { id: 'perm-leave-write', resource: 'leave', action: 'write', description: 'Approve/reject leave requests' },
      { id: 'perm-notifications-read', resource: 'notifications', action: 'read', description: 'View notifications' },
      { id: 'perm-org-manage', resource: 'organization', action: 'manage', description: 'Manage organization settings' },
      { id: 'perm-org-view', resource: 'organization', action: 'view', description: 'View organization settings' },
      { id: 'perm-performance-read', resource: 'performance', action: 'read', description: 'View all performance reviews' },
      { id: 'perm-performance-self', resource: 'performance', action: 'self', description: 'View own performance reviews' },
      { id: 'perm-performance-write', resource: 'performance', action: 'write', description: 'Create/manage performance reviews' },
      { id: 'perm-projects-read', resource: 'projects', action: 'read', description: 'View projects' },
      { id: 'perm-projects-write', resource: 'projects', action: 'write', description: 'Create/manage projects' },
      { id: 'perm-reports-view', resource: 'reports', action: 'view', description: 'View reports' },
      { id: 'perm-settings-manage', resource: 'settings', action: 'manage', description: 'Manage system settings' },
      { id: 'perm-settings-view', resource: 'settings', action: 'view', description: 'View system settings' },
      { id: 'perm-tasks-read', resource: 'tasks', action: 'read', description: 'View tasks' },
      { id: 'perm-tasks-write', resource: 'tasks', action: 'write', description: 'Create/manage tasks' },
    ];
    
    // Create all permissions with specific IDs
    for (const perm of permissions) {
      await (client as any).permission.upsert({
        where: { id: perm.id },
        create: perm,
        update: { resource: perm.resource, action: perm.action, description: perm.description },
      });
    }
    
    // Define role-permission mappings matching softqube database
    const rolePermissions: Record<string, string[]> = {
      // Tenant Admin - All 39 permissions
      tenant_admin: [
        'perm-admin360-view', 'perm-attendance-read', 'perm-attendance-self', 'perm-attendance-write',
        'perm-billing-manage', 'perm-billing-view',
        'perm-dashboard-view', 'perm-documents-read', 'perm-documents-self', 'perm-documents-write',
        'perm-employees-delete', 'perm-employees-read', 'perm-employees-write',
        'perm-holidays-read', 'perm-holidays-write',
        'perm-hr-assessments-read', 'perm-hr-assessments-write',
        'perm-hr-candidates-read', 'perm-hr-candidates-write',
        'perm-hr-interviews-read', 'perm-hr-interviews-write',
        'perm-hr-jobs-read', 'perm-hr-jobs-write',
        'perm-leave-read', 'perm-leave-self', 'perm-leave-write',
        'perm-notifications-read', 'perm-org-manage', 'perm-org-view',
        'perm-performance-read', 'perm-performance-self', 'perm-performance-write',
        'perm-projects-read', 'perm-projects-write',
        'perm-reports-view', 'perm-settings-manage', 'perm-settings-view',
        'perm-tasks-read', 'perm-tasks-write',
      ],
      // Admin - 37 permissions (all except billing)
      admin: [
        'perm-admin360-view', 'perm-attendance-read', 'perm-attendance-self', 'perm-attendance-write',
        'perm-dashboard-view', 'perm-documents-read', 'perm-documents-self', 'perm-documents-write',
        'perm-employees-delete', 'perm-employees-read', 'perm-employees-write',
        'perm-holidays-read', 'perm-holidays-write',
        'perm-hr-assessments-read', 'perm-hr-assessments-write',
        'perm-hr-candidates-read', 'perm-hr-candidates-write',
        'perm-hr-interviews-read', 'perm-hr-interviews-write',
        'perm-hr-jobs-read', 'perm-hr-jobs-write',
        'perm-leave-read', 'perm-leave-self', 'perm-leave-write',
        'perm-notifications-read', 'perm-org-manage', 'perm-org-view',
        'perm-performance-read', 'perm-performance-self', 'perm-performance-write',
        'perm-projects-read', 'perm-projects-write',
        'perm-reports-view', 'perm-settings-manage', 'perm-settings-view',
        'perm-tasks-read', 'perm-tasks-write',
      ],
      // HR Manager - 28 permissions
      hr_manager: [
        'perm-attendance-read', 'perm-attendance-self', 'perm-attendance-write',
        'perm-dashboard-view', 'perm-documents-read', 'perm-documents-self', 'perm-documents-write',
        'perm-employees-delete', 'perm-employees-read', 'perm-employees-write',
        'perm-holidays-read', 'perm-holidays-write',
        'perm-hr-assessments-read', 'perm-hr-assessments-write',
        'perm-hr-candidates-read', 'perm-hr-candidates-write',
        'perm-hr-interviews-read', 'perm-hr-interviews-write',
        'perm-hr-jobs-read', 'perm-hr-jobs-write',
        'perm-leave-read', 'perm-leave-self', 'perm-leave-write',
        'perm-notifications-read',
        'perm-performance-read', 'perm-performance-self', 'perm-performance-write',
        'perm-reports-view',
      ],
      // Project Manager - 15 permissions
      project_manager: [
        'perm-attendance-read', 'perm-attendance-self',
        'perm-dashboard-view', 'perm-documents-self',
        'perm-employees-read', 'perm-holidays-read',
        'perm-leave-read', 'perm-leave-self',
        'perm-notifications-read', 'perm-performance-self',
        'perm-projects-read', 'perm-projects-write',
        'perm-reports-view',
        'perm-tasks-read', 'perm-tasks-write',
      ],
      // Team Lead - 14 permissions
      team_lead: [
        'perm-attendance-read', 'perm-attendance-self',
        'perm-dashboard-view', 'perm-documents-self',
        'perm-holidays-read',
        'perm-leave-read', 'perm-leave-self', 'perm-leave-write',
        'perm-notifications-read',
        'perm-performance-read', 'perm-performance-self',
        'perm-projects-read',
        'perm-tasks-read', 'perm-tasks-write',
      ],
      // Employee - 10 permissions
      employee: [
        'perm-attendance-self',
        'perm-dashboard-view', 'perm-documents-self',
        'perm-holidays-read',
        'perm-leave-self',
        'perm-notifications-read', 'perm-performance-self',
        'perm-projects-read',
        'perm-tasks-read', 'perm-tasks-write',
      ],
      // Viewer - 7 permissions
      viewer: [
        'perm-dashboard-view',
        'perm-employees-read', 'perm-holidays-read',
        'perm-notifications-read',
        'perm-projects-read', 'perm-reports-view',
        'perm-tasks-read',
      ],
    };
    
    // Assign permissions to roles
    for (const [roleSlug, permIds] of Object.entries(rolePermissions)) {
      const role = await (client as any).role.findUnique({ where: { slug: roleSlug } });
      if (!role) continue;
      
      for (const permId of permIds) {
        await (client as any).rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
          create: { roleId: role.id, permissionId: permId },
          update: {},
        });
      }
    }
  }
  
  private async createAdminUser(client: PrismaClient, seedData: TenantSeedData): Promise<string> {
    // Get the tenant admin role (for the person who registers the tenant)
    const adminRole = await (client as any).role.findUnique({
      where: { slug: 'tenant_admin' },
    });
    
    // Create admin user
    // Tenant Admin has full access including billing management
    const user = await (client as any).user.create({
      data: {
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
    
    return user.id;
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
  
  private async createDefaultLeaveTypes(client: PrismaClient): Promise<void> {
    const leaveTypes = [
      {
        name: 'Casual Leave',
        code: 'CL',
        description: 'For personal work and urgent matters',
        defaultDaysPerYear: 12,
        carryForwardAllowed: false,
        requiresApproval: true,
        isPaid: true,
        color: '#3B82F6',
      },
      {
        name: 'Sick Leave',
        code: 'SL',
        description: 'For illness and medical appointments',
        defaultDaysPerYear: 12,
        carryForwardAllowed: false,
        requiresApproval: true,
        isPaid: true,
        color: '#EF4444',
      },
      {
        name: 'Earned Leave',
        code: 'EL',
        description: 'Privilege leave earned based on service',
        defaultDaysPerYear: 15,
        carryForwardAllowed: true,
        maxCarryForwardDays: 30,
        requiresApproval: true,
        isPaid: true,
        color: '#10B981',
      },
      {
        name: 'Maternity Leave',
        code: 'ML',
        description: 'For childbirth and post-natal care',
        defaultDaysPerYear: 182,
        carryForwardAllowed: false,
        requiresApproval: true,
        isPaid: true,
        color: '#EC4899',
      },
      {
        name: 'Paternity Leave',
        code: 'PL',
        description: 'For fathers after childbirth',
        defaultDaysPerYear: 15,
        carryForwardAllowed: false,
        requiresApproval: true,
        isPaid: true,
        color: '#8B5CF6',
      },
      {
        name: 'Bereavement Leave',
        code: 'BL',
        description: 'For death of immediate family member',
        defaultDaysPerYear: 5,
        carryForwardAllowed: false,
        requiresApproval: true,
        isPaid: true,
        color: '#6B7280',
      },
      {
        name: 'Compensatory Off',
        code: 'COMP',
        description: 'Compensatory off for working on holidays/weekends',
        defaultDaysPerYear: 0,
        carryForwardAllowed: true,
        maxCarryForwardDays: 5,
        requiresApproval: true,
        isPaid: true,
        color: '#F59E0B',
      },
      {
        name: 'Leave Without Pay',
        code: 'LWP',
        description: 'Unpaid leave when all other leaves are exhausted',
        defaultDaysPerYear: 0,
        carryForwardAllowed: false,
        requiresApproval: true,
        isPaid: false,
        color: '#9CA3AF',
      },
    ];
    
    for (const leaveType of leaveTypes) {
      await (client as any).leaveType.upsert({
        where: { code: leaveType.code },
        create: leaveType,
        update: {},
      });
    }
  }
  
  /**
   * Create default document folders for a tenant
   */
  private async createDefaultFolders(client: PrismaClient, adminUserId: string): Promise<void> {
    // Define the folder structure
    interface FolderDef {
      name: string;
      description?: string;
      color?: string;
      children?: FolderDef[];
    }
    
    // Company Documents - main company folder
    const COMPANY_DOCUMENTS: FolderDef = {
      name: 'Company Documents',
      description: 'Company-wide documents and resources',
      color: 'blue',
      children: [
        { name: 'Policies', description: 'Company policies and procedures', color: 'red' },
        { name: 'Forms', description: 'Standard company forms and templates', color: 'green' },
        { name: 'Templates', description: 'Document templates', color: 'purple' },
        { name: 'Certifications', description: 'Company certifications and licenses', color: 'orange' },
        { name: 'Legal Documents', description: 'Legal agreements and contracts', color: 'red' },
        { name: 'Training Materials', description: 'Training resources and materials', color: 'blue' },
        { name: 'Company Assets', description: 'Logos, branding, and marketing assets', color: 'pink' },
        { name: 'HR Documents', description: 'HR policies, handbooks, and guidelines', color: 'indigo' },
      ],
    };
    
    // Company Master - legacy folder name (same structure as Company Documents)
    const COMPANY_MASTER: FolderDef = {
      name: 'Company Master',
      description: 'Company master documents and templates',
      color: 'blue',
      children: [
        { name: 'Policies', description: 'Company policies and procedures', color: 'red' },
        { name: 'Forms', description: 'Standard company forms and templates', color: 'green' },
        { name: 'Templates', description: 'Document templates', color: 'purple' },
        { name: 'Certifications', description: 'Company certifications and licenses', color: 'orange' },
        { name: 'Legal Documents', description: 'Legal agreements and contracts', color: 'red' },
        { name: 'Training Materials', description: 'Training resources and materials', color: 'blue' },
        { name: 'Company Assets', description: 'Logos, branding, and marketing assets', color: 'pink' },
      ],
    };
    
    // Employee Documents - for individual employee folders
    const EMPLOYEE_DOCUMENTS: FolderDef = {
      name: 'Employee Documents',
      description: 'Employee-specific documents organized by employee',
      color: 'green',
    };
    
    // On-Boarding - for candidates going through hiring process
    const ON_BOARDING: FolderDef = {
      name: 'On-Boarding',
      description: 'Documents for candidates going through on-boarding process',
      color: 'indigo',
    };
    
    // Helper to create folder recursively
    const createFolder = async (
      folder: FolderDef,
      parentId: string | null,
      parentPath: string
    ): Promise<string> => {
      const path = parentPath ? `${parentPath}/${folder.name}` : `/${folder.name}`;
      const depth = parentPath ? parentPath.split('/').filter(Boolean).length + 1 : 1;
      
      // Check if exists
      const existing = await (client as any).folder.findFirst({
        where: { name: folder.name, parentId },
      });
      
      let folderId: string;
      
      if (existing) {
        folderId = existing.id;
      } else {
        const created = await (client as any).folder.create({
          data: {
            name: folder.name,
            description: folder.description,
            color: folder.color,
            parentId,
            path,
            depth,
            createdBy: adminUserId,
          },
        });
        folderId = created.id;
      }
      
      // Create children
      if (folder.children) {
        for (const child of folder.children) {
          await createFolder(child, folderId, path);
        }
      }
      
      return folderId;
    };
    
    // Create the default folders
    await createFolder(COMPANY_DOCUMENTS, null, '');
    await createFolder(COMPANY_MASTER, null, '');
    await createFolder(EMPLOYEE_DOCUMENTS, null, '');
    await createFolder(ON_BOARDING, null, '');
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
