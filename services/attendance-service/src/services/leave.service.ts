/**
 * Leave Service - Leave requests, approvals, and balance management
 */

import { PrismaClient } from '@prisma/client';
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
} from 'date-fns';
import { getEventBus, SQS_QUEUES } from '@oms/event-bus';
import { logger } from '../utils/logger';
import { config } from '../config';

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
      adjustmentDays: balance.adjustmentDays + adjustmentDays,
      updatedAt: new Date(),
    },
    include: { leaveType: true },
  });
  
  // Log adjustment
  await prisma.leaveBalanceAdjustment.create({
    data: {
      id: uuidv4(),
      leaveBalanceId: balance.id,
      days: adjustmentDays,
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
 * Calculate leave days excluding weekends and holidays
 */
async function calculateLeaveDays(
  prisma: PrismaClient,
  fromDate: Date,
  toDate: Date,
  isHalfDay: boolean
): Promise<number> {
  if (isHalfDay) {
    return 0.5;
  }
  
  // Get holidays in range
  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: fromDate, lte: toDate },
    },
  });
  const holidayDates = new Set(holidays.map(h => format(h.date, 'yyyy-MM-dd')));
  
  // Count business days excluding holidays
  const allDays = eachDayOfInterval({ start: fromDate, end: toDate });
  const leaveDays = allDays.filter(day =>
    !isWeekend(day) && !holidayDates.has(format(day, 'yyyy-MM-dd'))
  ).length;
  
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
  
  const fromDate = parseISO(input.fromDate);
  const toDate = parseISO(input.toDate);
  
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
  
  // Calculate leave days
  const leaveDays = await calculateLeaveDays(prisma, fromDate, toDate, input.isHalfDay || false);
  
  if (leaveDays === 0) {
    throw new Error('No valid leave days in the selected range');
  }
  
  // Get employee and their balance
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    include: {
      reportingTo: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });
  
  if (!employee || employee.status !== 'active') {
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
  
  // Check available balance
  const availableDays = balance.totalDays + balance.carryForwardDays + balance.adjustmentDays
    - balance.usedDays - balance.pendingDays;
  
  if (leaveDays > availableDays && !config.leave.allowNegativeBalance) {
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
      approverId: employee.reportingToId ? employee.reportingTo?.userId : null,
      createdBy: input.employeeId,
      updatedBy: input.employeeId,
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
  
  // Emit event
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
      approvedAt: new Date(),
      approverComments: input.comments,
      updatedBy: input.approverId,
      updatedAt: new Date(),
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
        createdBy: input.approverId,
        updatedBy: input.approverId,
      },
      update: {
        status: 'on_leave',
        leaveRequestId: leaveRequest.id,
        updatedBy: input.approverId,
        updatedAt: new Date(),
      },
    });
  }
  
  // Emit event
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
  
  logger.info({
    leaveRequestId: input.leaveRequestId,
    approvedBy: input.approverId,
  }, 'Leave approved');
  
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
      rejectedAt: new Date(),
      rejectionReason: input.reason,
      updatedBy: input.approverId,
      updatedAt: new Date(),
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
  
  logger.info({
    leaveRequestId: input.leaveRequestId,
    rejectedBy: input.approverId,
    reason: input.reason,
  }, 'Leave rejected');
  
  return updated;
}

/**
 * Cancel leave request
 */
export async function cancelLeave(
  prisma: PrismaClient,
  leaveRequestId: string,
  cancelledBy: string,
  reason?: string
): Promise<any> {
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
  });
  
  if (!leaveRequest) {
    throw new Error('Leave request not found');
  }
  
  if (!['pending', 'approved'].includes(leaveRequest.status)) {
    throw new Error(`Cannot cancel leave request with status: ${leaveRequest.status}`);
  }
  
  const wasPending = leaveRequest.status === 'pending';
  
  // Update leave request
  const updated = await prisma.leaveRequest.update({
    where: { id: leaveRequestId },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: reason,
      updatedBy: cancelledBy,
      updatedAt: new Date(),
    },
    include: {
      leaveType: true,
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
      ? { pendingDays: { decrement: leaveRequest.totalDays } }
      : { usedDays: { decrement: leaveRequest.totalDays } },
  });
  
  // Remove attendance records if was approved
  if (!wasPending) {
    await prisma.attendance.deleteMany({
      where: { leaveRequestId },
    });
  }
  
  logger.info({ leaveRequestId, cancelledBy }, 'Leave cancelled');
  
  return updated;
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
      where.OR.push({ fromDate: { gte: parseISO(filters.dateFrom) } });
    }
    if (filters.dateTo) {
      where.OR.push({ toDate: { lte: parseISO(filters.dateTo) } });
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
          include: {
            user: { select: { firstName: true, lastName: true } },
            department: { select: { name: true } },
          },
        },
      },
    }),
    prisma.leaveRequest.count({ where }),
  ]);
  
  return { data, total, page, pageSize };
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
    where: { reportingToId: managerId },
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
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}
