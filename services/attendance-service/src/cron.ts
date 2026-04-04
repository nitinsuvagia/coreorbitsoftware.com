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

/**
 * Auto-close open attendance sessions for a given date.
 * If an employee checked in but never checked out, set:
 *   check_out_time = check_in_time + 9 hours + random(3..18) minutes
 *   work_minutes   = 540 + that same random offset
 */
async function autoCloseOpenSessions(
  prisma: any,
  tenantSlug: string,
  dateKey: string
): Promise<void> {
  try {
    const openSessions = await prisma.attendance.findMany({
      where: {
        date: new Date(dateKey),
        checkOutTime: null,
        checkInTime: { not: null },
      },
      select: { id: true, employeeId: true, checkInTime: true },
    });

    if (openSessions.length === 0) return;

    logger.info(
      { tenantSlug, date: dateKey, count: openSessions.length },
      'Auto-closing open attendance sessions'
    );

    for (const session of openSessions) {
      // Get all CLOSED sessions for this employee on the same date
      const closedSessions = await prisma.attendance.findMany({
        where: {
          employeeId: session.employeeId,
          date: new Date(dateKey),
          checkOutTime: { not: null },
        },
        select: { workMinutes: true },
      });

      // Sum up already-worked minutes from closed sessions
      const alreadyWorked = closedSessions.reduce(
        (sum: number, s: any) => sum + (s.workMinutes || 0),
        0
      );

      // Target: 540 min (9 hrs) + random 3-18 min for the whole day
      const randomMinutes = Math.floor(Math.random() * 16) + 3; // 3..18
      const totalDayTarget = 540 + randomMinutes;

      // This open session should fill the remaining gap
      const sessionMinutes = Math.max(60, totalDayTarget - alreadyWorked); // min 1 hour

      const checkIn = new Date(session.checkInTime);
      const checkOut = new Date(checkIn.getTime() + sessionMinutes * 60000);

      await prisma.attendance.update({
        where: { id: session.id },
        data: {
          checkOutTime: checkOut,
          workMinutes: sessionMinutes,
          updatedAt: new Date(),
        },
      });

      logger.debug(
        {
          tenantSlug,
          employeeId: session.employeeId,
          date: dateKey,
          alreadyWorked,
          sessionMinutes,
          totalDay: alreadyWorked + sessionMinutes,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
        },
        'Auto-closed open session'
      );
    }

    logger.info(
      { tenantSlug, date: dateKey, closed: openSessions.length },
      'Auto-close open sessions complete'
    );
  } catch (error) {
    logger.error(
      { tenantSlug, date: dateKey, error: (error as Error).message },
      'Failed to auto-close open sessions'
    );
  }
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

        // Auto-checkout: close any open sessions (check_out_time IS NULL) for yesterday
        // Sets checkout = check_in + 9hrs + random 3-18 min, work_minutes accordingly
        await autoCloseOpenSessions(tenantPrisma, tenant.slug, dateKey);

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
