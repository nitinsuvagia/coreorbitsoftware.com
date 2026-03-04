/**
 * Seed Default Email Templates
 * 
 * This script seeds the default email templates for a tenant.
 * Run this when creating a new tenant or to reset templates to defaults.
 * 
 * Usage: npx ts-node scripts/seed-email-templates.ts <tenant-slug>
 */

import { getTenantPrisma } from '@oms/database';
import { logger } from '../src/utils/logger';

// Default email templates
const defaultTemplates = [
  // ============================================================================
  // SYSTEM CATEGORY
  // ============================================================================
  {
    name: 'welcome',
    displayName: 'Welcome Email',
    category: 'SYSTEM',
    description: 'Sent when a new user account is created',
    subject: 'Welcome to {{companyName}} - Your Account is Ready',
    htmlContent: `<h2>Welcome to {{companyName}}, {{firstName}}!</h2>

<p>Your account has been created successfully. You now have access to the employee portal where you can manage your work-related activities.</p>

<div class="info-box">
  <p><strong>Your Account Details:</strong></p>
  <p>
    Email: {{email}}<br>
    Username: {{username}}<br>
    Role: {{role}}
  </p>
</div>

<p>To get started, please set up your password by clicking the button below:</p>

<a href="{{resetPasswordUrl}}" class="button">Set Up Password</a>

<p style="font-size: 14px; color: #718096;">Or copy and paste this link into your browser:<br>
<a href="{{resetPasswordUrl}}">{{resetPasswordUrl}}</a></p>

<div class="divider"></div>

<p><strong>What you can do:</strong></p>
<ul style="color: #4a5568; margin-left: 20px;">
  <li>View and update your profile</li>
  <li>Check attendance and leave balances</li>
  <li>Access company documents</li>
  <li>View assigned tasks and projects</li>
</ul>

<p>If you have any questions, please contact the HR department.</p>

<p>Best regards,<br>
<strong>{{companyName}} Team</strong></p>`,
    variables: [
      { name: 'firstName', description: 'User first name', required: true },
      { name: 'email', description: 'User email address', required: true },
      { name: 'username', description: 'User login name', required: true },
      { name: 'role', description: 'User role name', required: true },
      { name: 'resetPasswordUrl', description: 'Password setup link', required: true },
      { name: 'companyName', description: 'Company name', required: true },
    ],
    isDefault: true,
  },
  {
    name: 'password-reset',
    displayName: 'Password Reset',
    category: 'SYSTEM',
    description: 'Sent when a user requests password reset',
    subject: 'Reset Your Password - {{companyName}}',
    htmlContent: `<h2>Password Reset Request</h2>

<p>Hello {{firstName}},</p>

<p>We received a request to reset your password for your {{companyName}} account. If you didn't make this request, you can safely ignore this email.</p>

<p>To reset your password, click the button below:</p>

<a href="{{resetPasswordUrl}}" class="button">Reset Password</a>

<p style="font-size: 14px; color: #718096;">Or copy and paste this link into your browser:<br>
<a href="{{resetPasswordUrl}}">{{resetPasswordUrl}}</a></p>

<div class="warning-box">
  <p><strong>⏰ Important:</strong> This link will expire in <strong>{{expiryHours}} hours</strong>.</p>
</div>

<p>If you didn't request a password reset, please contact your administrator immediately as someone may be trying to access your account.</p>

<p>Best regards,<br>
<strong>{{companyName}} Team</strong></p>`,
    variables: [
      { name: 'firstName', description: 'User first name', required: true },
      { name: 'resetPasswordUrl', description: 'Password reset link', required: true },
      { name: 'expiryHours', description: 'Link expiry in hours', required: false, example: '24' },
      { name: 'companyName', description: 'Company name', required: true },
    ],
    isDefault: true,
  },
  {
    name: 'account-activated',
    displayName: 'Account Activated',
    category: 'SYSTEM',
    description: 'Sent when a user account is activated/reactivated',
    subject: 'Your Account Has Been Activated - {{companyName}}',
    htmlContent: `<h2>Account Activated!</h2>

<p>Hello {{firstName}},</p>

<p>Great news! Your account at {{companyName}} has been activated and is now fully functional.</p>

<div class="success-box">
  <p><strong>✓ Your account is now active</strong></p>
</div>

<p>You can now log in and access all the features available to you:</p>

<a href="{{loginUrl}}" class="button">Log In Now</a>

<p>If you have any questions or need assistance, please don't hesitate to reach out to the HR department.</p>

<p>Best regards,<br>
<strong>{{companyName}} Team</strong></p>`,
    variables: [
      { name: 'firstName', description: 'User first name', required: true },
      { name: 'loginUrl', description: 'Portal login URL', required: true },
      { name: 'companyName', description: 'Company name', required: true },
    ],
    isDefault: true,
  },
  {
    name: 'account-suspended',
    displayName: 'Account Suspended',
    category: 'SYSTEM',
    description: 'Sent when a user account is suspended',
    subject: 'Important: Your Account Has Been Suspended - {{companyName}}',
    htmlContent: `<h2>Account Suspended</h2>

<p>Hello {{firstName}},</p>

<p>We're writing to inform you that your account at {{companyName}} has been suspended.</p>

<div class="warning-box">
  <p><strong>Account Status: Suspended</strong></p>
  {{#if reason}}
  <p>Reason: {{reason}}</p>
  {{/if}}
</div>

<p>While your account is suspended, you will not be able to:</p>
<ul style="color: #4a5568; margin-left: 20px;">
  <li>Log in to the portal</li>
  <li>Access your dashboard</li>
  <li>View or submit any information</li>
</ul>

<p>If you believe this is an error or have questions about this action, please contact the HR department immediately.</p>

<p>Best regards,<br>
<strong>{{companyName}} Team</strong></p>`,
    variables: [
      { name: 'firstName', description: 'User first name', required: true },
      { name: 'reason', description: 'Suspension reason', required: false },
      { name: 'companyName', description: 'Company name', required: true },
    ],
    isDefault: true,
  },
  {
    name: 'role-changed',
    displayName: 'Role Changed',
    category: 'SYSTEM',
    description: 'Sent when a user role/permissions are changed',
    subject: 'Your Role Has Been Updated - {{companyName}}',
    htmlContent: `<h2>Role Update Notification</h2>

<p>Hello {{firstName}},</p>

<p>Your role at {{companyName}} has been updated. Here are the details:</p>

<div class="info-box">
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; color: #718096;">Previous Role:</td>
      <td style="padding: 8px 0; color: #1a202c;">{{previousRole}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">New Role:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{newRole}}</td>
    </tr>
  </table>
</div>

<p>This change may affect your access to certain features and information in the system. Please log in to review your updated permissions and dashboard.</p>

<a href="{{portalUrl}}" class="button">View Dashboard</a>

<p>If you have questions about this role change, please contact your manager or the HR department.</p>

<p>Best regards,<br>
<strong>{{companyName}} Team</strong></p>`,
    variables: [
      { name: 'firstName', description: 'User first name', required: true },
      { name: 'previousRole', description: 'Previous role name', required: true },
      { name: 'newRole', description: 'New role name', required: true },
      { name: 'portalUrl', description: 'Portal URL', required: true },
      { name: 'companyName', description: 'Company name', required: true },
    ],
    isDefault: true,
  },

  // ============================================================================
  // RECRUITMENT CATEGORY
  // ============================================================================
  {
    name: 'job-offer',
    displayName: 'Job Offer',
    category: 'RECRUITMENT',
    description: 'Sent when extending a job offer to a candidate',
    subject: 'Job Offer from {{companyName}} - {{designation}} Position',
    htmlContent: `<h2>Congratulations, {{candidateName}}!</h2>

<p>We are pleased to extend an offer of employment to you. We were impressed by your skills and qualifications throughout the interview process and believe you would be a great addition to our team.</p>

<div class="info-box">
  <p><strong>Offer Details:</strong></p>
  <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
    <tr>
      <td style="padding: 8px 0; color: #718096; width: 140px;">Position:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{designation}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">Department:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{department}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">Salary:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{currency}} {{salary}}/year</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">Start Date:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{joiningDate}}</td>
    </tr>
  </table>
</div>

<p>To respond to this offer, please click the button below:</p>

<a href="{{offerUrl}}" class="button">View & Respond to Offer</a>

<div class="warning-box">
  <p><strong>⏰ Important:</strong> This offer is valid until <strong>{{expiryDate}}</strong>.</p>
</div>

<p>If you have any questions about the offer, please don't hesitate to reach out to our HR team.</p>

<p>Best regards,<br>
<strong>HR Team</strong><br>
{{companyName}}</p>`,
    variables: [
      { name: 'candidateName', description: 'Candidate full name', required: true },
      { name: 'designation', description: 'Job position', required: true },
      { name: 'department', description: 'Department name', required: true },
      { name: 'currency', description: 'Currency symbol', required: true, example: 'INR' },
      { name: 'salary', description: 'Annual salary', required: true },
      { name: 'joiningDate', description: 'Proposed start date', required: true },
      { name: 'offerUrl', description: 'Offer view/respond URL', required: true },
      { name: 'expiryDate', description: 'Offer expiry date', required: true },
      { name: 'companyName', description: 'Company name', required: true },
    ],
    isDefault: true,
  },
  {
    name: 'offer-response',
    displayName: 'Offer Response Confirmation',
    category: 'RECRUITMENT',
    description: 'Sent to confirm receipt of offer response',
    subject: 'Offer Response Received - {{companyName}}',
    htmlContent: `<h2>Thank You for Your Response</h2>

<p>Dear {{candidateName}},</p>

<p>We have received your response to our job offer for the <strong>{{designation}}</strong> position.</p>

{{#if accepted}}
<div class="success-box">
  <p><strong>✓ You have ACCEPTED the offer</strong></p>
</div>

<p>We are thrilled to have you join our team! Our HR department will be in touch shortly with the next steps for your onboarding process.</p>

<p><strong>What happens next:</strong></p>
<ul style="color: #4a5568; margin-left: 20px;">
  <li>You will receive onboarding documents to complete</li>
  <li>We will schedule your orientation session</li>
  <li>Your equipment and workspace will be prepared</li>
  <li>You will be introduced to your team before your start date</li>
</ul>
{{else}}
<div class="info-box">
  <p><strong>You have DECLINED the offer</strong></p>
</div>

<p>We respect your decision and thank you for considering {{companyName}}. We appreciate the time you invested in our interview process.</p>

<p>If circumstances change in the future, please don't hesitate to reach out. We would be happy to consider your application for future opportunities.</p>
{{/if}}

<p>If you have any questions, please contact our HR team.</p>

<p>Best regards,<br>
<strong>HR Team</strong><br>
{{companyName}}</p>`,
    variables: [
      { name: 'candidateName', description: 'Candidate full name', required: true },
      { name: 'designation', description: 'Job position', required: true },
      { name: 'accepted', description: 'Whether offer was accepted', required: true },
      { name: 'companyName', description: 'Company name', required: true },
    ],
    isDefault: true,
  },
  {
    name: 'interview-invitation',
    displayName: 'Interview Invitation',
    category: 'RECRUITMENT',
    description: 'Sent to invite candidates for an interview',
    subject: 'Interview Invitation - {{designation}} at {{companyName}}',
    htmlContent: `<h2>Interview Invitation</h2>

<p>Dear {{candidateName}},</p>

<p>Thank you for your application for the <strong>{{designation}}</strong> position at {{companyName}}. We were impressed with your profile and would like to invite you for an interview.</p>

<div class="info-box">
  <p><strong>Interview Details:</strong></p>
  <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
    <tr>
      <td style="padding: 8px 0; color: #718096; width: 140px;">Date:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{interviewDate}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">Time:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{interviewTime}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">Type:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{interviewType}}</td>
    </tr>
    {{#if location}}
    <tr>
      <td style="padding: 8px 0; color: #718096;">Location:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{location}}</td>
    </tr>
    {{/if}}
    {{#if meetingLink}}
    <tr>
      <td style="padding: 8px 0; color: #718096;">Meeting Link:</td>
      <td style="padding: 8px 0; color: #1a202c;"><a href="{{meetingLink}}">Join Meeting</a></td>
    </tr>
    {{/if}}
  </table>
</div>

<p><strong>Please confirm your attendance</strong> by clicking the button below:</p>

<a href="{{confirmationUrl}}" class="button">Confirm Attendance</a>

{{#if instructions}}
<div class="divider"></div>
<p><strong>Additional Instructions:</strong></p>
<p>{{instructions}}</p>
{{/if}}

<p>If you need to reschedule, please let us know at least 24 hours in advance.</p>

<p>Best regards,<br>
<strong>HR Team</strong><br>
{{companyName}}</p>`,
    variables: [
      { name: 'candidateName', description: 'Candidate full name', required: true },
      { name: 'designation', description: 'Job position', required: true },
      { name: 'interviewDate', description: 'Interview date', required: true },
      { name: 'interviewTime', description: 'Interview time', required: true },
      { name: 'interviewType', description: 'Type of interview', required: true, example: 'Video Call' },
      { name: 'location', description: 'Physical location', required: false },
      { name: 'meetingLink', description: 'Video meeting URL', required: false },
      { name: 'confirmationUrl', description: 'URL to confirm attendance', required: true },
      { name: 'instructions', description: 'Additional instructions', required: false },
      { name: 'companyName', description: 'Company name', required: true },
    ],
    isDefault: true,
  },

  // ============================================================================
  // HR CATEGORY
  // ============================================================================
  {
    name: 'onboarding-welcome',
    displayName: 'Onboarding Welcome',
    category: 'HR',
    description: 'Sent to new employees on their first day',
    subject: 'Welcome Aboard! Your First Day at {{companyName}}',
    htmlContent: `<h2>Welcome to the Team, {{firstName}}!</h2>

<p>We are thrilled to officially welcome you to {{companyName}}! Today marks the beginning of an exciting journey with us.</p>

<div class="success-box">
  <p><strong>🎉 Welcome aboard!</strong></p>
  <p>Employee Code: {{employeeCode}}<br>
  Department: {{department}}<br>
  Position: {{designation}}<br>
  Reporting To: {{managerName}}</p>
</div>

<p><strong>Your First Week:</strong></p>
<ul style="color: #4a5568; margin-left: 20px;">
  <li>Complete your onboarding checklist in the portal</li>
  <li>Meet your team members and manager</li>
  <li>Set up your workstation and access</li>
  <li>Review company policies and procedures</li>
</ul>

<a href="{{portalUrl}}" class="button">Access Employee Portal</a>

<p>Your manager {{managerName}} will be your primary point of contact during your onboarding. Don't hesitate to reach out with any questions.</p>

<p>We're excited to have you on board!</p>

<p>Best regards,<br>
<strong>HR Team</strong><br>
{{companyName}}</p>`,
    variables: [
      { name: 'firstName', description: 'Employee first name', required: true },
      { name: 'employeeCode', description: 'Employee code', required: true },
      { name: 'department', description: 'Department name', required: true },
      { name: 'designation', description: 'Job title', required: true },
      { name: 'managerName', description: 'Manager name', required: true },
      { name: 'portalUrl', description: 'Employee portal URL', required: true },
      { name: 'companyName', description: 'Company name', required: true },
    ],
    isDefault: true,
  },

  // ============================================================================
  // ATTENDANCE CATEGORY
  // ============================================================================
  {
    name: 'leave-approved',
    displayName: 'Leave Request Approved',
    category: 'ATTENDANCE',
    description: 'Sent when a leave request is approved',
    subject: 'Leave Request Approved - {{leaveType}}',
    htmlContent: `<h2>Leave Request Approved</h2>

<p>Dear {{firstName}},</p>

<p>Your leave request has been approved. Here are the details:</p>

<div class="success-box">
  <p><strong>✓ APPROVED</strong></p>
  <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
    <tr>
      <td style="padding: 8px 0; color: #718096; width: 140px;">Leave Type:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{leaveType}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">From:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{startDate}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">To:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{endDate}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">Days:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{totalDays}} day(s)</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">Approved By:</td>
      <td style="padding: 8px 0; color: #1a202c;">{{approverName}}</td>
    </tr>
  </table>
</div>

{{#if comments}}
<p><strong>Comments:</strong> {{comments}}</p>
{{/if}}

<p>Please ensure you complete any pending tasks before your leave. If you need to cancel or modify this leave, please do so at least 24 hours in advance through the portal.</p>

<p>Best regards,<br>
<strong>HR Team</strong><br>
{{companyName}}</p>`,
    variables: [
      { name: 'firstName', description: 'Employee first name', required: true },
      { name: 'leaveType', description: 'Type of leave', required: true },
      { name: 'startDate', description: 'Leave start date', required: true },
      { name: 'endDate', description: 'Leave end date', required: true },
      { name: 'totalDays', description: 'Number of leave days', required: true },
      { name: 'approverName', description: 'Name of approver', required: true },
      { name: 'comments', description: 'Approval comments', required: false },
      { name: 'companyName', description: 'Company name', required: true },
    ],
    isDefault: true,
  },
  {
    name: 'leave-rejected',
    displayName: 'Leave Request Rejected',
    category: 'ATTENDANCE',
    description: 'Sent when a leave request is rejected',
    subject: 'Leave Request Declined - {{leaveType}}',
    htmlContent: `<h2>Leave Request Update</h2>

<p>Dear {{firstName}},</p>

<p>We regret to inform you that your leave request has been declined. Here are the details:</p>

<div class="warning-box">
  <p><strong>✗ DECLINED</strong></p>
  <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
    <tr>
      <td style="padding: 8px 0; color: #718096; width: 140px;">Leave Type:</td>
      <td style="padding: 8px 0; color: #1a202c;">{{leaveType}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">Requested Dates:</td>
      <td style="padding: 8px 0; color: #1a202c;">{{startDate}} - {{endDate}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">Reviewed By:</td>
      <td style="padding: 8px 0; color: #1a202c;">{{approverName}}</td>
    </tr>
  </table>
</div>

{{#if reason}}
<p><strong>Reason:</strong> {{reason}}</p>
{{/if}}

<p>If you have questions about this decision, please speak with your manager or contact HR.</p>

<p>Best regards,<br>
<strong>HR Team</strong><br>
{{companyName}}</p>`,
    variables: [
      { name: 'firstName', description: 'Employee first name', required: true },
      { name: 'leaveType', description: 'Type of leave', required: true },
      { name: 'startDate', description: 'Leave start date', required: true },
      { name: 'endDate', description: 'Leave end date', required: true },
      { name: 'approverName', description: 'Name of reviewer', required: true },
      { name: 'reason', description: 'Rejection reason', required: false },
      { name: 'companyName', description: 'Company name', required: true },
    ],
    isDefault: true,
  },

  // ============================================================================
  // PROJECT CATEGORY
  // ============================================================================
  {
    name: 'task-assigned',
    displayName: 'Task Assigned',
    category: 'PROJECT',
    description: 'Sent when a task is assigned to an employee',
    subject: 'New Task Assigned: {{taskTitle}}',
    htmlContent: `<h2>New Task Assigned</h2>

<p>Dear {{firstName}},</p>

<p>A new task has been assigned to you in the <strong>{{projectName}}</strong> project.</p>

<div class="info-box">
  <p><strong>Task Details:</strong></p>
  <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
    <tr>
      <td style="padding: 8px 0; color: #718096; width: 140px;">Task:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{taskTitle}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">Project:</td>
      <td style="padding: 8px 0; color: #1a202c;">{{projectName}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">Priority:</td>
      <td style="padding: 8px 0; color: #1a202c;">{{priority}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">Due Date:</td>
      <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">{{dueDate}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #718096;">Assigned By:</td>
      <td style="padding: 8px 0; color: #1a202c;">{{assignedBy}}</td>
    </tr>
  </table>
</div>

{{#if description}}
<p><strong>Description:</strong></p>
<p style="background: #f7fafc; padding: 15px; border-radius: 4px;">{{description}}</p>
{{/if}}

<a href="{{taskUrl}}" class="button">View Task Details</a>

<p>Please review the task requirements and update the status as you progress.</p>

<p>Best regards,<br>
<strong>{{companyName}} Team</strong></p>`,
    variables: [
      { name: 'firstName', description: 'Employee first name', required: true },
      { name: 'taskTitle', description: 'Task title', required: true },
      { name: 'projectName', description: 'Project name', required: true },
      { name: 'priority', description: 'Task priority', required: true },
      { name: 'dueDate', description: 'Task due date', required: true },
      { name: 'assignedBy', description: 'Name of person assigning', required: true },
      { name: 'description', description: 'Task description', required: false },
      { name: 'taskUrl', description: 'URL to view task', required: true },
      { name: 'companyName', description: 'Company name', required: true },
    ],
    isDefault: true,
  },

  // ============================================================================
  // CUSTOM CATEGORY
  // ============================================================================
  {
    name: 'custom-message',
    displayName: 'Custom Message',
    category: 'CUSTOM',
    description: 'Generic template for custom messages',
    subject: '{{subject}}',
    htmlContent: `<h2>{{title}}</h2>

<p>Dear {{recipientName}},</p>

{{{messageBody}}}

{{#if ctaUrl}}
<a href="{{ctaUrl}}" class="button">{{ctaText}}</a>
{{/if}}

<p>Best regards,<br>
<strong>{{senderName}}</strong><br>
{{companyName}}</p>`,
    variables: [
      { name: 'subject', description: 'Email subject line', required: true },
      { name: 'title', description: 'Email heading', required: true },
      { name: 'recipientName', description: 'Recipient name', required: true },
      { name: 'messageBody', description: 'Main message content (HTML allowed)', required: true },
      { name: 'ctaUrl', description: 'Call-to-action button URL', required: false },
      { name: 'ctaText', description: 'Call-to-action button text', required: false },
      { name: 'senderName', description: 'Sender name', required: true },
      { name: 'companyName', description: 'Company name', required: true },
    ],
    isDefault: true,
  },

  // ============================================================================
  // BASE TEMPLATE
  // ============================================================================
  {
    name: 'base',
    displayName: 'Base Template',
    category: 'SYSTEM',
    description: 'Base wrapper template for all emails',
    subject: '{{subject}}',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
      margin-bottom: 20px;
    }
    .header img {
      max-height: 50px;
      max-width: 200px;
    }
    .header h1 {
      color: #2563eb;
      margin: 10px 0 0 0;
      font-size: 24px;
    }
    h2 {
      color: #1a202c;
      margin-top: 0;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 15px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .info-box {
      background-color: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      padding: 15px;
      margin: 15px 0;
    }
    .success-box {
      background-color: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 6px;
      padding: 15px;
      margin: 15px 0;
    }
    .warning-box {
      background-color: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 6px;
      padding: 15px;
      margin: 15px 0;
    }
    .divider {
      border-top: 1px solid #e5e7eb;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #eee;
      margin-top: 30px;
      font-size: 12px;
      color: #6b7280;
    }
    a {
      color: #2563eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if companyLogo}}
      <img src="{{companyLogo}}" alt="{{companyName}}" />
      {{else}}
      <h1>{{companyName}}</h1>
      {{/if}}
    </div>
    
    {{{body}}}
    
    <div class="footer">
      <p>© {{year}} {{companyName}}. All rights reserved.</p>
      {{#if portalUrl}}
      <p><a href="{{portalUrl}}">Visit Employee Portal</a></p>
      {{/if}}
    </div>
  </div>
</body>
</html>`,
    variables: [
      { name: 'subject', description: 'Email subject', required: true },
      { name: 'body', description: 'Main email content', required: true },
      { name: 'companyName', description: 'Company name', required: true },
      { name: 'companyLogo', description: 'Company logo URL', required: false },
      { name: 'portalUrl', description: 'Portal URL', required: false },
      { name: 'year', description: 'Current year', required: false },
    ],
    isDefault: true,
  },
];

/**
 * Main seed function
 */
async function seedEmailTemplates(tenantSlug: string) {
  console.log(`\n🌱 Seeding email templates for tenant: ${tenantSlug}\n`);
  
  try {
    const prisma = await getTenantPrisma(tenantSlug);
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const template of defaultTemplates) {
      const existing = await prisma.emailTemplate.findUnique({
        where: { name: template.name },
      });
      
      if (existing) {
        if (existing.isDefault) {
          // Update default templates
          await prisma.emailTemplate.update({
            where: { id: existing.id },
            data: {
              displayName: template.displayName,
              category: template.category as any,
              description: template.description,
              subject: template.subject,
              htmlContent: template.htmlContent,
              variables: template.variables,
              updatedBy: 'system',
            },
          });
          updated++;
          console.log(`  ✓ Updated: ${template.displayName}`);
        } else {
          skipped++;
          console.log(`  - Skipped (customized): ${template.displayName}`);
        }
      } else {
        await prisma.emailTemplate.create({
          data: {
            name: template.name,
            displayName: template.displayName,
            category: template.category as any,
            description: template.description,
            subject: template.subject,
            htmlContent: template.htmlContent,
            variables: template.variables,
            isActive: true,
            isDefault: template.isDefault ?? true,
            createdBy: 'system',
            updatedBy: 'system',
          },
        });
        created++;
        console.log(`  + Created: ${template.displayName}`);
      }
    }
    
    console.log(`\n✅ Seeding complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total templates: ${defaultTemplates.length}\n`);
    
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    throw error;
  }
}

// Run if called directly
const tenantSlug = process.argv[2];

if (!tenantSlug) {
  console.error('Usage: npx ts-node scripts/seed-email-templates.ts <tenant-slug>');
  process.exit(1);
}

seedEmailTemplates(tenantSlug)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

// Export for programmatic use
export { seedEmailTemplates, defaultTemplates };
