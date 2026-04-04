/**
 * Cron Jobs for Attendance Service
 * 
 * Scheduled tasks:
 * - Midnight aggregation: Compute daily status for the previous day
 * - Leave carry-forward: Process year-end leave carry-forward on April 1
 */

import cron from 'node-cron';
import { subDays, format } from 'date-fns';
import { logger } from './utils/logger';
import { aggregateDailyStatusForDate } from './services/daily-status.service';
import { processLeaveCarryForward } from './services/leave.service';
import { getMasterPrisma } from './utils/database';
import { getTenantPrismaBySlug } from './utils/database';

/**
 * Get the current date/time in IST (UTC+5:30).
 * The cron runs in IST timezone, so we need IST "now" to correctly
 * compute "yesterday" relative to the Indian business day.
 */
function getNowInIST(): Date {
  const now = new Date();
  // IST offset = +5:30 = +330 minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 330 * 60000);
}

// ============================================================================
// CRON JOB: MIDNIGHT DAILY STATUS AGGREGATION
// ============================================================================

/**
 * Run daily status aggregation for all tenants
 * Triggered at 00:05 AM every day (5 minutes after midnight to ensure all check-outs are recorded)
 */
async function runDailyStatusAggregation(): Promise<void> {
  // Use IST "now" so that subDays gives yesterday in IST, not UTC
  const nowInIST = getNowInIST();
  const yesterday = subDays(nowInIST, 1);
  const dateKey = format(yesterday, 'yyyy-MM-dd');
  
  logger.info({ date: dateKey }, 'Starting scheduled daily status aggregation for all tenants');
  
  try {
    // Get all active tenants
    const masterPrisma = getMasterPrisma();
    const tenants = await masterPrisma.tenant.findMany({
      where: { 
        status: { in: ['ACTIVE', 'TRIAL'] },
        subscription: {
          status: { in: ['ACTIVE', 'TRIALING'] },
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
let leaveCarryForwardJob: cron.ScheduledTask | null = null;

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs(): void {
  logger.info('Initializing attendance service cron jobs...');
  
  // ---- Daily Status Aggregation ----
  // Run at 00:05 AM UTC every day
  // Date calculation uses IST to determine "yesterday" for Indian business day
  midnightAggregationJob = cron.schedule('5 0 * * *', async () => {
    logger.info('Midnight cron job triggered (UTC)');
    await runDailyStatusAggregation();
  }, {
    scheduled: true,
    timezone: 'UTC',
  });
  
  logger.info('Cron: daily status aggregation scheduled at 00:05 UTC (05:35 IST)');

  // ---- Leave Carry-Forward ----
  // Run on April 1 at 01:00 AM IST every year (financial year starts April)
  // Carries forward remaining leave balances from previous FY to new FY
  leaveCarryForwardJob = cron.schedule('0 1 1 4 *', async () => {
    logger.info('Leave carry-forward cron job triggered');
    await runLeaveCarryForwardForAllTenants();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  logger.info('Cron: leave carry-forward scheduled at 01:00 IST on April 1 every year');
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

  if (leaveCarryForwardJob) {
    leaveCarryForwardJob.stop();
    leaveCarryForwardJob = null;
  }
  
  logger.info('Cron jobs stopped');
}

// ============================================================================
// LEAVE CARRY-FORWARD: AUTO-RUN FOR ALL TENANTS
// ============================================================================

/**
 * Run leave carry-forward for ALL active tenants.
 * Called automatically by the April 1 cron job.
 * Previous year = currentYear - 1, new year = currentYear.
 */
async function runLeaveCarryForwardForAllTenants(): Promise<void> {
  const now = new Date();
  const newYear = now.getFullYear();     // e.g. 2026
  const previousYear = newYear - 1;      // e.g. 2025

  logger.info({ previousYear, newYear }, 'Starting leave carry-forward for all tenants');

  try {
    const masterPrisma = getMasterPrisma();
    const tenants = await masterPrisma.tenant.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        subscription: {
          status: { in: ['ACTIVE', 'TRIALING'] },
        },
      },
      select: { id: true, slug: true, name: true },
    });

    logger.info({ tenantCount: tenants.length }, 'Found active tenants for carry-forward');

    let successCount = 0;
    let errorCount = 0;

    for (const tenant of tenants) {
      try {
        const tenantPrisma = await getTenantPrismaBySlug(tenant.slug);
        const result = await processLeaveCarryForward(tenantPrisma, previousYear, newYear, false);

        logger.info(
          {
            tenantSlug: tenant.slug,
            previousYear,
            newYear,
            carryForwardsApplied: result.carryForwardsApplied,
            employeesProcessed: result.employeesProcessed,
          },
          'Leave carry-forward completed for tenant'
        );
        successCount++;
      } catch (error) {
        logger.error(
          { tenantSlug: tenant.slug, error: (error as Error).message },
          'Failed to process leave carry-forward for tenant'
        );
        errorCount++;
      }
    }

    logger.info(
      { previousYear, newYear, successCount, errorCount, totalTenants: tenants.length },
      'Leave carry-forward for all tenants complete'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message },
      'Critical error in leave carry-forward cron'
    );
  }
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
      status: { in: ['ACTIVE', 'TRIAL'] },
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
