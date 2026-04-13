/**
 * Script to find and merge duplicate employee document folders
 * 
 * Run with: npx tsx scripts/fix-duplicate-employee-folders.ts
 */

import { getTenantDbManager } from '../packages/tenant-db-manager/src';
import * as dotenv from 'dotenv';

dotenv.config();

async function findAndMergeDuplicateFolders() {
  const dbManager = getTenantDbManager();
  
  // Get all tenant slugs (you may need to adjust this based on your setup)
  const masterDb = dbManager.getMasterPrisma();
  const tenants = await masterDb.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { slug: true, name: true },
  });
  
  console.log(`Found ${tenants.length} active tenants to process\n`);
  
  for (const tenant of tenants) {
    console.log(`\n========================================`);
    console.log(`Processing tenant: ${tenant.name} (${tenant.slug})`);
    console.log(`========================================`);
    
    try {
      const prisma = await dbManager.getClientBySlug(tenant.slug);
      
      // Find the "Employee Documents" root folder
      const employeeDocsFolder = await (prisma as any).folder.findFirst({
        where: {
          name: 'Employee Documents',
          parentId: null,
        },
      });
      
      if (!employeeDocsFolder) {
        console.log('  No Employee Documents folder found, skipping...');
        continue;
      }
      
      // Get all subfolders under Employee Documents
      const employeeFolders = await (prisma as any).folder.findMany({
        where: {
          parentId: employeeDocsFolder.id,
          isDeleted: false,
        },
        include: {
          _count: { select: { files: true, children: true } },
        },
        orderBy: { name: 'asc' },
      });
      
      // Group folders by employee code (first part before " - ")
      const foldersByCode: Map<string, typeof employeeFolders> = new Map();
      
      for (const folder of employeeFolders) {
        const code = folder.name.split(' - ')[0].trim();
        if (!foldersByCode.has(code)) {
          foldersByCode.set(code, []);
        }
        foldersByCode.get(code)!.push(folder);
      }
      
      // Find duplicates
      let duplicatesFound = 0;
      
      for (const [code, folders] of foldersByCode.entries()) {
        if (folders.length > 1) {
          duplicatesFound++;
          console.log(`\n  DUPLICATE FOUND for employee code: ${code}`);
          
          // Sort by total items (files + children) to keep the one with most content
          folders.sort((a, b) => {
            const aTotal = a._count.files + a._count.children;
            const bTotal = b._count.files + b._count.children;
            return bTotal - aTotal; // Descending order
          });
          
          const keepFolder = folders[0];
          const mergeFolders = folders.slice(1);
          
          console.log(`  Keeping: ${keepFolder.name} (ID: ${keepFolder.id}) - ${keepFolder._count.files} files, ${keepFolder._count.children} subfolders`);
          
          for (const duplicate of mergeFolders) {
            console.log(`  Merging:  ${duplicate.name} (ID: ${duplicate.id}) - ${duplicate._count.files} files, ${duplicate._count.children} subfolders`);
            
            // Move files from duplicate to keep folder
            const movedFiles = await (prisma as any).file.updateMany({
              where: { folderId: duplicate.id },
              data: { folderId: keepFolder.id },
            });
            console.log(`    - Moved ${movedFiles.count} files`);
            
            // Move subfolders from duplicate to keep folder
            const movedFolders = await (prisma as any).folder.updateMany({
              where: { parentId: duplicate.id },
              data: { parentId: keepFolder.id },
            });
            console.log(`    - Moved ${movedFolders.count} subfolders`);
            
            // Soft delete the duplicate folder
            await (prisma as any).folder.update({
              where: { id: duplicate.id },
              data: { 
                isDeleted: true,
                deletedAt: new Date(),
                name: `[MERGED] ${duplicate.name}`,
              },
            });
            console.log(`    - Marked duplicate as deleted`);
          }
        }
      }
      
      if (duplicatesFound === 0) {
        console.log('  No duplicates found');
      } else {
        console.log(`\n  Total: ${duplicatesFound} duplicate employee codes merged`);
      }
      
    } catch (error) {
      console.error(`  Error processing tenant ${tenant.slug}:`, error);
    }
  }
  
  console.log('\n\nDone!');
  process.exit(0);
}

// Run the script
findAndMergeDuplicateFolders().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
