/**
 * Seed script to create initial platform admin
 * Run with: npx tsx scripts/seed-admin.ts
 */

import { PrismaClient } from '../packages/database/node_modules/.prisma/master-client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if admin already exists
  const existingAdmin = await prisma.platformAdmin.findUnique({
    where: { email: 'admin@oms.local' }
  });

  if (existingAdmin) {
    console.log('⚠️  Admin already exists, skipping...');
    return;
  }

  // Create default platform admin
  const passwordHash = await bcrypt.hash('admin123', 12);
  
  const admin = await prisma.platformAdmin.create({
    data: {
      email: 'admin@oms.local',
      username: 'superadmin',
      displayName: 'Super Admin',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    }
  });

  console.log('✅ Created platform admin:');
  console.log('   Email:    admin@oms.local');
  console.log('   Password: admin123');
  console.log('   Role:     SUPER_ADMIN');
  console.log('');
  console.log('🔐 Please change the password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
