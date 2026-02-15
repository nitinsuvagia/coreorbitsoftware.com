/**
 * Preference Service - User notification preferences
 */

import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { config, NotificationType } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    digest: 'immediate' | 'daily' | 'weekly' | 'never';
    types: NotificationType[];
  };
  push: {
    enabled: boolean;
    types: NotificationType[];
  };
  inApp: {
    enabled: boolean;
    types: 'all' | NotificationType[];
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };
}

export interface UpdatePreferencesInput {
  email?: Partial<NotificationPreferences['email']>;
  push?: Partial<NotificationPreferences['push']>;
  inApp?: Partial<NotificationPreferences['inApp']>;
  quietHours?: Partial<NotificationPreferences['quietHours']>;
}

// ============================================================================
// PREFERENCE OPERATIONS
// ============================================================================

/**
 * Get user notification preferences
 */
export async function getPreferences(
  prisma: PrismaClient,
  userId: string
): Promise<NotificationPreferences> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  
  if (!prefs) {
    // Return defaults
    return config.defaultPreferences as NotificationPreferences;
  }
  
  return {
    email: prefs.emailPreferences as NotificationPreferences['email'],
    push: prefs.pushPreferences as NotificationPreferences['push'],
    inApp: prefs.inAppPreferences as NotificationPreferences['inApp'],
    quietHours: prefs.quietHours as NotificationPreferences['quietHours'],
  };
}

/**
 * Create default preferences for a user
 */
export async function createDefaultPreferences(
  prisma: PrismaClient,
  userId: string
): Promise<NotificationPreferences> {
  const defaults = config.defaultPreferences;
  
  await prisma.notificationPreference.create({
    data: {
      id: uuidv4(),
      userId,
      emailPreferences: defaults.email,
      pushPreferences: defaults.push,
      inAppPreferences: defaults.inApp,
    },
  });
  
  logger.info({ userId }, 'Created default notification preferences');
  
  return defaults as NotificationPreferences;
}

/**
 * Update user notification preferences
 */
export async function updatePreferences(
  prisma: PrismaClient,
  userId: string,
  input: UpdatePreferencesInput
): Promise<NotificationPreferences> {
  const existing = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  
  if (!existing) {
    // Create with defaults merged with input
    const defaults = config.defaultPreferences;
    
    const prefs = await prisma.notificationPreference.create({
      data: {
        id: uuidv4(),
        userId,
        emailPreferences: { ...defaults.email, ...input.email },
        pushPreferences: { ...defaults.push, ...input.push },
        inAppPreferences: { ...defaults.inApp, ...input.inApp },
        quietHours: input.quietHours,
      },
    });
    
    return {
      email: prefs.emailPreferences as NotificationPreferences['email'],
      push: prefs.pushPreferences as NotificationPreferences['push'],
      inApp: prefs.inAppPreferences as NotificationPreferences['inApp'],
      quietHours: prefs.quietHours as NotificationPreferences['quietHours'],
    };
  }
  
  // Merge with existing preferences
  const data: any = { updatedAt: new Date() };
  
  if (input.email) {
    data.emailPreferences = {
      ...(existing.emailPreferences as any),
      ...input.email,
    };
  }
  
  if (input.push) {
    data.pushPreferences = {
      ...(existing.pushPreferences as any),
      ...input.push,
    };
  }
  
  if (input.inApp) {
    data.inAppPreferences = {
      ...(existing.inAppPreferences as any),
      ...input.inApp,
    };
  }
  
  if (input.quietHours !== undefined) {
    data.quietHours = input.quietHours 
      ? { ...(existing.quietHours as any), ...input.quietHours }
      : null;
  }
  
  const prefs = await prisma.notificationPreference.update({
    where: { userId },
    data,
  });
  
  logger.info({ userId }, 'Updated notification preferences');
  
  return {
    email: prefs.emailPreferences as NotificationPreferences['email'],
    push: prefs.pushPreferences as NotificationPreferences['push'],
    inApp: prefs.inAppPreferences as NotificationPreferences['inApp'],
    quietHours: prefs.quietHours as NotificationPreferences['quietHours'],
  };
}

/**
 * Check if user should receive notification via channel
 */
export async function shouldNotify(
  prisma: PrismaClient,
  userId: string,
  type: NotificationType,
  channel: 'email' | 'push' | 'inApp'
): Promise<boolean> {
  const prefs = await getPreferences(prisma, userId);
  
  // Check quiet hours
  if (prefs.quietHours?.enabled) {
    const now = new Date();
    const userTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: prefs.quietHours.timezone,
    });
    
    const { start, end } = prefs.quietHours;
    
    if (start < end) {
      // Same day range (e.g., 22:00 to 23:00)
      if (userTime >= start && userTime <= end) {
        return false;
      }
    } else {
      // Overnight range (e.g., 22:00 to 07:00)
      if (userTime >= start || userTime <= end) {
        return false;
      }
    }
  }
  
  // Check channel-specific preferences
  switch (channel) {
    case 'email':
      if (!prefs.email.enabled) return false;
      if (prefs.email.digest === 'never') return false;
      return prefs.email.types.includes(type);
      
    case 'push':
      if (!prefs.push.enabled) return false;
      return prefs.push.types.includes(type);
      
    case 'inApp':
      if (!prefs.inApp.enabled) return false;
      if (prefs.inApp.types === 'all') return true;
      return prefs.inApp.types.includes(type);
      
    default:
      return false;
  }
}

/**
 * Get users who should receive a notification type via channel
 */
export async function getUsersToNotify(
  prisma: PrismaClient,
  userIds: string[],
  type: NotificationType,
  channel: 'email' | 'push' | 'inApp'
): Promise<string[]> {
  const results: string[] = [];
  
  for (const userId of userIds) {
    const shouldSend = await shouldNotify(prisma, userId, type, channel);
    if (shouldSend) {
      results.push(userId);
    }
  }
  
  return results;
}

/**
 * Toggle notification type for a channel
 */
export async function toggleNotificationType(
  prisma: PrismaClient,
  userId: string,
  channel: 'email' | 'push' | 'inApp',
  type: NotificationType,
  enabled: boolean
): Promise<NotificationPreferences> {
  const prefs = await getPreferences(prisma, userId);
  
  switch (channel) {
    case 'email':
      if (enabled && !prefs.email.types.includes(type)) {
        prefs.email.types.push(type);
      } else if (!enabled) {
        prefs.email.types = prefs.email.types.filter(t => t !== type);
      }
      break;
      
    case 'push':
      if (enabled && !prefs.push.types.includes(type)) {
        prefs.push.types.push(type);
      } else if (!enabled) {
        prefs.push.types = prefs.push.types.filter(t => t !== type);
      }
      break;
      
    case 'inApp':
      if (prefs.inApp.types === 'all') {
        // Convert to explicit list
        prefs.inApp.types = [...config.notificationTypes];
      }
      if (enabled && !prefs.inApp.types.includes(type)) {
        prefs.inApp.types.push(type);
      } else if (!enabled) {
        prefs.inApp.types = prefs.inApp.types.filter(t => t !== type);
      }
      break;
  }
  
  return updatePreferences(prisma, userId, {
    [channel]: prefs[channel],
  });
}

/**
 * Get available notification types for display
 */
export function getNotificationTypes(): { type: NotificationType; category: string; description: string }[] {
  return [
    // Task
    { type: 'task.assigned', category: 'Tasks', description: 'When you are assigned to a task' },
    { type: 'task.mentioned', category: 'Tasks', description: 'When you are mentioned in a task or comment' },
    { type: 'task.commented', category: 'Tasks', description: 'When someone comments on your task' },
    { type: 'task.status_changed', category: 'Tasks', description: 'When a task status changes' },
    { type: 'task.due_soon', category: 'Tasks', description: 'Reminder for tasks due soon' },
    { type: 'task.overdue', category: 'Tasks', description: 'Alert for overdue tasks' },
    
    // Leave
    { type: 'leave.requested', category: 'Leave', description: 'When someone requests leave (for managers)' },
    { type: 'leave.approved', category: 'Leave', description: 'When your leave request is approved' },
    { type: 'leave.rejected', category: 'Leave', description: 'When your leave request is rejected' },
    { type: 'leave.cancelled', category: 'Leave', description: 'When a leave request is cancelled' },
    
    // Attendance
    { type: 'attendance.reminder', category: 'Attendance', description: 'Daily check-in reminder' },
    { type: 'attendance.missed', category: 'Attendance', description: 'Alert for missed check-ins' },
    
    // Project
    { type: 'project.added', category: 'Projects', description: 'When you are added to a project' },
    { type: 'project.milestone', category: 'Projects', description: 'When a project milestone is reached' },
    { type: 'timesheet.reminder', category: 'Projects', description: 'Timesheet submission reminder' },
    { type: 'timesheet.approved', category: 'Projects', description: 'When your timesheet is approved' },
    { type: 'timesheet.rejected', category: 'Projects', description: 'When your timesheet is rejected' },
    
    // System
    { type: 'system.announcement', category: 'System', description: 'Important system announcements' },
    { type: 'system.maintenance', category: 'System', description: 'Scheduled maintenance notices' },
    
    // Employee
    { type: 'employee.onboarded', category: 'Team', description: 'When new team members join' },
    { type: 'employee.birthday', category: 'Team', description: 'Team member birthdays' },
    { type: 'employee.anniversary', category: 'Team', description: 'Work anniversaries' },
  ];
}
