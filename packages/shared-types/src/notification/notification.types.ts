/**
 * Notification Types - User notifications
 */

import { AuditableEntity, BaseEntity } from '../common';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'action_required';
export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms' | 'slack';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification extends BaseEntity {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  channels: NotificationChannel[];
  isRead: boolean;
  readAt?: Date;
  isArchived: boolean;
  archivedAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
  groupKey?: string;
}

export type NotificationCategory =
  | 'task'
  | 'project'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'hr'
  | 'meeting'
  | 'recruitment'
  | 'system'
  | 'announcement'
  | 'approval'
  | 'reminder';

export interface NotificationTemplate extends BaseEntity {
  tenantId?: string;
  name: string;
  code: string;
  category: NotificationCategory;
  subject: string;
  bodyTemplate: string;
  htmlTemplate?: string;
  channels: NotificationChannel[];
  variables: string[];
  isSystem: boolean;
  isActive: boolean;
}

export interface NotificationPreference extends BaseEntity {
  tenantId: string;
  userId: string;
  category: NotificationCategory;
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
    slack: boolean;
  };
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface PushSubscription extends BaseEntity {
  tenantId: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceType: 'web' | 'android' | 'ios';
  deviceInfo?: string;
  isActive: boolean;
  lastUsedAt?: Date;
}
