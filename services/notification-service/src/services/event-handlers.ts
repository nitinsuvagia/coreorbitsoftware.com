/**
 * Event Handlers - Comprehensive notification event handling
 * 
 * This module handles all incoming events and creates appropriate notifications
 * for users based on event type and their roles.
 */

import { PrismaClient } from '.prisma/tenant-client';
import { getTenantPrisma, getMasterPrisma } from '@oms/database';
import { logger } from '../utils/logger';
import { dispatchNotification, SendNotificationInput } from './dispatcher.service';
import * as emailService from './email.service';
import * as inAppService from './inapp.service';

// ============================================================================
// TYPES
// ============================================================================

interface TenantContext {
  tenantId: string;
  tenantSlug: string;
}

interface UserRole {
  userId: string;
  role: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get users with specific roles in a tenant
 */
async function getUsersByRoles(
  prisma: PrismaClient,
  roleNames: string[]
): Promise<string[]> {
  // Get user IDs with specific role names via the UserRole and Role relations
  const userRoles = await prisma.userRole.findMany({
    where: {
      role: {
        name: { in: roleNames },
      },
    },
    select: { userId: true },
  });
  
  // Filter to only active users
  if (userRoles.length === 0) return [];
  
  const activeUsers = await prisma.user.findMany({
    where: {
      id: { in: userRoles.map(ur => ur.userId) },
      status: 'ACTIVE',
    },
    select: { id: true },
  });
  
  return activeUsers.map(u => u.id);
}

/**
 * Get all HR users in a tenant
 */
async function getHRUsers(prisma: PrismaClient): Promise<string[]> {
  return getUsersByRoles(prisma, ['HR', 'HR_MANAGER', 'ADMIN']);
}

/**
 * Get all admin users in a tenant
 */
async function getAdminUsers(prisma: PrismaClient): Promise<string[]> {
  return getUsersByRoles(prisma, ['ADMIN', 'SUPER_ADMIN']);
}

/**
 * Get tenant owner
 */
async function getTenantOwner(tenantId: string): Promise<{ userId: string; email: string } | null> {
  const masterPrisma = getMasterPrisma();
  const tenant = await masterPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { ownerEmail: true, ownerName: true },
  });
  
  if (!tenant) return null;
  
  // Find the owner in the tenant database
  const tenantData = await masterPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  
  if (!tenantData) return null;
  
  const tenantPrisma = await getTenantPrisma(tenantData.slug);
  const owner = await tenantPrisma.user.findFirst({
    where: { email: tenant.ownerEmail, isActive: true },
    select: { id: true, email: true },
  });
  
  return owner ? { userId: owner.id, email: owner.email } : null;
}

/**
 * Get project managers and leaders for an employee
 */
async function getEmployeeManagers(
  prisma: PrismaClient,
  employeeId: string
): Promise<string[]> {
  const managerIds: string[] = [];
  
  // Get employee's reporting manager and department manager
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      reportingManagerId: true,
      departmentId: true,
    },
  });

  if (!employee) return [];
  
  // Add reporting manager's user ID
  if (employee.reportingManagerId) {
    const manager = await prisma.employee.findUnique({
      where: { id: employee.reportingManagerId },
      select: { user: { select: { id: true } } },
    });
    if (manager?.user?.id) {
      managerIds.push(manager.user.id);
    }
  }
  
  // Add department manager's user ID
  if (employee.departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: employee.departmentId },
      select: { managerId: true },
    });
    
    if (department?.managerId) {
      const deptManager = await prisma.employee.findUnique({
        where: { id: department.managerId },
        select: { user: { select: { id: true } } },
      });
      if (deptManager?.user?.id) {
        managerIds.push(deptManager.user.id);
      }
    }
  }
  
  return [...new Set(managerIds)];
}

/**
 * Get platform admins for billing notifications
 */
async function getPlatformAdmins(): Promise<string[]> {
  const masterPrisma = getMasterPrisma();
  const admins = await masterPrisma.platformAdmin.findMany({
    where: { isActive: true },
    select: { id: true, email: true },
  });
  return admins.map(a => a.id);
}

/**
 * Notify platform admins via email
 */
async function notifyPlatformAdmins(
  subject: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  const masterPrisma = getMasterPrisma();
  
  try {
    const admins = await masterPrisma.platformAdmin.findMany({
      where: { isActive: true },
      select: { email: true, name: true },
    });
    
    for (const admin of admins) {
      try {
        await emailService.sendEmail({
          to: admin.email,
          subject,
          html: `<p>${message}</p><pre>${JSON.stringify(data, null, 2)}</pre>`,
          text: `${message}\n\n${JSON.stringify(data, null, 2)}`,
        });
      } catch (error) {
        logger.error({ email: admin.email, error }, 'Failed to notify platform admin');
      }
    }
  } catch (error) {
    // Platform admin table may not exist - just log and continue
    logger.debug({ error }, 'Could not fetch platform admins');
  }
}

// ============================================================================
// JOB DESCRIPTION / RECRUITMENT HANDLERS
// ============================================================================

export async function handleJobDescriptionCreated(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Get ALL active employees in the tenant
  const allActiveUsers = await prisma.user.findMany({
    where: { 
      status: 'ACTIVE',
    },
    select: { id: true },
  });
  
  const allUserIds = allActiveUsers.map(u => u.id);
  
  if (allUserIds.length > 0) {
    // Send in-app notification to all employees
    await dispatchNotification({
      tenantSlug,
      type: 'job.created',
      recipientUserIds: allUserIds,
      data: {
        jobTitle: payload.title,
        department: payload.department,
        location: payload.location,
        employmentType: payload.employmentType,
        openings: payload.openings,
        createdBy: payload.createdByName || payload.createdBy,
        jobId: payload.jobId || payload.id,
      },
      channels: ['inApp'], // Don't spam email for job postings
    });
    
    logger.info(
      { jobId: payload.jobId || payload.id, recipientCount: allUserIds.length },
      'Job description created - notifications sent to all employees'
    );
  } else {
    logger.warn({ tenantSlug }, 'No active users found to notify about new job');
  }
}

export async function handleJobDescriptionPublished(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify all employees about new job opening (for internal referrals)
  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  
  await dispatchNotification({
    tenantSlug,
    type: 'job.published',
    recipientUserIds: allUsers.map(u => u.id),
    data: {
      jobTitle: payload.title,
      department: payload.department,
      location: payload.location,
      jobId: payload.id,
    },
    channels: ['inApp'], // Don't spam email for job postings
  });
  
  logger.info({ jobId: payload.id }, 'Job published notification sent');
}

export async function handleCandidateApplied(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify HR users
  const hrUsers = await getHRUsers(prisma);
  
  await dispatchNotification({
    tenantSlug,
    type: 'candidate.applied',
    recipientUserIds: hrUsers,
    data: {
      candidateName: payload.candidateName,
      jobTitle: payload.jobTitle,
      candidateId: payload.candidateId,
      jobId: payload.jobId,
    },
  });
  
  logger.info({ candidateId: payload.candidateId }, 'Candidate applied notification sent');
}

export async function handleCandidateHired(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantId, tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify tenant admin
  const admins = await getAdminUsers(prisma);
  
  await dispatchNotification({
    tenantSlug,
    type: 'candidate.hired',
    recipientUserIds: admins,
    data: {
      candidateName: payload.candidateName,
      jobTitle: payload.jobTitle,
      department: payload.department,
      startDate: payload.startDate,
    },
  });
  
  // Also notify platform admin for compliance tracking
  await notifyPlatformAdmins(
    'New Employee Hired',
    `${payload.candidateName} has been hired at tenant ${tenantSlug} for ${payload.jobTitle}`,
    { tenantId, ...payload }
  );
  
  logger.info({ candidateId: payload.candidateId }, 'Candidate hired notification sent');
}

// ============================================================================
// INTERVIEW HANDLERS
// ============================================================================

export async function handleInterviewScheduled(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify interviewers
  if (payload.interviewerIds?.length > 0) {
    // Get user IDs for interviewers (employees)
    const employees = await prisma.employee.findMany({
      where: { id: { in: payload.interviewerIds } },
      select: { userId: true },
    });
    
    const userIds = employees.map(e => e.userId).filter(Boolean) as string[];
    
    await dispatchNotification({
      tenantSlug,
      type: 'interview.scheduled',
      recipientUserIds: userIds,
      data: {
        candidateName: payload.candidateName,
        jobTitle: payload.jobTitle,
        interviewDate: payload.scheduledAt,
        interviewType: payload.interviewType,
        location: payload.location || 'Virtual',
        meetingLink: payload.meetingLink,
        interviewId: payload.interviewId,
      },
    });
  }
  
  // Notify HR
  const hrUsers = await getHRUsers(prisma);
  await dispatchNotification({
    tenantSlug,
    type: 'interview.scheduled',
    recipientUserIds: hrUsers,
    data: {
      candidateName: payload.candidateName,
      jobTitle: payload.jobTitle,
      interviewDate: payload.scheduledAt,
      interviewType: payload.interviewType,
      interviewId: payload.interviewId,
    },
    channels: ['inApp'], // HR gets in-app only to reduce email noise
  });
  
  logger.info({ interviewId: payload.interviewId }, 'Interview scheduled notification sent');
}

export async function handleInterviewReminder(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify interviewers
  if (payload.interviewerIds?.length > 0) {
    const employees = await prisma.employee.findMany({
      where: { id: { in: payload.interviewerIds } },
      select: { userId: true },
    });
    
    const userIds = employees.map(e => e.userId).filter(Boolean) as string[];
    
    await dispatchNotification({
      tenantSlug,
      type: 'interview.reminder',
      recipientUserIds: userIds,
      data: {
        candidateName: payload.candidateName,
        timeUntil: payload.timeUntil,
        interviewDate: payload.scheduledAt,
        meetingLink: payload.meetingLink,
        interviewId: payload.interviewId,
      },
    });
  }
  
  logger.info({ interviewId: payload.interviewId }, 'Interview reminder sent');
}

// ============================================================================
// ASSESSMENT HANDLERS
// ============================================================================

export async function handleAssessmentAssigned(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Send email to candidate/participant
  if (payload.participantEmail) {
    await emailService.sendTenantEmail(tenantSlug, {
      to: payload.participantEmail,
      subject: `Assessment Assigned: ${payload.testName}`,
      html: `
        <h2>Assessment Invitation</h2>
        <p>You have been assigned an assessment: <strong>${payload.testName}</strong></p>
        <p>Duration: ${payload.duration} minutes</p>
        <p>Deadline: ${new Date(payload.deadline).toLocaleDateString()}</p>
        <p><a href="${payload.assessmentLink}">Start Assessment</a></p>
      `,
    });
  }
  
  // Notify HR/interviewers
  const hrUsers = await getHRUsers(prisma);
  await dispatchNotification({
    tenantSlug,
    type: 'assessment.assigned',
    recipientUserIds: hrUsers,
    data: {
      candidateName: payload.candidateName,
      testName: payload.testName,
      deadline: payload.deadline,
    },
    channels: ['inApp'],
  });
  
  logger.info({ assessmentId: payload.assessmentId }, 'Assessment assigned notification sent');
}

export async function handleAssessmentSubmitted(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify HR and hiring managers
  const hrUsers = await getHRUsers(prisma);
  
  await dispatchNotification({
    tenantSlug,
    type: 'assessment.submitted',
    recipientUserIds: hrUsers,
    data: {
      candidateName: payload.candidateName,
      testName: payload.testName,
      score: payload.score,
      assessmentId: payload.assessmentId,
    },
  });
  
  logger.info({ assessmentId: payload.assessmentId }, 'Assessment submitted notification sent');
}

// ============================================================================
// LEAVE HANDLERS
// ============================================================================

export async function handleLeaveRequested(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify managers
  const managers = await getEmployeeManagers(prisma, payload.employeeId);
  const hrUsers = await getHRUsers(prisma);
  
  const recipients = [...new Set([...managers, ...(payload.managerIds || [])])];
  
  await dispatchNotification({
    tenantSlug,
    type: 'leave.requested',
    recipientUserIds: recipients,
    data: {
      employeeName: payload.employeeName,
      leaveType: payload.leaveType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      reason: payload.reason,
      leaveId: payload.leaveId,
    },
  });
  
  // Also notify HR
  await dispatchNotification({
    tenantSlug,
    type: 'leave.requested',
    recipientUserIds: hrUsers,
    data: {
      employeeName: payload.employeeName,
      leaveType: payload.leaveType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      leaveId: payload.leaveId,
    },
    channels: ['inApp'],
  });
  
  logger.info({ leaveId: payload.leaveId }, 'Leave requested notification sent');
}

export async function handleLeaveApproved(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify employee
  await dispatchNotification({
    tenantSlug,
    type: 'leave.approved',
    recipientUserIds: [payload.employeeUserId],
    data: {
      leaveType: payload.leaveType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      approvedBy: payload.approvedByName,
    },
  });
  
  // Notify project managers if employee is on active projects
  const managers = await getEmployeeManagers(prisma, payload.employeeId);
  if (managers.length > 0) {
    await dispatchNotification({
      tenantSlug,
      type: 'leave.approved',
      recipientUserIds: managers,
      data: {
        employeeName: payload.employeeName,
        leaveType: payload.leaveType,
        startDate: payload.startDate,
        endDate: payload.endDate,
      },
      channels: ['inApp'],
    });
  }
  
  logger.info({ leaveId: payload.leaveId }, 'Leave approved notification sent');
}

export async function handleLeaveRejected(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  
  await dispatchNotification({
    tenantSlug,
    type: 'leave.rejected',
    recipientUserIds: [payload.employeeUserId],
    data: {
      leaveType: payload.leaveType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      rejectedBy: payload.rejectedByName,
      reason: payload.rejectionReason,
    },
  });
  
  logger.info({ leaveId: payload.leaveId }, 'Leave rejected notification sent');
}

// ============================================================================
// HOLIDAY HANDLERS
// ============================================================================

export async function handleHolidayCreated(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify all active employees
  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  
  await dispatchNotification({
    tenantSlug,
    type: 'holiday.created',
    recipientUserIds: allUsers.map(u => u.id),
    data: {
      holidayName: payload.name,
      date: payload.date,
      isOptional: payload.isOptional,
    },
    channels: ['inApp'],
  });
  
  logger.info({ holidayId: payload.id }, 'Holiday created notification sent');
}

export async function handleHolidayReminder(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify all active employees a day before
  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  
  await dispatchNotification({
    tenantSlug,
    type: 'holiday.reminder',
    recipientUserIds: allUsers.map(u => u.id),
    data: {
      holidayName: payload.name,
      date: payload.date,
      message: `Tomorrow is ${payload.name}. The office will be closed.`,
    },
  });
  
  logger.info({ holidayId: payload.id }, 'Holiday reminder sent');
}

// ============================================================================
// DOCUMENT HANDLERS
// ============================================================================

export async function handleDocumentExpiringSoon(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify document owner
  if (payload.employeeUserId) {
    await dispatchNotification({
      tenantSlug,
      type: 'document.expiring',
      recipientUserIds: [payload.employeeUserId],
      data: {
        documentName: payload.documentName,
        documentType: payload.documentType,
        expiryDate: payload.expiryDate,
        daysUntilExpiry: payload.daysUntilExpiry,
      },
    });
  }
  
  // Also notify HR
  const hrUsers = await getHRUsers(prisma);
  await dispatchNotification({
    tenantSlug,
    type: 'document.expiring',
    recipientUserIds: hrUsers,
    data: {
      employeeName: payload.employeeName,
      documentName: payload.documentName,
      documentType: payload.documentType,
      expiryDate: payload.expiryDate,
      daysUntilExpiry: payload.daysUntilExpiry,
    },
  });
  
  logger.info({ documentId: payload.documentId }, 'Document expiring notification sent');
}

export async function handleDocumentExpired(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify document owner
  if (payload.employeeUserId) {
    await dispatchNotification({
      tenantSlug,
      type: 'document.expired',
      recipientUserIds: [payload.employeeUserId],
      data: {
        documentName: payload.documentName,
        documentType: payload.documentType,
        expiryDate: payload.expiryDate,
        message: 'Please upload an updated document immediately.',
      },
    });
  }
  
  // Notify HR with urgency
  const hrUsers = await getHRUsers(prisma);
  await dispatchNotification({
    tenantSlug,
    type: 'document.expired',
    recipientUserIds: hrUsers,
    data: {
      employeeName: payload.employeeName,
      documentName: payload.documentName,
      documentType: payload.documentType,
      expiryDate: payload.expiryDate,
      priority: 'high',
    },
  });
  
  logger.info({ documentId: payload.documentId }, 'Document expired notification sent');
}

// ============================================================================
// BILLING HANDLERS
// ============================================================================

export async function handleBillingInvoiceCreated(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantId, tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify tenant admins and HR  
  const admins = await getAdminUsers(prisma);
  const hrUsers = await getHRUsers(prisma);
  
  await dispatchNotification({
    tenantSlug,
    type: 'billing.invoice_created',
    recipientUserIds: [...new Set([...admins, ...hrUsers])],
    data: {
      invoiceNumber: payload.invoiceNumber,
      amount: payload.amount,
      dueDate: payload.dueDate,
      currency: payload.currency,
    },
  });
  
  // Notify platform admin
  await notifyPlatformAdmins(
    `Invoice Generated - ${tenantSlug}`,
    `Invoice ${payload.invoiceNumber} generated for ${payload.amount} ${payload.currency}`,
    { tenantId, ...payload }
  );
  
  logger.info({ invoiceId: payload.invoiceId }, 'Invoice created notification sent');
}

export async function handleBillingPaymentReceived(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantId, tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify tenant admins
  const admins = await getAdminUsers(prisma);
  
  await dispatchNotification({
    tenantSlug,
    type: 'billing.payment_received',
    recipientUserIds: admins,
    data: {
      amount: payload.amount,
      currency: payload.currency,
      invoiceNumber: payload.invoiceNumber,
      paymentMethod: payload.paymentMethod,
    },
  });
  
  // Notify platform admin
  await notifyPlatformAdmins(
    `Payment Received - ${tenantSlug}`,
    `Payment of ${payload.amount} ${payload.currency} received`,
    { tenantId, ...payload }
  );
  
  logger.info({ paymentId: payload.paymentId }, 'Payment received notification sent');
}

export async function handleBillingPaymentFailed(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantId, tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify tenant admins with urgency
  const admins = await getAdminUsers(prisma);
  
  await dispatchNotification({
    tenantSlug,
    type: 'billing.payment_failed',
    recipientUserIds: admins,
    data: {
      amount: payload.amount,
      currency: payload.currency,
      reason: payload.failureReason,
      retryDate: payload.retryDate,
      priority: 'urgent',
    },
  });
  
  // Notify platform admin
  await notifyPlatformAdmins(
    `Payment Failed - ${tenantSlug}`,
    `Payment of ${payload.amount} ${payload.currency} failed: ${payload.failureReason}`,
    { tenantId, ...payload }
  );
  
  logger.info({ paymentId: payload.paymentId }, 'Payment failed notification sent');
}

export async function handleSubscriptionChanged(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantId, tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify tenant admins
  const admins = await getAdminUsers(prisma);
  
  await dispatchNotification({
    tenantSlug,
    type: 'billing.subscription_changed',
    recipientUserIds: admins,
    data: {
      oldPlan: payload.oldPlanName,
      newPlan: payload.newPlanName,
      changeType: payload.changeType, // 'upgrade' | 'downgrade' | 'cancelled'
      effectiveDate: payload.effectiveDate,
    },
  });
  
  // Notify platform admin
  await notifyPlatformAdmins(
    `Subscription Changed - ${tenantSlug}`,
    `${payload.changeType}: ${payload.oldPlanName} → ${payload.newPlanName}`,
    { tenantId, ...payload }
  );
  
  logger.info({ tenantId }, 'Subscription changed notification sent');
}

export async function handleSubscriptionActivated(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantId, tenantSlug } = context;
  
  // Get tenant prisma - may not have a slug yet for new tenants
  let admins: string[] = [];
  try {
    if (tenantSlug) {
      const prisma = await getTenantPrisma(tenantSlug);
      admins = await getAdminUsers(prisma);
    }
  } catch (err) {
    logger.debug('Could not get tenant prisma, skipping in-app notification');
  }
  
  if (admins.length > 0) {
    await dispatchNotification({
      tenantSlug,
      type: 'billing.subscription_activated',
      recipientUserIds: admins,
      data: {
        planName: payload.planName,
        billingCycle: payload.billingCycle,
        amount: payload.amount,
        currency: payload.currency,
      },
    });
  }
  
  // Notify platform admin
  await notifyPlatformAdmins(
    `New Subscription Activated - ${tenantSlug || tenantId}`,
    `Plan: ${payload.planName} (${payload.billingCycle}) - $${payload.amount}`,
    { tenantId, ...payload }
  );
  
  logger.info({ tenantId }, 'Subscription activated notification sent');
}

export async function handleSubscriptionCanceled(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantId, tenantSlug } = context;
  
  let admins: string[] = [];
  try {
    if (tenantSlug) {
      const prisma = await getTenantPrisma(tenantSlug);
      admins = await getAdminUsers(prisma);
    }
  } catch (err) {
    logger.debug('Could not get tenant prisma, skipping in-app notification');
  }
  
  if (admins.length > 0) {
    await dispatchNotification({
      tenantSlug,
      type: 'billing.subscription_canceled',
      recipientUserIds: admins,
      data: {
        subscriptionId: payload.subscriptionId,
        reason: payload.reason,
      },
    });
  }
  
  // Notify platform admin with urgency
  await notifyPlatformAdmins(
    `Subscription Canceled - ${tenantSlug || tenantId}`,
    `Subscription ${payload.subscriptionId} has been canceled`,
    { tenantId, ...payload, priority: 'high' }
  );
  
  logger.info({ tenantId }, 'Subscription canceled notification sent');
}

// ============================================================================
// TASK/PROJECT HANDLERS
// ============================================================================

export async function handleTaskAssigned(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  
  if (payload.assigneeIds?.length > 0) {
    await dispatchNotification({
      tenantSlug,
      type: 'task.assigned',
      recipientUserIds: payload.assigneeIds,
      data: {
        taskTitle: payload.title,
        taskNumber: payload.taskNumber,
        projectName: payload.projectName,
        priority: payload.priority,
        dueDate: payload.dueDate,
        assignedBy: payload.assignedByName,
        taskId: payload.taskId,
      },
    });
  }
  
  logger.info({ taskId: payload.taskId }, 'Task assigned notification sent');
}

export async function handleTaskDueSoon(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  
  if (payload.assigneeIds?.length > 0) {
    await dispatchNotification({
      tenantSlug,
      type: 'task.due_soon',
      recipientUserIds: payload.assigneeIds,
      data: {
        taskTitle: payload.title,
        taskNumber: payload.taskNumber,
        dueDate: payload.dueDate,
        hoursRemaining: payload.hoursRemaining,
        taskId: payload.taskId,
      },
    });
  }
  
  logger.info({ taskId: payload.taskId }, 'Task due soon notification sent');
}

export async function handleTaskOverdue(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify assignees
  if (payload.assigneeIds?.length > 0) {
    await dispatchNotification({
      tenantSlug,
      type: 'task.overdue',
      recipientUserIds: payload.assigneeIds,
      data: {
        taskTitle: payload.title,
        taskNumber: payload.taskNumber,
        dueDate: payload.dueDate,
        daysOverdue: payload.daysOverdue,
        taskId: payload.taskId,
        priority: 'high',
      },
    });
  }
  
  // Also notify project manager
  if (payload.projectManagerUserId) {
    await dispatchNotification({
      tenantSlug,
      type: 'task.overdue',
      recipientUserIds: [payload.projectManagerUserId],
      data: {
        taskTitle: payload.title,
        taskNumber: payload.taskNumber,
        assigneeNames: payload.assigneeNames,
        daysOverdue: payload.daysOverdue,
        taskId: payload.taskId,
      },
      channels: ['inApp'],
    });
  }
  
  logger.info({ taskId: payload.taskId }, 'Task overdue notification sent');
}

export async function handleProjectMemberAdded(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  
  await dispatchNotification({
    tenantSlug,
    type: 'project.added',
    recipientUserIds: [payload.employeeUserId],
    data: {
      projectName: payload.projectName,
      role: payload.role,
      addedBy: payload.addedByName,
      projectId: payload.projectId,
    },
  });
  
  logger.info({ projectId: payload.projectId }, 'Project member added notification sent');
}

// ============================================================================
// EMPLOYEE HANDLERS
// ============================================================================

export async function handleEmployeeOnboarded(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Welcome notification for new employee
  await dispatchNotification({
    tenantSlug,
    type: 'employee.onboarded',
    recipientUserIds: [payload.userId],
    data: {
      employeeName: payload.firstName,
      department: payload.department,
      welcomeMessage: 'Welcome to the team! Complete your profile to get started.',
    },
  });
  
  // Notify HR and admin
  const hrUsers = await getHRUsers(prisma);
  await dispatchNotification({
    tenantSlug,
    type: 'employee.onboarded',
    recipientUserIds: hrUsers,
    data: {
      employeeName: `${payload.firstName} ${payload.lastName}`,
      department: payload.department,
      position: payload.position,
      startDate: payload.joiningDate,
    },
    channels: ['inApp'],
  });
  
  logger.info({ employeeId: payload.employeeId }, 'Employee onboarded notification sent');
}

export async function handleEmployeeBirthday(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Get all colleagues in the same department or team
  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  
  await dispatchNotification({
    tenantSlug,
    type: 'employee.birthday',
    recipientUserIds: allUsers.map(u => u.id).filter(id => id !== payload.userId),
    data: {
      employeeName: payload.employeeName,
      message: `Today is ${payload.employeeName}'s birthday! 🎂`,
    },
    channels: ['inApp'],
  });
  
  logger.info({ employeeId: payload.employeeId }, 'Birthday notification sent');
}

export async function handleEmployeeAnniversary(
  payload: any,
  context: TenantContext
): Promise<void> {
  const { tenantSlug } = context;
  const prisma = await getTenantPrisma(tenantSlug);
  
  // Notify employee
  await dispatchNotification({
    tenantSlug,
    type: 'employee.anniversary',
    recipientUserIds: [payload.userId],
    data: {
      years: payload.years,
      message: `Happy ${payload.years} year work anniversary! Thank you for your dedication.`,
    },
  });
  
  // Notify HR and managers
  const hrUsers = await getHRUsers(prisma);
  await dispatchNotification({
    tenantSlug,
    type: 'employee.anniversary',
    recipientUserIds: hrUsers,
    data: {
      employeeName: payload.employeeName,
      years: payload.years,
      department: payload.department,
    },
    channels: ['inApp'],
  });
  
  logger.info({ employeeId: payload.employeeId }, 'Work anniversary notification sent');
}

// ============================================================================
// MASTER EVENT HANDLER
// ============================================================================

/**
 * Route events to appropriate handlers
 */
export async function handleEvent(
  eventType: string,
  payload: any,
  context: TenantContext
): Promise<void> {
  logger.debug({ eventType, tenantSlug: context.tenantSlug }, 'Processing notification event');
  
  try {
    switch (eventType) {
      // Recruitment
      case 'job.created':
      case 'job_description.created':
        await handleJobDescriptionCreated(payload, context);
        break;
      case 'job.published':
      case 'job_description.published':
        await handleJobDescriptionPublished(payload, context);
        break;
      case 'candidate.applied':
        await handleCandidateApplied(payload, context);
        break;
      case 'candidate.hired':
        await handleCandidateHired(payload, context);
        break;
        
      // Interviews
      case 'interview.scheduled':
        await handleInterviewScheduled(payload, context);
        break;
      case 'interview.reminder':
        await handleInterviewReminder(payload, context);
        break;
        
      // Assessments
      case 'assessment.assigned':
        await handleAssessmentAssigned(payload, context);
        break;
      case 'assessment.submitted':
        await handleAssessmentSubmitted(payload, context);
        break;
        
      // Leave
      case 'leave.requested':
        await handleLeaveRequested(payload, context);
        break;
      case 'leave.approved':
        await handleLeaveApproved(payload, context);
        break;
      case 'leave.rejected':
        await handleLeaveRejected(payload, context);
        break;
        
      // Holidays
      case 'holiday.created':
        await handleHolidayCreated(payload, context);
        break;
      case 'holiday.reminder':
        await handleHolidayReminder(payload, context);
        break;
        
      // Documents
      case 'document.expiring':
        await handleDocumentExpiringSoon(payload, context);
        break;
      case 'document.expired':
        await handleDocumentExpired(payload, context);
        break;
        
      // Billing
      case 'billing.invoice_created':
        await handleBillingInvoiceCreated(payload, context);
        break;
      case 'billing.payment_received':
        await handleBillingPaymentReceived(payload, context);
        break;
      case 'billing.payment_failed':
        await handleBillingPaymentFailed(payload, context);
        break;
      case 'billing.subscription_changed':
        await handleSubscriptionChanged(payload, context);
        break;
      case 'billing.subscription_activated':
        await handleSubscriptionActivated(payload, context);
        break;
      case 'billing.subscription_canceled':
        await handleSubscriptionCanceled(payload, context);
        break;
        
      // Tasks
      case 'task.assigned':
        await handleTaskAssigned(payload, context);
        break;
      case 'task.due_soon':
        await handleTaskDueSoon(payload, context);
        break;
      case 'task.overdue':
        await handleTaskOverdue(payload, context);
        break;
        
      // Projects
      case 'project.member_added':
        await handleProjectMemberAdded(payload, context);
        break;
        
      // Employees
      case 'employee.onboarded':
      case 'employee.created':
        await handleEmployeeOnboarded(payload, context);
        break;
      case 'employee.birthday':
        await handleEmployeeBirthday(payload, context);
        break;
      case 'employee.anniversary':
        await handleEmployeeAnniversary(payload, context);
        break;
        
      default:
        logger.debug({ eventType }, 'Unhandled notification event type');
    }
  } catch (error) {
    logger.error({ eventType, error }, 'Failed to handle notification event');
    throw error;
  }
}
