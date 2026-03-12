/**
 * Attendance Service - Check-in, Check-out, and Time Tracking
 */

import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuidv4 } from 'uuid';
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  differenceInMinutes,
  format,
  parseISO,
  isWeekend,
  eachDayOfInterval,
} from 'date-fns';
import { getEventBus, SQS_QUEUES } from '@oms/event-bus';
import { logger } from '../utils/logger';
import { config } from '../config';
import { getMasterPrisma } from '../utils/database';

// ============================================================================
// TYPES
// ============================================================================

export interface CheckInInput {
  employeeId: string;
  location?: { lat: number; lng: number };
  deviceInfo?: string;
  notes?: string;
  isRemote?: boolean;
}

export interface CheckOutInput {
  attendanceId: string;
  location?: { lat: number; lng: number };
  notes?: string;
}

export interface BreakInput {
  attendanceId: string;
  breakType: 'lunch' | 'short' | 'other';
  notes?: string;
}

export interface AttendanceFilters {
  employeeId?: string;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  page?: number;
  pageSize?: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: Date;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  workMinutes: number;
  overtimeMinutes: number;
  status: string;
  isLate: boolean;
  isEarlyLeave: boolean;
}

// ============================================================================
// TIMEZONE HELPERS
// ============================================================================

/**
 * Get the organization timezone for a tenant.
 * Falls back to 'Asia/Kolkata' if not set.
 */
async function getTenantTimezone(tenantSlug: string): Promise<string> {
  try {
    const masterPrisma = getMasterPrisma();
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true },
    });
    return (tenant?.settings as any)?.timezone || 'Asia/Kolkata';
  } catch (error) {
    logger.warn({ error }, 'Failed to get tenant timezone, using default');
    return 'Asia/Kolkata';
  }
}

/**
 * Get today's date (midnight UTC) for a given IANA timezone.
 * e.g. if timezone is 'Asia/Kolkata' and it's 1:00 AM IST March 3,
 * returns 2026-03-03T00:00:00.000Z
 */
function getDateInTimezone(timezone: string, date?: Date): Date {
  const now = date || new Date();
  // Use Intl.DateTimeFormat with en-CA locale to get YYYY-MM-DD in the target timezone
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse work time from HH:mm format
 */

function parseWorkTime(timeStr: string, date: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Calculate work minutes excluding breaks
 */
function calculateWorkMinutes(
  checkIn: Date,
  checkOut: Date,
  breakMinutes: number
): number {
  const totalMinutes = differenceInMinutes(checkOut, checkIn);
  return Math.max(0, totalMinutes - breakMinutes);
}

/**
 * Calculate overtime minutes
 */
function calculateOvertimeMinutes(workMinutes: number): number {
  const standardMinutes = config.workHours.standardHoursPerDay * 60;
  const overtime = workMinutes - standardMinutes;
  
  if (overtime < config.overtime.minMinutesForOvertime) {
    return 0;
  }
  
  const maxOvertimeMinutes = config.overtime.maxOvertimeHoursPerDay * 60;
  return Math.min(overtime, maxOvertimeMinutes);
}

/**
 * Determine attendance status
 */
function determineStatus(
  checkIn: Date | null,
  checkOut: Date | null,
  workMinutes: number,
  isOnLeave: boolean
): string {
  if (isOnLeave) return 'on_leave';
  if (!checkIn) return 'absent';
  
  const halfDayMinutes = (config.workHours.standardHoursPerDay * 60) / 2;
  
  if (workMinutes < halfDayMinutes) return 'half_day';
  return 'present';
}

/**
 * Check if employee is late
 */
function checkIsLate(checkInTime: Date): boolean {
  const workStart = parseWorkTime(config.workHours.workStartTime, checkInTime);
  const graceEnd = new Date(workStart.getTime() + config.workHours.graceMinutesLate * 60000);
  return checkInTime > graceEnd;
}

// ============================================================================
// ATTENDANCE OPERATIONS
// ============================================================================

/**
 * Check in an employee
 */
export async function checkIn(
  prisma: PrismaClient,
  input: CheckInInput,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('attendance-service');
  // Use org timezone to determine today's calendar date
  const now = new Date();
  const timezone = await getTenantTimezone(tenantContext.tenantSlug);
  const today = getDateInTimezone(timezone, now);
  
  // Check if employee exists and is active
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  
  if (!employee || employee.status !== 'ACTIVE') {
    throw new Error('Employee not found or inactive');
  }
  
  // Check for ANY open (not checked-out) session across all dates.
  // This prevents a second active session when the employee forgot to
  // check out on a previous day (the old code only checked today's date,
  // allowing two simultaneous open sessions on different dates).
  const openSession = await prisma.attendance.findFirst({
    where: {
      employeeId: input.employeeId,
      checkOutTime: null,
      checkInTime: { not: null },
    },
    orderBy: { checkInTime: 'desc' },
  });

  if (openSession) {
    if (openSession.date.toDateString() === today.toDateString()) {
      // Same day — employee is already checked in today
      throw new Error('Already checked in. Please check out first.');
    }
    // Different day — employee forgot to check out yesterday (or earlier).
    // Auto-close the dangling session at end-of-day (23:59:59) of its own date
    // so it doesn't block today's check-in and the record stays meaningful.
    const endOfSessionDay = new Date(openSession.date);
    endOfSessionDay.setHours(23, 59, 59, 999);
    const checkInMs = openSession.checkInTime ? new Date(openSession.checkInTime).getTime() : endOfSessionDay.getTime();
    const workMinutes = Math.round((endOfSessionDay.getTime() - checkInMs) / 60000);
    await prisma.attendance.update({
      where: { id: openSession.id },
      data: {
        checkOutTime: endOfSessionDay,
        workMinutes: Math.max(0, workMinutes),
        status: 'present',
        notes: openSession.notes
          ? `${openSession.notes} [Auto closed — no checkout]`
          : '[Auto closed — no checkout]',
        updatedBy: input.employeeId,
      },
    });
    logger.warn(
      { attendanceId: openSession.id, employeeId: input.employeeId, date: openSession.date },
      'Auto-closed dangling attendance session from previous day before new check-in'
    );
  }
  
  // Only the first session of the day determines if the employee is late.
  // Subsequent sessions (after checkout + re-checkin) are not marked late.
  const existingSessionToday = await prisma.attendance.findFirst({
    where: { employeeId: input.employeeId, date: today },
    orderBy: { checkInTime: 'asc' },
  });
  const isLate = existingSessionToday ? false : checkIsLate(now);
  
  const attendance = await prisma.attendance.create({
    data: {
      id: uuidv4(),
      employeeId: input.employeeId,
      date: today,
      checkInTime: now,
      checkInLocation: input.location || {},
      checkInDevice: input.deviceInfo,
      isRemote: input.isRemote || false,
      isLate,
      status: 'present',
      notes: input.notes,
      createdBy: input.employeeId,
      updatedBy: input.employeeId,
    },
    include: {
      employee: {
        include: {
          user: { select: { firstName: true, lastName: true } },
          department: { select: { name: true } },
        },
      },
    },
  });
  
  // Emit check-in event (best-effort — don't fail the check-in if the event bus is unavailable)
  try {
    await eventBus.sendToQueue(
      SQS_QUEUES.ATTENDANCE_CHECK_IN,
      'attendance.check_in',
      {
        attendanceId: attendance.id,
        employeeId: input.employeeId,
        checkInTime: now.toISOString(),
        location: input.location,
        deviceInfo: input.deviceInfo,
        isRemote: input.isRemote || false,
        isLate,
      },
      tenantContext
    );
  } catch (eventError) {
    logger.warn({ error: (eventError as Error).message, attendanceId: attendance.id }, 'Failed to emit check-in event — attendance was still recorded');
  }

  logger.info({
    attendanceId: attendance.id,
    employeeId: input.employeeId,
    isLate,
  }, 'Employee checked in');
  
  return attendance;
}

/**
 * Check out an employee
 */
export async function checkOut(
  prisma: PrismaClient,
  input: CheckOutInput,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('attendance-service');
  
  const attendance = await prisma.attendance.findUnique({
    where: { id: input.attendanceId },
  });
  
  if (!attendance) {
    throw new Error('Attendance record not found');
  }
  
  if (!attendance.checkInTime) {
    throw new Error('Cannot check out without checking in first');
  }
  
  if (attendance.checkOutTime) {
    throw new Error('Already checked out');
  }
  
  const now = new Date();
  const workEnd = parseWorkTime(config.workHours.workEndTime, attendance.date);
  const graceStart = new Date(workEnd.getTime() - config.workHours.graceMinutesEarly * 60000);
  const isEarlyLeave = now < graceStart;
  
  // Calculate total break minutes (attendanceBreak model may not exist yet)
  let totalBreakMinutes = 0;
  try {
    if ((prisma as any).attendanceBreak) {
      const breaks = await (prisma as any).attendanceBreak.findMany({
        where: { attendanceId: input.attendanceId },
      });
      totalBreakMinutes = breaks.reduce((sum: number, b: any) => {
        if (b.endTime) {
          return sum + differenceInMinutes(b.endTime, b.startTime);
        }
        return sum;
      }, 0);
    }
  } catch {
    // attendanceBreak table doesn't exist yet — use breakMinutes already stored
    totalBreakMinutes = attendance.breakMinutes || 0;
  }
  
  // Calculate work and overtime for THIS session
  const workMinutes = calculateWorkMinutes(
    attendance.checkInTime,
    now,
    totalBreakMinutes
  );
  const overtimeMinutes = calculateOvertimeMinutes(workMinutes);
  
  // Sum all sessions' work minutes for the same employee + date to determine daily status
  const otherSessions = await prisma.attendance.findMany({
    where: {
      employeeId: attendance.employeeId,
      date: attendance.date,
      id: { not: attendance.id },
      checkOutTime: { not: null },
    },
    select: { id: true, workMinutes: true },
  });
  const totalDayWorkMinutes = otherSessions.reduce((sum, s) => sum + (s.workMinutes || 0), 0) + workMinutes;
  
  // Determine status based on the TOTAL day's work, not just this session
  const status = determineStatus(attendance.checkInTime, now, totalDayWorkMinutes, false);
  
  const updated = await prisma.attendance.update({
    where: { id: input.attendanceId },
    data: {
      checkOutTime: now,
      checkOutLocation: input.location || {},
      workMinutes,
      overtimeMinutes,
      breakMinutes: totalBreakMinutes,
      isEarlyLeave,
      status,
      notes: input.notes ? `${attendance.notes || ''}\n${input.notes}`.trim() : attendance.notes,
      updatedBy: attendance.employeeId,
      updatedAt: new Date(),
    },
    include: {
      employee: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  
  // Update status on all OTHER sessions for the same day (so all sessions reflect the daily total)
  if (otherSessions.length > 0) {
    await prisma.attendance.updateMany({
      where: {
        employeeId: attendance.employeeId,
        date: attendance.date,
        id: { not: attendance.id },
      },
      data: { status },
    });
  }
  
  // Emit check-out event (best-effort — don't fail the check-out if the event bus is unavailable)
  try {
    await eventBus.sendToQueue(
      SQS_QUEUES.ATTENDANCE_CHECK_OUT,
      'attendance.check_out',
      {
        attendanceId: input.attendanceId,
        employeeId: attendance.employeeId,
        checkOutTime: now.toISOString(),
        workHours: workMinutes / 60,
        overtimeHours: overtimeMinutes / 60,
      },
      tenantContext
    );
  } catch (eventError) {
    logger.warn({ error: (eventError as Error).message, attendanceId: input.attendanceId }, 'Failed to emit check-out event — attendance was still recorded');
  }

  logger.info({
    attendanceId: input.attendanceId,
    workMinutes,
    overtimeMinutes,
  }, 'Employee checked out');
  
  return updated;
}

/**
 * Start a break
 */
export async function startBreak(
  prisma: PrismaClient,
  input: BreakInput
): Promise<any> {
  const attendance = await prisma.attendance.findUnique({
    where: { id: input.attendanceId },
  });
  
  if (!attendance || !attendance.checkInTime || attendance.checkOutTime) {
    throw new Error('Invalid attendance record for break');
  }
  
  // Check for active break
  const activeBreak = await (prisma as any).attendanceBreak.findFirst({
    where: {
      attendanceId: input.attendanceId,
      endTime: null,
    },
  });
  
  if (activeBreak) {
    throw new Error('Already on a break. Please end the current break first.');
  }
  
  const breakRecord = await (prisma as any).attendanceBreak.create({
    data: {
      id: uuidv4(),
      attendanceId: input.attendanceId,
      breakType: input.breakType,
      startTime: new Date(),
      notes: input.notes,
    },
  });
  
  logger.debug({ breakId: breakRecord.id, type: input.breakType }, 'Break started');
  
  return breakRecord;
}

/**
 * End a break
 */
export async function endBreak(
  prisma: PrismaClient,
  breakId: string
): Promise<any> {
  const breakRecord = await (prisma as any).attendanceBreak.findUnique({
    where: { id: breakId },
  });
  
  if (!breakRecord) {
    throw new Error('Break record not found');
  }
  
  if (breakRecord.endTime) {
    throw new Error('Break already ended');
  }
  
  const now = new Date();
  const durationMinutes = differenceInMinutes(now, breakRecord.startTime);
  
  const updated = await (prisma as any).attendanceBreak.update({
    where: { id: breakId },
    data: {
      endTime: now,
      durationMinutes,
    },
  });
  
  logger.debug({ breakId, durationMinutes }, 'Break ended');
  
  return updated;
}

/**
 * Get today's attendance for an employee
 */
export async function getTodayAttendance(
  prisma: PrismaClient,
  employeeId: string,
  tenantSlug?: string
): Promise<any> {
  const now = new Date();
  const timezone = tenantSlug ? await getTenantTimezone(tenantSlug) : 'Asia/Kolkata';
  const today = getDateInTimezone(timezone, now);
  
  // Prefer the open (not checked-out) session; fall back to the most recent one
  const openSession = await prisma.attendance.findFirst({
    where: {
      employeeId,
      date: today,
      checkOutTime: null,
    },
  });
  if (openSession) return openSession;

  return prisma.attendance.findFirst({
    where: {
      employeeId,
      date: today,
    },
    orderBy: { checkInTime: 'desc' },
  });
}

/**
 * Get attendance by ID
 */
export async function getAttendanceById(
  prisma: PrismaClient,
  id: string
): Promise<any> {
  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: {
      employee: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
    },
  });
  
  if (!attendance) {
    throw new Error('Attendance record not found');
  }
  
  return attendance;
}

/**
 * List attendance records with filters
 */
export async function listAttendance(
  prisma: PrismaClient,
  filters: AttendanceFilters
): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const page = filters.page || 1;
  const pageSize = Math.min(filters.pageSize || 20, 5000);
  const skip = (page - 1) * pageSize;
  
  const where: any = {};
  
  if (filters.employeeId) {
    where.employeeId = filters.employeeId;
  }
  
  if (filters.departmentId) {
    where.employee = { departmentId: filters.departmentId };
  }
  
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) {
      // Build UTC midnight date so Prisma sends the correct date to PostgreSQL DATE column
      const [y, m, d] = filters.dateFrom.split('-').map(Number);
      where.date.gte = new Date(Date.UTC(y, m - 1, d));
    }
    if (filters.dateTo) {
      const [y, m, d] = filters.dateTo.split('-').map(Number);
      where.date.lte = new Date(Date.UTC(y, m - 1, d));
    }
  }
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  const [data, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ date: 'desc' }, { checkInTime: 'desc' }],
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            department: { select: { name: true } },
          },
        },
      },
    }),
    prisma.attendance.count({ where }),
  ]);
  
  return { data, total, page, pageSize };
}

/**
 * Get monthly attendance summary for an employee
 */
export async function getMonthlyAttendanceSummary(
  prisma: PrismaClient,
  employeeId: string,
  year: number,
  month: number
): Promise<{
  totalDays: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  averageCheckInTime: string | null;
  averageCheckOutTime: string | null;
}> {
  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(startDate);
  
  // Get all attendance records for the month
  const records = await prisma.attendance.findMany({
    where: {
      employeeId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  
  // Get holidays
  const holidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  const holidayDates = new Set(holidays.map(h => format(h.date, 'yyyy-MM-dd')));
  
  // Get leave days
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: 'approved',
      OR: [
        { fromDate: { gte: startDate, lte: endDate } },
        { toDate: { gte: startDate, lte: endDate } },
      ],
    },
  });
  
  // Calculate days in month
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const workingDays = allDays.filter(day => 
    !isWeekend(day) && !holidayDates.has(format(day, 'yyyy-MM-dd'))
  ).length;
  
  // Calculate attendance stats
  let presentDays = 0;
  let lateDays = 0;
  let halfDays = 0;
  let totalWorkMinutes = 0;
  let totalOvertimeMinutes = 0;
  let checkInTimes: number[] = [];
  let checkOutTimes: number[] = [];
  
  for (const record of records) {
    if (record.status === 'present') presentDays++;
    if (record.status === 'half_day') halfDays++;
    if (record.isLate) lateDays++;
    
    totalWorkMinutes += record.workMinutes || 0;
    totalOvertimeMinutes += record.overtimeMinutes || 0;
    
    if (record.checkInTime) {
      checkInTimes.push(record.checkInTime.getHours() * 60 + record.checkInTime.getMinutes());
    }
    if (record.checkOutTime) {
      checkOutTimes.push(record.checkOutTime.getHours() * 60 + record.checkOutTime.getMinutes());
    }
  }
  
  // Calculate leave days
  let leaveDays = 0;
  for (const leave of leaves) {
    const leaveStart = leave.fromDate > startDate ? leave.fromDate : startDate;
    const leaveEnd = leave.toDate < endDate ? leave.toDate : endDate;
    const leaveDaysInMonth = eachDayOfInterval({ start: leaveStart, end: leaveEnd })
      .filter(day => !isWeekend(day) && !holidayDates.has(format(day, 'yyyy-MM-dd')));
    leaveDays += leaveDaysInMonth.length;
  }
  
  // Calculate averages
  const avgCheckIn = checkInTimes.length > 0
    ? Math.round(checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length)
    : null;
  const avgCheckOut = checkOutTimes.length > 0
    ? Math.round(checkOutTimes.reduce((a, b) => a + b, 0) / checkOutTimes.length)
    : null;
  
  const formatMinutesToTime = (minutes: number | null) => {
    if (minutes === null) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };
  
  return {
    totalDays: allDays.length,
    workingDays,
    presentDays: presentDays + halfDays,
    absentDays: workingDays - presentDays - halfDays - leaveDays,
    lateDays,
    halfDays,
    leaveDays,
    totalWorkHours: Math.round((totalWorkMinutes / 60) * 100) / 100,
    totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
    averageCheckInTime: formatMinutesToTime(avgCheckIn),
    averageCheckOutTime: formatMinutesToTime(avgCheckOut),
  };
}

/**
 * Get department attendance summary for a date
 */
export async function getDepartmentAttendanceSummary(
  prisma: PrismaClient,
  departmentId: string,
  date: Date
): Promise<{
  totalEmployees: number;
  present: number;
  absent: number;
  onLeave: number;
  late: number;
  remote: number;
}> {
  const dayStart = startOfDay(date);
  
  // Get all active employees in department
  const employees = await prisma.employee.count({
    where: {
      departmentId,
      status: 'ACTIVE',
    },
  });
  
  // Get attendance for the day
  const attendance = await prisma.attendance.findMany({
    where: {
      date: dayStart,
      employee: { departmentId },
    },
  });
  
  const present = attendance.filter(a => a.status === 'present' || a.status === 'half_day').length;
  const late = attendance.filter(a => a.isLate).length;
  const remote = attendance.filter(a => a.isRemote).length;
  const onLeave = attendance.filter(a => a.status === 'on_leave').length;
  
  return {
    totalEmployees: employees,
    present,
    absent: employees - present - onLeave,
    onLeave,
    late,
    remote,
  };
}

/**
 * Get today's attendance overview for the entire company
 */
export async function getTodayAttendanceOverview(
  prisma: PrismaClient,
  tenantSlug?: string
): Promise<{
  totalEmployees: number;
  present: number;
  absent: number;
  onLeave: number;
  late: number;
  workFromHome: number;
  presentRate: number;
}> {
  // Use org timezone to determine today's date
  const timezone = tenantSlug ? await getTenantTimezone(tenantSlug) : 'Asia/Kolkata';
  const todayDate = getDateInTimezone(timezone);
  
  // Get all active employees
  const totalEmployees = await prisma.employee.count({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
    },
  });
  
  // Get today's attendance records using date range to handle timezone
  const todayStart = todayDate;
  const todayEnd = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000 - 1);
  
  const todayAttendance = await prisma.attendance.findMany({
    where: {
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });
  
  // Get today's approved leaves - get unique employee IDs
  const todayLeavesData = await prisma.leaveRequest.findMany({
    where: {
      status: { in: ['approved', 'APPROVED'] },
      fromDate: { lte: todayEnd },
      toDate: { gte: todayStart },
    },
    select: { employeeId: true },
  });
  const uniqueOnLeaveEmployees = new Set(todayLeavesData.map(l => l.employeeId));
  
  // Count UNIQUE employees for each category (same employee may have multiple sessions)
  const presentEmployees = new Set(
    todayAttendance
      .filter(a => a.status === 'present' || a.status === 'half_day' || a.status === 'PRESENT' || a.status === 'HALF_DAY')
      .map(a => a.employeeId)
  );
  const lateEmployees = new Set(
    todayAttendance.filter(a => a.isLate).map(a => a.employeeId)
  );
  const wfhEmployees = new Set(
    todayAttendance.filter(a => a.isRemote).map(a => a.employeeId)
  );
  
  const present = presentEmployees.size;
  const late = lateEmployees.size;
  const workFromHome = wfhEmployees.size;
  
  // Employees on leave who also checked in are counted as present, not on leave
  // (they came to work despite having leave, or cancelled leave but record not updated)
  const onLeave = [...uniqueOnLeaveEmployees].filter(empId => !presentEmployees.has(empId)).length;
  const absent = Math.max(0, totalEmployees - present - onLeave);
  
  const presentRate = totalEmployees > 0 
    ? Math.round((present / totalEmployees) * 100) 
    : 0;
  
  return {
    totalEmployees,
    present,
    absent,
    onLeave,
    late,
    workFromHome,
    presentRate,
  };
}
