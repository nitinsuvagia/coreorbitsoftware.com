/**
 * Script to initialize default folder structure for a tenant
 * Run with: npm run init-folders
 */

import { runWithTenantContextById } from '@oms/tenant-db-manager';
import { initializeDefaultFolderStructure } from '../services/folder-init.service';
import { PrismaClient } from '.prisma/tenant-client';

async function main() {
  const tenantSlug = process.env.TENANT_SLUG || 'softqube';
  const tenantId = process.env.TENANT_ID || '58262b45-f5f5-4742-9daa-b5ef3a42ae32';
  const adminUserId = process.env.ADMIN_USER_ID || '9371f096-277b-4e2d-8504-4b81e44ab747';

  console.log(`Initializing folder structure for tenant: ${tenantSlug}`);

  try {
    await runWithTenantContextById(tenantId, async () => {
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: `postgresql://postgres:password@localhost:5432/oms_tenant_${tenantSlug}`,
          },
        },
      });

      try {
        // Initialize folder structure
        await initializeDefaultFolderStructure(prisma, adminUserId);
        console.log('✅ Folder structure initialized successfully');
      } finally {
        await prisma.$disconnect();
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to initialize folder structure:', error);
    process.exit(1);
  }
}

main();
