import { getTenantDbManager } from '../packages/tenant-db-manager/src';

async function cleanupOrphanEmployee() {
  const dbManager = getTenantDbManager();
  const db = await dbManager.getClientBySlug('softqube');
  
  // Delete orphaned employee with this email
  const deleted = await db.employee.delete({
    where: { email: 'nitinsuvagia@gmail.com' },
  });
  
  console.log('Deleted orphaned employee:', deleted.firstName, deleted.lastName, '- Email:', deleted.email);
  console.log('Done! Ready to test offer acceptance again.');
  process.exit(0);
}

cleanupOrphanEmployee().catch(e => { console.error(e); process.exit(1); });
