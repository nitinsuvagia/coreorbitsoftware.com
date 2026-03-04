/**
 * Tenant Database Client
 */

import { join, dirname } from 'path';
import { existsSync, readFileSync } from 'fs';

// Find monorepo root by looking for package.json with workspaces
function findMonorepoRoot(startDir: string): string {
  // Check for Docker environment or explicit override
  if (process.env.MONOREPO_ROOT) {
    return process.env.MONOREPO_ROOT;
  }
  // Detect Docker environment
  const isDocker = existsSync('/.dockerenv') || existsSync('/app/node_modules/.prisma');
  if (isDocker) {
    return '/app';
  }
  
  let dir = startDir;
  while (dir !== dirname(dir)) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.workspaces) {
          return dir;
        }
      } catch {
        // Continue searching
      }
    }
    dir = dirname(dir);
  }
  throw new Error('Could not find monorepo root');
}

// Load Prisma client from the monorepo root's node_modules
const monorepoRoot = findMonorepoRoot(__dirname);
const prismaClientPath = join(monorepoRoot, 'node_modules', '.prisma', 'tenant-client');

// Use eval('require') to bypass esbuild's static analysis that converts require() to ESM imports
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-eval
const dynamicRequire = eval('require');
const { PrismaClient, Prisma } = dynamicRequire(prismaClientPath);

// Export as TenantPrismaClient to avoid name collision with master client
export { PrismaClient as TenantPrismaClient, Prisma as TenantPrisma };
export type TenantPrismaClientType = InstanceType<typeof PrismaClient>;

// Create singleton instance
export const tenantPrisma = new PrismaClient();
