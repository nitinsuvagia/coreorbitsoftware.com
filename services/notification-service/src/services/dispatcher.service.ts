/**
 * Dispatcher Service - Orchestrates notification delivery
 */

import { PrismaClient } from '.prisma/tenant-client';
import { getTenantPrisma, getMasterPrisma } from '@oms/database';
import { getEventBus, SQS_QUEUES } from '@oms/event-bus';
import { logger } from '../utils/logger';
import { NotificationType } from '../config';
import * as emailService from './email.service';
import * as pushService from './push.service';
import * as inAppService from './inapp.service';
import * as preferenceService from './preference.service';
import * as websocketService from './websocket.service';

// ============================================================================
// TYPES
// ============================================================================

export interface SendNotificationInput {
  tenantSlug: string;
  type: NotificationType;
  recipientUserIds: string[];
  data: Record<string, any>;
  channels?: ('email' | 'push' | 'inApp')[];
}

export interface NotificationResult {
  email: { sent: number; failed: number };
  push: { sent: number; failed: number };
  inApp: { created: number };
}

// ============================================================================
// DISPATCHER
// ============================================================================

/**
 * Send notification to users via all configured channels
 */
export async function dispatchNotification(
  input: SendNotificationInput
): Promise<NotificationResult> {
  const prisma = await getTenantPrisma(input.tenantSlug);
  const channels = input.channels || ['email', 'push', 'inApp'];
  
  const result: NotificationResult = {
    email: { sent: 0, failed: 0 },
    push: { sent: 0, failed: 0 },
    inApp: { created: 0 },
  };
  
  // Get users who should receive each channel
  const emailUsers = channels.includes('email')
    ? await preferenceService.getUsersToNotify(prisma, input.recipientUserIds, input.type, 'email')
    : [];
  const pushUsers = channels.includes('push')
    ? await preferenceService.getUsersToNotify(prisma, input.recipientUserIds, input.type, 'push')
    : [];
  const inAppUsers = channels.includes('inApp')
    ? await preferenceService.getUsersToNotify(prisma, input.recipientUserIds, input.type, 'inApp')
    : [];
  
  // Send emails
  if (emailUsers.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: emailUsers } },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    
    for (const user of users) {
      try {
        const emailResult = await emailService.sendNotificationEmail(
          input.type,
          { email: user.email, name: `${user.firstName} ${user.lastName}` },
          input.data
        );
        
        if (emailResult.success) {
          result.email.sent++;
        } else {
          result.email.failed++;
        }
      } catch (error) {
        logger.error({ userId: user.id, error }, 'Failed to send email notification');
        result.email.failed++;
      }
    }
  }
  
  // Send push notifications
  if (pushUsers.length > 0) {
    for (const userId of pushUsers) {
      try {
        const pushResult = await pushService.sendNotificationPush(
          prisma,
          input.type,
          userId,
          input.data
        );
        result.push.sent += pushResult.sent;
        result.push.failed += pushResult.failed;
      } catch (error) {
        logger.error({ userId, error }, 'Failed to send push notification');
        result.push.failed++;
      }
    }
  }
  
  // Create in-app notifications and push via WebSocket
  if (inAppUsers.length > 0) {
    for (const userId of inAppUsers) {
      try {
        const notification = await inAppService.createTypedNotification(
          prisma,
          input.type,
          userId,
          input.data
        );
        result.inApp.created++;
        
        // Send real-time notification via WebSocket
        if (notification) {
          const masterPrisma = getMasterPrisma();
          const tenant = await masterPrisma.tenant.findFirst({
            where: { slug: input.tenantSlug },
            select: { id: true },
          });
          
          if (tenant) {
            websocketService.sendToUser(tenant.id, userId, {
              id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              data: notification.data as Record<string, any>,
              actionUrl: notification.actionUrl || undefined,
              priority: notification.priority as 'low' | 'normal' | 'high' | 'urgent',
              createdAt: notification.createdAt.toISOString(),
            });
          }
        }
      } catch (error) {
        logger.error({ userId, error }, 'Failed to create in-app notification');
      }
    }
  }
  
  logger.info({
    type: input.type,
    recipients: input.recipientUserIds.length,
    result,
  }, 'Notification dispatched');
  
  return result;
}

/**
 * Handle incoming notification events from event bus
 */
export async function handleNotificationEvent(
  event: string,
  payload: any,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<void> {
  const { tenantSlug } = tenantContext;
  
  logger.debug({ event, tenantSlug }, 'Handling notification event');
  
  try {
    switch (event) {
      case 'task.created':
      case 'task.assigned':
        if (payload.assigneeIds?.length > 0) {
          await dispatchNotification({
            tenantSlug,
            type: 'task.assigned',
            recipientUserIds: payload.assigneeIds,
            data: payload,
          });
        }
        break;
        
      case 'task.mentioned':
        if (payload.mentionedEmployeeIds?.length > 0) {
          await dispatchNotification({
            tenantSlug,
            type: 'task.mentioned',
            recipientUserIds: payload.mentionedEmployeeIds,
            data: payload,
          });
        }
        break;
        
      case 'task.commented':
        // Notify task assignees and reporter
        const prisma = await getTenantPrisma(tenantSlug);
        const task = await prisma.task.findUnique({
          where: { id: payload.taskId },
          include: {
            assignees: { where: { isActive: true }, select: { employeeId: true } },
          },
        });
        
        if (task) {
          const recipients = [
            task.reporterId,
            ...task.assignees.map(a => a.employeeId),
          ].filter(id => id !== payload.commentedByUserId);
          
          if (recipients.length > 0) {
            await dispatchNotification({
              tenantSlug,
              type: 'task.commented',
              recipientUserIds: [...new Set(recipients)],
              data: { ...payload, taskNumber: task.taskNumber },
            });
          }
        }
        break;
        
      case 'leave.requested':
        // Notify managers
        if (payload.managerIds?.length > 0) {
          await dispatchNotification({
            tenantSlug,
            type: 'leave.requested',
            recipientUserIds: payload.managerIds,
            data: payload,
          });
        }
        break;
        
      case 'leave.approved':
        await dispatchNotification({
          tenantSlug,
          type: 'leave.approved',
          recipientUserIds: [payload.employeeUserId],
          data: payload,
        });
        break;
        
      case 'leave.rejected':
        await dispatchNotification({
          tenantSlug,
          type: 'leave.rejected',
          recipientUserIds: [payload.employeeUserId],
          data: payload,
        });
        break;
        
      case 'project.member_added':
        await dispatchNotification({
          tenantSlug,
          type: 'project.added',
          recipientUserIds: [payload.employeeUserId],
          data: payload,
        });
        break;
        
      case 'employee.created':
        // Welcome notification for new employee
        await dispatchNotification({
          tenantSlug,
          type: 'employee.onboarded',
          recipientUserIds: [payload.userId],
          data: payload,
          channels: ['email', 'inApp'], // No push for new users
        });
        break;
        
      default:
        logger.debug({ event }, 'Unhandled notification event');
    }
  } catch (error) {
    logger.error({ event, error }, 'Failed to handle notification event');
    throw error;
  }
}

/**
 * Send system announcement to all users in a tenant
 */
export async function sendAnnouncement(
  tenantSlug: string,
  title: string,
  message: string,
  options?: {
    url?: string;
    channels?: ('email' | 'push' | 'inApp')[];
  }
): Promise<NotificationResult> {
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Get all active users
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  
  return dispatchNotification({
    tenantSlug,
    type: 'system.announcement',
    recipientUserIds: users.map(u => u.id),
    data: { title, message, url: options?.url },
    channels: options?.channels,
  });
}

/**
 * Send maintenance notice
 */
export async function sendMaintenanceNotice(
  message: string,
  scheduledAt: Date,
  durationMinutes: number
): Promise<void> {
  const masterPrisma = getMasterPrisma();
  
  // Get all active tenants
  const tenants = await masterPrisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { slug: true },
  });
  
  for (const tenant of tenants) {
    const prisma = await getTenantPrisma(tenant.slug);
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    
    await dispatchNotification({
      tenantSlug: tenant.slug,
      type: 'system.maintenance',
      recipientUserIds: users.map(u => u.id),
      data: { 
        message, 
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes,
      },
    });
  }
  
  logger.info({ 
    tenantCount: tenants.length, 
    scheduledAt,
  }, 'Maintenance notice sent');
}
