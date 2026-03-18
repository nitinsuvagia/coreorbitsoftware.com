/**
 * AI Service - Database Utilities
 * Tenant Prisma client management for conversation storage
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const MasterPrismaClient = require('.prisma/master-client').PrismaClient;
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const TenantPrismaClient = require('.prisma/tenant-client').PrismaClient;

type PrismaClientType = any;

const tenantClients: Map<string, PrismaClientType> = new Map();
let masterClient: PrismaClientType | null = null;

export function getMasterPrisma(): PrismaClientType {
  if (!masterClient) {
    const url = process.env.MASTER_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/oms_master';
    masterClient = new MasterPrismaClient({
      datasources: { db: { url } },
    });
  }
  return masterClient;
}

export async function getTenantPrismaBySlug(tenantSlug: string): Promise<PrismaClientType> {
  if (tenantClients.has(tenantSlug)) {
    return tenantClients.get(tenantSlug)!;
  }

  const master = getMasterPrisma();
  const tenant = await master.tenant.findFirst({
    where: {
      slug: tenantSlug,
      status: { in: ['ACTIVE', 'TRIAL'] },
    },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantSlug}`);
  }

  const dbHost = tenant.databaseHost || process.env.TENANT_DB_HOST || process.env.DB_HOST || 'localhost';
  const dbPort = tenant.databasePort || process.env.TENANT_DB_PORT || process.env.DB_PORT || 5432;
  const dbUser = process.env.TENANT_DB_USER || process.env.DB_USER || 'postgres';
  const dbPassword = process.env.TENANT_DB_PASSWORD || process.env.DB_PASSWORD || 'password';
  const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${tenant.databaseName}`;

  const client = new TenantPrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  tenantClients.set(tenantSlug, client);
  return client;
}

// ---------------------------------------------------------------------------
// Tenant timezone lookup (cached)
// ---------------------------------------------------------------------------
const timezoneCache = new Map<string, { tz: string; cachedAt: number }>();
const TZ_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the IANA timezone configured for a tenant (e.g. 'America/New_York', 'Asia/Shanghai').
 * Falls back to 'UTC' if not configured.
 */
export async function getTenantTimezone(tenantSlug: string): Promise<string> {
  const cached = timezoneCache.get(tenantSlug);
  if (cached && Date.now() - cached.cachedAt < TZ_CACHE_TTL) {
    return cached.tz;
  }
  try {
    const master = getMasterPrisma();
    const tenant = await master.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true },
    });
    const tz: string = (tenant?.settings as any)?.timezone || 'UTC';
    timezoneCache.set(tenantSlug, { tz, cachedAt: Date.now() });
    return tz;
  } catch {
    return cached?.tz || 'UTC';
  }
}

export async function disconnectAll(): Promise<void> {
  if (masterClient) {
    await masterClient.$disconnect();
    masterClient = null;
  }
  for (const [, client] of tenantClients) {
    await client.$disconnect();
  }
  tenantClients.clear();
  timezoneCache.clear();
}
