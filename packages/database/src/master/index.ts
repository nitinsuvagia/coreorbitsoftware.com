/**
 * Master Database Client
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
const prismaClientPath = join(monorepoRoot, 'node_modules', '.prisma', 'master-client');

// Set MASTER_DATABASE_URL env var if not already set - this must happen BEFORE loading PrismaClient
// Prisma validates env vars at module load time, not just at query time
if (!process.env.MASTER_DATABASE_URL) {
  process.env.MASTER_DATABASE_URL = 'postgresql://postgres:password@localhost:5432/oms_master';
}

// Use eval('require') to bypass esbuild's static analysis that converts require() to ESM imports
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-eval
const dynamicRequire = eval('require');
const { PrismaClient, Prisma } = dynamicRequire(prismaClientPath);

// Export as MasterPrismaClient to avoid name collision with tenant client
export { PrismaClient as MasterPrismaClient, Prisma as MasterPrisma };
export type MasterPrismaClientType = InstanceType<typeof PrismaClient>;

// Create singleton instance
export const masterPrisma = new PrismaClient();

// Helper function to get master prisma client
export function getMasterPrisma(): InstanceType<typeof PrismaClient> {
  return masterPrisma;
}
