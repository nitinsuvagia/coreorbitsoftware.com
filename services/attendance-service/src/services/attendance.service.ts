/**
 * Attendance Service - Check-in, Check-out, and Time Tracking
 */

import { PrismaClient } from '@prisma/client';
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
  const today = startOfDay(new Date());
  
  // Check if employee exists and is active
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  
  if (!employee || employee.status !== 'active') {
    throw new Error('Employee not found or inactive');
  }
  
  // Check if already checked in today
  const existingAttendance = await prisma.attendance.findFirst({
    where: {
      employeeId: input.employeeId,
      date: today,
    },
  });
  
  if (existingAttendance?.checkInTime && !existingAttendance.checkOutTime) {
    throw new Error('Already checked in. Please check out first.');
  }
  
  if (existingAttendance?.checkOutTime) {
    throw new Error('Already completed attendance for today');
  }
  
  const now = new Date();
  const isLate = checkIsLate(now);
  
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
  
  // Emit check-in event
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
  
  // Calculate total break minutes
  const breaks = await prisma.attendanceBreak.findMany({
    where: { attendanceId: input.attendanceId },
  });
  
  const totalBreakMinutes = breaks.reduce((sum, b) => {
    if (b.endTime) {
      return sum + differenceInMinutes(b.endTime, b.startTime);
    }
    return sum;
  }, 0);
  
  // Calculate work and overtime
  const workMinutes = calculateWorkMinutes(
    attendance.checkInTime,
    now,
    totalBreakMinutes
  );
  const overtimeMinutes = calculateOvertimeMinutes(workMinutes);
  
  // Determine final status
  const status = determineStatus(attendance.checkInTime, now, workMinutes, false);
  
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
  
  // Emit check-out event
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
  const activeBreak = await prisma.attendanceBreak.findFirst({
    where: {
      attendanceId: input.attendanceId,
      endTime: null,
    },
  });
  
  if (activeBreak) {
    throw new Error('Already on a break. Please end the current break first.');
  }
  
  const breakRecord = await prisma.attendanceBreak.create({
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
  const breakRecord = await prisma.attendanceBreak.findUnique({
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
  
  const updated = await prisma.attendanceBreak.update({
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
  employeeId: string
): Promise<any> {
  const today = startOfDay(new Date());
  
  return prisma.attendance.findFirst({
    where: {
      employeeId,
      date: today,
    },
    include: {
      breaks: true,
    },
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
      breaks: true,
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
  const pageSize = Math.min(filters.pageSize || 20, 100);
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
      where.date.gte = startOfDay(parseISO(filters.dateFrom));
    }
    if (filters.dateTo) {
      where.date.lte = endOfDay(parseISO(filters.dateTo));
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
        breaks: true,
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
      status: 'active',
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
