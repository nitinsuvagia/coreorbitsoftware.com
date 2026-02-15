/**
 * API Gateway - Database Utilities
 * Direct Prisma client management for tenant databases
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const MasterPrismaClient = require('.prisma/master-client').PrismaClient;
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const TenantPrismaClient = require('.prisma/tenant-client').PrismaClient;

type PrismaClientType = any;

// Cache for tenant Prisma clients
const tenantClients: Map<string, PrismaClientType> = new Map();

// Master Prisma client singleton
let masterClient: PrismaClientType | null = null;

/**
 * Get master database Prisma client
 */
export function getMasterPrisma(): PrismaClientType {
  if (!masterClient) {
    const url = process.env.MASTER_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/oms_master';
    masterClient = new MasterPrismaClient({
      datasources: {
        db: { url },
      },
    });
  }
  return masterClient;
}

/**
 * Get tenant database Prisma client by slug
 */
export async function getTenantPrismaBySlug(tenantSlug: string): Promise<PrismaClientType> {
  // Check cache first
  if (tenantClients.has(tenantSlug)) {
    return tenantClients.get(tenantSlug)!;
  }

  // Look up tenant in master database
  const master = getMasterPrisma();
  const tenant = await master.tenant.findFirst({
    where: { 
      slug: tenantSlug,
      status: 'ACTIVE',
    },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantSlug}`);
  }

  // Build tenant database URL
  const dbHost = tenant.databaseHost || process.env.DB_HOST || 'localhost';
  const dbPort = tenant.databasePort || process.env.DB_PORT || 5432;
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'password';
  const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${tenant.databaseName}`;

  // Create new Prisma client for tenant
  const client = new TenantPrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });

  // Cache it
  tenantClients.set(tenantSlug, client);

  return client;
}

/**
 * Disconnect all clients
 */
export async function disconnectAll(): Promise<void> {
  if (masterClient) {
    await masterClient.$disconnect();
    masterClient = null;
  }
  
  for (const [, client] of tenantClients) {
    await client.$disconnect();
  }
  tenantClients.clear();
}

export default {
  getMasterPrisma,
  getTenantPrismaBySlug,
  disconnectAll,
};
