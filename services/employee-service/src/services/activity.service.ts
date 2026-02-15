/**
 * Activity Service - Handles creation and retrieval of activities, alerts, and notifications
 */

import { PrismaClient } from '.prisma/tenant-client';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

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

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
export type HRAlertType = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface CreateActivityInput {
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

export interface CreateNotificationInput {
  userId: string;
  type?: NotificationType;
  category?: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

export interface CreateHRAlertInput {
  type?: HRAlertType;
  category: string;
  title: string;
  description: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: number;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

// ============================================================================
// ACTIVITY FUNCTIONS
// ============================================================================

/**
 * Create a new activity log entry
 */
export async function createActivity(
  prisma: PrismaClient,
  input: CreateActivityInput
): Promise<void> {
  try {
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
    logger.error({ error: (error as Error).message }, 'Failed to create activity');
    // Don't throw - activities are non-critical
  }
}

/**
 * Get recent activities with pagination
 */
export async function getRecentActivities(
  prisma: PrismaClient,
  options: {
    limit?: number;
    offset?: number;
    types?: ActivityType[];
    entityType?: string;
    fromDate?: Date;
  } = {}
): Promise<any[]> {
  const { limit = 20, offset = 0, types, entityType, fromDate } = options;

  const where: any = {};
  
  if (types && types.length > 0) {
    where.type = { in: types };
  }
  
  if (entityType) {
    where.entityType = entityType;
  }
  
  if (fromDate) {
    where.createdAt = { gte: fromDate };
  }

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return activities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    action: activity.action,
    entityType: activity.entityType,
    entityId: activity.entityId,
    entityName: activity.entityName,
    userId: activity.userId,
    userName: activity.userName,
    details: activity.details,
    metadata: activity.metadata,
    timestamp: activity.createdAt.toISOString(),
  }));
}

// ============================================================================
// HR ALERT FUNCTIONS
// ============================================================================

/**
 * Create a new HR alert
 */
export async function createHRAlert(
  prisma: PrismaClient,
  input: CreateHRAlertInput
): Promise<void> {
  try {
    await prisma.hRAlert.create({
      data: {
        type: input.type || 'INFO',
        category: input.category,
        title: input.title,
        description: input.description,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        priority: input.priority || 0,
        metadata: input.metadata,
        expiresAt: input.expiresAt,
      },
    });
    logger.info({ category: input.category, title: input.title }, 'HR Alert created');
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to create HR alert');
    // Don't throw - alerts are non-critical
  }
}

/**
 * Get active HR alerts
 */
export async function getHRAlerts(
  prisma: PrismaClient,
  options: {
    limit?: number;
    categories?: string[];
    types?: HRAlertType[];
    includeExpired?: boolean;
  } = {}
): Promise<any[]> {
  const { limit = 10, categories, types, includeExpired = false } = options;

  const where: any = {
    isActive: true,
    isDismissed: false,
  };

  if (!includeExpired) {
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ];
  }

  if (categories && categories.length > 0) {
    where.category = { in: categories };
  }

  if (types && types.length > 0) {
    where.type = { in: types };
  }

  const alerts = await prisma.hRAlert.findMany({
    where,
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
  });

  return alerts.map((alert) => ({
    id: alert.id,
    type: alert.type.toLowerCase(),
    category: alert.category,
    title: alert.title,
    description: alert.description,
    actionUrl: alert.actionUrl,
    actionLabel: alert.actionLabel,
    timestamp: formatTimestamp(alert.createdAt),
  }));
}

/**
 * Dismiss an HR alert
 */
export async function dismissHRAlert(
  prisma: PrismaClient,
  alertId: string,
  userId: string
): Promise<void> {
  await prisma.hRAlert.update({
    where: { id: alertId },
    data: {
      isDismissed: true,
      dismissedBy: userId,
      dismissedAt: new Date(),
    },
  });
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Create a notification for a user
 */
export async function createNotification(
  prisma: PrismaClient,
  input: CreateNotificationInput
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type || 'INFO',
        category: input.category,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        metadata: input.metadata,
        expiresAt: input.expiresAt,
      },
    });
    logger.info({ userId: input.userId, title: input.title }, 'Notification created');
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to create notification');
  }
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
  prisma: PrismaClient,
  userIds: string[],
  input: Omit<CreateNotificationInput, 'userId'>
): Promise<void> {
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: input.type || 'INFO',
        category: input.category,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        metadata: input.metadata,
        expiresAt: input.expiresAt,
      })),
    });
    logger.info({ userCount: userIds.length, title: input.title }, 'Bulk notifications created');
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to create bulk notifications');
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  prisma: PrismaClient,
  userId: string,
  options: {
    limit?: number;
    unreadOnly?: boolean;
    categories?: string[];
  } = {}
): Promise<any[]> {
  const { limit = 20, unreadOnly = false, categories } = options;

  const where: any = {
    userId,
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ],
  };

  if (unreadOnly) {
    where.isRead = false;
  }

  if (categories && categories.length > 0) {
    where.category = { in: categories };
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return notifications.map((n) => ({
    id: n.id,
    type: n.type.toLowerCase(),
    category: n.category,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    actionUrl: n.actionUrl,
    actionLabel: n.actionLabel,
    timestamp: formatTimestamp(n.createdAt),
    createdAt: n.createdAt.toISOString(),
  }));
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(
  prisma: PrismaClient,
  notificationId: string
): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Mark all user notifications as read
 */
export async function markAllNotificationsRead(
  prisma: PrismaClient,
  userId: string
): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

// ============================================================================
// AUTO-GENERATED ALERTS
// ============================================================================

/**
 * Generate system alerts based on current data
 * This should be called periodically or during dashboard load
 */
export async function generateSystemAlerts(prisma: PrismaClient): Promise<any[]> {
  const now = new Date();
  const alerts: any[] = [];

  try {
    // Check for probation ending soon (within 7 days)
    const probationEnding = await prisma.employee.count({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        probationEndDate: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (probationEnding > 0) {
      alerts.push({
        id: 'sys-probation-ending',
        type: 'warning',
        category: 'probation',
        title: 'Probation Reviews Due',
        description: `${probationEnding} employee(s) have probation ending within 7 days`,
        timestamp: 'System Alert',
        actionUrl: '/employees?status=probation',
        actionLabel: 'View List',
      });
    }

    // Check for contracts expiring soon (within 30 days)
    const contractsExpiring = await prisma.employee.count({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        employmentType: 'CONTRACT',
        probationEndDate: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (contractsExpiring > 0) {
      alerts.push({
        id: 'sys-contracts-expiring',
        type: 'warning',
        category: 'contract',
        title: 'Contract Renewals Pending',
        description: `${contractsExpiring} contract(s) expiring within 30 days`,
        timestamp: 'System Alert',
        actionUrl: '/employees?employmentType=CONTRACT',
        actionLabel: 'Review',
      });
    }

    // Check for pending leave requests
    const pendingLeaves = await prisma.leaveRequest.count({
      where: { status: 'pending' },
    });

    if (pendingLeaves > 0) {
      alerts.push({
        id: 'sys-pending-leaves',
        type: pendingLeaves > 10 ? 'warning' : 'info',
        category: 'leave',
        title: 'Pending Leave Requests',
        description: `${pendingLeaves} leave request(s) awaiting approval`,
        timestamp: 'System Alert',
        actionUrl: '/leaves/pending',
        actionLabel: 'Review',
      });
    }

    // Check for overdue documents (employee documents with past expiry dates)
    const expiredDocs = await prisma.employeeDocument.count({
      where: {
        expiryDate: { lt: now },
        isVerified: true,
      },
    });

    if (expiredDocs > 0) {
      alerts.push({
        id: 'sys-expired-docs',
        type: 'critical',
        category: 'compliance',
        title: 'Document Compliance Issue',
        description: `${expiredDocs} employee document(s) have expired and need renewal`,
        timestamp: 'System Alert',
        actionUrl: '/documents?status=expired',
        actionLabel: 'View',
      });
    }

    // Check for long-open positions (over 30 days)
    try {
      const longOpenPositions = await prisma.jobDescription.count({
        where: {
          status: 'OPEN',
          deletedAt: null,
          postedDate: {
            lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      if (longOpenPositions > 0) {
        alerts.push({
          id: 'sys-long-open-positions',
          type: 'warning',
          category: 'recruitment',
          title: 'Slow Hiring Alert',
          description: `${longOpenPositions} position(s) open for over 30 days`,
          timestamp: 'System Alert',
          actionUrl: '/hr/jobs',
          actionLabel: 'View Jobs',
        });
      }
    } catch (e) {
      // Job descriptions might not exist
    }

    // Merge with persisted alerts from database
    const persistedAlerts = await getHRAlerts(prisma, { limit: 20 });
    
    return [...alerts, ...persistedAlerts];
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to generate system alerts');
    return alerts;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format timestamp to relative time
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// ============================================================================
// ACTIVITY HELPER FUNCTIONS (to be used by other services)
// ============================================================================

/**
 * Log employee hire activity
 */
export async function logEmployeeHired(
  prisma: PrismaClient,
  employeeId: string,
  employeeName: string,
  userId?: string,
  userName?: string
): Promise<void> {
  await createActivity(prisma, {
    type: 'HIRE',
    action: 'New employee onboarded',
    entityType: 'employee',
    entityId: employeeId,
    entityName: employeeName,
    userId,
    userName,
  });
}

/**
 * Log employee exit activity
 */
export async function logEmployeeExit(
  prisma: PrismaClient,
  employeeId: string,
  employeeName: string,
  reason: string,
  userId?: string,
  userName?: string
): Promise<void> {
  await createActivity(prisma, {
    type: 'EXIT',
    action: `Employee ${reason === 'RESIGNED' ? 'resigned' : 'terminated'}`,
    entityType: 'employee',
    entityId: employeeId,
    entityName: employeeName,
    userId,
    userName,
    details: `Exit reason: ${reason}`,
  });
}

/**
 * Log leave request activity
 */
export async function logLeaveRequest(
  prisma: PrismaClient,
  employeeId: string,
  employeeName: string,
  action: 'submitted' | 'approved' | 'rejected' | 'cancelled',
  leaveType: string,
  days: number,
  userId?: string,
  userName?: string
): Promise<void> {
  const actionMap = {
    submitted: 'Leave request submitted',
    approved: 'Leave request approved',
    rejected: 'Leave request rejected',
    cancelled: 'Leave request cancelled',
  };

  await createActivity(prisma, {
    type: 'LEAVE',
    action: actionMap[action],
    entityType: 'leave',
    entityId: employeeId,
    entityName: employeeName,
    userId,
    userName,
    details: `${leaveType} leave for ${days} day(s)`,
  });
}

/**
 * Log interview activity
 */
export async function logInterviewActivity(
  prisma: PrismaClient,
  interviewId: string,
  candidateName: string,
  action: 'scheduled' | 'completed' | 'cancelled' | 'feedback',
  position: string,
  userId?: string,
  userName?: string
): Promise<void> {
  const actionMap = {
    scheduled: 'Interview scheduled',
    completed: 'Interview completed',
    cancelled: 'Interview cancelled',
    feedback: 'Interview feedback submitted',
  };

  await createActivity(prisma, {
    type: 'INTERVIEW',
    action: actionMap[action],
    entityType: 'interview',
    entityId: interviewId,
    entityName: candidateName,
    userId,
    userName,
    details: `Position: ${position}`,
  });
}

/**
 * Log candidate status change
 */
export async function logCandidateStatusChange(
  prisma: PrismaClient,
  candidateId: string,
  candidateName: string,
  newStatus: string,
  position: string,
  userId?: string,
  userName?: string
): Promise<void> {
  await createActivity(prisma, {
    type: 'CANDIDATE',
    action: `Candidate moved to ${newStatus}`,
    entityType: 'candidate',
    entityId: candidateId,
    entityName: candidateName,
    userId,
    userName,
    details: `Position: ${position}`,
  });
}

/**
 * Log promotion activity
 */
export async function logPromotion(
  prisma: PrismaClient,
  employeeId: string,
  employeeName: string,
  newDesignation: string,
  userId?: string,
  userName?: string
): Promise<void> {
  await createActivity(prisma, {
    type: 'PROMOTION',
    action: `Promoted to ${newDesignation}`,
    entityType: 'employee',
    entityId: employeeId,
    entityName: employeeName,
    userId,
    userName,
  });
}
