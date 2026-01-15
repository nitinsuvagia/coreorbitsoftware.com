/**
 * Push Notification Service - Web Push notifications
 */

import webPush from 'web-push';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { config, NotificationType } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: { action: string; title: string; icon?: string }[];
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

export interface SendPushInput {
  userId: string;
  payload: PushPayload;
}

export interface PushResult {
  success: boolean;
  subscriptionId?: string;
  error?: string;
}

// ============================================================================
// VAPID SETUP
// ============================================================================

let vapidConfigured = false;

function ensureVapidConfigured(): void {
  if (vapidConfigured) return;
  
  if (!config.push.vapidPublicKey || !config.push.vapidPrivateKey) {
    logger.warn('VAPID keys not configured. Push notifications disabled.');
    return;
  }
  
  webPush.setVapidDetails(
    config.push.vapidSubject,
    config.push.vapidPublicKey,
    config.push.vapidPrivateKey
  );
  
  vapidConfigured = true;
  logger.info('VAPID configured for web push');
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Register a push subscription for a user
 */
export async function registerSubscription(
  prisma: PrismaClient,
  userId: string,
  subscription: PushSubscription,
  userAgent?: string,
  deviceName?: string
): Promise<any> {
  const id = uuidv4();
  
  // Check if subscription already exists
  const existing = await prisma.pushSubscription.findFirst({
    where: { 
      userId,
      endpoint: subscription.endpoint,
    },
  });
  
  if (existing) {
    // Update existing subscription
    return prisma.pushSubscription.update({
      where: { id: existing.id },
      data: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        deviceName,
        updatedAt: new Date(),
      },
    });
  }
  
  // Create new subscription
  return prisma.pushSubscription.create({
    data: {
      id,
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
      deviceName,
    },
  });
}

/**
 * Unregister a push subscription
 */
export async function unregisterSubscription(
  prisma: PrismaClient,
  userId: string,
  endpoint: string
): Promise<void> {
  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
  
  logger.debug({ userId }, 'Push subscription unregistered');
}

/**
 * Get all subscriptions for a user
 */
export async function getUserSubscriptions(
  prisma: PrismaClient,
  userId: string
): Promise<any[]> {
  return prisma.pushSubscription.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Deactivate invalid subscription
 */
async function deactivateSubscription(
  prisma: PrismaClient,
  subscriptionId: string
): Promise<void> {
  await prisma.pushSubscription.update({
    where: { id: subscriptionId },
    data: { isActive: false },
  });
}

// ============================================================================
// PUSH NOTIFICATION SENDING
// ============================================================================

/**
 * Send push notification to a single subscription
 */
async function sendToSubscription(
  prisma: PrismaClient,
  subscription: any,
  payload: PushPayload
): Promise<PushResult> {
  ensureVapidConfigured();
  
  if (!vapidConfigured) {
    return { success: false, error: 'VAPID not configured' };
  }
  
  const pushSubscription: webPush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
  
  try {
    await webPush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      { TTL: config.push.ttl }
    );
    
    logger.debug({ subscriptionId: subscription.id }, 'Push notification sent');
    
    return { success: true, subscriptionId: subscription.id };
  } catch (error: any) {
    logger.error({ 
      subscriptionId: subscription.id, 
      error: error.message,
      statusCode: error.statusCode,
    }, 'Push notification failed');
    
    // If subscription is invalid (410 Gone or 404), deactivate it
    if (error.statusCode === 410 || error.statusCode === 404) {
      await deactivateSubscription(prisma, subscription.id);
      logger.info({ subscriptionId: subscription.id }, 'Deactivated invalid push subscription');
    }
    
    return { 
      success: false, 
      subscriptionId: subscription.id, 
      error: error.message 
    };
  }
}

/**
 * Send push notification to a user (all their devices)
 */
export async function sendPushToUser(
  prisma: PrismaClient,
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number; results: PushResult[] }> {
  const subscriptions = await getUserSubscriptions(prisma, userId);
  
  if (subscriptions.length === 0) {
    logger.debug({ userId }, 'No push subscriptions for user');
    return { sent: 0, failed: 0, results: [] };
  }
  
  const results: PushResult[] = [];
  let sent = 0;
  let failed = 0;
  
  for (const subscription of subscriptions) {
    const result = await sendToSubscription(prisma, subscription, payload);
    results.push(result);
    
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }
  
  return { sent, failed, results };
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(
  prisma: PrismaClient,
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  let totalSent = 0;
  let totalFailed = 0;
  
  for (const userId of userIds) {
    const result = await sendPushToUser(prisma, userId, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
  }
  
  logger.info({ 
    userCount: userIds.length, 
    sent: totalSent, 
    failed: totalFailed 
  }, 'Bulk push notifications sent');
  
  return { sent: totalSent, failed: totalFailed };
}

/**
 * Send notification push by type
 */
export async function sendNotificationPush(
  prisma: PrismaClient,
  type: NotificationType,
  userId: string,
  data: Record<string, any>
): Promise<{ sent: number; failed: number }> {
  const payloadMap: Record<NotificationType, () => PushPayload> = {
    'task.assigned': () => ({
      title: 'Task Assigned',
      body: `You have been assigned to ${data.taskNumber || 'a task'}: ${data.taskTitle || ''}`,
      icon: '/icons/task.png',
      tag: `task-${data.taskId}`,
      data: { type, taskId: data.taskId, url: `/tasks/${data.taskId}` },
      actions: [
        { action: 'view', title: 'View Task' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    }),
    'task.mentioned': () => ({
      title: 'You were mentioned',
      body: `${data.mentionedBy || 'Someone'} mentioned you in ${data.taskNumber || 'a task'}`,
      icon: '/icons/mention.png',
      tag: `mention-${data.commentId || data.taskId}`,
      data: { type, taskId: data.taskId, commentId: data.commentId, url: `/tasks/${data.taskId}` },
    }),
    'task.commented': () => ({
      title: 'New Comment',
      body: `${data.commentedBy || 'Someone'} commented on ${data.taskNumber || 'a task'}`,
      icon: '/icons/comment.png',
      tag: `comment-${data.taskId}`,
      data: { type, taskId: data.taskId, url: `/tasks/${data.taskId}` },
    }),
    'task.status_changed': () => ({
      title: 'Task Status Updated',
      body: `${data.taskNumber || 'Task'} moved to ${data.newStatus || 'new status'}`,
      icon: '/icons/status.png',
      tag: `status-${data.taskId}`,
      data: { type, taskId: data.taskId, url: `/tasks/${data.taskId}` },
      silent: true,
    }),
    'task.due_soon': () => ({
      title: '⏰ Task Due Soon',
      body: `${data.taskNumber || 'Task'}: ${data.taskTitle || ''} is due ${data.dueIn || 'soon'}`,
      icon: '/icons/clock.png',
      tag: `due-${data.taskId}`,
      data: { type, taskId: data.taskId, url: `/tasks/${data.taskId}` },
      requireInteraction: true,
    }),
    'task.overdue': () => ({
      title: '🚨 Task Overdue',
      body: `${data.taskNumber || 'Task'}: ${data.taskTitle || ''} is overdue!`,
      icon: '/icons/alert.png',
      tag: `overdue-${data.taskId}`,
      data: { type, taskId: data.taskId, url: `/tasks/${data.taskId}` },
      requireInteraction: true,
      vibrate: [200, 100, 200],
    }),
    'leave.requested': () => ({
      title: 'Leave Request',
      body: `${data.employeeName || 'An employee'} has requested ${data.leaveType || 'leave'}`,
      icon: '/icons/leave.png',
      data: { type, leaveRequestId: data.leaveRequestId, url: `/leaves/${data.leaveRequestId}` },
    }),
    'leave.approved': () => ({
      title: '✅ Leave Approved',
      body: `Your ${data.leaveType || 'leave'} request has been approved`,
      icon: '/icons/approved.png',
      data: { type, leaveRequestId: data.leaveRequestId, url: `/leaves/${data.leaveRequestId}` },
    }),
    'leave.rejected': () => ({
      title: '❌ Leave Rejected',
      body: `Your ${data.leaveType || 'leave'} request has been rejected`,
      icon: '/icons/rejected.png',
      data: { type, leaveRequestId: data.leaveRequestId, url: `/leaves/${data.leaveRequestId}` },
    }),
    'leave.cancelled': () => ({
      title: 'Leave Cancelled',
      body: `Leave request has been cancelled`,
      icon: '/icons/cancelled.png',
      data: { type, leaveRequestId: data.leaveRequestId },
    }),
    'attendance.reminder': () => ({
      title: '⏰ Check-in Reminder',
      body: 'Don\'t forget to check in for today!',
      icon: '/icons/clock.png',
      tag: 'attendance-reminder',
      data: { type, url: '/attendance' },
    }),
    'attendance.missed': () => ({
      title: '⚠️ Missed Check-in',
      body: 'You missed check-in for today. Please contact HR if needed.',
      icon: '/icons/warning.png',
      tag: 'attendance-missed',
      data: { type, url: '/attendance' },
    }),
    'project.added': () => ({
      title: 'Added to Project',
      body: `You've been added to ${data.projectName || 'a project'}`,
      icon: '/icons/project.png',
      data: { type, projectId: data.projectId, url: `/projects/${data.projectId}` },
    }),
    'project.milestone': () => ({
      title: '🎯 Milestone Reached',
      body: `${data.projectName || 'Project'}: ${data.milestoneName || 'Milestone'} completed!`,
      icon: '/icons/milestone.png',
      data: { type, projectId: data.projectId, url: `/projects/${data.projectId}` },
    }),
    'timesheet.reminder': () => ({
      title: '📝 Timesheet Reminder',
      body: 'Please submit your timesheet for this week',
      icon: '/icons/timesheet.png',
      tag: 'timesheet-reminder',
      data: { type, url: '/timesheets' },
    }),
    'timesheet.approved': () => ({
      title: '✅ Timesheet Approved',
      body: `Your timesheet for ${data.period || 'this period'} has been approved`,
      icon: '/icons/approved.png',
      data: { type, url: '/timesheets' },
    }),
    'timesheet.rejected': () => ({
      title: '❌ Timesheet Rejected',
      body: `Your timesheet needs revision: ${data.reason || 'See comments'}`,
      icon: '/icons/rejected.png',
      data: { type, url: '/timesheets' },
    }),
    'system.announcement': () => ({
      title: data.title || '📢 Announcement',
      body: data.message || data.body || '',
      icon: '/icons/announcement.png',
      tag: 'announcement',
      data: { type, announcementId: data.announcementId, url: data.url },
    }),
    'system.maintenance': () => ({
      title: '🔧 Scheduled Maintenance',
      body: data.message || 'System maintenance scheduled. Please save your work.',
      icon: '/icons/maintenance.png',
      tag: 'maintenance',
      data: { type },
      requireInteraction: true,
    }),
    'employee.onboarded': () => ({
      title: '👋 New Team Member',
      body: `Welcome ${data.employeeName || 'new colleague'} to the team!`,
      icon: '/icons/welcome.png',
      data: { type, employeeId: data.employeeId, url: `/employees/${data.employeeId}` },
    }),
    'employee.birthday': () => ({
      title: '🎂 Birthday Today',
      body: `It's ${data.employeeName || 'a colleague'}'s birthday! Wish them well!`,
      icon: '/icons/birthday.png',
      data: { type, employeeId: data.employeeId },
    }),
    'employee.anniversary': () => ({
      title: '🎉 Work Anniversary',
      body: `${data.employeeName || 'A colleague'} celebrates ${data.years || ''} years with us!`,
      icon: '/icons/anniversary.png',
      data: { type, employeeId: data.employeeId },
    }),
  };
  
  const payloadFn = payloadMap[type];
  if (!payloadFn) {
    logger.warn({ type }, 'Unknown notification type for push');
    return { sent: 0, failed: 0 };
  }
  
  const payload = payloadFn();
  
  return sendPushToUser(prisma, userId, payload);
}

/**
 * Get VAPID public key for client registration
 */
export function getVapidPublicKey(): string | null {
  return config.push.vapidPublicKey || null;
}
