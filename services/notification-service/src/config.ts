/**
 * Notification Service Configuration
 */

// Load environment variables from root .env file first
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || process.env.PORT || '3008', 10),
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // AWS
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    sesFromEmail: process.env.AWS_SES_FROM_EMAIL || 'noreply@oms.local',
    sesFromName: process.env.AWS_SES_FROM_NAME || 'Office Management System',
  },
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Email settings
  email: {
    provider: process.env.EMAIL_PROVIDER || 'smtp', // 'ses' | 'smtp'
    // Platform email (for platform admin communications)
    platform: {
      smtp: {
        host: process.env.PLATFORM_SMTP_HOST || process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.PLATFORM_SMTP_PORT || process.env.SMTP_PORT || '587', 10),
        secure: process.env.PLATFORM_SMTP_SECURE === 'true' || process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.PLATFORM_SMTP_USER || process.env.SMTP_USER,
          pass: process.env.PLATFORM_SMTP_PASS || process.env.SMTP_PASS,
        },
      },
      fromEmail: process.env.PLATFORM_FROM_EMAIL || 'itsupport@omsystem.com',
      fromName: process.env.PLATFORM_FROM_NAME || 'OMS Platform Support',
    },
    // Tenant email (for tenant-specific communications)
    tenant: {
      smtp: {
        host: process.env.TENANT_SMTP_HOST || process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.TENANT_SMTP_PORT || process.env.SMTP_PORT || '587', 10),
        secure: process.env.TENANT_SMTP_SECURE === 'true' || process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.TENANT_SMTP_USER || process.env.SMTP_USER,
          pass: process.env.TENANT_SMTP_PASS || process.env.SMTP_PASS,
        },
      },
      fromEmail: process.env.TENANT_FROM_EMAIL || 'noreply@omsystem.com',
      fromName: process.env.TENANT_FROM_NAME || 'Office Management System',
    },
    batchSize: 50,
    rateLimitPerSecond: 14, // SES limit
    retryAttempts: 3,
    retryDelayMs: 1000,
  },
  
  // Push notification settings
  push: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@oms.local',
    ttl: 86400, // 24 hours
  },
  
  // In-app notification settings
  inApp: {
    maxPerUser: 500,
    retentionDays: 90,
    markReadBatchSize: 100,
  },
  
  // Notification types
  notificationTypes: [
    // Task related
    'task.assigned',
    'task.mentioned',
    'task.commented',
    'task.status_changed',
    'task.due_soon',
    'task.overdue',
    
    // Leave related
    'leave.requested',
    'leave.approved',
    'leave.rejected',
    'leave.cancelled',
    
    // Attendance related
    'attendance.reminder',
    'attendance.missed',
    
    // Project related
    'project.added',
    'project.milestone',
    'timesheet.reminder',
    'timesheet.approved',
    'timesheet.rejected',
    
    // System
    'system.announcement',
    'system.maintenance',
    
    // Employee
    'employee.onboarded',
    'employee.birthday',
    'employee.anniversary',
  ] as const,
  
  // Default preferences for new users
  defaultPreferences: {
    email: {
      enabled: true,
      digest: 'immediate' as 'immediate' | 'daily' | 'weekly' | 'never',
      types: ['task.assigned', 'task.mentioned', 'leave.approved', 'leave.rejected'],
    },
    push: {
      enabled: true,
      types: ['task.assigned', 'task.mentioned', 'task.due_soon'],
    },
    inApp: {
      enabled: true,
      types: 'all' as 'all' | string[],
    },
  },
  
  // Template paths
  templates: {
    basePath: process.env.TEMPLATE_PATH || './templates',
  },
};

export type NotificationType = typeof config.notificationTypes[number];
