/**
 * Seed Default Departments and Designations for Existing Tenants
 * 
 * Usage: npx ts-node scripts/seed-tenant-defaults.ts [tenant-slug]
 * If no tenant slug provided, seeds all tenants
 */

import { getMasterPrisma, TenantPrismaClient } from '@oms/database';

const DEFAULT_DEPARTMENTS = [
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

const DEFAULT_DESIGNATIONS = [
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

async function seedTenantDefaults(tenantSlug: string) {
  console.log(`\n🌱 Seeding defaults for tenant: ${tenantSlug}`);
  
  const masterPrisma = getMasterPrisma();
  
  // Get tenant info
  const tenant = await masterPrisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  
  if (!tenant) {
    console.error(`❌ Tenant not found: ${tenantSlug}`);
    return;
  }
  
  // Connect to tenant database
  const tenantDbUrl = `postgresql://postgres:password@localhost:5432/oms_tenant_${tenantSlug}`;
  const tenantPrisma = new TenantPrismaClient({
    datasources: { db: { url: tenantDbUrl } },
  });
  
  try {
    // Seed departments
    console.log('  📁 Creating departments...');
    let deptCount = 0;
    for (const dept of DEFAULT_DEPARTMENTS) {
      await tenantPrisma.department.upsert({
        where: { code: dept.code },
        create: dept,
        update: { name: dept.name, description: dept.description },
      });
      deptCount++;
    }
    console.log(`  ✅ ${deptCount} departments created/updated`);
    
    // Seed designations
    console.log('  🏷️  Creating designations...');
    let desigCount = 0;
    for (const desig of DEFAULT_DESIGNATIONS) {
      await tenantPrisma.designation.upsert({
        where: { code: desig.code },
        create: desig,
        update: { name: desig.name, level: desig.level },
      });
      desigCount++;
    }
    console.log(`  ✅ ${desigCount} designations created/updated`);
    
    console.log(`✅ Tenant ${tenantSlug} seeded successfully!`);
    
  } catch (error) {
    console.error(`❌ Error seeding tenant ${tenantSlug}:`, error);
  } finally {
    await tenantPrisma.$disconnect();
  }
}

async function main() {
  const targetSlug = process.argv[2];
  const masterPrisma = getMasterPrisma();
  
  try {
    if (targetSlug) {
      // Seed specific tenant
      await seedTenantDefaults(targetSlug);
    } else {
      // Seed all active tenants
      const tenants = await masterPrisma.tenant.findMany({
        where: { status: { in: ['ACTIVE', 'TRIAL'] } },
      });
      
      console.log(`Found ${tenants.length} active tenant(s) to seed\n`);
      
      for (const tenant of tenants) {
        await seedTenantDefaults(tenant.slug);
      }
    }
    
    console.log('\n🎉 Seeding complete!');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await masterPrisma.$disconnect();
  }
}

main();
