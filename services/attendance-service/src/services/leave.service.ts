/**
 * Leave Service - Leave requests, approvals, and balance management
 */

import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuidv4 } from 'uuid';
import {
  differenceInBusinessDays,
  eachDayOfInterval,
  format,
  isWeekend,
  parseISO,
  startOfYear,
  endOfYear,
  addDays,
  getDay,
} from 'date-fns';
import { getEventBus, SQS_QUEUES, SNS_TOPICS } from '@oms/event-bus';
import { getMasterPrisma } from '@oms/database';
import { logger } from '../utils/logger';
import { recalculateDailyStatus } from './daily-status.service';

/**
 * Parse a date-only string (YYYY-MM-DD) as UTC midnight.
 * date-fns parseISO treats date-only strings as local time, which causes
 * timezone offset issues (e.g., 2026-03-10 in IST becomes 2026-03-09T18:30:00Z).
 */
function parseDateAsUTC(dateStr: string): Date {
  // If already has time component or Z suffix, parse normally
  if (dateStr.includes('T') || dateStr.includes('Z')) {
    return parseISO(dateStr);
  }
  // Append T00:00:00Z to force UTC interpretation
  return parseISO(dateStr + 'T00:00:00Z');
}
import { config } from '../config';
import {
  logLeaveRequested,
  logLeaveApproved,
  logLeaveRejected,
  logLeaveCancelled,
} from './activity.service';

// ============================================================================
// TENANT SETTINGS HELPER
// ============================================================================

interface TenantLeaveSettings {
  excludeHolidaysFromLeave: boolean;
  excludeWeekendsFromLeave: boolean;
  weeklyWorkingHours: {
    sunday?: { isWorkingDay: boolean };
    monday?: { isWorkingDay: boolean };
    tuesday?: { isWorkingDay: boolean };
    wednesday?: { isWorkingDay: boolean };
    thursday?: { isWorkingDay: boolean };
    friday?: { isWorkingDay: boolean };
    saturday?: { isWorkingDay: boolean };
  } | null;
  enabledHolidayTypes: {
    public: boolean;
    optional: boolean;
    restricted: boolean;
  };
}

async function getTenantLeaveSettings(tenantSlug: string): Promise<TenantLeaveSettings> {
  try {
    const masterPrisma = getMasterPrisma();
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true },
    });
    
    if (tenant?.settings) {
      // Parse enabledHolidayTypes from JSON
      let enabledHolidayTypes = { public: true, optional: true, restricted: true };
      if (tenant.settings.enabledHolidayTypes) {
        const parsed = typeof tenant.settings.enabledHolidayTypes === 'string'
          ? JSON.parse(tenant.settings.enabledHolidayTypes)
          : tenant.settings.enabledHolidayTypes;
        enabledHolidayTypes = { ...enabledHolidayTypes, ...parsed };
      }
      
      return {
        excludeHolidaysFromLeave: tenant.settings.excludeHolidaysFromLeave ?? true,
        excludeWeekendsFromLeave: tenant.settings.excludeWeekendsFromLeave ?? true,
        weeklyWorkingHours: tenant.settings.weeklyWorkingHours as any || null,
        enabledHolidayTypes,
      };
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to get tenant leave settings, using defaults');
  }
  
  // Default settings
  return {
    excludeHolidaysFromLeave: true,
    excludeWeekendsFromLeave: true,
    weeklyWorkingHours: null,
    enabledHolidayTypes: { public: true, optional: true, restricted: true },
  };
}

// ============================================================================
// TYPES
// ============================================================================

export interface CreateLeaveTypeInput {
  name: string;
  code: string;
  description?: string;
  defaultDaysPerYear: number;
  carryForwardAllowed: boolean;
  maxCarryForwardDays?: number;
  requiresApproval: boolean;
  isPaid: boolean;
  color?: string;
  isActive?: boolean;
}

export interface UpdateLeaveTypeInput {
  name?: string;
  description?: string;
  defaultDaysPerYear?: number;
  carryForwardAllowed?: boolean;
  maxCarryForwardDays?: number;
  requiresApproval?: boolean;
  isPaid?: boolean;
  color?: string;
  isActive?: boolean;
}

export interface RequestLeaveInput {
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  isHalfDay?: boolean;
  halfDayType?: 'first_half' | 'second_half';
  reason: string;
  attachmentUrl?: string;
}

export interface ApproveLeaveInput {
  leaveRequestId: string;
  approverId: string;
  comments?: string;
}

export interface RejectLeaveInput {
  leaveRequestId: string;
  approverId: string;
  reason: string;
}

export interface LeaveFilters {
  employeeId?: string;
  leaveTypeId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// LEAVE TYPE OPERATIONS
// ============================================================================

/**
 * Create a leave type
 */
export async function createLeaveType(
  prisma: PrismaClient,
  input: CreateLeaveTypeInput,
  userId: string
): Promise<any> {
  const id = uuidv4();
  
  const existing = await prisma.leaveType.findFirst({
    where: { code: input.code },
  });
  
  if (existing) {
    throw new Error(`Leave type with code '${input.code}' already exists`);
  }
  
  const leaveType = await prisma.leaveType.create({
    data: {
      id,
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
      defaultDaysPerYear: input.defaultDaysPerYear,
      carryForwardAllowed: input.carryForwardAllowed,
      maxCarryForwardDays: input.maxCarryForwardDays ?? config.leave.maxCarryForwardDays,
      requiresApproval: input.requiresApproval,
      isPaid: input.isPaid,
      color: input.color || '#3B82F6',
      isActive: input.isActive ?? true,
      createdBy: userId,
      updatedBy: userId,
    },
  });
  
  logger.info({ leaveTypeId: id, code: input.code }, 'Leave type created');
  
  return leaveType;
}

/**
 * List leave types
 */
export async function listLeaveTypes(
  prisma: PrismaClient,
  activeOnly: boolean = true
): Promise<any[]> {
  return prisma.leaveType.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { name: 'asc' },
  });
}

/**
 * Update leave type
 */
export async function updateLeaveType(
  prisma: PrismaClient,
  id: string,
  input: UpdateLeaveTypeInput,
  userId: string
): Promise<any> {
  const leaveType = await prisma.leaveType.update({
    where: { id },
    data: {
      ...input,
      updatedBy: userId,
      updatedAt: new Date(),
    },
  });
  
  logger.info({ leaveTypeId: id }, 'Leave type updated');
  
  return leaveType;
}

// ============================================================================
// LEAVE BALANCE OPERATIONS
// ============================================================================

/**
 * Initialize leave balances for an employee
 */
export async function initializeLeaveBalances(
  prisma: PrismaClient,
  employeeId: string,
  year: number
): Promise<any[]> {
  const leaveTypes = await prisma.leaveType.findMany({
    where: { isActive: true },
  });
  
  const balances: any[] = [];
  
  for (const leaveType of leaveTypes) {
    // Check if balance already exists
    const existing = await prisma.leaveBalance.findFirst({
      where: {
        employeeId,
        leaveTypeId: leaveType.id,
        year,
      },
    });
    
    if (!existing) {
      const balance = await prisma.leaveBalance.create({
        data: {
          id: uuidv4(),
          employeeId,
          leaveTypeId: leaveType.id,
          year,
          totalDays: leaveType.defaultDaysPerYear,
          usedDays: 0,
          pendingDays: 0,
          carryForwardDays: 0,
          adjustmentDays: 0,
        },
      });
      balances.push(balance);
    } else {
      balances.push(existing);
    }
  }
  
  logger.debug({ employeeId, year, count: balances.length }, 'Leave balances initialized');
  
  return balances;
}

/**
 * Get leave balances for an employee
 */
export async function getLeaveBalances(
  prisma: PrismaClient,
  employeeId: string,
  year?: number
): Promise<any[]> {
  const targetYear = year || new Date().getFullYear();
  
  // Initialize if not exists
  await initializeLeaveBalances(prisma, employeeId, targetYear);
  
  return prisma.leaveBalance.findMany({
    where: {
      employeeId,
      year: targetYear,
      leaveType: { isActive: true },
    },
    include: {
      leaveType: true,
    },
    orderBy: { leaveType: { name: 'asc' } },
  });
}

/**
 * Adjust leave balance
 */
export async function adjustLeaveBalance(
  prisma: PrismaClient,
  employeeId: string,
  leaveTypeId: string,
  year: number,
  adjustmentDays: number,
  reason: string,
  adjustedBy: string
): Promise<any> {
  // Initialize if not exists
  await initializeLeaveBalances(prisma, employeeId, year);
  
  const balance = await prisma.leaveBalance.findFirst({
    where: { employeeId, leaveTypeId, year },
  });
  
  if (!balance) {
    throw new Error('Leave balance not found');
  }
  
  const updated = await prisma.leaveBalance.update({
    where: { id: balance.id },
    data: {
      adjustmentDays: Number(balance.adjustmentDays) + adjustmentDays,
      updatedAt: new Date(),
    },
    include: { leaveType: true },
  });
  
  // Log adjustment
  await prisma.leaveBalanceAdjustment.create({
    data: {
      id: uuidv4(),
      leaveBalanceId: balance.id,
      adjustmentDays: adjustmentDays,
      reason,
      adjustedBy,
    },
  });
  
  logger.info({
    employeeId,
    leaveTypeId,
    adjustmentDays,
    reason,
  }, 'Leave balance adjusted');
  
  return updated;
}

// ============================================================================
// LEAVE REQUEST OPERATIONS
// ============================================================================

/**
 * Check if a day is a non-working day based on tenant settings
 */
function isNonWorkingDay(
  day: Date,
  settings: TenantLeaveSettings
): boolean {
  const dayOfWeek = getDay(day); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayName = dayNames[dayOfWeek];
  
  // Check weekly working hours settings if available
  if (settings.weeklyWorkingHours) {
    const daySettings = settings.weeklyWorkingHours[dayName];
    if (daySettings && !daySettings.isWorkingDay) {
      return true; // It's a non-working day
    }
  } else if (settings.excludeWeekendsFromLeave) {
    // Fallback to standard weekend check (Sat/Sun)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate leave days based on tenant settings (holidays, weekends, working hours)
 * - Public holidays: Always excluded if enabled in settings
 * - Optional holidays: Only excluded if employee has opted for them
 * - Restricted holidays: Always excluded if enabled in settings
 */
async function calculateLeaveDays(
  prisma: PrismaClient,
  fromDate: Date,
  toDate: Date,
  isHalfDay: boolean,
  tenantSlug?: string,
  employeeId?: string
): Promise<number> {
  if (isHalfDay) {
    return 0.5;
  }
  
  // Get tenant settings
  const settings = tenantSlug 
    ? await getTenantLeaveSettings(tenantSlug)
    : { 
        excludeHolidaysFromLeave: true, 
        excludeWeekendsFromLeave: true, 
        weeklyWorkingHours: null,
        enabledHolidayTypes: { public: true, optional: true, restricted: true }
      };
  
  // Get holidays in range if we need to exclude them
  let holidayDates = new Set<string>();
  if (settings.excludeHolidaysFromLeave) {
    // Build type filter based on enabled holiday types
    const enabledTypes: ('PUBLIC' | 'OPTIONAL' | 'RESTRICTED')[] = [];
    if (settings.enabledHolidayTypes.public) enabledTypes.push('PUBLIC');
    if (settings.enabledHolidayTypes.optional) enabledTypes.push('OPTIONAL');
    if (settings.enabledHolidayTypes.restricted) enabledTypes.push('RESTRICTED');
    
    const holidays = await prisma.holiday.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        type: { in: enabledTypes },
      },
    });
    
    // For optional holidays, only exclude if employee has opted for them
    for (const holiday of holidays) {
      if (holiday.type === 'OPTIONAL') {
        // If employeeId is provided, check if they've opted for this holiday
        if (employeeId && settings.enabledHolidayTypes.optional) {
          const year = holiday.date.getFullYear();
          const opted = await prisma.employeeOptionalHoliday.findFirst({
            where: {
              employeeId,
              holidayId: holiday.id,
              year,
              status: 'OPTED',
            },
          });
          if (opted) {
            holidayDates.add(format(holiday.date, 'yyyy-MM-dd'));
          }
        }
        // If no employeeId, don't automatically exclude optional holidays
      } else {
        // Public and restricted holidays are always excluded if enabled
        holidayDates.add(format(holiday.date, 'yyyy-MM-dd'));
      }
    }
  }
  
  // Count working days
  const allDays = eachDayOfInterval({ start: fromDate, end: toDate });
  const leaveDays = allDays.filter(day => {
    // Check if it's a non-working day
    if (settings.excludeWeekendsFromLeave || settings.weeklyWorkingHours) {
      if (isNonWorkingDay(day, settings)) {
        return false; // Exclude non-working days
      }
    }
    
    // Check if it's a holiday
    if (settings.excludeHolidaysFromLeave && holidayDates.has(format(day, 'yyyy-MM-dd'))) {
      return false; // Exclude holidays
    }
    
    return true; // Count this day
  }).length;
  
  return leaveDays;
}

/**
 * Request leave
 */
export async function requestLeave(
  prisma: PrismaClient,
  input: RequestLeaveInput,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('attendance-service');
  
  const fromDate = parseDateAsUTC(input.fromDate);
  const toDate = parseDateAsUTC(input.toDate);
  
  // Validate dates
  if (fromDate > toDate) {
    throw new Error('From date cannot be after to date');
  }
  
  if (input.isHalfDay && format(fromDate, 'yyyy-MM-dd') !== format(toDate, 'yyyy-MM-dd')) {
    throw new Error('Half day leave must be for a single day');
  }
  
  // Check advance notice
  const today = new Date();
  const advanceDays = differenceInBusinessDays(fromDate, today);
  if (advanceDays < config.leave.minAdvanceNoticeDays) {
    throw new Error(
      `Leave requests require at least ${config.leave.minAdvanceNoticeDays} business day(s) advance notice`
    );
  }
  
  // Get leave type
  const leaveType = await prisma.leaveType.findUnique({
    where: { id: input.leaveTypeId },
  });
  
  if (!leaveType || !leaveType.isActive) {
    throw new Error('Leave type not found or inactive');
  }
  
  // Calculate leave days based on tenant settings
  // Pass employeeId to check optional holiday opt-ins
  const leaveDays = await calculateLeaveDays(prisma, fromDate, toDate, input.isHalfDay || false, tenantContext.tenantSlug, input.employeeId);
  
  if (leaveDays === 0) {
    throw new Error('No valid leave days in the selected range');
  }
  
  // Get employee and their balance
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    include: {
      reportingManager: true,
    },
  });
  
  // Allow leave requests for employees in active employment statuses
  const allowedStatuses = ['ACTIVE', 'ONBOARDING', 'PROBATION', 'ON_LEAVE', 'NOTICE_PERIOD'];
  if (!employee || !allowedStatuses.includes(employee.status)) {
    throw new Error('Employee not found or inactive');
  }
  
  // Initialize and get balance
  const year = fromDate.getFullYear();
  await initializeLeaveBalances(prisma, input.employeeId, year);
  
  const balance = await prisma.leaveBalance.findFirst({
    where: {
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      year,
    },
  });
  
  if (!balance) {
    throw new Error('Leave balance not found');
  }
  
  // Check available balance (skip for unpaid leave types like LWP)
  const availableDays = Number(balance.totalDays) + Number(balance.carryForwardDays) + Number(balance.adjustmentDays)
    - Number(balance.usedDays) - Number(balance.pendingDays);
  
  if (leaveType.isPaid && leaveDays > availableDays && !config.leave.allowNegativeBalance) {
    throw new Error(
      `Insufficient leave balance. Available: ${availableDays} days, Requested: ${leaveDays} days`
    );
  }
  
  // Check for overlapping leaves
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: input.employeeId,
      status: { in: ['pending', 'approved'] },
      OR: [
        { fromDate: { lte: toDate }, toDate: { gte: fromDate } },
      ],
    },
  });
  
  if (overlapping) {
    throw new Error('There is an overlapping leave request for this period');
  }
  
  // Create leave request
  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      id: uuidv4(),
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      fromDate,
      toDate,
      totalDays: leaveDays,
      isHalfDay: input.isHalfDay || false,
      halfDayType: input.halfDayType,
      reason: input.reason,
      attachmentUrl: input.attachmentUrl,
      status: leaveType.requiresApproval ? 'pending' : 'approved',
      approvedBy: leaveType.requiresApproval ? null : input.employeeId,
      approvedAt: leaveType.requiresApproval ? null : new Date(),
    },
    include: {
      leaveType: true,
      employee: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });
  
  // Update pending days in balance
  await prisma.leaveBalance.update({
    where: { id: balance.id },
    data: {
      pendingDays: { increment: leaveDays },
    },
  });
  
  // Emit event (non-fatal — leave is already saved)
  try {
    await eventBus.sendToQueue(
      SQS_QUEUES.ATTENDANCE_LEAVE_REQUESTED,
      'leave.requested',
      {
        leaveRequestId: leaveRequest.id,
        employeeId: input.employeeId,
        leaveTypeId: input.leaveTypeId,
        leaveTypeName: leaveType.name,
        fromDate: input.fromDate,
        toDate: input.toDate,
        totalDays: leaveDays,
        reason: input.reason,
      },
      tenantContext
    );
  } catch (eventError: any) {
    logger.warn({ error: eventError.message, leaveRequestId: leaveRequest.id }, 'Failed to emit leave.requested SQS event (non-fatal)');
  }
  
  // Publish to topic for notification service (non-fatal)
  try {
    await eventBus.publishToTopic('leave-requested' as any, 'leave.requested', {
      leaveId: leaveRequest.id,
      employeeId: input.employeeId,
      employeeName: `${leaveRequest.employee?.user?.firstName || ''} ${leaveRequest.employee?.user?.lastName || ''}`.trim(),
      employeeUserId: (leaveRequest.employee as any)?.userId,
      leaveType: leaveType.name,
      startDate: input.fromDate,
      endDate: input.toDate,
      totalDays: leaveDays,
      reason: input.reason,
      managerIds: (employee.reportingManager as any)?.userId ? [(employee.reportingManager as any).userId] : [],
    }, tenantContext);
  } catch (topicError: any) {
    logger.warn({ error: topicError.message, leaveRequestId: leaveRequest.id }, 'Failed to publish leave.requested event (non-fatal)');
  }
  
  // Log activity (non-fatal)
  try {
    await logLeaveRequested(
      prisma,
      input.employeeId,
      employee.displayName,
      leaveType.name,
      leaveDays,
      leaveRequest.id
    );
  } catch (activityError: any) {
    logger.warn({ error: activityError.message, leaveRequestId: leaveRequest.id }, 'Failed to log leave activity (non-fatal)');
  }
  
  logger.info({
    leaveRequestId: leaveRequest.id,
    employeeId: input.employeeId,
    days: leaveDays,
  }, 'Leave requested');
  
  return leaveRequest;
}

/**
 * Approve leave request
 */
export async function approveLeave(
  prisma: PrismaClient,
  input: ApproveLeaveInput,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('attendance-service');
  
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: input.leaveRequestId },
    include: {
      leaveType: true,
      employee: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  
  if (!leaveRequest) {
    throw new Error('Leave request not found');
  }
  
  if (leaveRequest.status !== 'pending') {
    throw new Error(`Cannot approve leave request with status: ${leaveRequest.status}`);
  }
  
  // Update leave request
  const updated = await prisma.leaveRequest.update({
    where: { id: input.leaveRequestId },
    data: {
      status: 'approved',
      approvedBy: input.approverId,
      approvedAt: new Date(),
      approverComments: input.comments,
    },
    include: {
      leaveType: true,
      employee: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  });
  
  // Update balance: move from pending to used
  const year = leaveRequest.fromDate.getFullYear();
  await prisma.leaveBalance.updateMany({
    where: {
      employeeId: leaveRequest.employeeId,
      leaveTypeId: leaveRequest.leaveTypeId,
      year,
    },
    data: {
      pendingDays: { decrement: leaveRequest.totalDays },
      usedDays: { increment: leaveRequest.totalDays },
    },
  });
  
  // Note: Attendance record creation is disabled until the Attendance model is fully implemented
  // with date, status, and leaveRequestId fields. For now, leave approval just updates the leave request.
  
  /*
  // Create attendance records for leave days
  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: leaveRequest.fromDate, lte: leaveRequest.toDate },
    },
  });
  const holidayDates = new Set(holidays.map(h => format(h.date, 'yyyy-MM-dd')));
  
  const leaveDays = eachDayOfInterval({
    start: leaveRequest.fromDate,
    end: leaveRequest.toDate,
  }).filter(day => !isWeekend(day) && !holidayDates.has(format(day, 'yyyy-MM-dd')));
  
  for (const day of leaveDays) {
    await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: leaveRequest.employeeId,
          date: day,
        },
      },
      create: {
        id: uuidv4(),
        employeeId: leaveRequest.employeeId,
        date: day,
        status: 'on_leave',
        leaveRequestId: leaveRequest.id,
      },
      update: {
        status: 'on_leave',
        leaveRequestId: leaveRequest.id,
      },
    });
  }
  */
  
  // Emit event (non-fatal — leave is already approved in DB)
  try {
    await eventBus.sendToQueue(
      SQS_QUEUES.ATTENDANCE_LEAVE_APPROVED,
      'leave.approved',
      {
        leaveRequestId: input.leaveRequestId,
        employeeId: leaveRequest.employeeId,
        approvedBy: input.approverId,
        approvedAt: new Date().toISOString(),
        comments: input.comments,
      },
      tenantContext
    );
  } catch (eventError: any) {
    logger.warn({ error: eventError.message, leaveRequestId: input.leaveRequestId }, 'Failed to emit leave.approved SQS event (non-fatal)');
  }
  
  // Publish to topic for notification service (non-fatal)
  try {
    await eventBus.publishToTopic('leave-approved' as any, 'leave.approved', {
      leaveId: input.leaveRequestId,
      employeeId: leaveRequest.employeeId,
      employeeName: leaveRequest.employee?.user
        ? `${leaveRequest.employee.user.firstName} ${leaveRequest.employee.user.lastName}`.trim()
        : leaveRequest.employee?.displayName || 'Employee',
      employeeEmail: updated.employee?.user?.email,
      leaveType: leaveRequest.leaveType?.name || 'Leave',
      fromDate: leaveRequest.fromDate.toISOString(),
      toDate: leaveRequest.toDate.toISOString(),
      totalDays: Number(leaveRequest.totalDays),
      approvedBy: input.approverId,
      comments: input.comments,
    }, tenantContext);
  } catch (topicError: any) {
    logger.warn({ error: topicError.message, leaveRequestId: input.leaveRequestId }, 'Failed to publish leave.approved event (non-fatal)');
  }
  
  // Log activity (non-fatal)
  const employeeName = leaveRequest.employee?.user
    ? `${leaveRequest.employee.user.firstName} ${leaveRequest.employee.user.lastName}`
    : leaveRequest.employee?.displayName || 'Unknown';
  try {
    await logLeaveApproved(
      prisma,
      leaveRequest.employeeId,
      employeeName,
      leaveRequest.leaveType?.name || 'Leave',
      Number(leaveRequest.totalDays),
      input.leaveRequestId,
      input.approverId
    );
  } catch (activityError: any) {
    logger.warn({ error: activityError.message, leaveRequestId: input.leaveRequestId }, 'Failed to log leave approved activity (non-fatal)');
  }
  
  logger.info({
    leaveRequestId: input.leaveRequestId,
    approvedBy: input.approverId,
  }, 'Leave approved');
  
  // Recalculate daily status for the leave dates (non-fatal)
  try {
    await recalculateDailyStatus(
      prisma,
      tenantContext.tenantSlug,
      leaveRequest.employeeId,
      leaveRequest.fromDate,
      leaveRequest.toDate
    );
    logger.info({
      leaveRequestId: input.leaveRequestId,
      employeeId: leaveRequest.employeeId,
      from: format(leaveRequest.fromDate, 'yyyy-MM-dd'),
      to: format(leaveRequest.toDate, 'yyyy-MM-dd'),
    }, 'Daily status recalculated for approved leave');
  } catch (dailyStatusError: any) {
    logger.warn({ error: dailyStatusError.message, leaveRequestId: input.leaveRequestId }, 'Failed to recalculate daily status (non-fatal)');
  }
  
  return updated;
}

/**
 * Reject leave request
 */
export async function rejectLeave(
  prisma: PrismaClient,
  input: RejectLeaveInput,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: input.leaveRequestId },
  });
  
  if (!leaveRequest) {
    throw new Error('Leave request not found');
  }
  
  if (leaveRequest.status !== 'pending') {
    throw new Error(`Cannot reject leave request with status: ${leaveRequest.status}`);
  }
  
  // Update leave request
  const updated = await prisma.leaveRequest.update({
    where: { id: input.leaveRequestId },
    data: {
      status: 'rejected',
      approvedBy: input.approverId,
      approvedAt: new Date(),
      rejectionReason: input.reason,
    },
    include: {
      leaveType: true,
      employee: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  });
  
  // Update balance: remove from pending
  const year = leaveRequest.fromDate.getFullYear();
  await prisma.leaveBalance.updateMany({
    where: {
      employeeId: leaveRequest.employeeId,
      leaveTypeId: leaveRequest.leaveTypeId,
      year,
    },
    data: {
      pendingDays: { decrement: leaveRequest.totalDays },
    },
  });
  
  // Log activity (non-fatal)
  const employeeName = updated.employee?.user
    ? `${updated.employee.user.firstName} ${updated.employee.user.lastName}`
    : updated.employee?.displayName || 'Unknown';
  try {
    await logLeaveRejected(
      prisma,
      leaveRequest.employeeId,
      employeeName,
      updated.leaveType?.name || 'Leave',
      Number(leaveRequest.totalDays),
      input.leaveRequestId,
      input.approverId,
      undefined,
      input.reason
    );
  } catch (activityError: any) {
    logger.warn({ error: activityError.message, leaveRequestId: input.leaveRequestId }, 'Failed to log leave rejected activity (non-fatal)');
  }
  
  logger.info({
    leaveRequestId: input.leaveRequestId,
    rejectedBy: input.approverId,
    reason: input.reason,
  }, 'Leave rejected');
  
  // Publish to topic for notification service (non-fatal)
  try {
    const eventBus = getEventBus('attendance-service');
    await eventBus.publishToTopic('leave-rejected' as any, 'leave.rejected', {
      leaveId: input.leaveRequestId,
      employeeId: leaveRequest.employeeId,
      employeeName: updated.employee?.user
        ? `${updated.employee.user.firstName} ${updated.employee.user.lastName}`.trim()
        : updated.employee?.displayName || 'Employee',
      employeeEmail: updated.employee?.user?.email,
      leaveType: updated.leaveType?.name || 'Leave',
      fromDate: leaveRequest.fromDate.toISOString(),
      toDate: leaveRequest.toDate.toISOString(),
      totalDays: Number(leaveRequest.totalDays),
      rejectedBy: input.approverId,
      reason: input.reason,
    }, tenantContext);
  } catch (topicError: any) {
    logger.warn({ error: topicError.message, leaveRequestId: input.leaveRequestId }, 'Failed to publish leave.rejected event (non-fatal)');
  }
  
  // Recalculate daily status in case pending leave was affecting calendar (non-fatal)
  try {
    await recalculateDailyStatus(
      prisma,
      tenantContext.tenantSlug,
      leaveRequest.employeeId,
      leaveRequest.fromDate,
      leaveRequest.toDate
    );
  } catch (dailyStatusError: any) {
    logger.warn({ error: dailyStatusError.message, leaveRequestId: input.leaveRequestId }, 'Failed to recalculate daily status (non-fatal)');
  }
  
  return updated;
}

/**
 * Cancel leave request
 * 
 * Business Rules:
 * 1. Employee can cancel their own leave only if:
 *    - Status is 'pending' OR 'approved'
 *    - Leave hasn't started yet (fromDate > today)
 * 
 * 2. Manager/Admin can cancel any leave but:
 *    - Must provide a reason
 *    - Can cancel even approved leaves
 *    - Cannot cancel leaves that have already passed completely
 * 
 * 3. Partial cancellation:
 *    - If leave has started but not ended, cancel remaining days only
 */
export interface CancelLeaveInput {
  leaveRequestId: string;
  cancelledByUserId: string;
  cancelledByEmployeeId?: string;
  userRole: string;
  reason?: string;
}

export async function cancelLeave(
  prisma: PrismaClient,
  input: CancelLeaveInput,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const { leaveRequestId, cancelledByUserId, cancelledByEmployeeId, userRole, reason } = input;
  
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: {
      employee: true,
      leaveType: true,
    },
  });
  
  if (!leaveRequest) {
    throw new Error('Leave request not found');
  }
  
  // Check if leave can be cancelled based on status
  if (!['pending', 'approved'].includes(leaveRequest.status)) {
    throw new Error(`Cannot cancel leave request with status: ${leaveRequest.status}`);
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const fromDate = new Date(leaveRequest.fromDate);
  fromDate.setHours(0, 0, 0, 0);
  
  const toDate = new Date(leaveRequest.toDate);
  toDate.setHours(0, 0, 0, 0);
  
  const isOwner = cancelledByEmployeeId === leaveRequest.employeeId;
  const isManagerOrAdmin = ['ADMIN', 'SUPER_ADMIN', 'HR', 'MANAGER'].includes(userRole?.toUpperCase() || '');
  
  // Check if leave has completely passed
  if (toDate < today) {
    throw new Error('Cannot cancel leave that has already passed');
  }
  
  // Check permissions
  if (!isOwner && !isManagerOrAdmin) {
    throw new Error('You do not have permission to cancel this leave request');
  }
  
  // Employee-specific restrictions
  if (isOwner && !isManagerOrAdmin) {
    // Employee can only cancel if leave hasn't started
    if (fromDate <= today && leaveRequest.status === 'approved') {
      throw new Error('You cannot cancel approved leave that has already started. Please contact HR.');
    }
  }
  
  // Manager/Admin must provide reason for cancelling approved leaves
  if (isManagerOrAdmin && !isOwner && leaveRequest.status === 'approved' && !reason) {
    throw new Error('A reason is required when cancelling approved leave');
  }
  
  const wasPending = leaveRequest.status === 'pending';
  let daysToRefund = Number(leaveRequest.totalDays);
  let newStatus = 'cancelled';
  let partialCancellation = false;
  
  // Handle partial cancellation (leave has started but not ended)
  if (fromDate < today && today <= toDate && leaveRequest.status === 'approved') {
    // Calculate remaining days to cancel
    const remainingDays = eachDayOfInterval({ start: today, end: toDate }).length;
    
    if (remainingDays > 0 && remainingDays < Number(leaveRequest.totalDays)) {
      daysToRefund = remainingDays;
      partialCancellation = true;
      newStatus = 'partially_cancelled';
      
      logger.info({
        leaveRequestId,
        originalDays: leaveRequest.totalDays,
        daysToRefund,
      }, 'Partial leave cancellation');
    }
  }
  
  // Update leave request
  const updateData: any = {
    status: newStatus,
    cancelledBy: cancelledByUserId,
    cancelledAt: new Date(),
    cancellationReason: reason || (isOwner ? 'Cancelled by employee' : `Cancelled by ${userRole}`),
    updatedBy: cancelledByUserId,
    updatedAt: new Date(),
  };
  
  // If partial cancellation, update the toDate and totalDays
  if (partialCancellation) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    updateData.toDate = yesterday;
    updateData.totalDays = Number(leaveRequest.totalDays) - daysToRefund;
    updateData.status = 'approved'; // Keep as approved for the days already taken
  }
  
  const updated = await prisma.leaveRequest.update({
    where: { id: leaveRequestId },
    data: updateData,
    include: {
      leaveType: true,
      employee: true,
    },
  });
  
  // Update balance
  const year = leaveRequest.fromDate.getFullYear();
  await prisma.leaveBalance.updateMany({
    where: {
      employeeId: leaveRequest.employeeId,
      leaveTypeId: leaveRequest.leaveTypeId,
      year,
    },
    data: wasPending
      ? { pendingDays: { decrement: daysToRefund } }
      : { usedDays: { decrement: daysToRefund } },
  });
  
  // Remove future attendance records if was approved
  if (!wasPending) {
    if (partialCancellation) {
      // Only delete attendance records from today onwards
      await prisma.attendance.deleteMany({
        where: {
          leaveRequestId,
          date: { gte: today },
        } as any,
      });
    } else {
      // Delete all attendance records for this leave
      await prisma.attendance.deleteMany({
        where: { leaveRequestId } as any,
      });
    }
  }
  
  // Log activity
  await logLeaveCancelled(
    prisma,
    leaveRequest.employeeId,
    leaveRequest.employee?.displayName || 'Unknown',
    leaveRequest.leaveType?.name || 'Leave',
    daysToRefund,
    leaveRequestId,
    cancelledByUserId,
    undefined,
    reason
  );
  
  logger.info({
    leaveRequestId,
    cancelledBy: cancelledByUserId,
    isOwner,
    isManagerOrAdmin,
    wasPending,
    daysRefunded: daysToRefund,
    partialCancellation,
  }, 'Leave cancelled');
  
  // Recalculate daily status for the cancelled leave dates (non-fatal)
  try {
    await recalculateDailyStatus(
      prisma,
      tenantContext.tenantSlug,
      leaveRequest.employeeId,
      leaveRequest.fromDate,
      leaveRequest.toDate
    );
    logger.info({
      leaveRequestId,
      employeeId: leaveRequest.employeeId,
    }, 'Daily status recalculated for cancelled leave');
  } catch (dailyStatusError: any) {
    logger.warn({ error: dailyStatusError.message, leaveRequestId }, 'Failed to recalculate daily status (non-fatal)');
  }
  
  return {
    ...updated,
    daysRefunded: daysToRefund,
    partialCancellation,
    cancelledByRole: isOwner ? 'EMPLOYEE' : userRole,
  };
}

/**
 * List leave requests
 */
export async function listLeaveRequests(
  prisma: PrismaClient,
  filters: LeaveFilters
): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const page = filters.page || 1;
  const pageSize = Math.min(filters.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  
  const where: any = {};
  
  if (filters.employeeId) {
    where.employeeId = filters.employeeId;
  }
  
  if (filters.leaveTypeId) {
    where.leaveTypeId = filters.leaveTypeId;
  }
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.dateFrom || filters.dateTo) {
    where.OR = [];
    if (filters.dateFrom) {
      where.OR.push({ fromDate: { gte: parseDateAsUTC(filters.dateFrom) } });
    }
    if (filters.dateTo) {
      where.OR.push({ toDate: { lte: parseDateAsUTC(filters.dateTo) } });
    }
  }
  
  const [data, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            avatar: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
    prisma.leaveRequest.count({ where }),
  ]);
  
  // Fetch approver details for requests that have approvedBy
  const approverIds = data
    .filter(r => r.approvedBy)
    .map(r => r.approvedBy as string);
  
  let approverMap: Map<string, { firstName: string; lastName: string }> = new Map();
  if (approverIds.length > 0) {
    const approvers = await prisma.user.findMany({
      where: { id: { in: approverIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    approverMap = new Map(approvers.map(a => [a.id, { firstName: a.firstName, lastName: a.lastName }]));
  }
  
  // Add approver details to each request
  const enrichedData = data.map(request => ({
    ...request,
    approvedBy: request.approvedBy
      ? approverMap.get(request.approvedBy) || request.approvedBy
      : null,
  }));
  
  return { data: enrichedData, total, page, pageSize };
}

/**
 * Get pending approvals for a manager
 */
export async function getPendingApprovals(
  prisma: PrismaClient,
  managerId: string
): Promise<any[]> {
  // Get employees reporting to this manager
  const directReports = await prisma.employee.findMany({
    where: { reportingManagerId: managerId },
    select: { id: true },
  });
  
  const employeeIds = directReports.map(e => e.id);
  
  return prisma.leaveRequest.findMany({
    where: {
      employeeId: { in: employeeIds },
      status: 'pending',
    },
    include: {
      leaveType: true,
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          avatar: true,
          email: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

// ============================================================================
// MONTHLY LEAVE ACCRUAL
// ============================================================================

/**
 * Default probation period in months.
 * Employees are eligible for leave accrual after this period from join date.
 */
const DEFAULT_PROBATION_MONTHS = 3;

/**
 * Run monthly leave accrual for all eligible employees.
 * 
 * Rules:
 * - Only PAID leave types (isPaid = true) are accrued — unpaid leaves like LWP are excluded
 * - Only leave types with accrualType = 'monthly' are accrued monthly
 * - Monthly credit = defaultDaysPerYear / 12
 * - Only ACTIVE employees who have completed probation are eligible
 * - Probation = probationEndDate if set, else joinDate + DEFAULT_PROBATION_MONTHS
 * - Creates/updates leave_balance for the current year
 * - Tracks accrual to avoid double-crediting for the same month
 * 
 * @param prisma - Tenant Prisma client
 * @param year - Target year (default: current year)
 * @param month - Target month 1-12 (default: current month)
 * @returns Summary of accrual results
 */
export async function runMonthlyLeaveAccrual(
  prisma: PrismaClient,
  year?: number,
  month?: number,
): Promise<{
  year: number;
  month: number;
  employeesProcessed: number;
  employeesSkipped: number;
  balancesCreated: number;
  balancesUpdated: number;
  details: Array<{
    employeeId: string;
    employeeName: string;
    leaveType: string;
    monthlyCredit: number;
    newTotal: number;
  }>;
}> {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || (now.getMonth() + 1); // 1-based
  
  logger.info({ year: targetYear, month: targetMonth }, 'Starting monthly leave accrual');
  
  // 1. Get all monthly-accrual PAID leave types (only org-allowed paid leaves get accrued)
  const monthlyLeaveTypes = await prisma.leaveType.findMany({
    where: {
      isActive: true,
      isPaid: true,
      accrualType: 'monthly',
      defaultDaysPerYear: { gt: 0 },
    },
  });
  
  if (monthlyLeaveTypes.length === 0) {
    logger.info('No monthly-accrual paid leave types found, skipping');
    return {
      year: targetYear,
      month: targetMonth,
      employeesProcessed: 0,
      employeesSkipped: 0,
      balancesCreated: 0,
      balancesUpdated: 0,
      details: [],
    };
  }
  
  // 2. Get all active employees
  const employees = await prisma.employee.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      joinDate: true,
      probationEndDate: true,
      confirmationDate: true,
    },
  });
  
  // 3. Determine accrual date (1st of target month)
  const accrualDate = new Date(targetYear, targetMonth - 1, 1); // 1st of month
  
  let employeesProcessed = 0;
  let employeesSkipped = 0;
  let balancesCreated = 0;
  let balancesUpdated = 0;
  const details: Array<{
    employeeId: string;
    employeeName: string;
    leaveType: string;
    monthlyCredit: number;
    newTotal: number;
  }> = [];
  
  for (const employee of employees) {
    // 4. Check if probation is completed
    let probationEndDate: Date;
    
    if (employee.probationEndDate) {
      probationEndDate = new Date(employee.probationEndDate);
    } else if (employee.confirmationDate) {
      // If confirmed, probation is done — use confirmation date
      probationEndDate = new Date(employee.confirmationDate);
    } else {
      // Default: joinDate + DEFAULT_PROBATION_MONTHS
      const joinDate = new Date(employee.joinDate);
      probationEndDate = new Date(joinDate);
      probationEndDate.setMonth(probationEndDate.getMonth() + DEFAULT_PROBATION_MONTHS);
    }
    
    // Employee must have completed probation by the accrual date
    if (probationEndDate > accrualDate) {
      employeesSkipped++;
      logger.debug(
        { employeeId: employee.id, probationEndDate: probationEndDate.toISOString() },
        'Employee still in probation, skipping accrual'
      );
      continue;
    }
    
    // 5. For each monthly leave type, credit the balance
    for (const leaveType of monthlyLeaveTypes) {
      const monthlyCredit = Number((leaveType.defaultDaysPerYear / 12).toFixed(1));
      // Max total for the year so far = monthlyCredit * targetMonth (cap at yearly max)
      const maxTotalForMonth = Math.min(
        Number((monthlyCredit * targetMonth).toFixed(1)),
        leaveType.defaultDaysPerYear
      );
      
      // Find or create leave balance
      const existing = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year: targetYear,
        },
      });
      
      if (existing) {
        const currentTotal = Number(existing.totalDays);
        
        // Only credit if not already at or above the expected total for this month
        if (currentTotal < maxTotalForMonth) {
          const newTotal = maxTotalForMonth;
          
          await prisma.leaveBalance.update({
            where: { id: existing.id },
            data: {
              totalDays: newTotal,
              updatedAt: new Date(),
            },
          });
          
          balancesUpdated++;
          details.push({
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            leaveType: leaveType.name,
            monthlyCredit,
            newTotal,
          });
        }
        // If already at expected total, skip (already accrued for this month)
      } else {
        // Create new balance with the accrued amount
        await prisma.leaveBalance.create({
          data: {
            id: uuidv4(),
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            year: targetYear,
            totalDays: maxTotalForMonth,
            usedDays: 0,
            pendingDays: 0,
            carryForwardDays: 0,
            adjustmentDays: 0,
          },
        });
        
        balancesCreated++;
        details.push({
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          leaveType: leaveType.name,
          monthlyCredit,
          newTotal: maxTotalForMonth,
        });
      }
    }
    
    // Also initialize yearly-accrual PAID leave types (EL, BL, etc.) if not already done
    // Unpaid leaves (LWP, Maternity etc.) are excluded — no balance allocation
    const yearlyLeaveTypes = await prisma.leaveType.findMany({
      where: {
        isActive: true,
        isPaid: true,
        accrualType: { not: 'monthly' },
        defaultDaysPerYear: { gt: 0 },
      },
    });
    
    for (const leaveType of yearlyLeaveTypes) {
      const existing = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year: targetYear,
        },
      });
      
      if (!existing) {
        await prisma.leaveBalance.create({
          data: {
            id: uuidv4(),
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            year: targetYear,
            totalDays: leaveType.defaultDaysPerYear,
            usedDays: 0,
            pendingDays: 0,
            carryForwardDays: 0,
            adjustmentDays: 0,
          },
        });
        balancesCreated++;
      }
    }
    
    employeesProcessed++;
  }
  
  logger.info({
    year: targetYear,
    month: targetMonth,
    employeesProcessed,
    employeesSkipped,
    balancesCreated,
    balancesUpdated,
  }, 'Monthly leave accrual completed');
  
  return {
    year: targetYear,
    month: targetMonth,
    employeesProcessed,
    employeesSkipped,
    balancesCreated,
    balancesUpdated,
    details,
  };
}

// ============================================================================
// LEAVE CARRY-FORWARD
// ============================================================================

/**
 * Process leave carry-forward for all employees of a tenant.
 *
 * For each leave type where `carryForwardAllowed = true`:
 *   1. Reads the remaining balance from `previousYear`
 *      remaining = totalDays + carryForwardDays + adjustmentDays - usedDays - pendingDays
 *   2. Caps it at `maxCarryForwardDays` (leave-type level, then env fallback)
 *   3. Creates / updates the `newYear` LeaveBalance with `carryForwardDays` set
 *
 * @param prisma       Tenant-scoped Prisma client
 * @param previousYear The financial year that just ended (e.g. 2025 for FY 2025-26)
 * @param newYear      The financial year starting (e.g. 2026)
 * @param dryRun       If true, only calculate – don't write to DB
 */
export async function processLeaveCarryForward(
  prisma: PrismaClient,
  previousYear: number,
  newYear: number,
  dryRun: boolean = false
): Promise<{
  previousYear: number;
  newYear: number;
  employeesProcessed: number;
  carryForwardsApplied: number;
  skippedNoBalance: number;
  dryRun: boolean;
  details: Array<{
    employeeId: string;
    employeeName: string;
    leaveType: string;
    leaveTypeCode: string;
    remainingPrevYear: number;
    maxCarryForward: number;
    carriedForward: number;
  }>;
}> {
  logger.info({ previousYear, newYear, dryRun }, 'Starting leave carry-forward processing');

  // 1. Get all leave types that allow carry-forward
  const carryForwardLeaveTypes = await prisma.leaveType.findMany({
    where: {
      isActive: true,
      carryForwardAllowed: true,
    },
  });

  if (carryForwardLeaveTypes.length === 0) {
    logger.info('No leave types with carry-forward enabled. Nothing to process.');
    return {
      previousYear, newYear, employeesProcessed: 0,
      carryForwardsApplied: 0, skippedNoBalance: 0, dryRun, details: [],
    };
  }

  // 2. Get all active employees
  const employees = await prisma.employee.findMany({
    where: { status: { in: ['active', 'Active', 'ACTIVE'] } },
    select: { id: true, firstName: true, lastName: true },
  });

  let employeesProcessed = 0;
  let carryForwardsApplied = 0;
  let skippedNoBalance = 0;
  const details: Array<{
    employeeId: string;
    employeeName: string;
    leaveType: string;
    leaveTypeCode: string;
    remainingPrevYear: number;
    maxCarryForward: number;
    carriedForward: number;
  }> = [];

  for (const employee of employees) {
    employeesProcessed++;

    for (const leaveType of carryForwardLeaveTypes) {
      // 3. Get previous year balance
      const prevBalance = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year: previousYear,
        },
      });

      if (!prevBalance) {
        skippedNoBalance++;
        continue;
      }

      // 4. Calculate remaining
      const total = Number(prevBalance.totalDays) + Number(prevBalance.carryForwardDays) + Number(prevBalance.adjustmentDays);
      const used = Number(prevBalance.usedDays) + Number(prevBalance.pendingDays);
      const remaining = Math.max(0, total - used);

      if (remaining <= 0) {
        skippedNoBalance++;
        continue;
      }

      // 5. Cap at maxCarryForwardDays
      const maxCF = leaveType.maxCarryForwardDays ?? config.leave.maxCarryForwardDays;
      const carriedForward = Math.min(remaining, maxCF);

      details.push({
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        leaveType: leaveType.name,
        leaveTypeCode: leaveType.code,
        remainingPrevYear: remaining,
        maxCarryForward: maxCF,
        carriedForward,
      });

      if (dryRun) {
        carryForwardsApplied++;
        continue;
      }

      // 6. Upsert the new year's balance with carryForwardDays
      const existingNewYearBalance = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year: newYear,
        },
      });

      if (existingNewYearBalance) {
        await prisma.leaveBalance.update({
          where: { id: existingNewYearBalance.id },
          data: {
            carryForwardDays: carriedForward,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.leaveBalance.create({
          data: {
            id: uuidv4(),
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            year: newYear,
            totalDays: leaveType.defaultDaysPerYear,
            usedDays: 0,
            pendingDays: 0,
            carryForwardDays: carriedForward,
            adjustmentDays: 0,
          },
        });
      }

      carryForwardsApplied++;
    }
  }

  logger.info({
    previousYear, newYear, employeesProcessed,
    carryForwardsApplied, skippedNoBalance, dryRun,
  }, 'Leave carry-forward processing completed');

  return {
    previousYear, newYear, employeesProcessed,
    carryForwardsApplied, skippedNoBalance, dryRun, details,
  };
}
