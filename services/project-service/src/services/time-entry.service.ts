/**
 * Time Entry Service - Time tracking, timesheets, and approvals
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  parseISO,
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInMinutes,
  isWeekend,
  isBefore,
  addDays,
} from 'date-fns';
import { getEventBus, SQS_QUEUES } from '@oms/event-bus';
import { logger } from '../utils/logger';
import { config } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateTimeEntryInput {
  employeeId: string;
  projectId: string;
  taskId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  description: string;
  isBillable?: boolean;
  tags?: string[];
}

export interface UpdateTimeEntryInput {
  projectId?: string;
  taskId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  description?: string;
  isBillable?: boolean;
  tags?: string[];
}

export interface ApproveTimeEntriesInput {
  timeEntryIds: string[];
  approverId: string;
  comments?: string;
}

export interface RejectTimeEntriesInput {
  timeEntryIds: string[];
  approverId: string;
  reason: string;
}

export interface TimeEntryFilters {
  employeeId?: string;
  projectId?: string;
  taskId?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  dateFrom?: string;
  dateTo?: string;
  isBillable?: boolean;
  page?: number;
  pageSize?: number;
}

export interface TimesheetSummary {
  employeeId: string;
  weekStart: string;
  weekEnd: string;
  entries: any[];
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  byProject: { projectId: string; projectName: string; minutes: number }[];
  byDay: { date: string; minutes: number }[];
  status: 'draft' | 'submitted' | 'approved' | 'partial';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function roundDuration(minutes: number): number {
  const interval = config.timeTracking.roundingIntervalMinutes;
  return Math.ceil(minutes / interval) * interval;
}

function validateTimeEntry(
  date: Date,
  durationMinutes: number,
  existingMinutesForDay: number
): void {
  const now = new Date();
  const entryDate = new Date(date);
  
  // Check future dates
  if (!config.timeTracking.allowFutureDates && entryDate > now) {
    throw new Error('Future time entries are not allowed');
  }
  
  // Check past edit window
  const daysDiff = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > config.timeTracking.pastEditWindowDays) {
    throw new Error(`Cannot log time for dates older than ${config.timeTracking.pastEditWindowDays} days`);
  }
  
  // Check minimum duration
  if (durationMinutes < config.timeTracking.minEntryMinutes) {
    throw new Error(`Minimum time entry is ${config.timeTracking.minEntryMinutes} minutes`);
  }
  
  // Check maximum hours per day
  const maxMinutes = config.timeTracking.maxHoursPerDay * 60;
  if (existingMinutesForDay + durationMinutes > maxMinutes) {
    throw new Error(`Cannot exceed ${config.timeTracking.maxHoursPerDay} hours per day`);
  }
}

// ============================================================================
// TIME ENTRY OPERATIONS
// ============================================================================

/**
 * Create a time entry
 */
export async function createTimeEntry(
  prisma: PrismaClient,
  input: CreateTimeEntryInput,
  userId: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const id = uuidv4();
  const date = parseISO(input.date);
  
  // Calculate duration
  let durationMinutes = input.durationMinutes || 0;
  if (input.startTime && input.endTime && !durationMinutes) {
    const start = parseISO(`${input.date}T${input.startTime}`);
    const end = parseISO(`${input.date}T${input.endTime}`);
    durationMinutes = differenceInMinutes(end, start);
  }
  
  // Round duration
  durationMinutes = roundDuration(durationMinutes);
  
  // Get existing minutes for the day
  const existingEntries = await prisma.timeEntry.aggregate({
    where: {
      employeeId: input.employeeId,
      date,
      status: { not: 'rejected' },
    },
    _sum: { durationMinutes: true },
  });
  
  const existingMinutes = existingEntries._sum.durationMinutes || 0;
  
  // Validate
  validateTimeEntry(date, durationMinutes, existingMinutes);
  
  // Verify project membership
  const teamMember = await prisma.projectTeamMember.findFirst({
    where: {
      projectId: input.projectId,
      employeeId: input.employeeId,
      isActive: true,
    },
  });
  
  if (!teamMember) {
    throw new Error('You are not a member of this project');
  }
  
  // Get project for billable default
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { isBillable: true, hourlyRateCents: true },
  });
  
  const isBillable = input.isBillable ?? project?.isBillable ?? config.billing.defaultBillable;
  
  const timeEntry = await prisma.timeEntry.create({
    data: {
      id,
      employeeId: input.employeeId,
      projectId: input.projectId,
      taskId: input.taskId,
      date,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes,
      description: input.description,
      isBillable,
      hourlyRateCents: teamMember.hourlyRateCents || project?.hourlyRateCents || config.billing.defaultHourlyRateCents,
      tags: input.tags || [],
      status: 'draft',
      createdBy: userId,
      updatedBy: userId,
    },
    include: {
      project: { select: { id: true, name: true, code: true } },
      task: { select: { id: true, title: true } },
    },
  });
  
  logger.info({ 
    timeEntryId: id, 
    employeeId: input.employeeId,
    projectId: input.projectId,
    durationMinutes,
  }, 'Time entry created');
  
  return timeEntry;
}

/**
 * Update a time entry
 */
export async function updateTimeEntry(
  prisma: PrismaClient,
  id: string,
  input: UpdateTimeEntryInput,
  userId: string
): Promise<any> {
  const existing = await prisma.timeEntry.findUnique({ where: { id } });
  
  if (!existing) {
    throw new Error('Time entry not found');
  }
  
  if (existing.status === 'approved') {
    throw new Error('Cannot edit approved time entries');
  }
  
  const data: any = {
    updatedBy: userId,
    updatedAt: new Date(),
  };
  
  // Calculate new duration if times provided
  let durationMinutes = input.durationMinutes;
  const date = input.date ? parseISO(input.date) : existing.date;
  
  if (input.startTime && input.endTime && !durationMinutes) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const start = parseISO(`${dateStr}T${input.startTime}`);
    const end = parseISO(`${dateStr}T${input.endTime}`);
    durationMinutes = differenceInMinutes(end, start);
  }
  
  if (durationMinutes) {
    durationMinutes = roundDuration(durationMinutes);
    
    // Get existing minutes for the day (excluding this entry)
    const existingEntries = await prisma.timeEntry.aggregate({
      where: {
        employeeId: existing.employeeId,
        date,
        status: { not: 'rejected' },
        id: { not: id },
      },
      _sum: { durationMinutes: true },
    });
    
    const existingMinutes = existingEntries._sum.durationMinutes || 0;
    validateTimeEntry(date, durationMinutes, existingMinutes);
    
    data.durationMinutes = durationMinutes;
  }
  
  if (input.projectId) data.projectId = input.projectId;
  if (input.taskId !== undefined) data.taskId = input.taskId;
  if (input.date) data.date = parseISO(input.date);
  if (input.startTime) data.startTime = input.startTime;
  if (input.endTime) data.endTime = input.endTime;
  if (input.description) data.description = input.description;
  if (input.isBillable !== undefined) data.isBillable = input.isBillable;
  if (input.tags) data.tags = input.tags;
  
  // Reset to draft if it was rejected
  if (existing.status === 'rejected') {
    data.status = 'draft';
    data.rejectionReason = null;
  }
  
  const timeEntry = await prisma.timeEntry.update({
    where: { id },
    data,
    include: {
      project: { select: { id: true, name: true, code: true } },
      task: { select: { id: true, title: true } },
    },
  });
  
  logger.info({ timeEntryId: id }, 'Time entry updated');
  
  return timeEntry;
}

/**
 * Delete a time entry
 */
export async function deleteTimeEntry(
  prisma: PrismaClient,
  id: string
): Promise<void> {
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  
  if (!entry) {
    throw new Error('Time entry not found');
  }
  
  if (entry.status === 'approved') {
    throw new Error('Cannot delete approved time entries');
  }
  
  await prisma.timeEntry.delete({ where: { id } });
  
  logger.info({ timeEntryId: id }, 'Time entry deleted');
}

/**
 * Submit time entries for approval
 */
export async function submitTimeEntries(
  prisma: PrismaClient,
  timeEntryIds: string[],
  employeeId: string
): Promise<any[]> {
  // Verify ownership
  const entries = await prisma.timeEntry.findMany({
    where: { id: { in: timeEntryIds } },
  });
  
  const unauthorized = entries.filter(e => e.employeeId !== employeeId);
  if (unauthorized.length > 0) {
    throw new Error('Some entries do not belong to you');
  }
  
  const invalidStatus = entries.filter(e => e.status !== 'draft');
  if (invalidStatus.length > 0) {
    throw new Error('Some entries are not in draft status');
  }
  
  await prisma.timeEntry.updateMany({
    where: { id: { in: timeEntryIds } },
    data: {
      status: 'submitted',
      submittedAt: new Date(),
      updatedAt: new Date(),
    },
  });
  
  logger.info({ count: timeEntryIds.length, employeeId }, 'Time entries submitted');
  
  return prisma.timeEntry.findMany({
    where: { id: { in: timeEntryIds } },
    include: {
      project: { select: { id: true, name: true } },
    },
  });
}

/**
 * Approve time entries
 */
export async function approveTimeEntries(
  prisma: PrismaClient,
  input: ApproveTimeEntriesInput,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any[]> {
  const eventBus = getEventBus('project-service');
  
  const entries = await prisma.timeEntry.findMany({
    where: { id: { in: input.timeEntryIds } },
  });
  
  const invalidStatus = entries.filter(e => e.status !== 'submitted');
  if (invalidStatus.length > 0) {
    throw new Error('Some entries are not in submitted status');
  }
  
  await prisma.timeEntry.updateMany({
    where: { id: { in: input.timeEntryIds } },
    data: {
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: input.approverId,
      approverComments: input.comments,
      updatedAt: new Date(),
    },
  });
  
  // Emit event
  for (const entry of entries) {
    await eventBus.sendToQueue(
      SQS_QUEUES.TIME_ENTRY_APPROVED,
      'timeEntry.approved',
      {
        timeEntryId: entry.id,
        employeeId: entry.employeeId,
        projectId: entry.projectId,
        durationMinutes: entry.durationMinutes,
        isBillable: entry.isBillable,
        approvedBy: input.approverId,
      },
      tenantContext
    );
  }
  
  logger.info({ 
    count: input.timeEntryIds.length, 
    approvedBy: input.approverId 
  }, 'Time entries approved');
  
  return prisma.timeEntry.findMany({
    where: { id: { in: input.timeEntryIds } },
  });
}

/**
 * Reject time entries
 */
export async function rejectTimeEntries(
  prisma: PrismaClient,
  input: RejectTimeEntriesInput
): Promise<any[]> {
  const entries = await prisma.timeEntry.findMany({
    where: { id: { in: input.timeEntryIds } },
  });
  
  const invalidStatus = entries.filter(e => e.status !== 'submitted');
  if (invalidStatus.length > 0) {
    throw new Error('Some entries are not in submitted status');
  }
  
  await prisma.timeEntry.updateMany({
    where: { id: { in: input.timeEntryIds } },
    data: {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectedBy: input.approverId,
      rejectionReason: input.reason,
      updatedAt: new Date(),
    },
  });
  
  logger.info({ 
    count: input.timeEntryIds.length, 
    rejectedBy: input.approverId,
    reason: input.reason,
  }, 'Time entries rejected');
  
  return prisma.timeEntry.findMany({
    where: { id: { in: input.timeEntryIds } },
  });
}

/**
 * List time entries with filters
 */
export async function listTimeEntries(
  prisma: PrismaClient,
  filters: TimeEntryFilters
): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const page = filters.page || 1;
  const pageSize = Math.min(filters.pageSize || 50, 100);
  const skip = (page - 1) * pageSize;
  
  const where: any = {};
  
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.taskId) where.taskId = filters.taskId;
  if (filters.status) where.status = filters.status;
  if (filters.isBillable !== undefined) where.isBillable = filters.isBillable;
  
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = parseISO(filters.dateFrom);
    if (filters.dateTo) where.date.lte = parseISO(filters.dateTo);
  }
  
  const [entries, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: {
        project: { select: { id: true, name: true, code: true } },
        task: { select: { id: true, title: true } },
        employee: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.timeEntry.count({ where }),
  ]);
  
  return { data: entries, total, page, pageSize };
}

/**
 * Get weekly timesheet summary
 */
export async function getWeeklyTimesheet(
  prisma: PrismaClient,
  employeeId: string,
  weekDate: string
): Promise<TimesheetSummary> {
  const date = parseISO(weekDate);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  
  const entries = await prisma.timeEntry.findMany({
    where: {
      employeeId,
      date: { gte: weekStart, lte: weekEnd },
    },
    include: {
      project: { select: { id: true, name: true, code: true } },
      task: { select: { id: true, title: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
  
  // Calculate totals
  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const billableMinutes = entries
    .filter(e => e.isBillable)
    .reduce((sum, e) => sum + e.durationMinutes, 0);
  
  // Group by project
  const projectMap = new Map<string, { projectName: string; minutes: number }>();
  for (const entry of entries) {
    const existing = projectMap.get(entry.projectId) || { 
      projectName: entry.project.name, 
      minutes: 0 
    };
    existing.minutes += entry.durationMinutes;
    projectMap.set(entry.projectId, existing);
  }
  
  // Group by day
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const byDay = days.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayEntries = entries.filter(e => format(e.date, 'yyyy-MM-dd') === dateStr);
    return {
      date: dateStr,
      minutes: dayEntries.reduce((sum, e) => sum + e.durationMinutes, 0),
    };
  });
  
  // Determine overall status
  const statuses = [...new Set(entries.map(e => e.status))];
  let status: 'draft' | 'submitted' | 'approved' | 'partial' = 'draft';
  if (statuses.every(s => s === 'approved')) {
    status = 'approved';
  } else if (statuses.every(s => s === 'submitted')) {
    status = 'submitted';
  } else if (statuses.some(s => s === 'approved' || s === 'submitted')) {
    status = 'partial';
  }
  
  return {
    employeeId,
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd'),
    entries,
    totalMinutes,
    billableMinutes,
    nonBillableMinutes: totalMinutes - billableMinutes,
    byProject: Array.from(projectMap.entries()).map(([projectId, data]) => ({
      projectId,
      projectName: data.projectName,
      minutes: data.minutes,
    })),
    byDay,
    status,
  };
}

/**
 * Get pending time entries for approval (for managers)
 */
export async function getPendingTimeEntriesForApproval(
  prisma: PrismaClient,
  managerId: string
): Promise<any[]> {
  // Get projects managed by this user
  const managedProjects = await prisma.project.findMany({
    where: { managerId },
    select: { id: true },
  });
  
  const projectIds = managedProjects.map(p => p.id);
  
  return prisma.timeEntry.findMany({
    where: {
      projectId: { in: projectIds },
      status: 'submitted',
    },
    include: {
      project: { select: { id: true, name: true, code: true } },
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: [{ date: 'asc' }, { submittedAt: 'asc' }],
  });
}

/**
 * Get project time summary
 */
export async function getProjectTimeSummary(
  prisma: PrismaClient,
  projectId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  byEmployee: { employeeId: string; name: string; minutes: number }[];
  byStatus: { status: string; minutes: number }[];
  estimatedCostCents: number;
}> {
  const where: any = {
    projectId,
    status: { in: ['approved', 'submitted'] },
  };
  
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = parseISO(dateFrom);
    if (dateTo) where.date.lte = parseISO(dateTo);
  }
  
  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  
  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const billableMinutes = entries
    .filter(e => e.isBillable)
    .reduce((sum, e) => sum + e.durationMinutes, 0);
  
  // Group by employee
  const employeeMap = new Map<string, { name: string; minutes: number }>();
  for (const entry of entries) {
    const name = `${entry.employee.user.firstName} ${entry.employee.user.lastName}`;
    const existing = employeeMap.get(entry.employeeId) || { name, minutes: 0 };
    existing.minutes += entry.durationMinutes;
    employeeMap.set(entry.employeeId, existing);
  }
  
  // Group by status
  const statusMap = new Map<string, number>();
  for (const entry of entries) {
    statusMap.set(entry.status, (statusMap.get(entry.status) || 0) + entry.durationMinutes);
  }
  
  // Calculate estimated cost
  const estimatedCostCents = entries.reduce((sum, e) => {
    return sum + Math.round((e.durationMinutes / 60) * e.hourlyRateCents);
  }, 0);
  
  return {
    totalMinutes,
    billableMinutes,
    nonBillableMinutes: totalMinutes - billableMinutes,
    byEmployee: Array.from(employeeMap.entries()).map(([employeeId, data]) => ({
      employeeId,
      name: data.name,
      minutes: data.minutes,
    })),
    byStatus: Array.from(statusMap.entries()).map(([status, minutes]) => ({
      status,
      minutes,
    })),
    estimatedCostCents,
  };
}
