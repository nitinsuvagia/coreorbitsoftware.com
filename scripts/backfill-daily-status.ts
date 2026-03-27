/**
 * Backfill Script: Populate employee_daily_status table with historical data
 * 
 * This script should be run once after the migration to populate the new
 * employee_daily_status table with historical attendance data.
 * 
 * Usage:
 *   npx tsx scripts/backfill-daily-status.ts [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--tenant SLUG]
 * 
 * Options:
 *   --from    Start date for backfill (default: 2024-01-01)
 *   --to      End date for backfill (default: yesterday)
 *   --tenant  Specific tenant slug (default: all active tenants)
 * 
 * Examples:
 *   npx tsx scripts/backfill-daily-status.ts
 *   npx tsx scripts/backfill-daily-status.ts --from 2025-01-01 --to 2025-12-31
 *   npx tsx scripts/backfill-daily-status.ts --tenant acme-corp
 */

import { PrismaClient } from '@prisma/client';
import {
  format,
  parseISO,
  subDays,
  eachDayOfInterval,
  getDay,
} from 'date-fns';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_START_DATE = '2024-01-01';

// Parse command line arguments
function parseArgs(): { from: string; to: string; tenant?: string } {
  const args = process.argv.slice(2);
  let from = DEFAULT_START_DATE;
  let to = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  let tenant: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) {
      from = args[i + 1];
      i++;
    } else if (args[i] === '--to' && args[i + 1]) {
      to = args[i + 1];
      i++;
    } else if (args[i] === '--tenant' && args[i + 1]) {
      tenant = args[i + 1];
      i++;
    }
  }

  return { from, to, tenant };
}

// ============================================================================
// MAIN BACKFILL LOGIC
// ============================================================================

interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  dbConnectionString: string;
}

async function getTenants(masterPrisma: PrismaClient, tenantSlug?: string): Promise<TenantInfo[]> {
  const where: any = {
    status: 'ACTIVE',
  };
  
  if (tenantSlug) {
    where.slug = tenantSlug;
  }

  const tenants = await masterPrisma.tenant.findMany({
    where,
    select: {
      id: true,
      slug: true,
      name: true,
      dbConnectionString: true,
    },
  });

  return tenants as TenantInfo[];
}

async function getNonWorkingDays(masterPrisma: PrismaClient, tenantSlug: string): Promise<number[]> {
  try {
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { organizationSettings: true },
    });
    const settings = tenant?.organizationSettings as Record<string, any> | null;
    return settings?.nonWorkingDays ?? [0, 6];
  } catch {
    return [0, 6];
  }
}

function computeStatus(params: {
  attendance: any | null;
  leave: any | null;
  holiday: any | null;
  isWeekOff: boolean;
}): {
  status: string;
  leaveCode: string | null;
  leaveTypeId: string | null;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  workMinutes: number;
  isLate: boolean;
  isEarlyLeave: boolean;
  isRemote: boolean;
  notes: string | null;
} {
  const { attendance, leave, holiday, isWeekOff } = params;

  if (isWeekOff) {
    return {
      status: 'WO',
      leaveCode: null,
      leaveTypeId: null,
      checkInTime: null,
      checkOutTime: null,
      workMinutes: 0,
      isLate: false,
      isEarlyLeave: false,
      isRemote: false,
      notes: 'Week-off day',
    };
  }

  if (holiday) {
    return {
      status: 'H',
      leaveCode: null,
      leaveTypeId: null,
      checkInTime: null,
      checkOutTime: null,
      workMinutes: 0,
      isLate: false,
      isEarlyLeave: false,
      isRemote: false,
      notes: holiday.name,
    };
  }

  if (attendance && (attendance.status === 'present' || attendance.status === 'late')) {
    return {
      status: 'P',
      leaveCode: null,
      leaveTypeId: null,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      workMinutes: attendance.workMinutes || 0,
      isLate: attendance.isLate || false,
      isEarlyLeave: attendance.isEarlyLeave || false,
      isRemote: attendance.isRemote || false,
      notes: attendance.notes,
    };
  }

  if (attendance?.status === 'half_day') {
    return {
      status: 'HD',
      leaveCode: leave?.leaveType?.code || null,
      leaveTypeId: leave?.leaveTypeId || null,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      workMinutes: attendance.workMinutes || 0,
      isLate: attendance.isLate || false,
      isEarlyLeave: attendance.isEarlyLeave || false,
      isRemote: attendance.isRemote || false,
      notes: attendance.notes,
    };
  }

  if (leave) {
    const isHalfDayLeave = leave.isHalfDay;
    return {
      status: isHalfDayLeave ? 'HD' : 'L',
      leaveCode: leave.leaveType?.code || null,
      leaveTypeId: leave.leaveTypeId,
      checkInTime: null,
      checkOutTime: null,
      workMinutes: 0,
      isLate: false,
      isEarlyLeave: false,
      isRemote: false,
      notes: `${leave.leaveType?.name || 'Leave'}${isHalfDayLeave ? ' (half-day)' : ''}`,
    };
  }

  return {
    status: 'A',
    leaveCode: null,
    leaveTypeId: null,
    checkInTime: null,
    checkOutTime: null,
    workMinutes: 0,
    isLate: false,
    isEarlyLeave: false,
    isRemote: false,
    notes: null,
  };
}

async function backfillTenant(
  masterPrisma: PrismaClient,
  tenant: TenantInfo,
  fromDate: Date,
  toDate: Date
): Promise<{ processed: number; errors: number }> {
  console.log(`\n📊 Processing tenant: ${tenant.name} (${tenant.slug})`);
  
  // Connect to tenant database
  const tenantPrisma = new PrismaClient({
    datasources: {
      db: { url: tenant.dbConnectionString },
    },
  });

  try {
    await tenantPrisma.$connect();

    const nonWorkingDays = await getNonWorkingDays(masterPrisma, tenant.slug);
    const days = eachDayOfInterval({ start: fromDate, end: toDate });
    
    console.log(`   Date range: ${format(fromDate, 'yyyy-MM-dd')} to ${format(toDate, 'yyyy-MM-dd')} (${days.length} days)`);

    // Get all employees
    const employees = await tenantPrisma.employee.findMany({
      where: {
        status: { in: ['ACTIVE', 'ONBOARDING', 'ON_LEAVE', 'PROBATION', 'NOTICE_PERIOD'] },
      },
      select: { id: true, joinDate: true, exitDate: true },
    });
    console.log(`   Employees: ${employees.length}`);

    // Fetch all attendance records in range
    const attendanceRecords = await tenantPrisma.attendance.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
      },
    });
    const attendanceByEmpDate = new Map<string, any>();
    for (const rec of attendanceRecords) {
      const key = `${rec.employeeId}_${format(rec.date, 'yyyy-MM-dd')}`;
      attendanceByEmpDate.set(key, rec);
    }
    console.log(`   Attendance records: ${attendanceRecords.length}`);

    // Fetch all approved leaves in range
    const leaveRecords = await tenantPrisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        fromDate: { lte: toDate },
        toDate: { gte: fromDate },
      },
      include: {
        leaveType: { select: { code: true, name: true } },
      },
    });
    const leaveByEmpDate = new Map<string, any>();
    for (const leave of leaveRecords) {
      const leaveDays = eachDayOfInterval({
        start: new Date(leave.fromDate),
        end: new Date(leave.toDate),
      });
      for (const d of leaveDays) {
        const key = `${leave.employeeId}_${format(d, 'yyyy-MM-dd')}`;
        if (!leaveByEmpDate.has(key)) {
          leaveByEmpDate.set(key, leave);
        }
      }
    }
    console.log(`   Leave records: ${leaveRecords.length}`);

    // Fetch holidays in range
    const holidays = await tenantPrisma.holiday.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        type: 'PUBLIC',
      },
    });
    const holidayByDate = new Map<string, any>();
    for (const h of holidays) {
      holidayByDate.set(format(h.date, 'yyyy-MM-dd'), h);
    }
    console.log(`   Holidays: ${holidays.length}`);

    let processed = 0;
    let errors = 0;
    let batchData: any[] = [];
    const BATCH_SIZE = 500;

    // Process each employee for each day
    for (const emp of employees) {
      const empJoinDate = new Date(emp.joinDate);
      const empExitDate = emp.exitDate ? new Date(emp.exitDate) : null;

      for (const day of days) {
        // Skip if employee hadn't joined or had exited
        if (day < empJoinDate) continue;
        if (empExitDate && day > empExitDate) continue;

        const dateKey = format(day, 'yyyy-MM-dd');
        const dayOfWeek = getDay(day);
        const isWeekOff = nonWorkingDays.includes(dayOfWeek);

        const empDateKey = `${emp.id}_${dateKey}`;
        const attendance = attendanceByEmpDate.get(empDateKey) || null;
        const leave = leaveByEmpDate.get(empDateKey) || null;
        const holiday = holidayByDate.get(dateKey) || null;

        try {
          const statusRecord = computeStatus({ attendance, leave, holiday, isWeekOff });

          batchData.push({
            employeeId: emp.id,
            date: day,
            status: statusRecord.status,
            leaveCode: statusRecord.leaveCode,
            leaveTypeId: statusRecord.leaveTypeId,
            checkInTime: statusRecord.checkInTime,
            checkOutTime: statusRecord.checkOutTime,
            workMinutes: statusRecord.workMinutes,
            isLate: statusRecord.isLate,
            isEarlyLeave: statusRecord.isEarlyLeave,
            isRemote: statusRecord.isRemote,
            sourceType: 'computed',
            notes: statusRecord.notes,
            computedAt: new Date(),
          });

          // Batch insert/upsert
          if (batchData.length >= BATCH_SIZE) {
            await upsertBatch(tenantPrisma, batchData);
            processed += batchData.length;
            process.stdout.write(`\r   Progress: ${processed} records processed...`);
            batchData = [];
          }
        } catch (error) {
          errors++;
        }
      }
    }

    // Insert remaining batch
    if (batchData.length > 0) {
      await upsertBatch(tenantPrisma, batchData);
      processed += batchData.length;
    }

    console.log(`\n   ✅ Completed: ${processed} records, ${errors} errors`);
    return { processed, errors };

  } finally {
    await tenantPrisma.$disconnect();
  }
}

async function upsertBatch(prisma: PrismaClient, records: any[]): Promise<void> {
  // Use raw SQL for efficient bulk upsert
  for (const record of records) {
    await prisma.$executeRaw`
      INSERT INTO employee_daily_status (
        id, employee_id, date, status, leave_code, leave_type_id,
        check_in_time, check_out_time, work_minutes,
        is_late, is_early_leave, is_remote,
        source_type, notes, computed_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${record.employeeId}::uuid,
        ${record.date}::date,
        ${record.status},
        ${record.leaveCode},
        ${record.leaveTypeId}::uuid,
        ${record.checkInTime}::timestamp,
        ${record.checkOutTime}::timestamp,
        ${record.workMinutes},
        ${record.isLate},
        ${record.isEarlyLeave},
        ${record.isRemote},
        ${record.sourceType},
        ${record.notes},
        ${record.computedAt}::timestamp,
        NOW(),
        NOW()
      )
      ON CONFLICT (employee_id, date) DO UPDATE SET
        status = EXCLUDED.status,
        leave_code = EXCLUDED.leave_code,
        leave_type_id = EXCLUDED.leave_type_id,
        check_in_time = EXCLUDED.check_in_time,
        check_out_time = EXCLUDED.check_out_time,
        work_minutes = EXCLUDED.work_minutes,
        is_late = EXCLUDED.is_late,
        is_early_leave = EXCLUDED.is_early_leave,
        is_remote = EXCLUDED.is_remote,
        notes = EXCLUDED.notes,
        computed_at = EXCLUDED.computed_at,
        updated_at = NOW()
    `;
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('       BACKFILL EMPLOYEE DAILY STATUS                              ');
  console.log('════════════════════════════════════════════════════════════════════');

  const { from, to, tenant } = parseArgs();
  const fromDate = parseISO(from);
  const toDate = parseISO(to);

  console.log(`\nConfiguration:`);
  console.log(`  From: ${from}`);
  console.log(`  To:   ${to}`);
  console.log(`  Tenant: ${tenant || 'all active tenants'}`);

  // Connect to master database
  const masterPrisma = new PrismaClient();
  await masterPrisma.$connect();
  console.log(`\n✓ Connected to master database`);

  try {
    const tenants = await getTenants(masterPrisma, tenant);
    console.log(`\n📋 Found ${tenants.length} tenant(s) to process`);

    if (tenants.length === 0) {
      console.log('\n⚠️  No tenants found. Exiting.');
      return;
    }

    let totalProcessed = 0;
    let totalErrors = 0;

    for (const t of tenants) {
      try {
        const result = await backfillTenant(masterPrisma, t, fromDate, toDate);
        totalProcessed += result.processed;
        totalErrors += result.errors;
      } catch (error) {
        console.error(`   ❌ Error processing ${t.slug}: ${(error as Error).message}`);
        totalErrors++;
      }
    }

    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log('                           SUMMARY                                  ');
    console.log('════════════════════════════════════════════════════════════════════');
    console.log(`  Tenants processed: ${tenants.length}`);
    console.log(`  Total records:     ${totalProcessed}`);
    console.log(`  Total errors:      ${totalErrors}`);
    console.log('════════════════════════════════════════════════════════════════════');

  } finally {
    await masterPrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
