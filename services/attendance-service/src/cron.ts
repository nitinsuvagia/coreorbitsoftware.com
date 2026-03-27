/**
 * Cron Jobs for Attendance Service
 * 
 * Scheduled tasks:
 * - Midnight aggregation: Compute daily status for the previous day
 */

import cron from 'node-cron';
import { subDays, format } from 'date-fns';
import { logger } from './utils/logger';
import { aggregateDailyStatusForDate } from './services/daily-status.service';
import { getMasterPrisma } from './utils/database';
import { getTenantPrismaBySlug } from './utils/database';

// ============================================================================
// CRON JOB: MIDNIGHT DAILY STATUS AGGREGATION
// ============================================================================

/**
 * Run daily status aggregation for all tenants
 * Triggered at 00:05 AM every day (5 minutes after midnight to ensure all check-outs are recorded)
 */
async function runDailyStatusAggregation(): Promise<void> {
  const yesterday = subDays(new Date(), 1);
  const dateKey = format(yesterday, 'yyyy-MM-dd');
  
  logger.info({ date: dateKey }, 'Starting scheduled daily status aggregation for all tenants');
  
  try {
    // Get all active tenants
    const masterPrisma = getMasterPrisma();
    const tenants = await masterPrisma.tenant.findMany({
      where: { 
        status: 'ACTIVE',
        subscription: {
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
      },
      select: { id: true, slug: true, name: true },
    });
    
    logger.info({ tenantCount: tenants.length }, 'Found active tenants for aggregation');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const tenant of tenants) {
      try {
        const tenantPrisma = await getTenantPrismaBySlug(tenant.slug);
        const result = await aggregateDailyStatusForDate(tenantPrisma, tenant.slug, yesterday);
        
        logger.info(
          { tenantSlug: tenant.slug, date: dateKey, ...result },
          'Daily status aggregation completed for tenant'
        );
        successCount++;
      } catch (error) {
        logger.error(
          { tenantSlug: tenant.slug, date: dateKey, error: (error as Error).message },
          'Failed to aggregate daily status for tenant'
        );
        errorCount++;
      }
    }
    
    logger.info(
      { date: dateKey, successCount, errorCount, totalTenants: tenants.length },
      'Scheduled daily status aggregation complete'
    );
  } catch (error) {
    logger.error(
      { date: dateKey, error: (error as Error).message },
      'Critical error in daily status aggregation'
    );
  }
}

// ============================================================================
// CRON SCHEDULING
// ============================================================================

let midnightAggregationJob: cron.ScheduledTask | null = null;

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs(): void {
  logger.info('Initializing attendance service cron jobs...');
  
  // Run at 00:05 AM every day (server time - typically UTC)
  // Cron expression: minute(5) hour(0) day(*) month(*) weekday(*)
  midnightAggregationJob = cron.schedule('5 0 * * *', async () => {
    logger.info('Midnight cron job triggered');
    await runDailyStatusAggregation();
  }, {
    scheduled: true,
    timezone: 'UTC', // Use UTC; tenant timezones handled in aggregation logic
  });
  
  logger.info('Cron jobs initialized: daily status aggregation scheduled at 00:05 UTC');
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export function stopCronJobs(): void {
  logger.info('Stopping cron jobs...');
  
  if (midnightAggregationJob) {
    midnightAggregationJob.stop();
    midnightAggregationJob = null;
  }
  
  logger.info('Cron jobs stopped');
}

/**
 * Manually trigger daily status aggregation (for admin API)
 */
export async function triggerManualAggregation(targetDate?: Date): Promise<{
  date: string;
  tenants: number;
  success: number;
  errors: number;
}> {
  const date = targetDate || subDays(new Date(), 1);
  const dateKey = format(date, 'yyyy-MM-dd');
  
  logger.info({ date: dateKey }, 'Manual daily status aggregation triggered');
  
  const masterPrisma = getMasterPrisma();
  const tenants = await masterPrisma.tenant.findMany({
    where: { 
      status: 'ACTIVE',
      subscription: {
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
    },
    select: { id: true, slug: true },
  });
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const tenant of tenants) {
    try {
      const tenantPrisma = await getTenantPrismaBySlug(tenant.slug);
      await aggregateDailyStatusForDate(tenantPrisma, tenant.slug, date);
      successCount++;
    } catch (error) {
      logger.error({ tenantSlug: tenant.slug, error: (error as Error).message }, 'Manual aggregation failed');
      errorCount++;
    }
  }
  
  return {
    date: dateKey,
    tenants: tenants.length,
    success: successCount,
    errors: errorCount,
  };
}
