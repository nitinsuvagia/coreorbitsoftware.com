/**
 * Notification Routes - API endpoints for notifications
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantPrisma } from '@oms/database';
import * as inAppService from '../services/inapp.service';
import * as pushService from '../services/push.service';
import * as preferenceService from '../services/preference.service';
import * as dispatcherService from '../services/dispatcher.service';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const listNotificationsSchema = z.object({
  unreadOnly: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  type: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.string().optional().transform(v => v ? parseInt(v, 10) : 1),
  pageSize: z.string().optional().transform(v => v ? parseInt(v, 10) : 20),
});

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

const registerPushSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
  deviceName: z.string().max(100).optional(),
});

const updatePreferencesSchema = z.object({
  email: z.object({
    enabled: z.boolean().optional(),
    digest: z.enum(['immediate', 'daily', 'weekly', 'never']).optional(),
    types: z.array(z.string()).optional(),
  }).optional(),
  push: z.object({
    enabled: z.boolean().optional(),
    types: z.array(z.string()).optional(),
  }).optional(),
  inApp: z.object({
    enabled: z.boolean().optional(),
    types: z.union([z.literal('all'), z.array(z.string())]).optional(),
  }).optional(),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string(),
  }).optional().nullable(),
});

const sendAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  url: z.string().url().optional(),
  channels: z.array(z.enum(['email', 'push', 'inApp'])).optional(),
});

const sendPlatformEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1),
  html: z.string().optional(),
});

const sendBulkPlatformEmailSchema = z.object({
  recipients: z.array(z.string().email()).min(1).max(100),
  subject: z.string().min(1).max(200),
  message: z.string().min(1),
  html: z.string().optional(),
  useQueue: z.boolean().optional(),
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

function getTenantContext(req: Request) {
  const tenantId = req.headers['x-tenant-id'] as string;
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  const userId = req.headers['x-user-id'] as string;
  
  if (!tenantId || !tenantSlug) {
    throw new Error('Tenant context not found');
  }
  
  return { tenantId, tenantSlug, userId };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// IN-APP NOTIFICATION ENDPOINTS
// ============================================================================

// List notifications
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const filters = listNotificationsSchema.parse(req.query);
    
    const result = await inAppService.listNotifications(prisma, {
      userId,
      unreadOnly: filters.unreadOnly,
      type: filters.type as any,
      priority: filters.priority,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
      page: filters.page,
      pageSize: filters.pageSize,
    });
    
    res.json({ success: true, ...result });
  })
);

// Get unread count
router.get(
  '/unread-count',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const count = await inAppService.getUnreadCount(prisma, userId);
    
    res.json({ success: true, data: { count } });
  })
);

// Get notification stats
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const stats = await inAppService.getNotificationStats(prisma, userId);
    
    res.json({ success: true, data: stats });
  })
);

// Get notification by ID
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const notification = await inAppService.getNotificationById(
      prisma,
      req.params.id,
      userId
    );
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    res.json({ success: true, data: notification });
  })
);

// Mark notification as read
router.post(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const notification = await inAppService.markAsRead(
      prisma,
      req.params.id,
      userId
    );
    
    res.json({ success: true, data: notification });
  })
);

// Mark multiple as read
router.post(
  '/mark-read',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const { ids } = markReadSchema.parse(req.body);
    
    const result = await inAppService.markMultipleAsRead(prisma, ids, userId);
    
    res.json({ success: true, data: result });
  })
);

// Mark all as read
router.post(
  '/mark-all-read',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const result = await inAppService.markAllAsRead(prisma, userId);
    
    res.json({ success: true, data: result });
  })
);

// Delete notification
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    await inAppService.deleteNotification(prisma, req.params.id, userId);
    
    res.json({ success: true, message: 'Notification deleted' });
  })
);

// Delete multiple notifications
router.post(
  '/delete-multiple',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const { ids } = markReadSchema.parse(req.body);
    
    const result = await inAppService.deleteMultipleNotifications(prisma, ids, userId);
    
    res.json({ success: true, data: result });
  })
);

// ============================================================================
// PUSH NOTIFICATION ENDPOINTS
// ============================================================================

// Get VAPID public key
router.get(
  '/push/vapid-key',
  asyncHandler(async (req: Request, res: Response) => {
    const key = pushService.getVapidPublicKey();
    
    if (!key) {
      return res.status(503).json({ 
        success: false, 
        error: 'Push notifications not configured' 
      });
    }
    
    res.json({ success: true, data: { publicKey: key } });
  })
);

// Register push subscription
router.post(
  '/push/subscribe',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const { subscription, deviceName } = registerPushSchema.parse(req.body);
    
    const result = await pushService.registerSubscription(
      prisma,
      userId,
      subscription as any,
      req.headers['user-agent'],
      deviceName
    );
    
    res.status(201).json({ success: true, data: result });
  })
);

// Unregister push subscription
router.post(
  '/push/unsubscribe',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, error: 'Endpoint required' });
    }
    
    await pushService.unregisterSubscription(prisma, userId, endpoint);
    
    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  })
);

// Get user's push subscriptions
router.get(
  '/push/subscriptions',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const subscriptions = await pushService.getUserSubscriptions(prisma, userId);
    
    res.json({ success: true, data: subscriptions });
  })
);

// ============================================================================
// PREFERENCE ENDPOINTS
// ============================================================================

// Get notification preferences
router.get(
  '/preferences',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const preferences = await preferenceService.getPreferences(prisma, userId);
    
    res.json({ success: true, data: preferences });
  })
);

// Update notification preferences
router.patch(
  '/preferences',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const input = updatePreferencesSchema.parse(req.body);
    
    const preferences = await preferenceService.updatePreferences(
      prisma,
      userId,
      input as any
    );
    
    res.json({ success: true, data: preferences });
  })
);

// Get available notification types
router.get(
  '/preferences/types',
  asyncHandler(async (req: Request, res: Response) => {
    const types = preferenceService.getNotificationTypes();
    
    res.json({ success: true, data: types });
  })
);

// Toggle specific notification type
router.post(
  '/preferences/toggle',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const { channel, type, enabled } = req.body;
    
    if (!channel || !type || typeof enabled !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        error: 'channel, type, and enabled are required' 
      });
    }
    
    const preferences = await preferenceService.toggleNotificationType(
      prisma,
      userId,
      channel,
      type,
      enabled
    );
    
    res.json({ success: true, data: preferences });
  })
);

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

// Send announcement (admin only)
router.post(
  '/admin/announcement',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    // TODO: Add admin role check
    
    const input = sendAnnouncementSchema.parse(req.body);
    
    const result = await dispatcherService.sendAnnouncement(
      tenantSlug,
      input.title,
      input.message,
      { url: input.url, channels: input.channels }
    );
    
    res.json({ success: true, data: result });
  })
);

// Cleanup old notifications (admin/cron)
router.post(
  '/admin/cleanup',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = await getTenantPrisma(tenantSlug);
    
    const result = await inAppService.cleanupNotifications(prisma);
    
    res.json({ success: true, data: result });
  })
);

// ============================================================================
// TENANT EMAIL ENDPOINT (for tenant-specific communications like job offers)
// Uses organization's SMTP settings from database if configured
// ============================================================================

router.post(
  '/tenant/email',
  asyncHandler(async (req: Request, res: Response) => {
    // Allow tenant context from header (no auth required for internal service calls)
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    
    if (!tenantSlug) {
      return res.status(400).json({ 
        success: false, 
        error: 'X-Tenant-Slug header is required' 
      });
    }
    
    const input = sendPlatformEmailSchema.parse(req.body);
    
    // Import email service dynamically to avoid circular dependencies
    const { sendTenantEmail } = await import('../services/email.service');
    
    logger.info({ tenantSlug, to: input.to, subject: input.subject }, 'Sending tenant email');
    
    // Use tenant's SMTP configuration from database
    const result = await sendTenantEmail(tenantSlug, {
      to: input.to,
      subject: input.subject,
      html: input.html || `<p>${input.message.replace(/\\n/g, '<br>')}</p>`,
      text: input.message,
    });
    
    logger.info({ tenantSlug, to: input.to, success: result.success, result }, 'Tenant email result');
    
    res.json({ 
      success: result.success, 
      data: { 
        sent: result.success ? 1 : 0,
        failed: result.success ? 0 : 1,
        results: [result]
      } 
    });
  })
);

// ============================================================================
// PLATFORM EMAIL ENDPOINT (for platform admin communications)
// ============================================================================

router.post(
  '/platform/email',
  asyncHandler(async (req: Request, res: Response) => {
    const input = sendPlatformEmailSchema.parse(req.body);
    
    // Import email service dynamically to avoid circular dependencies
    const { sendEmail } = await import('../services/email.service');
    
    const results = await sendEmail({
      to: { email: input.to },
      subject: input.subject,
      html: input.html || `<p>${input.message.replace(/\\n/g, '<br>')}</p>`,
      text: input.message,
      emailType: 'platform', // Use platform email configuration
    });
    
    const success = results.every(r => r.success);
    
    res.json({ 
      success, 
      data: { 
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
      } 
    });
  })
);

// Bulk platform email endpoint
router.post(
  '/platform/email/bulk',
  asyncHandler(async (req: Request, res: Response) => {
    const input = sendBulkPlatformEmailSchema.parse(req.body);
    
    const { sendBulkEmail } = await import('../services/email.service');
    
    const recipients = input.recipients.map(email => ({ email }));
    
    const result = await sendBulkEmail(recipients, {
      subject: input.subject,
      html: input.html || `<p>${input.message.replace(/\\n/g, '<br>')}</p>`,
      text: input.message,
      emailType: 'platform',
    });
    
    res.json({ 
      success: result.sent > 0,
      data: result
    });
  })
);

// Queue stats endpoint
router.get(
  '/queue/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const { getQueueStats } = await import('../services/queue.service');
    const stats = await getQueueStats();
    res.json({ success: true, data: stats });
  })
);

export default router;
