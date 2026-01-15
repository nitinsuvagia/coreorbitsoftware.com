/**
 * In-App Notification Service - Database-stored notifications
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { subDays } from 'date-fns';
import { logger } from '../utils/logger';
import { config, NotificationType } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
}

export interface NotificationFilters {
  userId: string;
  unreadOnly?: boolean;
  type?: NotificationType;
  priority?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================

/**
 * Create an in-app notification
 */
export async function createNotification(
  prisma: PrismaClient,
  input: CreateNotificationInput
): Promise<any> {
  const id = uuidv4();
  
  // Check user's notification count and remove oldest if exceeding limit
  const count = await prisma.notification.count({
    where: { userId: input.userId },
  });
  
  if (count >= config.inApp.maxPerUser) {
    // Delete oldest notifications
    const toDelete = count - config.inApp.maxPerUser + 1;
    const oldest = await prisma.notification.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: 'asc' },
      take: toDelete,
      select: { id: true },
    });
    
    await prisma.notification.deleteMany({
      where: { id: { in: oldest.map(n => n.id) } },
    });
    
    logger.debug({ userId: input.userId, count: toDelete }, 'Deleted old notifications');
  }
  
  const notification = await prisma.notification.create({
    data: {
      id,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data || {},
      actionUrl: input.actionUrl,
      priority: input.priority || 'normal',
      expiresAt: input.expiresAt,
    },
  });
  
  logger.debug({ 
    notificationId: id, 
    userId: input.userId, 
    type: input.type 
  }, 'In-app notification created');
  
  return notification;
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
  prisma: PrismaClient,
  userIds: string[],
  input: Omit<CreateNotificationInput, 'userId'>
): Promise<{ created: number }> {
  const notifications = userIds.map(userId => ({
    id: uuidv4(),
    userId,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data || {},
    actionUrl: input.actionUrl,
    priority: input.priority || 'normal',
    expiresAt: input.expiresAt,
  }));
  
  const result = await prisma.notification.createMany({
    data: notifications,
  });
  
  logger.info({ 
    count: result.count, 
    type: input.type 
  }, 'Bulk notifications created');
  
  return { created: result.count };
}

/**
 * Get notification by ID
 */
export async function getNotificationById(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<any | null> {
  return prisma.notification.findFirst({
    where: { id, userId },
  });
}

/**
 * List notifications for a user
 */
export async function listNotifications(
  prisma: PrismaClient,
  filters: NotificationFilters
): Promise<{ data: any[]; total: number; unreadCount: number; page: number; pageSize: number }> {
  const page = filters.page || 1;
  const pageSize = Math.min(filters.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  
  const where: any = { userId: filters.userId };
  
  if (filters.unreadOnly) where.isRead = false;
  if (filters.type) where.type = filters.type;
  if (filters.priority) where.priority = filters.priority;
  
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = filters.from;
    if (filters.to) where.createdAt.lte = filters.to;
  }
  
  // Exclude expired notifications
  where.OR = [
    { expiresAt: null },
    { expiresAt: { gt: new Date() } },
  ];
  
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId: filters.userId, isRead: false },
    }),
  ]);
  
  return { data: notifications, total, unreadCount, page, pageSize };
}

/**
 * Mark notification as read
 */
export async function markAsRead(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<any> {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
}

/**
 * Mark multiple notifications as read
 */
export async function markMultipleAsRead(
  prisma: PrismaClient,
  ids: string[],
  userId: string
): Promise<{ updated: number }> {
  const batchSize = config.inApp.markReadBatchSize;
  let updated = 0;
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const result = await prisma.notification.updateMany({
      where: { id: { in: batch }, userId },
      data: { isRead: true, readAt: new Date() },
    });
    updated += result.count;
  }
  
  return { updated };
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(
  prisma: PrismaClient,
  userId: string
): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  
  logger.info({ userId, count: result.count }, 'Marked all notifications as read');
  
  return { updated: result.count };
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  await prisma.notification.deleteMany({
    where: { id, userId },
  });
}

/**
 * Delete multiple notifications
 */
export async function deleteMultipleNotifications(
  prisma: PrismaClient,
  ids: string[],
  userId: string
): Promise<{ deleted: number }> {
  const result = await prisma.notification.deleteMany({
    where: { id: { in: ids }, userId },
  });
  
  return { deleted: result.count };
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(
  prisma: PrismaClient,
  userId: string
): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(
  prisma: PrismaClient,
  userId: string
): Promise<{
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}> {
  const [total, unread, byType, byPriority] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.groupBy({
      by: ['type'],
      where: { userId },
      _count: true,
    }),
    prisma.notification.groupBy({
      by: ['priority'],
      where: { userId },
      _count: true,
    }),
  ]);
  
  return {
    total,
    unread,
    byType: Object.fromEntries(byType.map(t => [t.type, t._count])),
    byPriority: Object.fromEntries(byPriority.map(p => [p.priority, p._count])),
  };
}

/**
 * Cleanup expired and old notifications
 */
export async function cleanupNotifications(
  prisma: PrismaClient
): Promise<{ deleted: number }> {
  const cutoffDate = subDays(new Date(), config.inApp.retentionDays);
  
  const result = await prisma.notification.deleteMany({
    where: {
      OR: [
        // Expired notifications
        { expiresAt: { lt: new Date() } },
        // Old read notifications
        { isRead: true, createdAt: { lt: cutoffDate } },
      ],
    },
  });
  
  logger.info({ deleted: result.count }, 'Cleaned up old notifications');
  
  return { deleted: result.count };
}

/**
 * Create notification from type with auto-generated content
 */
export async function createTypedNotification(
  prisma: PrismaClient,
  type: NotificationType,
  userId: string,
  data: Record<string, any>
): Promise<any> {
  const contentMap: Record<NotificationType, { title: string; message: string; priority?: 'low' | 'normal' | 'high' | 'urgent' }> = {
    'task.assigned': {
      title: 'New Task Assigned',
      message: `You have been assigned to ${data.taskNumber || 'a task'}: ${data.taskTitle || ''}`,
    },
    'task.mentioned': {
      title: 'You were mentioned',
      message: `${data.mentionedBy || 'Someone'} mentioned you in ${data.taskNumber || 'a task'}`,
    },
    'task.commented': {
      title: 'New Comment',
      message: `${data.commentedBy || 'Someone'} commented on ${data.taskNumber || 'your task'}`,
    },
    'task.status_changed': {
      title: 'Task Status Changed',
      message: `${data.taskNumber || 'Task'} status changed to ${data.newStatus || 'updated'}`,
      priority: 'low',
    },
    'task.due_soon': {
      title: 'Task Due Soon',
      message: `${data.taskNumber || 'A task'} is due ${data.dueIn || 'soon'}`,
      priority: 'high',
    },
    'task.overdue': {
      title: 'Task Overdue!',
      message: `${data.taskNumber || 'A task'} is now overdue`,
      priority: 'urgent',
    },
    'leave.requested': {
      title: 'Leave Request Pending',
      message: `${data.employeeName || 'An employee'} has requested ${data.days || ''} day(s) of ${data.leaveType || 'leave'}`,
    },
    'leave.approved': {
      title: 'Leave Request Approved',
      message: `Your ${data.leaveType || 'leave'} request has been approved`,
    },
    'leave.rejected': {
      title: 'Leave Request Rejected',
      message: `Your ${data.leaveType || 'leave'} request was rejected. Reason: ${data.reason || 'See details'}`,
    },
    'leave.cancelled': {
      title: 'Leave Cancelled',
      message: `${data.leaveType || 'Leave'} request has been cancelled`,
      priority: 'low',
    },
    'attendance.reminder': {
      title: 'Check-in Reminder',
      message: 'Don\'t forget to check in for today!',
    },
    'attendance.missed': {
      title: 'Missed Check-in',
      message: 'You missed check-in today. Please contact HR if needed.',
      priority: 'high',
    },
    'project.added': {
      title: 'Added to Project',
      message: `You've been added to project: ${data.projectName || 'New Project'}`,
    },
    'project.milestone': {
      title: 'Milestone Reached',
      message: `${data.projectName || 'Project'}: ${data.milestoneName || 'Milestone'} has been completed!`,
    },
    'timesheet.reminder': {
      title: 'Timesheet Reminder',
      message: 'Please submit your timesheet for this week',
    },
    'timesheet.approved': {
      title: 'Timesheet Approved',
      message: `Your timesheet for ${data.period || 'this period'} has been approved`,
    },
    'timesheet.rejected': {
      title: 'Timesheet Rejected',
      message: `Your timesheet needs revision: ${data.reason || 'See comments'}`,
      priority: 'high',
    },
    'system.announcement': {
      title: data.title || 'System Announcement',
      message: data.message || data.body || '',
      priority: 'high',
    },
    'system.maintenance': {
      title: 'Scheduled Maintenance',
      message: data.message || 'System maintenance is scheduled. Please save your work.',
      priority: 'urgent',
    },
    'employee.onboarded': {
      title: 'New Team Member',
      message: `Welcome ${data.employeeName || ''} to the team!`,
    },
    'employee.birthday': {
      title: 'Birthday Today! 🎂',
      message: `It's ${data.employeeName || 'a colleague'}'s birthday today!`,
      priority: 'low',
    },
    'employee.anniversary': {
      title: 'Work Anniversary! 🎉',
      message: `${data.employeeName || 'A colleague'} celebrates ${data.years || ''} years with us!`,
      priority: 'low',
    },
  };
  
  const content = contentMap[type];
  if (!content) {
    throw new Error(`Unknown notification type: ${type}`);
  }
  
  return createNotification(prisma, {
    userId,
    type,
    title: content.title,
    message: content.message,
    priority: content.priority,
    data,
    actionUrl: data.actionUrl || data.url,
  });
}
