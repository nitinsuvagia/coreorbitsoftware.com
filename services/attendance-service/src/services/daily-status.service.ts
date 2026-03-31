/**
 * Daily Status Aggregation Service
 * Computes and stores pre-aggregated employee daily status for fast calendar rendering.
 * 
 * Status codes:
 *   P  = Present (checked in)
 *   A  = Absent (no check-in on working day)
 *   HD = Half-Day (half-day attendance or half-day leave)
 *   L  = On Leave (approved leave)
 *   H  = Holiday
 *   WO = Week-Off (weekend or declared off day)
 */

import { PrismaClient } from '.prisma/tenant-client';
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isWeekend,
  getDay,
  subDays,
} from 'date-fns';
import { logger } from '../utils/logger';
import { getMasterPrisma } from '../utils/database';
import { getTenantPrismaBySlug } from '../utils/database';

// ============================================================================
// TYPES
// ============================================================================

export interface SessionData {
  id: string;
  checkIn: string | null;
  checkOut: string | null;
  workMinutes: number;
  status: string;
  isLate: boolean;
  isEarlyLeave: boolean;
  isRemote: boolean;
  notes: string | null;
}

export interface DailyStatusRecord {
  employeeId: string;
  date: Date;
  status: 'P' | 'A' | 'HD' | 'L' | 'H' | 'WO';
  leaveCode: string | null;
  leaveTypeId: string | null;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  workMinutes: number;
  isLate: boolean;
  isEarlyLeave: boolean;
  isRemote: boolean;
  notes: string | null;
  sessions: SessionData[];
  sessionCount: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get non-working days configuration for a tenant (e.g., [0, 6] for Sat/Sun)
 */
async function getNonWorkingDays(tenantSlug: string): Promise<number[]> {
  try {
    const masterPrisma = getMasterPrisma();
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { organizationSettings: true },
    });
    const settings = tenant?.organizationSettings as Record<string, any> | null;
    return settings?.nonWorkingDays ?? [0, 6]; // Default: Saturday (6) and Sunday (0)
  } catch (error) {
    logger.warn({ tenantSlug, error: (error as Error).message }, 'Failed to get non-working days, using default');
    return [0, 6];
  }
}

/**
 * Compute the daily status for a single employee on a single date
 * attendance param now contains aggregated data with _sessions array
 */
function computeStatus(params: {
  date: Date;
  attendance: any | null; // Aggregated attendance record with _sessions
  leave: any | null; // Approved leave covering this date
  holiday: any | null; // Holiday on this date
  isWeekOff: boolean;
}): DailyStatusRecord {
  const { date, attendance, leave, holiday, isWeekOff } = params;

  // Build sessions array from raw attendance data
  const sessions: SessionData[] = attendance?._sessions?.map((s: any) => ({
    id: s.id,
    checkIn: s.checkInTime?.toISOString?.() || s.checkInTime || null,
    checkOut: s.checkOutTime?.toISOString?.() || s.checkOutTime || null,
    workMinutes: s.workMinutes || 0,
    status: s.status || 'present',
    isLate: s.isLate || false,
    isEarlyLeave: s.isEarlyLeave || false,
    isRemote: s.isRemote || false,
    notes: s.notes || null,
  })) || [];

  // Priority: Present/Late (actual attendance) > WeekOff > Holiday > Half-Day > Leave > Absent
  // If employee actually worked (checked in), that takes priority over weekend/holiday
  
  // If employee checked in (present or late), they came to work - highest priority
  if (attendance && (attendance.status === 'present' || attendance.status === 'late')) {
    return {
      employeeId: '',
      date,
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
      sessions,
      sessionCount: sessions.length || 1,
    };
  }

  // Half-day attendance
  if (attendance?.status === 'half_day') {
    return {
      employeeId: '',
      date,
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
      sessions,
      sessionCount: sessions.length || 1,
    };
  }

  // Week-off (if no attendance recorded)
  if (isWeekOff) {
    return {
      employeeId: '',
      date,
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
      sessions: [],
      sessionCount: 0,
    };
  }

  // Holiday (if no attendance recorded)
  if (holiday) {
    return {
      employeeId: '',
      date,
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
      sessions: [],
      sessionCount: 0,
    };
  }

  // On leave (approved)
  if (leave) {
    const isHalfDayLeave = leave.isHalfDay;
    return {
      employeeId: '',
      date,
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
      sessions: [],
      sessionCount: 0,
    };
  }

  // No attendance, no leave, not holiday, not weekend = Absent
  return {
    employeeId: '',
    date,
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
    sessions: [],
    sessionCount: 0,
  };
}

// ============================================================================
// MAIN AGGREGATION FUNCTIONS
// ============================================================================

/**
 * Aggregate daily status for a specific date for all employees
 * This is called by the midnight cron job for the previous day
 */
export async function aggregateDailyStatusForDate(
  prisma: PrismaClient,
  tenantSlug: string,
  targetDate: Date
): Promise<{ processed: number; errors: number }> {
  const dateKey = format(targetDate, 'yyyy-MM-dd');
  logger.info({ tenantSlug, date: dateKey }, 'Starting daily status aggregation');

  const nonWorkingDays = await getNonWorkingDays(tenantSlug);
  const dayOfWeek = getDay(targetDate);
  const isWeekOff = nonWorkingDays.includes(dayOfWeek);

  // Get all active employees
  const employees = await prisma.employee.findMany({
    where: {
      status: { in: ['ACTIVE', 'ONBOARDING', 'ON_LEAVE', 'PROBATION', 'NOTICE_PERIOD'] },
      // Only include employees who joined on or before the target date
      joinDate: { lte: targetDate },
      // Exclude employees who exited before the target date
      OR: [
        { exitDate: null },
        { exitDate: { gte: targetDate } },
      ],
    },
    select: { id: true },
  });

  if (employees.length === 0) {
    logger.info({ tenantSlug, date: dateKey }, 'No active employees found');
    return { processed: 0, errors: 0 };
  }

  const employeeIds = employees.map((e) => e.id);

  // Fetch all attendance records for the date (can be multiple sessions per employee)
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      employeeId: { in: employeeIds },
      date: targetDate,
    },
    orderBy: { checkInTime: 'asc' },
  });
  
  // Group attendance records by employee and aggregate multiple sessions
  const attendanceByEmployee = new Map<string, any>();
  for (const record of attendanceRecords) {
    const existing = attendanceByEmployee.get(record.employeeId);
    if (!existing) {
      // First session - use as base
      attendanceByEmployee.set(record.employeeId, {
        ...record,
        // Track all sessions for proper aggregation
        _sessions: [record],
      });
    } else {
      // Additional session - merge data
      existing._sessions.push(record);
      
      // Use earliest check-in time
      if (record.checkInTime && (!existing.checkInTime || record.checkInTime < existing.checkInTime)) {
        existing.checkInTime = record.checkInTime;
      }
      
      // Use latest check-out time
      if (record.checkOutTime && (!existing.checkOutTime || record.checkOutTime > existing.checkOutTime)) {
        existing.checkOutTime = record.checkOutTime;
      }
      
      // Sum work minutes from all sessions
      existing.workMinutes = (existing.workMinutes || 0) + (record.workMinutes || 0);
      
      // If any session is present/late, the day counts as present
      if (record.status === 'present' || record.status === 'late') {
        existing.status = record.status === 'late' ? 'late' : existing.status === 'late' ? 'late' : 'present';
      }
      
      // Aggregate boolean flags (OR logic)
      existing.isLate = existing.isLate || record.isLate;
      existing.isRemote = existing.isRemote || record.isRemote;
      existing.isEarlyLeave = existing.isEarlyLeave || record.isEarlyLeave;
    }
  }

  // Fetch all approved leaves covering this date
  const leaveRecords = await prisma.leaveRequest.findMany({
    where: {
      employeeId: { in: employeeIds },
      status: 'APPROVED',
      fromDate: { lte: targetDate },
      toDate: { gte: targetDate },
    },
    include: {
      leaveType: { select: { code: true, name: true } },
    },
  });
  const leaveByEmployee = new Map(
    leaveRecords.map((l) => [l.employeeId, l])
  );

  // Fetch holiday for this date (if any)
  const holiday = await prisma.holiday.findFirst({
    where: {
      date: targetDate,
      type: 'PUBLIC', // Only public holidays count as "H"
    },
  });

  let processed = 0;
  let errors = 0;

  // Process each employee
  for (const emp of employees) {
    try {
      const attendance = attendanceByEmployee.get(emp.id) || null;
      const leave = leaveByEmployee.get(emp.id) || null;

      const statusRecord = computeStatus({
        date: targetDate,
        attendance,
        leave,
        holiday,
        isWeekOff,
      });
      statusRecord.employeeId = emp.id;

      // Upsert into employee_daily_status
      await prisma.employeeDailyStatus.upsert({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: targetDate,
          },
        },
        create: {
          employeeId: emp.id,
          date: targetDate,
          status: statusRecord.status,
          leaveCode: statusRecord.leaveCode,
          leaveTypeId: statusRecord.leaveTypeId,
          checkInTime: statusRecord.checkInTime,
          checkOutTime: statusRecord.checkOutTime,
          workMinutes: statusRecord.workMinutes,
          isLate: statusRecord.isLate,
          isEarlyLeave: statusRecord.isEarlyLeave,
          isRemote: statusRecord.isRemote,
          sessions: statusRecord.sessions.length > 0 ? statusRecord.sessions : undefined,
          sessionCount: statusRecord.sessionCount,
          sourceType: 'computed',
          notes: statusRecord.notes,
          computedAt: new Date(),
        },
        update: {
          status: statusRecord.status,
          leaveCode: statusRecord.leaveCode,
          leaveTypeId: statusRecord.leaveTypeId,
          checkInTime: statusRecord.checkInTime,
          checkOutTime: statusRecord.checkOutTime,
          workMinutes: statusRecord.workMinutes,
          isLate: statusRecord.isLate,
          isEarlyLeave: statusRecord.isEarlyLeave,
          isRemote: statusRecord.isRemote,
          sessions: statusRecord.sessions.length > 0 ? statusRecord.sessions : undefined,
          sessionCount: statusRecord.sessionCount,
          notes: statusRecord.notes,
          computedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      processed++;
    } catch (error) {
      logger.error(
        { employeeId: emp.id, date: dateKey, error: (error as Error).message },
        'Failed to aggregate daily status for employee'
      );
      errors++;
    }
  }

  logger.info({ tenantSlug, date: dateKey, processed, errors }, 'Daily status aggregation complete');
  return { processed, errors };
}

/**
 * Recalculate daily status for a specific employee and date range
 * Called when attendance/leave is modified
 */
export async function recalculateDailyStatus(
  prisma: PrismaClient,
  tenantSlug: string,
  employeeId: string,
  fromDate: Date,
  toDate: Date
): Promise<{ processed: number; errors: number }> {
  logger.info(
    { tenantSlug, employeeId, from: format(fromDate, 'yyyy-MM-dd'), to: format(toDate, 'yyyy-MM-dd') },
    'Recalculating daily status for employee'
  );

  const nonWorkingDays = await getNonWorkingDays(tenantSlug);
  const days = eachDayOfInterval({ start: fromDate, end: toDate });

  // Fetch all attendance records for the date range (can be multiple sessions per day)
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      employeeId,
      date: { gte: fromDate, lte: toDate },
    },
    orderBy: { checkInTime: 'asc' },
  });
  
  // Group and aggregate multiple sessions per date
  const attendanceByDate = new Map<string, any>();
  for (const record of attendanceRecords) {
    const dateKey = format(record.date, 'yyyy-MM-dd');
    const existing = attendanceByDate.get(dateKey);
    if (!existing) {
      attendanceByDate.set(dateKey, {
        ...record,
        _sessions: [record],
      });
    } else {
      existing._sessions.push(record);
      
      // Use earliest check-in time
      if (record.checkInTime && (!existing.checkInTime || record.checkInTime < existing.checkInTime)) {
        existing.checkInTime = record.checkInTime;
      }
      
      // Use latest check-out time
      if (record.checkOutTime && (!existing.checkOutTime || record.checkOutTime > existing.checkOutTime)) {
        existing.checkOutTime = record.checkOutTime;
      }
      
      // Sum work minutes from all sessions
      existing.workMinutes = (existing.workMinutes || 0) + (record.workMinutes || 0);
      
      // If any session is present/late, the day counts as present
      if (record.status === 'present' || record.status === 'late') {
        existing.status = record.status === 'late' ? 'late' : existing.status === 'late' ? 'late' : 'present';
      }
      
      // Aggregate boolean flags
      existing.isLate = existing.isLate || record.isLate;
      existing.isRemote = existing.isRemote || record.isRemote;
      existing.isEarlyLeave = existing.isEarlyLeave || record.isEarlyLeave;
    }
  }

  // Fetch all approved leaves covering this date range
  const leaveRecords = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      fromDate: { lte: toDate },
      toDate: { gte: fromDate },
    },
    include: {
      leaveType: { select: { code: true, name: true } },
    },
  });

  // Build leave lookup by date
  const leaveByDate = new Map<string, typeof leaveRecords[0]>();
  for (const leave of leaveRecords) {
    const leaveDays = eachDayOfInterval({
      start: new Date(leave.fromDate),
      end: new Date(leave.toDate),
    });
    for (const d of leaveDays) {
      const dk = format(d, 'yyyy-MM-dd');
      if (!leaveByDate.has(dk)) {
        leaveByDate.set(dk, leave);
      }
    }
  }

  // Fetch holidays in range
  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: fromDate, lte: toDate },
      type: 'PUBLIC',
    },
  });
  const holidayByDate = new Map(
    holidays.map((h) => [format(h.date, 'yyyy-MM-dd'), h])
  );

  let processed = 0;
  let errors = 0;

  for (const day of days) {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayOfWeek = getDay(day);
    const isWeekOff = nonWorkingDays.includes(dayOfWeek);

    try {
      const attendance = attendanceByDate.get(dateKey) || null;
      const leave = leaveByDate.get(dateKey) || null;
      const holiday = holidayByDate.get(dateKey) || null;

      const statusRecord = computeStatus({ date: day, attendance, leave, holiday, isWeekOff });
      statusRecord.employeeId = employeeId;

      await prisma.employeeDailyStatus.upsert({
        where: {
          employeeId_date: {
            employeeId,
            date: day,
          },
        },
        create: {
          employeeId,
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
          sessions: statusRecord.sessions.length > 0 ? statusRecord.sessions : undefined,
          sessionCount: statusRecord.sessionCount,
          sourceType: 'computed',
          notes: statusRecord.notes,
          computedAt: new Date(),
        },
        update: {
          status: statusRecord.status,
          leaveCode: statusRecord.leaveCode,
          leaveTypeId: statusRecord.leaveTypeId,
          checkInTime: statusRecord.checkInTime,
          checkOutTime: statusRecord.checkOutTime,
          workMinutes: statusRecord.workMinutes,
          isLate: statusRecord.isLate,
          isEarlyLeave: statusRecord.isEarlyLeave,
          isRemote: statusRecord.isRemote,
          sessions: statusRecord.sessions.length > 0 ? statusRecord.sessions : undefined,
          sessionCount: statusRecord.sessionCount,
          notes: statusRecord.notes,
          computedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      processed++;
    } catch (error) {
      logger.error(
        { employeeId, date: dateKey, error: (error as Error).message },
        'Failed to recalculate daily status'
      );
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * Backfill historical data for all employees
 * Run once during migration
 */
export async function backfillDailyStatus(
  prisma: PrismaClient,
  tenantSlug: string,
  fromDate: Date,
  toDate: Date
): Promise<{ processed: number; errors: number }> {
  logger.info(
    { tenantSlug, from: format(fromDate, 'yyyy-MM-dd'), to: format(toDate, 'yyyy-MM-dd') },
    'Backfilling daily status for all employees'
  );

  const days = eachDayOfInterval({ start: fromDate, end: toDate });
  let totalProcessed = 0;
  let totalErrors = 0;

  // Process day by day to avoid memory issues with large date ranges
  for (const day of days) {
    const result = await aggregateDailyStatusForDate(prisma, tenantSlug, day);
    totalProcessed += result.processed;
    totalErrors += result.errors;
  }

  logger.info(
    { tenantSlug, totalProcessed, totalErrors },
    'Backfill complete'
  );

  return { processed: totalProcessed, errors: totalErrors };
}

/**
 * Get pre-aggregated daily status for calendar view
 * Returns data for given date range
 */
export async function getDailyStatusForCalendar(
  prisma: PrismaClient,
  fromDate: Date,
  toDate: Date,
  employeeIds?: string[]
): Promise<any[]> {
  const where: any = {
    date: { gte: fromDate, lte: toDate },
  };
  
  if (employeeIds && employeeIds.length > 0) {
    where.employeeId = { in: employeeIds };
  }

  const statuses = await prisma.employeeDailyStatus.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          avatar: true,
          department: { select: { name: true, code: true } },
          designation: { select: { name: true } },
          status: true,
        },
      },
    },
    orderBy: [
      { employeeId: 'asc' },
      { date: 'asc' },
    ],
  });

  return statuses;
}
