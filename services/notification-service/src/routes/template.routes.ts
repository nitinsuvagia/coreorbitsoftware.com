/**
 * Email Template Routes - API endpoints for managing email templates
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantPrisma } from '@oms/database';
import { renderTemplate, renderTemplateFromDb, clearTemplateCache } from '../services/template.service';
import { sendEmail, sendTenantEmail } from '../services/email.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Name must be lowercase alphanumeric with hyphens'),
  displayName: z.string().min(1).max(200),
  category: z.enum(['SYSTEM', 'HR', 'RECRUITMENT', 'ATTENDANCE', 'PROJECT', 'CUSTOM']),
  description: z.string().max(500).optional(),
  subject: z.string().min(1).max(500),
  htmlContent: z.string().min(1),
  textContent: z.string().optional(),
  variables: z.array(z.object({
    name: z.string(),
    description: z.string(),
    required: z.boolean().optional(),
    example: z.string().optional(),
  })).optional(),
  isActive: z.boolean().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial().omit({ name: true });

const previewTemplateSchema = z.object({
  subject: z.string().min(1),
  htmlContent: z.string().min(1),
  data: z.record(z.any()).optional(),
});

const sendTestEmailSchema = z.object({
  to: z.string().email(),
  data: z.record(z.any()).optional(),
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Require tenant context
 */
function requireTenant(req: Request, res: Response, next: NextFunction) {
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  if (!tenantSlug) {
    return res.status(400).json({
      success: false,
      error: 'Tenant slug is required',
    });
  }
  (req as any).tenantSlug = tenantSlug;
  next();
}

/**
 * Check permission for template management
 */
function requirePermission(req: Request, res: Response, next: NextFunction) {
  // Permission check would be done by API Gateway
  // Here we just ensure the user has the right headers
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }
  (req as any).userId = userId;
  next();
}

// ============================================================================
// DEFAULT EMAIL TEMPLATES
// ============================================================================

function baseHtmlWrapper(bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f7; }
.container { max-width: 600px; margin: 0 auto; background: #ffffff; }
.header { background: #2563eb; padding: 24px; text-align: center; }
.header h1 { color: #ffffff; margin: 0; font-size: 22px; }
.body { padding: 32px 24px; color: #333; line-height: 1.6; }
.body h2 { color: #1e293b; margin-top: 0; }
.btn { display: inline-block; padding: 12px 28px; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
.info-box { background: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; border-radius: 0 6px 6px 0; }
.footer { padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; background: #f8fafc; }
</style>
</head>
<body>
<div class="container">
<div class="header"><h1>{{companyName}}</h1></div>
<div class="body">${bodyContent}</div>
<div class="footer">
<p>&copy; {{year}} {{companyName}}. All rights reserved.</p>
<p>This is an automated message. Please do not reply directly.</p>
</div>
</div>
</body>
</html>`;
}

function getDefaultEmailTemplates() {
  return [
    // ---- SYSTEM ----
    {
      name: 'welcome',
      displayName: 'Welcome Email',
      category: 'SYSTEM' as const,
      description: 'Sent to new employees when their account is created',
      subject: 'Welcome to {{companyName}}!',
      htmlContent: baseHtmlWrapper(`<h2>Welcome, {{userFirstName}}!</h2>
<p>Your account has been created at <strong>{{companyName}}</strong>. You can now log in to the employee portal.</p>
<div class="info-box">
<strong>Email:</strong> {{userEmail}}<br>
<strong>Temporary Password:</strong> {{tempPassword}}
</div>
<p><a href="{{portalUrl}}" class="btn">Log In to Portal</a></p>
<p>Please change your password after your first login.</p>`),
      textContent: 'Welcome to {{companyName}}, {{userFirstName}}! Your account has been created. Email: {{userEmail}}. Temporary Password: {{tempPassword}}. Log in at {{portalUrl}}',
      variables: [
        { name: 'userFirstName', description: 'Employee first name', required: true },
        { name: 'userEmail', description: 'Employee email', required: true },
        { name: 'tempPassword', description: 'Temporary password', required: true },
        { name: 'portalUrl', description: 'Portal login URL', required: true },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: 'password-reset',
      displayName: 'Password Reset',
      category: 'SYSTEM' as const,
      description: 'Sent when a user requests a password reset',
      subject: 'Reset Your Password - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Password Reset Request</h2>
<p>Hi {{userFirstName}},</p>
<p>We received a request to reset your password. Click the button below to set a new password:</p>
<p><a href="{{resetLink}}" class="btn">Reset Password</a></p>
<p>This link will expire in {{expiryMinutes}} minutes.</p>
<p>If you did not request this, please ignore this email.</p>`),
      textContent: 'Hi {{userFirstName}}, we received a request to reset your password. Visit: {{resetLink}} (expires in {{expiryMinutes}} minutes). If you did not request this, ignore this email.',
      variables: [
        { name: 'userFirstName', description: 'User first name', required: true },
        { name: 'resetLink', description: 'Password reset link', required: true },
        { name: 'expiryMinutes', description: 'Link expiry time in minutes', required: true },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: 'email-verification',
      displayName: 'Email Verification',
      category: 'SYSTEM' as const,
      description: 'Sent to verify a user email address',
      subject: 'Verify Your Email - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Verify Your Email</h2>
<p>Hi {{userFirstName}},</p>
<p>Please verify your email address by clicking the button below:</p>
<p><a href="{{verificationLink}}" class="btn">Verify Email</a></p>
<p>This link will expire in {{expiryMinutes}} minutes.</p>`),
      textContent: 'Hi {{userFirstName}}, verify your email at: {{verificationLink}} (expires in {{expiryMinutes}} minutes).',
      variables: [
        { name: 'userFirstName', description: 'User first name', required: true },
        { name: 'verificationLink', description: 'Verification link', required: true },
        { name: 'expiryMinutes', description: 'Link expiry time in minutes', required: true },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: 'security-alert',
      displayName: 'Security Alert',
      category: 'SYSTEM' as const,
      description: 'Sent for security events like new device login or password change',
      subject: 'Security Alert - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Security Alert</h2>
<p>Hi {{userFirstName}},</p>
<p>We detected the following activity on your account:</p>
<div class="info-box">
<strong>Event:</strong> {{eventType}}<br>
<strong>Time:</strong> {{eventTime}}<br>
<strong>IP Address:</strong> {{ipAddress}}<br>
<strong>Device:</strong> {{device}}
</div>
<p>If this was not you, please reset your password immediately or contact your administrator.</p>`),
      textContent: 'Security Alert: {{eventType}} detected on your account at {{eventTime}} from IP {{ipAddress}}. If this was not you, reset your password immediately.',
      variables: [
        { name: 'userFirstName', description: 'User first name', required: true },
        { name: 'eventType', description: 'Security event type', required: true },
        { name: 'eventTime', description: 'Event timestamp', required: true },
        { name: 'ipAddress', description: 'IP address', required: false },
        { name: 'device', description: 'Device info', required: false },
      ],
      isActive: true,
      isDefault: true,
    },
    // ---- HR ----
    {
      name: 'employee-onboarding',
      displayName: 'Employee Onboarding',
      category: 'HR' as const,
      description: 'Sent to new employees with onboarding information',
      subject: 'Your Onboarding Details - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Welcome Aboard, {{userFirstName}}!</h2>
<p>We're excited to have you join <strong>{{companyName}}</strong>.</p>
<div class="info-box">
<strong>Start Date:</strong> {{startDate}}<br>
<strong>Department:</strong> {{department}}<br>
<strong>Reporting To:</strong> {{manager}}<br>
<strong>Employee Code:</strong> {{employeeCode}}
</div>
<p>Please complete your onboarding tasks:</p>
<p><a href="{{onboardingLink}}" class="btn">Start Onboarding</a></p>`),
      textContent: 'Welcome to {{companyName}}, {{userFirstName}}! Start Date: {{startDate}}, Department: {{department}}, Manager: {{manager}}. Complete onboarding at: {{onboardingLink}}',
      variables: [
        { name: 'userFirstName', description: 'Employee first name', required: true },
        { name: 'startDate', description: 'Start date', required: true },
        { name: 'department', description: 'Department name', required: true },
        { name: 'manager', description: 'Manager name', required: true },
        { name: 'employeeCode', description: 'Employee code', required: false },
        { name: 'onboardingLink', description: 'Onboarding portal link', required: true },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: 'employee-offboarding',
      displayName: 'Employee Offboarding',
      category: 'HR' as const,
      description: 'Sent when an employee begins the offboarding process',
      subject: 'Offboarding - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Offboarding Process</h2>
<p>Hi {{userFirstName}},</p>
<p>Your offboarding process has been initiated. Please complete the following:</p>
<div class="info-box">
<strong>Last Working Day:</strong> {{lastDay}}<br>
<strong>Exit Interview:</strong> {{exitInterviewDate}}
</div>
<p>Please ensure all company assets are returned and knowledge transfer is completed.</p>
<p><a href="{{offboardingLink}}" class="btn">View Offboarding Checklist</a></p>`),
      textContent: 'Hi {{userFirstName}}, your offboarding has been initiated. Last working day: {{lastDay}}. View checklist at: {{offboardingLink}}',
      variables: [
        { name: 'userFirstName', description: 'Employee first name', required: true },
        { name: 'lastDay', description: 'Last working day', required: true },
        { name: 'exitInterviewDate', description: 'Exit interview date', required: false },
        { name: 'offboardingLink', description: 'Offboarding checklist link', required: true },
      ],
      isActive: true,
      isDefault: true,
    },
    // ---- RECRUITMENT ----
    {
      name: 'interview-invitation',
      displayName: 'Interview Invitation',
      category: 'RECRUITMENT' as const,
      description: 'Sent to candidates to schedule an interview',
      subject: 'Interview Invitation - {{position}} at {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Interview Invitation</h2>
<p>Dear {{candidateName}},</p>
<p>We are pleased to invite you for an interview for the position of <strong>{{position}}</strong>.</p>
<div class="info-box">
<strong>Date:</strong> {{interviewDate}}<br>
<strong>Time:</strong> {{interviewTime}}<br>
<strong>Type:</strong> {{interviewType}}<br>
<strong>Location/Link:</strong> {{interviewLocation}}
</div>
<p>Please confirm your attendance by replying to this email or clicking below:</p>
<p><a href="{{confirmLink}}" class="btn">Confirm Attendance</a></p>`),
      textContent: 'Dear {{candidateName}}, you are invited for an interview for {{position}} on {{interviewDate}} at {{interviewTime}}. {{interviewType}}: {{interviewLocation}}. Confirm at: {{confirmLink}}',
      variables: [
        { name: 'candidateName', description: 'Candidate name', required: true },
        { name: 'position', description: 'Job position', required: true },
        { name: 'interviewDate', description: 'Interview date', required: true },
        { name: 'interviewTime', description: 'Interview time', required: true },
        { name: 'interviewType', description: 'Interview type (On-site/Virtual)', required: true },
        { name: 'interviewLocation', description: 'Location or meeting link', required: true },
        { name: 'confirmLink', description: 'Confirmation link', required: false },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: 'job-offer',
      displayName: 'Job Offer Letter',
      category: 'RECRUITMENT' as const,
      description: 'Sent to candidates with a job offer',
      subject: 'Job Offer - {{position}} at {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Congratulations, {{candidateName}}!</h2>
<p>We are pleased to offer you the position of <strong>{{position}}</strong> at {{companyName}}.</p>
<div class="info-box">
<strong>Position:</strong> {{position}}<br>
<strong>Department:</strong> {{department}}<br>
<strong>Start Date:</strong> {{startDate}}<br>
<strong>Salary:</strong> {{offerAmount}}
</div>
<p>Please review the offer details and respond by {{offerDeadline}}:</p>
<p><a href="{{offerLink}}" class="btn">Review & Accept Offer</a></p>`),
      textContent: 'Congratulations {{candidateName}}! We offer you the {{position}} role at {{companyName}}. Salary: {{offerAmount}}, Start: {{startDate}}. Review at: {{offerLink}}',
      variables: [
        { name: 'candidateName', description: 'Candidate name', required: true },
        { name: 'position', description: 'Job position', required: true },
        { name: 'department', description: 'Department', required: true },
        { name: 'startDate', description: 'Proposed start date', required: true },
        { name: 'offerAmount', description: 'Salary offer', required: true },
        { name: 'offerDeadline', description: 'Offer response deadline', required: true },
        { name: 'offerLink', description: 'Link to view/accept offer', required: true },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: 'application-received',
      displayName: 'Application Received',
      category: 'RECRUITMENT' as const,
      description: 'Auto-reply when a candidate submits an application',
      subject: 'Application Received - {{position}} at {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Application Received</h2>
<p>Dear {{candidateName}},</p>
<p>Thank you for applying for the <strong>{{position}}</strong> position at {{companyName}}.</p>
<p>We have received your application and our team will review it shortly. You will be notified about the next steps.</p>
<p>If you have any questions, please contact us at {{supportEmail}}.</p>`),
      textContent: 'Dear {{candidateName}}, thank you for applying for {{position}} at {{companyName}}. We have received your application and will be in touch.',
      variables: [
        { name: 'candidateName', description: 'Candidate name', required: true },
        { name: 'position', description: 'Job position', required: true },
      ],
      isActive: true,
      isDefault: true,
    },
    // ---- ATTENDANCE ----
    {
      name: 'leave-request-submitted',
      displayName: 'Leave Request Submitted',
      category: 'ATTENDANCE' as const,
      description: 'Sent to manager when an employee submits a leave request',
      subject: 'Leave Request from {{userName}} - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Leave Request</h2>
<p>{{userName}} has submitted a leave request that requires your approval.</p>
<div class="info-box">
<strong>Employee:</strong> {{userName}}<br>
<strong>Leave Type:</strong> {{leaveType}}<br>
<strong>From:</strong> {{startDate}}<br>
<strong>To:</strong> {{endDate}}<br>
<strong>Days:</strong> {{leaveDays}}<br>
<strong>Reason:</strong> {{reason}}
</div>
<p><a href="{{approvalLink}}" class="btn">Review Request</a></p>`),
      textContent: 'Leave request from {{userName}}: {{leaveType}} from {{startDate}} to {{endDate}} ({{leaveDays}} days). Reason: {{reason}}. Review at: {{approvalLink}}',
      variables: [
        { name: 'userName', description: 'Employee name', required: true },
        { name: 'leaveType', description: 'Type of leave', required: true },
        { name: 'startDate', description: 'Leave start date', required: true },
        { name: 'endDate', description: 'Leave end date', required: true },
        { name: 'leaveDays', description: 'Number of days', required: true },
        { name: 'reason', description: 'Leave reason', required: false },
        { name: 'approvalLink', description: 'Link to approve/reject', required: true },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: 'leave-approved',
      displayName: 'Leave Approved',
      category: 'ATTENDANCE' as const,
      description: 'Sent to employee when their leave request is approved',
      subject: 'Leave Request Approved - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Leave Approved</h2>
<p>Hi {{userFirstName}},</p>
<p>Your leave request has been <strong style="color:#16a34a">approved</strong>.</p>
<div class="info-box">
<strong>Leave Type:</strong> {{leaveType}}<br>
<strong>From:</strong> {{startDate}}<br>
<strong>To:</strong> {{endDate}}<br>
<strong>Days:</strong> {{leaveDays}}<br>
<strong>Approved By:</strong> {{approvedBy}}
</div>`),
      textContent: 'Hi {{userFirstName}}, your {{leaveType}} leave from {{startDate}} to {{endDate}} ({{leaveDays}} days) has been approved by {{approvedBy}}.',
      variables: [
        { name: 'userFirstName', description: 'Employee first name', required: true },
        { name: 'leaveType', description: 'Type of leave', required: true },
        { name: 'startDate', description: 'Start date', required: true },
        { name: 'endDate', description: 'End date', required: true },
        { name: 'leaveDays', description: 'Number of days', required: true },
        { name: 'approvedBy', description: 'Approver name', required: true },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: 'leave-rejected',
      displayName: 'Leave Rejected',
      category: 'ATTENDANCE' as const,
      description: 'Sent to employee when their leave request is rejected',
      subject: 'Leave Request Rejected - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Leave Rejected</h2>
<p>Hi {{userFirstName}},</p>
<p>Your leave request has been <strong style="color:#dc2626">rejected</strong>.</p>
<div class="info-box">
<strong>Leave Type:</strong> {{leaveType}}<br>
<strong>From:</strong> {{startDate}}<br>
<strong>To:</strong> {{endDate}}<br>
<strong>Rejected By:</strong> {{rejectedBy}}<br>
<strong>Reason:</strong> {{rejectionReason}}
</div>
<p>Please contact your manager for more information.</p>`),
      textContent: 'Hi {{userFirstName}}, your {{leaveType}} leave from {{startDate}} to {{endDate}} has been rejected by {{rejectedBy}}. Reason: {{rejectionReason}}',
      variables: [
        { name: 'userFirstName', description: 'Employee first name', required: true },
        { name: 'leaveType', description: 'Type of leave', required: true },
        { name: 'startDate', description: 'Start date', required: true },
        { name: 'endDate', description: 'End date', required: true },
        { name: 'rejectedBy', description: 'Rejector name', required: true },
        { name: 'rejectionReason', description: 'Rejection reason', required: false },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: 'attendance-reminder',
      displayName: 'Attendance Check-in Reminder',
      category: 'ATTENDANCE' as const,
      description: 'Daily reminder to check in for attendance',
      subject: 'Attendance Reminder - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Attendance Reminder</h2>
<p>Hi {{userFirstName}},</p>
<p>This is a friendly reminder to check in for today's attendance.</p>
<div class="info-box">
<strong>Date:</strong> {{date}}<br>
<strong>Expected Check-in:</strong> {{checkInTime}}
</div>
<p><a href="{{portalUrl}}" class="btn">Check In Now</a></p>`),
      textContent: 'Hi {{userFirstName}}, reminder to check in for attendance today ({{date}}). Expected check-in: {{checkInTime}}. Log in at: {{portalUrl}}',
      variables: [
        { name: 'userFirstName', description: 'Employee first name', required: true },
        { name: 'date', description: 'Today\'s date', required: true },
        { name: 'checkInTime', description: 'Expected check-in time', required: true },
      ],
      isActive: true,
      isDefault: true,
    },
    // ---- PROJECT ----
    {
      name: 'task-assigned',
      displayName: 'Task Assigned',
      category: 'PROJECT' as const,
      description: 'Sent when a task is assigned to an employee',
      subject: 'New Task Assigned - {{projectName}} - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>New Task Assigned</h2>
<p>Hi {{userFirstName}},</p>
<p>A new task has been assigned to you:</p>
<div class="info-box">
<strong>Task:</strong> {{taskTitle}}<br>
<strong>Project:</strong> {{projectName}}<br>
<strong>Priority:</strong> {{taskPriority}}<br>
<strong>Due Date:</strong> {{taskDueDate}}<br>
<strong>Assigned By:</strong> {{assignedBy}}
</div>
<p><a href="{{taskLink}}" class="btn">View Task</a></p>`),
      textContent: 'Hi {{userFirstName}}, new task assigned: "{{taskTitle}}" in {{projectName}} project. Priority: {{taskPriority}}, Due: {{taskDueDate}}. Assigned by {{assignedBy}}.',
      variables: [
        { name: 'userFirstName', description: 'Employee first name', required: true },
        { name: 'taskTitle', description: 'Task title', required: true },
        { name: 'projectName', description: 'Project name', required: true },
        { name: 'taskPriority', description: 'Task priority', required: true },
        { name: 'taskDueDate', description: 'Due date', required: true },
        { name: 'assignedBy', description: 'Assignor name', required: true },
        { name: 'taskLink', description: 'Link to view task', required: false },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: 'task-deadline-reminder',
      displayName: 'Task Deadline Reminder',
      category: 'PROJECT' as const,
      description: 'Sent when a task deadline is approaching',
      subject: 'Task Deadline Approaching - {{taskTitle}} - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Task Deadline Approaching</h2>
<p>Hi {{userFirstName}},</p>
<p>Your task is due soon:</p>
<div class="info-box">
<strong>Task:</strong> {{taskTitle}}<br>
<strong>Project:</strong> {{projectName}}<br>
<strong>Due Date:</strong> {{taskDueDate}}<br>
<strong>Hours Remaining:</strong> {{hoursRemaining}}
</div>
<p><a href="{{taskLink}}" class="btn">View Task</a></p>`),
      textContent: 'Hi {{userFirstName}}, task "{{taskTitle}}" in {{projectName}} is due on {{taskDueDate}} ({{hoursRemaining}} hours remaining).',
      variables: [
        { name: 'userFirstName', description: 'Employee first name', required: true },
        { name: 'taskTitle', description: 'Task title', required: true },
        { name: 'projectName', description: 'Project name', required: true },
        { name: 'taskDueDate', description: 'Due date', required: true },
        { name: 'hoursRemaining', description: 'Hours until deadline', required: true },
        { name: 'taskLink', description: 'Link to view task', required: false },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: 'task-overdue',
      displayName: 'Task Overdue Notification',
      category: 'PROJECT' as const,
      description: 'Sent when a task passes its due date',
      subject: 'Task Overdue - {{taskTitle}} - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2 style="color:#dc2626">Task Overdue</h2>
<p>Hi {{userFirstName}},</p>
<p>The following task is past its due date:</p>
<div class="info-box" style="border-left-color:#dc2626">
<strong>Task:</strong> {{taskTitle}}<br>
<strong>Project:</strong> {{projectName}}<br>
<strong>Was Due:</strong> {{taskDueDate}}<br>
<strong>Days Overdue:</strong> {{daysOverdue}}
</div>
<p>Please update the task status or contact your project manager.</p>
<p><a href="{{taskLink}}" class="btn" style="background:#dc2626">View Task</a></p>`),
      textContent: 'Hi {{userFirstName}}, task "{{taskTitle}}" in {{projectName}} is overdue (was due {{taskDueDate}}, {{daysOverdue}} days overdue).',
      variables: [
        { name: 'userFirstName', description: 'Employee first name', required: true },
        { name: 'taskTitle', description: 'Task title', required: true },
        { name: 'projectName', description: 'Project name', required: true },
        { name: 'taskDueDate', description: 'Original due date', required: true },
        { name: 'daysOverdue', description: 'Days overdue', required: true },
        { name: 'taskLink', description: 'Link to view task', required: false },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: 'performance-review-scheduled',
      displayName: 'Performance Review Scheduled',
      category: 'HR' as const,
      description: 'Sent when a performance review is scheduled',
      subject: 'Performance Review Scheduled - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Performance Review Scheduled</h2>
<p>Hi {{userFirstName}},</p>
<p>A performance review has been scheduled for you.</p>
<div class="info-box">
<strong>Review Period:</strong> {{reviewPeriod}}<br>
<strong>Reviewer:</strong> {{reviewerName}}<br>
<strong>Due Date:</strong> {{dueDate}}
</div>
<p><a href="{{reviewLink}}" class="btn">View Review</a></p>`),
      textContent: 'Hi {{userFirstName}}, a performance review has been scheduled. Period: {{reviewPeriod}}, Reviewer: {{reviewerName}}, Due: {{dueDate}}.',
      variables: [
        { name: 'userFirstName', description: 'Employee first name', required: true },
        { name: 'reviewPeriod', description: 'Review period', required: true },
        { name: 'reviewerName', description: 'Reviewer name', required: true },
        { name: 'dueDate', description: 'Review due date', required: true },
        { name: 'reviewLink', description: 'Link to review', required: false },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: 'badge-awarded',
      displayName: 'Badge Awarded',
      category: 'HR' as const,
      description: 'Sent when an employee receives a badge/achievement',
      subject: 'You Earned a Badge! - {{companyName}}',
      htmlContent: baseHtmlWrapper(`<h2>Congratulations! 🏆</h2>
<p>Hi {{userFirstName}},</p>
<p>You have been awarded a badge:</p>
<div class="info-box">
<strong>Badge:</strong> {{badgeName}}<br>
<strong>Category:</strong> {{badgeCategory}}<br>
<strong>Awarded By:</strong> {{awardedBy}}<br>
<strong>Reason:</strong> {{reason}}
</div>
<p>Keep up the great work!</p>`),
      textContent: 'Congratulations {{userFirstName}}! You earned the "{{badgeName}}" badge. Awarded by {{awardedBy}}. Reason: {{reason}}',
      variables: [
        { name: 'userFirstName', description: 'Employee first name', required: true },
        { name: 'badgeName', description: 'Badge name', required: true },
        { name: 'badgeCategory', description: 'Badge category', required: true },
        { name: 'awardedBy', description: 'Person who awarded', required: true },
        { name: 'reason', description: 'Award reason', required: false },
      ],
      isActive: true,
      isDefault: true,
    },
  ];
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /templates - List all email templates
 */
router.get('/', requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const { category, isActive } = req.query;
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    const where: any = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        displayName: true,
        category: true,
        description: true,
        subject: true,
        isActive: true,
        isDefault: true,
        variables: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /templates/categories - Get template categories with counts
 */
router.get('/categories', requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const prisma = await getTenantPrisma(tenantSlug);
    
    const categories = await prisma.emailTemplate.groupBy({
      by: ['category'],
      _count: { id: true },
    });
    
    const categoryInfo = [
      { value: 'SYSTEM', label: 'System', description: 'System notifications (welcome, password reset)' },
      { value: 'HR', label: 'HR', description: 'HR related (onboarding, offboarding)' },
      { value: 'RECRUITMENT', label: 'Recruitment', description: 'Recruitment (job offer, interview invite)' },
      { value: 'ATTENDANCE', label: 'Attendance', description: 'Attendance (check-in reminder, leave approval)' },
      { value: 'PROJECT', label: 'Project', description: 'Project related (task assigned, deadline reminder)' },
      { value: 'CUSTOM', label: 'Custom', description: 'Custom templates' },
    ];
    
    const result = categoryInfo.map(cat => ({
      ...cat,
      count: categories.find(c => c.category === cat.value)?._count.id || 0,
    }));
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /templates/variables - Get available template variables
 */
router.get('/variables', (req: Request, res: Response) => {
  const variables = {
    common: [
      { name: 'companyName', description: 'Organization name', example: 'Innovatelab Inc' },
      { name: 'companyLogo', description: 'Organization logo URL', example: 'https://...' },
      { name: 'portalUrl', description: 'Portal login URL', example: 'https://portal...' },
      { name: 'supportEmail', description: 'Support email address', example: 'support@...' },
      { name: 'year', description: 'Current year', example: '2026' },
    ],
    user: [
      { name: 'userName', description: 'Full name of the user', example: 'John Doe' },
      { name: 'userFirstName', description: 'First name', example: 'John' },
      { name: 'userLastName', description: 'Last name', example: 'Doe' },
      { name: 'userEmail', description: 'User email address', example: 'john@...' },
    ],
    employee: [
      { name: 'employeeCode', description: 'Employee code', example: 'EMP-001' },
      { name: 'department', description: 'Department name', example: 'Engineering' },
      { name: 'designation', description: 'Job title', example: 'Software Engineer' },
      { name: 'manager', description: 'Manager name', example: 'Jane Smith' },
    ],
    recruitment: [
      { name: 'candidateName', description: 'Candidate full name', example: 'John Doe' },
      { name: 'position', description: 'Job position', example: 'Software Engineer' },
      { name: 'offerAmount', description: 'Salary offer', example: '$75,000' },
      { name: 'startDate', description: 'Proposed start date', example: 'March 15, 2026' },
      { name: 'offerLink', description: 'Link to view/accept offer', example: 'https://...' },
    ],
    attendance: [
      { name: 'date', description: 'Date', example: 'March 4, 2026' },
      { name: 'checkInTime', description: 'Check-in time', example: '9:00 AM' },
      { name: 'checkOutTime', description: 'Check-out time', example: '6:00 PM' },
      { name: 'leaveType', description: 'Type of leave', example: 'Annual Leave' },
      { name: 'leaveDays', description: 'Number of leave days', example: '3' },
    ],
    project: [
      { name: 'projectName', description: 'Project name', example: 'Website Redesign' },
      { name: 'taskTitle', description: 'Task title', example: 'Design homepage' },
      { name: 'taskDueDate', description: 'Task due date', example: 'March 10, 2026' },
      { name: 'assignedBy', description: 'Person who assigned', example: 'Jane Smith' },
    ],
  };
  
  res.json({
    success: true,
    data: variables,
  });
});

/**
 * GET /templates/:id - Get single template with full content
 */
router.get('/:id', requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const { id } = req.params;
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /templates - Create new email template
 */
router.post('/', requireTenant, requirePermission, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const userId = (req as any).userId;
    
    const data = createTemplateSchema.parse(req.body);
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    // Check if name already exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: data.name },
    });
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Template with this name already exists',
      });
    }
    
    const template = await prisma.emailTemplate.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        category: data.category,
        description: data.description,
        subject: data.subject,
        htmlContent: data.htmlContent,
        textContent: data.textContent,
        variables: data.variables || [],
        isActive: data.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    
    // Clear cache for this tenant
    clearTemplateCache(tenantSlug);
    
    logger.info({ templateId: template.id, tenantSlug }, 'Email template created');
    
    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * PUT /templates/:id - Update email template
 */
router.put('/:id', requireTenant, requirePermission, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const userId = (req as any).userId;
    const { id } = req.params;
    
    const data = updateTemplateSchema.parse(req.body);
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    // Check if template exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
      },
    });
    
    // Clear cache for this tenant
    clearTemplateCache(tenantSlug);
    
    logger.info({ templateId: id, tenantSlug }, 'Email template updated');
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * DELETE /templates/:id - Delete email template
 */
router.delete('/:id', requireTenant, requirePermission, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const { id } = req.params;
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    // Check if template exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    // Don't allow deleting default templates
    if (existing.isDefault) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete default system templates',
      });
    }
    
    await prisma.emailTemplate.delete({
      where: { id },
    });
    
    // Clear cache for this tenant
    clearTemplateCache(tenantSlug);
    
    logger.info({ templateId: id, tenantSlug }, 'Email template deleted');
    
    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /templates/:id/duplicate - Duplicate a template
 */
router.post('/:id/duplicate', requireTenant, requirePermission, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const userId = (req as any).userId;
    const { id } = req.params;
    const { name, displayName } = req.body;
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    // Get source template
    const source = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    // Create new name if not provided
    const newName = name || `${source.name}-copy`;
    const newDisplayName = displayName || `${source.displayName} (Copy)`;
    
    // Check if name already exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: newName },
    });
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Template with this name already exists',
      });
    }
    
    const template = await prisma.emailTemplate.create({
      data: {
        name: newName,
        displayName: newDisplayName,
        category: source.category,
        description: source.description,
        subject: source.subject,
        htmlContent: source.htmlContent,
        textContent: source.textContent,
        variables: source.variables || [],
        isActive: false, // Start as inactive
        isDefault: false,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    
    logger.info({ templateId: template.id, sourceId: id, tenantSlug }, 'Email template duplicated');
    
    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /templates/preview - Preview template with sample data
 */
router.post('/preview', requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = previewTemplateSchema.parse(req.body);
    
    // Sample data for preview
    const sampleData = {
      companyName: 'Innovatelab Inc',
      companyLogo: 'https://via.placeholder.com/200x50?text=Logo',
      portalUrl: 'https://portal.example.com',
      supportEmail: 'support@example.com',
      year: new Date().getFullYear(),
      userName: 'John Doe',
      userFirstName: 'John',
      userLastName: 'Doe',
      userEmail: 'john.doe@example.com',
      ...data.data,
    };
    
    const result = renderTemplateFromDb(
      data.subject,
      data.htmlContent,
      sampleData
    );
    
    res.json({
      success: true,
      data: {
        subject: result.subject,
        html: result.html,
        text: result.text,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * POST /templates/seed - Seed default email templates
 */
router.post('/seed', requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const prisma = await getTenantPrisma(tenantSlug);

    // Check existing templates
    const existingCount = await prisma.emailTemplate.count();
    if (existingCount > 0) {
      return res.json({
        success: true,
        message: 'Email templates already exist, skipping seed',
        data: { existingCount },
      });
    }

    const defaultTemplates = getDefaultEmailTemplates();
    let createdCount = 0;

    for (const tmpl of defaultTemplates) {
      await prisma.emailTemplate.create({ data: tmpl });
      createdCount++;
    }

    logger.info({ count: createdCount, tenantSlug }, 'Default email templates seeded');

    res.status(201).json({
      success: true,
      message: `${createdCount} default email templates created`,
      data: { created: createdCount },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to seed email templates');
    next(error);
  }
});

/**
 * POST /templates/:id/test - Send test email
 */
router.post('/:id/test', requireTenant, requirePermission, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const { id } = req.params;
    
    const { to, data: testData } = sendTestEmailSchema.parse(req.body);
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    // Get template
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    // Sample data for test
    const sampleData = {
      companyName: 'Innovatelab Inc',
      companyLogo: 'https://via.placeholder.com/200x50?text=Logo',
      portalUrl: 'https://portal.example.com',
      supportEmail: 'support@example.com',
      year: new Date().getFullYear(),
      userName: 'Test User',
      userFirstName: 'Test',
      userLastName: 'User',
      userEmail: to,
      ...testData,
    };
    
    const rendered = renderTemplateFromDb(
      template.subject,
      template.htmlContent,
      sampleData
    );
    
    // Send test email using tenant's SMTP settings
    const result = await sendTenantEmail(tenantSlug, {
      to,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send test email. Check your SMTP settings.',
      });
    }
    
    logger.info({ templateId: id, to, tenantSlug }, 'Test email sent');
    
    res.json({
      success: true,
      message: `Test email sent to ${to}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * POST /templates/:id/reset - Reset template to default
 */
router.post('/:id/reset', requireTenant, requirePermission, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const userId = (req as any).userId;
    const { id } = req.params;
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    // Get current template
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    // Try to load the default template from file system
    const defaultTemplate = renderTemplate(template.name, {}, 'tenant');
    
    if (!defaultTemplate) {
      return res.status(404).json({
        success: false,
        error: 'No default template found for this template type',
      });
    }
    
    // This is a simplified reset - in production you'd want to store
    // the original template content somewhere
    logger.info({ templateId: id, tenantSlug }, 'Template reset requested (manual action needed)');
    
    res.json({
      success: true,
      message: 'Template reset functionality requires manual restoration from defaults',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
