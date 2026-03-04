/**
 * Scheduled Jobs Service - Timer-based notification triggers
 * 
 * Handles scheduled notifications like:
 * - Holiday reminders (day before)
 * - Document expiry alerts
 * - Task due reminders
 * - Birthday/anniversary notifications
 * - Interview reminders
 */

import { getTenantPrisma, getMasterPrisma } from '@oms/database';
import { logger } from '../utils/logger';
import { handleEvent } from './event-handlers';
import { addDays, subDays, startOfDay, endOfDay, differenceInDays, addHours, isToday, isTomorrow } from 'date-fns';

// ============================================================================
// SCHEDULED JOBS
// ============================================================================

// Store interval IDs for cleanup
const intervals: NodeJS.Timeout[] = [];

/**
 * Initialize all scheduled jobs using setInterval
 */
export function initializeScheduledJobs(): void {
  logger.info('Initializing scheduled notification jobs...');
  
  // Run daily notifications every 24 hours (check at startup too)
  setTimeout(() => runDailyNotifications(), 5000); // Run 5s after startup
  intervals.push(setInterval(runDailyNotifications, 24 * 60 * 60 * 1000));
  
  // Run interview reminders every hour
  intervals.push(setInterval(runInterviewReminders, 60 * 60 * 1000));
  
  // Run task due reminders every 6 hours
  intervals.push(setInterval(runTaskDueReminders, 6 * 60 * 60 * 1000));
  
  logger.info(`${intervals.length} scheduled jobs initialized`);
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduledJobs(): void {
  for (const interval of intervals) {
    clearInterval(interval);
  }
  intervals.length = 0;
  logger.info('All scheduled jobs stopped');
}

// ============================================================================
// DAILY NOTIFICATIONS
// ============================================================================

/**
 * Run all daily notification checks
 */
async function runDailyNotifications(): Promise<void> {
  logger.info('Running daily notifications...');
  
  try {
    await Promise.all([
      checkHolidayReminders(),
      checkDocumentExpiry(),
      checkBirthdaysAndAnniversaries(),
      checkOverdueTasks(),
    ]);
    
    logger.info('Daily notifications completed');
  } catch (error) {
    logger.error({ error }, 'Failed to run daily notifications');
  }
}

// ============================================================================
// HOLIDAY REMINDERS
// ============================================================================

/**
 * Check for holidays tomorrow and send reminders
 */
async function checkHolidayReminders(): Promise<void> {
  const masterPrisma = getMasterPrisma();
  
  // Get all active tenants
  const tenants = await masterPrisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true },
  });
  
  const tomorrow = addDays(new Date(), 1);
  const tomorrowStart = startOfDay(tomorrow);
  const tomorrowEnd = endOfDay(tomorrow);
  
  for (const tenant of tenants) {
    try {
      const prisma = await getTenantPrisma(tenant.slug);
      
      // Find holidays tomorrow
      const holidays = await prisma.holiday.findMany({
        where: {
          date: {
            gte: tomorrowStart,
            lte: tomorrowEnd,
          },
        },
      });
      
      for (const holiday of holidays) {
        await handleEvent(
          'holiday.reminder',
          {
            id: holiday.id,
            name: holiday.name,
            date: holiday.date.toISOString(),
            type: holiday.type,
          },
          { tenantId: tenant.id, tenantSlug: tenant.slug }
        );
      }
      
      if (holidays.length > 0) {
        logger.info({ tenant: tenant.slug, count: holidays.length }, 'Holiday reminders sent');
      }
    } catch (error) {
      logger.error({ tenant: tenant.slug, error }, 'Failed to check holidays');
    }
  }
}

// ============================================================================
// DOCUMENT EXPIRY
// ============================================================================

/**
 * Check for documents expiring soon (30, 14, 7, 1 days)
 */
async function checkDocumentExpiry(): Promise<void> {
  const masterPrisma = getMasterPrisma();
  
  const tenants = await masterPrisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true },
  });
  
  const reminderDays = [30, 14, 7, 1];
  const today = new Date();
  
  for (const tenant of tenants) {
    try {
      const prisma = await getTenantPrisma(tenant.slug);
      
      for (const days of reminderDays) {
        const targetDate = addDays(today, days);
        const targetStart = startOfDay(targetDate);
        const targetEnd = endOfDay(targetDate);
        
        // Find documents expiring on this date
        const documents = await prisma.employeeDocument.findMany({
          where: {
            expiryDate: {
              gte: targetStart,
              lte: targetEnd,
            },
            status: 'ACTIVE',
          },
          include: {
            employee: {
              select: {
                id: true,
                userId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        
        for (const doc of documents) {
          await handleEvent(
            'document.expiring',
            {
              documentId: doc.id,
              documentName: doc.fileName,
              documentType: doc.documentType,
              expiryDate: doc.expiryDate?.toISOString(),
              daysUntilExpiry: days,
              employeeId: doc.employee?.id,
              employeeUserId: doc.employee?.userId,
              employeeName: doc.employee ? `${doc.employee.firstName} ${doc.employee.lastName}` : 'Unknown',
            },
            { tenantId: tenant.id, tenantSlug: tenant.slug }
          );
        }
        
        if (documents.length > 0) {
          logger.info({ tenant: tenant.slug, days, count: documents.length }, 'Document expiry reminders sent');
        }
      }
      
      // Check for already expired documents
      const expiredDocs = await prisma.employeeDocument.findMany({
        where: {
          expiryDate: { lt: today },
          status: 'ACTIVE',
        },
        include: {
          employee: {
            select: {
              id: true,
              userId: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
      
      for (const doc of expiredDocs) {
        await handleEvent(
          'document.expired',
          {
            documentId: doc.id,
            documentName: doc.fileName,
            documentType: doc.documentType,
            expiryDate: doc.expiryDate?.toISOString(),
            employeeId: doc.employee?.id,
            employeeUserId: doc.employee?.userId,
            employeeName: doc.employee ? `${doc.employee.firstName} ${doc.employee.lastName}` : 'Unknown',
          },
          { tenantId: tenant.id, tenantSlug: tenant.slug }
        );
      }
    } catch (error) {
      logger.error({ tenant: tenant.slug, error }, 'Failed to check document expiry');
    }
  }
}

// ============================================================================
// BIRTHDAY & ANNIVERSARY
// ============================================================================

/**
 * Check for birthdays and work anniversaries today
 */
async function checkBirthdaysAndAnniversaries(): Promise<void> {
  const masterPrisma = getMasterPrisma();
  
  const tenants = await masterPrisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true },
  });
  
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  
  for (const tenant of tenants) {
    try {
      const prisma = await getTenantPrisma(tenant.slug);
      
      // Get employees with birthday today
      const employees = await prisma.employee.findMany({
        where: {
          isActive: true,
          dateOfBirth: { not: null },
        },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          joiningDate: true,
        },
      });
      
      for (const emp of employees) {
        // Check birthday
        if (emp.dateOfBirth) {
          const birthMonth = emp.dateOfBirth.getMonth() + 1;
          const birthDay = emp.dateOfBirth.getDate();
          
          if (birthMonth === todayMonth && birthDay === todayDay) {
            await handleEvent(
              'employee.birthday',
              {
                employeeId: emp.id,
                userId: emp.userId,
                employeeName: `${emp.firstName} ${emp.lastName}`,
              },
              { tenantId: tenant.id, tenantSlug: tenant.slug }
            );
          }
        }
        
        // Check work anniversary
        if (emp.joiningDate) {
          const joinMonth = emp.joiningDate.getMonth() + 1;
          const joinDay = emp.joiningDate.getDate();
          
          if (joinMonth === todayMonth && joinDay === todayDay) {
            const years = today.getFullYear() - emp.joiningDate.getFullYear();
            if (years > 0) {
              await handleEvent(
                'employee.anniversary',
                {
                  employeeId: emp.id,
                  userId: emp.userId,
                  employeeName: `${emp.firstName} ${emp.lastName}`,
                  years,
                },
                { tenantId: tenant.id, tenantSlug: tenant.slug }
              );
            }
          }
        }
      }
    } catch (error) {
      logger.error({ tenant: tenant.slug, error }, 'Failed to check birthdays/anniversaries');
    }
  }
}

// ============================================================================
// TASK DUE REMINDERS
// ============================================================================

/**
 * Check for overdue tasks - delegates to runTaskDueReminders
 * This is called as part of daily notifications
 */
async function checkOverdueTasks(): Promise<void> {
  // Overdue task checking is handled in runTaskDueReminders
  // This function exists for explicit daily checks
  await runTaskDueReminders();
}

/**
 * Check for tasks due soon and overdue
 */
async function runTaskDueReminders(): Promise<void> {
  const masterPrisma = getMasterPrisma();
  
  const tenants = await masterPrisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true },
  });
  
  const now = new Date();
  const in24Hours = addHours(now, 24);
  
  for (const tenant of tenants) {
    try {
      const prisma = await getTenantPrisma(tenant.slug);
      
      // Tasks due in next 24 hours that haven't been notified
      const tasksDueSoon = await prisma.task.findMany({
        where: {
          dueDate: {
            gte: now,
            lte: in24Hours,
          },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
        include: {
          assignees: {
            where: { isActive: true },
            include: {
              employee: { select: { userId: true } },
            },
          },
          project: {
            include: {
              manager: { select: { userId: true } },
            },
          },
        },
      });
      
      for (const task of tasksDueSoon) {
        const assigneeUserIds = task.assignees
          .map(a => a.employee?.userId)
          .filter(Boolean) as string[];
        
        if (assigneeUserIds.length > 0) {
          await handleEvent(
            'task.due_soon',
            {
              taskId: task.id,
              title: task.title,
              taskNumber: task.taskNumber,
              dueDate: task.dueDate?.toISOString(),
              hoursRemaining: Math.max(0, Math.floor((task.dueDate!.getTime() - now.getTime()) / 3600000)),
              assigneeIds: assigneeUserIds,
            },
            { tenantId: tenant.id, tenantSlug: tenant.slug }
          );
        }
      }
      
      // Overdue tasks
      const tasksOverdue = await prisma.task.findMany({
        where: {
          dueDate: { lt: now },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
        include: {
          assignees: {
            where: { isActive: true },
            include: {
              employee: { select: { userId: true, firstName: true, lastName: true } },
            },
          },
          project: {
            include: {
              manager: { select: { userId: true } },
            },
          },
        },
      });
      
      for (const task of tasksOverdue) {
        const assigneeUserIds = task.assignees
          .map(a => a.employee?.userId)
          .filter(Boolean) as string[];
        
        const assigneeNames = task.assignees
          .map(a => a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : '')
          .filter(Boolean);
        
        if (assigneeUserIds.length > 0) {
          await handleEvent(
            'task.overdue',
            {
              taskId: task.id,
              title: task.title,
              taskNumber: task.taskNumber,
              dueDate: task.dueDate?.toISOString(),
              daysOverdue: differenceInDays(now, task.dueDate!),
              assigneeIds: assigneeUserIds,
              assigneeNames,
              projectManagerUserId: task.project?.manager?.userId,
            },
            { tenantId: tenant.id, tenantSlug: tenant.slug }
          );
        }
      }
      
      if (tasksDueSoon.length > 0 || tasksOverdue.length > 0) {
        logger.info({
          tenant: tenant.slug,
          dueSoon: tasksDueSoon.length,
          overdue: tasksOverdue.length,
        }, 'Task reminders sent');
      }
    } catch (error) {
      logger.error({ tenant: tenant.slug, error }, 'Failed to check task due dates');
    }
  }
}

// ============================================================================
// INTERVIEW REMINDERS
// ============================================================================

/**
 * Check for interviews in the next hour and send reminders
 */
async function runInterviewReminders(): Promise<void> {
  const masterPrisma = getMasterPrisma();
  
  const tenants = await masterPrisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true },
  });
  
  const now = new Date();
  const in1Hour = addHours(now, 1);
  const in30Min = addHours(now, 0.5);
  
  for (const tenant of tenants) {
    try {
      const prisma = await getTenantPrisma(tenant.slug);
      
      // Find interviews in next 30-60 minutes
      const interviews = await prisma.interview.findMany({
        where: {
          scheduledAt: {
            gte: in30Min,
            lte: in1Hour,
          },
          status: 'SCHEDULED',
        },
        include: {
          candidate: {
            select: { firstName: true, lastName: true },
          },
          interviewers: {
            select: { interviewerId: true },
          },
        },
      });
      
      for (const interview of interviews) {
        const interviewerIds = interview.interviewers.map(i => i.interviewerId);
        
        if (interviewerIds.length > 0) {
          const minutesUntil = Math.floor((interview.scheduledAt.getTime() - now.getTime()) / 60000);
          
          await handleEvent(
            'interview.reminder',
            {
              interviewId: interview.id,
              candidateName: interview.candidate 
                ? `${interview.candidate.firstName} ${interview.candidate.lastName}`
                : 'Unknown',
              scheduledAt: interview.scheduledAt.toISOString(),
              timeUntil: `${minutesUntil} minutes`,
              meetingLink: interview.meetingLink,
              interviewerIds,
            },
            { tenantId: tenant.id, tenantSlug: tenant.slug }
          );
        }
      }
      
      if (interviews.length > 0) {
        logger.info({ tenant: tenant.slug, count: interviews.length }, 'Interview reminders sent');
      }
    } catch (error) {
      logger.error({ tenant: tenant.slug, error }, 'Failed to check interview reminders');
    }
  }
}

/**
 * Manually trigger daily notifications (for testing)
 */
export async function triggerDailyNotifications(): Promise<void> {
  await runDailyNotifications();
}

/**
 * Manually trigger interview reminders (for testing)
 */
export async function triggerInterviewReminders(): Promise<void> {
  await runInterviewReminders();
}

/**
 * Manually trigger task reminders (for testing)
 */
export async function triggerTaskReminders(): Promise<void> {
  await runTaskDueReminders();
}
