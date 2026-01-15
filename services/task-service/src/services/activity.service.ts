/**
 * Activity Service - Task activity logging and tracking
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { subDays } from 'date-fns';
import { logger } from '../utils/logger';
import { config } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'commented'
  | 'replied'
  | 'assigned'
  | 'unassigned'
  | 'status_changed'
  | 'priority_changed'
  | 'due_date_changed'
  | 'attachment_added'
  | 'attachment_removed'
  | 'dependency_added'
  | 'dependency_removed'
  | 'moved' // to another project
  | 'archived'
  | 'restored';

export interface LogActivityInput {
  taskId: string;
  userId: string;
  action: ActivityAction;
  details?: Record<string, any>;
}

export interface ActivityFilters {
  taskId?: string;
  projectId?: string;
  userId?: string;
  action?: ActivityAction;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// ACTIVITY OPERATIONS
// ============================================================================

/**
 * Log a task activity
 */
export async function logActivity(
  prisma: PrismaClient,
  input: LogActivityInput
): Promise<any> {
  const activity = await prisma.taskActivity.create({
    data: {
      id: uuidv4(),
      taskId: input.taskId,
      userId: input.userId,
      action: input.action,
      details: input.details || {},
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
      task: {
        select: { taskNumber: true, title: true },
      },
    },
  });
  
  logger.debug({
    taskId: input.taskId,
    action: input.action,
  }, 'Activity logged');
  
  return activity;
}

/**
 * Get activity by ID
 */
export async function getActivityById(
  prisma: PrismaClient,
  id: string
): Promise<any | null> {
  return prisma.taskActivity.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      task: {
        select: { id: true, taskNumber: true, title: true },
      },
    },
  });
}

/**
 * List activities with filters
 */
export async function listActivities(
  prisma: PrismaClient,
  filters: ActivityFilters
): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const page = filters.page || 1;
  const pageSize = Math.min(filters.pageSize || 50, 200);
  const skip = (page - 1) * pageSize;
  
  const where: any = {};
  
  if (filters.taskId) where.taskId = filters.taskId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  
  if (filters.projectId) {
    where.task = { projectId: filters.projectId };
  }
  
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(filters.from);
    if (filters.to) where.createdAt.lte = new Date(filters.to);
  }
  
  const [activities, total] = await Promise.all([
    prisma.taskActivity.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        task: {
          select: { id: true, taskNumber: true, title: true, projectId: true },
        },
      },
    }),
    prisma.taskActivity.count({ where }),
  ]);
  
  return { data: activities, total, page, pageSize };
}

/**
 * Get task activity timeline
 */
export async function getTaskTimeline(
  prisma: PrismaClient,
  taskId: string,
  options?: { limit?: number }
): Promise<any[]> {
  const limit = options?.limit || 100;
  
  const activities = await prisma.taskActivity.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
  
  return activities;
}

/**
 * Get user activity feed
 */
export async function getUserActivityFeed(
  prisma: PrismaClient,
  userId: string,
  options?: { limit?: number; includeOwnActions?: boolean }
): Promise<any[]> {
  const limit = options?.limit || 50;
  
  // Get tasks assigned to or reported by the user
  const myTasks = await prisma.task.findMany({
    where: {
      OR: [
        { reporterId: userId },
        { assignees: { some: { employeeId: userId, isActive: true } } },
      ],
    },
    select: { id: true },
  });
  
  const taskIds = myTasks.map(t => t.id);
  
  const where: any = {
    taskId: { in: taskIds },
  };
  
  if (!options?.includeOwnActions) {
    where.userId = { not: userId };
  }
  
  const activities = await prisma.taskActivity.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
      task: {
        select: {
          id: true,
          taskNumber: true,
          title: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
  });
  
  return activities;
}

/**
 * Get project activity feed
 */
export async function getProjectActivityFeed(
  prisma: PrismaClient,
  projectId: string,
  options?: { limit?: number; actions?: ActivityAction[] }
): Promise<any[]> {
  const limit = options?.limit || 100;
  
  const where: any = {
    task: { projectId },
  };
  
  if (options?.actions?.length) {
    where.action = { in: options.actions };
  }
  
  const activities = await prisma.taskActivity.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
      task: {
        select: { id: true, taskNumber: true, title: true },
      },
    },
  });
  
  return activities;
}

/**
 * Get activity summary for a task
 */
export async function getTaskActivitySummary(
  prisma: PrismaClient,
  taskId: string
): Promise<{
  totalActivities: number;
  activityByAction: Record<string, number>;
  activityByUser: { userId: string; name: string; count: number }[];
  firstActivity?: Date;
  lastActivity?: Date;
}> {
  const activities = await prisma.taskActivity.findMany({
    where: { taskId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  
  if (activities.length === 0) {
    return {
      totalActivities: 0,
      activityByAction: {},
      activityByUser: [],
    };
  }
  
  // Group by action
  const activityByAction: Record<string, number> = {};
  for (const activity of activities) {
    activityByAction[activity.action] = (activityByAction[activity.action] || 0) + 1;
  }
  
  // Group by user
  const userMap = new Map<string, { name: string; count: number }>();
  for (const activity of activities) {
    const userId = activity.userId;
    const name = `${activity.user.firstName} ${activity.user.lastName}`;
    
    if (userMap.has(userId)) {
      userMap.get(userId)!.count++;
    } else {
      userMap.set(userId, { name, count: 1 });
    }
  }
  
  const activityByUser = Array.from(userMap.entries()).map(([userId, data]) => ({
    userId,
    name: data.name,
    count: data.count,
  })).sort((a, b) => b.count - a.count);
  
  return {
    totalActivities: activities.length,
    activityByAction,
    activityByUser,
    firstActivity: activities[0].createdAt,
    lastActivity: activities[activities.length - 1].createdAt,
  };
}

/**
 * Cleanup old activities
 */
export async function cleanupOldActivities(
  prisma: PrismaClient
): Promise<number> {
  const cutoffDate = subDays(new Date(), config.activity.retentionDays);
  
  const result = await prisma.taskActivity.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });
  
  logger.info({
    deletedCount: result.count,
    cutoffDate,
  }, 'Old activities cleaned up');
  
  return result.count;
}

/**
 * Get activity statistics for a date range
 */
export async function getActivityStats(
  prisma: PrismaClient,
  projectId: string,
  from: Date,
  to: Date
): Promise<{
  totalActivities: number;
  activitiesByDay: { date: string; count: number }[];
  topContributors: { userId: string; name: string; count: number }[];
  mostActiveActions: { action: string; count: number }[];
}> {
  const activities = await prisma.taskActivity.findMany({
    where: {
      task: { projectId },
      createdAt: { gte: from, lte: to },
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
  
  // Group by day
  const byDay = new Map<string, number>();
  for (const activity of activities) {
    const date = activity.createdAt.toISOString().split('T')[0];
    byDay.set(date, (byDay.get(date) || 0) + 1);
  }
  
  const activitiesByDay = Array.from(byDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // Group by user
  const byUser = new Map<string, { name: string; count: number }>();
  for (const activity of activities) {
    const userId = activity.userId;
    const name = `${activity.user.firstName} ${activity.user.lastName}`;
    
    if (byUser.has(userId)) {
      byUser.get(userId)!.count++;
    } else {
      byUser.set(userId, { name, count: 1 });
    }
  }
  
  const topContributors = Array.from(byUser.entries())
    .map(([userId, data]) => ({ userId, name: data.name, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Group by action
  const byAction = new Map<string, number>();
  for (const activity of activities) {
    byAction.set(activity.action, (byAction.get(activity.action) || 0) + 1);
  }
  
  const mostActiveActions = Array.from(byAction.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count);
  
  return {
    totalActivities: activities.length,
    activitiesByDay,
    topContributors,
    mostActiveActions,
  };
}
