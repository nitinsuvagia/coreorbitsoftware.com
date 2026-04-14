/**
 * Migration script to move base64 avatars from database to document storage
 * 
 * This script:
 * 1. Finds all users with base64 avatars in the database
 * 2. Decodes the base64 and saves as files
 * 3. Uploads to the employee's "Profile Photo" folder in document storage
 * 4. Updates the user's avatar field to point to the new URL
 * 
 * Run with: npx tsx scripts/migrate-avatars-to-documents.ts
 * 
 * Prerequisites:
 * - Document service must be running
 * - Environment variables must be set (.env file)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Import tenant database manager
import { getTenantDbManager } from '../packages/tenant-db-manager/src';

interface UserWithAvatar {
  id: string;
  email: string;
  avatar: string;
  employeeId: string | null;
}

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

// Base64 to Buffer
function base64ToBuffer(base64String: string): { buffer: Buffer; mimeType: string; extension: string } {
  // Extract mime type and data from data URL
  const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 data URL format');
  }
  
  const mimeType = matches[1];
  const data = matches[2];
  const buffer = Buffer.from(data, 'base64');
  
  // Get file extension from mime type
  const extensionMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  const extension = extensionMap[mimeType] || 'jpg';
  
  return { buffer, mimeType, extension };
}

async function migrateAvatars() {
  const dbManager = getTenantDbManager();
  const masterDb = dbManager.getMasterPrisma();
  
  // Get all active tenants
  const tenants = await masterDb.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { slug: true, name: true },
  });
  
  console.log(`Found ${tenants.length} active tenants to process\n`);
  
  let totalMigrated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  
  for (const tenant of tenants) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing tenant: ${tenant.name} (${tenant.slug})`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const prisma = await dbManager.getClientBySlug(tenant.slug);
      
      // Find all users with base64 avatars
      const usersWithAvatars = await (prisma as any).user.findMany({
        where: {
          avatar: { startsWith: 'data:image' },
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          avatar: true,
          employeeId: true,
        },
      }) as UserWithAvatar[];
      
      console.log(`  Found ${usersWithAvatars.length} users with base64 avatars`);
      
      if (usersWithAvatars.length === 0) {
        console.log('  No avatars to migrate, skipping...');
        continue;
      }
      
      // Get Employee Documents folder
      const employeeDocsFolder = await (prisma as any).folder.findFirst({
        where: { name: 'Employee Documents', parentId: null },
      });
      
      if (!employeeDocsFolder) {
        console.log('  WARNING: Employee Documents folder not found, skipping tenant...');
        totalSkipped += usersWithAvatars.length;
        continue;
      }
      
      // Create uploads directory for this tenant if needed
      const uploadDir = path.join(process.cwd(), 'uploads', 'documents', tenant.slug);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      for (const user of usersWithAvatars) {
        try {
          console.log(`\n  Processing: ${user.email}`);
          
          if (!user.employeeId) {
            console.log(`    SKIP: No employee record linked`);
            totalSkipped++;
            continue;
          }
          
          // Get employee details
          const employee = await (prisma as any).employee.findUnique({
            where: { id: user.employeeId },
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          }) as Employee | null;
          
          if (!employee) {
            console.log(`    SKIP: Employee record not found`);
            totalSkipped++;
            continue;
          }
          
          // Find or create employee folder
          const employeeFolderName = `${employee.employeeCode} - ${employee.firstName} ${employee.lastName}`;
          let employeeFolder = await (prisma as any).folder.findFirst({
            where: {
              parentId: employeeDocsFolder.id,
              isDeleted: false,
              name: { startsWith: `${employee.employeeCode} - ` },
            },
          });
          
          if (!employeeFolder) {
            console.log(`    Creating employee folder: ${employeeFolderName}`);
            employeeFolder = await (prisma as any).folder.create({
              data: {
                name: employeeFolderName,
                description: `Documents for ${employee.firstName} ${employee.lastName}`,
                parentId: employeeDocsFolder.id,
                path: `/Employee Documents/${employeeFolderName}`,
                depth: 2,
                createdBy: user.id,
              },
            });
          }
          
          // Find or create Profile Photo folder
          let profilePhotoFolder = await (prisma as any).folder.findFirst({
            where: {
              name: 'Profile Photo',
              parentId: employeeFolder.id,
              isDeleted: false,
            },
          });
          
          if (!profilePhotoFolder) {
            console.log(`    Creating Profile Photo folder`);
            profilePhotoFolder = await (prisma as any).folder.create({
              data: {
                name: 'Profile Photo',
                description: 'Profile pictures',
                parentId: employeeFolder.id,
                path: `${employeeFolder.path}/Profile Photo`,
                depth: 3,
                createdBy: user.id,
              },
            });
          }
          
          // Convert base64 to file
          const { buffer, mimeType, extension } = base64ToBuffer(user.avatar);
          const fileName = `avatar.${extension}`;
          const storageName = `${Date.now()}-${fileName}`;
          
          // Storage key for file
          const storageKey = `${tenant.slug}/${employee.employeeCode}/profile-photo/${storageName}`;
          
          // Save file to local storage
          const employeeDir = path.join(uploadDir, employee.employeeCode, 'profile-photo');
          if (!fs.existsSync(employeeDir)) {
            fs.mkdirSync(employeeDir, { recursive: true });
          }
          const filePath = path.join(employeeDir, storageName);
          fs.writeFileSync(filePath, buffer);
          
          console.log(`    Saved file: ${storageKey} (${buffer.length} bytes)`);
          
          // Check if file record already exists
          const existingFile = await (prisma as any).file.findFirst({
            where: {
              folderId: profilePhotoFolder.id,
              name: { startsWith: 'avatar.' },
              isDeleted: false,
            },
          });
          
          let fileRecord;
          if (existingFile) {
            // Update existing file
            fileRecord = await (prisma as any).file.update({
              where: { id: existingFile.id },
              data: {
                storageName,
                storageKey,
                size: buffer.length,
                mimeType,
                updatedAt: new Date(),
              },
            });
            console.log(`    Updated existing file record`);
          } else {
            // Create new file record
            fileRecord = await (prisma as any).file.create({
              data: {
                name: fileName,
                storageName,
                storageKey,
                mimeType,
                size: buffer.length,
                folderId: profilePhotoFolder.id,
                uploadedBy: user.id,
                entityType: 'EMPLOYEE',
                entityId: employee.id,
              },
            });
            console.log(`    Created file record: ${fileRecord.id}`);
          }
          
          // Update user avatar to new URL
          const newAvatarUrl = `/api/documents/files/download?key=${encodeURIComponent(storageKey)}&inline=true`;
          
          await (prisma as any).user.update({
            where: { id: user.id },
            data: { avatar: newAvatarUrl },
          });
          
          // Also update employee avatar if it exists
          await (prisma as any).employee.update({
            where: { id: employee.id },
            data: { avatar: newAvatarUrl },
          });
          
          console.log(`    SUCCESS: Avatar migrated to document storage`);
          console.log(`    New URL: ${newAvatarUrl}`);
          totalMigrated++;
          
        } catch (userError: any) {
          console.log(`    ERROR: ${userError.message}`);
          totalFailed++;
        }
      }
      
    } catch (tenantError: any) {
      console.error(`  ERROR processing tenant ${tenant.slug}:`, tenantError.message);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('MIGRATION COMPLETE');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Migrated: ${totalMigrated}`);
  console.log(`  Failed:   ${totalFailed}`);
  console.log(`  Skipped:  ${totalSkipped}`);
  console.log(`${'='.repeat(60)}\n`);
  
  process.exit(0);
}

// Run the migration
migrateAvatars().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
