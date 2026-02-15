/**
 * Activity Service for Attendance Service
 * Logs leave and attendance related activities to the Activity table
 */

import { PrismaClient } from '.prisma/tenant-client';
import { logger } from '../utils/logger';

export type ActivityType = 
  | 'HIRE' 
  | 'EXIT' 
  | 'PROMOTION' 
  | 'TRAINING' 
  | 'LEAVE' 
  | 'PERFORMANCE' 
  | 'DOCUMENT' 
  | 'GRIEVANCE' 
  | 'INTERVIEW' 
  | 'CANDIDATE' 
  | 'ONBOARDING' 
  | 'OFFBOARDING' 
  | 'COMPLIANCE'
  | 'ATTENDANCE';

interface CreateActivityInput {
  type: ActivityType;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  userId?: string;
  userName?: string;
  details?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new activity log entry
 */
export async function createActivity(
  prisma: PrismaClient,
  input: CreateActivityInput
): Promise<void> {
  try {
    // Check if Activity table exists
    await prisma.activity.create({
      data: {
        type: input.type,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        userId: input.userId,
        userName: input.userName,
        details: input.details,
        metadata: input.metadata,
      },
    });
    logger.info({ type: input.type, action: input.action }, 'Activity created');
  } catch (error) {
    // Don't throw - activities are non-critical
    // Table might not exist yet
    logger.debug({ error: (error as Error).message }, 'Activity creation skipped (table may not exist)');
  }
}

/**
 * Log leave request submitted
 */
export async function logLeaveRequested(
  prisma: PrismaClient,
  employeeId: string,
  employeeName: string,
  leaveTypeName: string,
  days: number,
  leaveRequestId: string
): Promise<void> {
  await createActivity(prisma, {
    type: 'LEAVE',
    action: 'Leave request submitted',
    entityType: 'leave',
    entityId: leaveRequestId,
    entityName: employeeName,
    details: `${leaveTypeName} for ${days} day(s)`,
    metadata: { employeeId, leaveTypeName, days },
  });
}

/**
 * Log leave request approved
 */
export async function logLeaveApproved(
  prisma: PrismaClient,
  employeeId: string,
  employeeName: string,
  leaveTypeName: string,
  days: number,
  leaveRequestId: string,
  approverId?: string,
  approverName?: string
): Promise<void> {
  await createActivity(prisma, {
    type: 'LEAVE',
    action: 'Leave request approved',
    entityType: 'leave',
    entityId: leaveRequestId,
    entityName: employeeName,
    userId: approverId,
    userName: approverName,
    details: `${leaveTypeName} for ${days} day(s)`,
    metadata: { employeeId, leaveTypeName, days },
  });
}

/**
 * Log leave request rejected
 */
export async function logLeaveRejected(
  prisma: PrismaClient,
  employeeId: string,
  employeeName: string,
  leaveTypeName: string,
  days: number,
  leaveRequestId: string,
  approverId?: string,
  approverName?: string,
  reason?: string
): Promise<void> {
  await createActivity(prisma, {
    type: 'LEAVE',
    action: 'Leave request rejected',
    entityType: 'leave',
    entityId: leaveRequestId,
    entityName: employeeName,
    userId: approverId,
    userName: approverName,
    details: `${leaveTypeName} - Reason: ${reason || 'Not specified'}`,
    metadata: { employeeId, leaveTypeName, days, reason },
  });
}

/**
 * Log leave request cancelled
 */
export async function logLeaveCancelled(
  prisma: PrismaClient,
  employeeId: string,
  employeeName: string,
  leaveTypeName: string,
  days: number,
  leaveRequestId: string,
  cancelledBy?: string,
  cancelledByName?: string,
  reason?: string
): Promise<void> {
  await createActivity(prisma, {
    type: 'LEAVE',
    action: 'Leave request cancelled',
    entityType: 'leave',
    entityId: leaveRequestId,
    entityName: employeeName,
    userId: cancelledBy,
    userName: cancelledByName,
    details: reason ? `Reason: ${reason}` : `${leaveTypeName} for ${days} day(s)`,
    metadata: { employeeId, leaveTypeName, days, reason },
  });
}

/**
 * Log attendance check-in
 */
export async function logCheckIn(
  prisma: PrismaClient,
  employeeId: string,
  employeeName: string,
  attendanceId: string,
  isLate: boolean
): Promise<void> {
  await createActivity(prisma, {
    type: 'ATTENDANCE',
    action: isLate ? 'Late check-in recorded' : 'Check-in recorded',
    entityType: 'attendance',
    entityId: attendanceId,
    entityName: employeeName,
    metadata: { employeeId, isLate },
  });
}

/**
 * Log attendance check-out
 */
export async function logCheckOut(
  prisma: PrismaClient,
  employeeId: string,
  employeeName: string,
  attendanceId: string,
  isEarlyLeave: boolean
): Promise<void> {
  await createActivity(prisma, {
    type: 'ATTENDANCE',
    action: isEarlyLeave ? 'Early check-out recorded' : 'Check-out recorded',
    entityType: 'attendance',
    entityId: attendanceId,
    entityName: employeeName,
    metadata: { employeeId, isEarlyLeave },
  });
}
