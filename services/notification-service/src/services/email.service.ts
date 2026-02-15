/**
 * Email Service - Email notification handling
 */

import { SESClient, SendEmailCommand, SendBulkTemplatedEmailCommand } from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';
import { config, NotificationType } from '../config';
import { renderTemplate as renderEmailTemplate, EmailTemplateName } from './template.service';
import { getMasterPrisma } from '@oms/database';

// ============================================================================
// TYPES
// ============================================================================

export interface EmailRecipient {
  email: string;
  name?: string;
  data?: Record<string, any>;
}

export interface SendEmailInput {
  to: EmailRecipient | EmailRecipient[];
  subject?: string; // Optional if using templateName
  template?: string; // Legacy template path
  templateName?: EmailTemplateName; // New: Use predefined template
  html?: string;
  text?: string;
  data?: Record<string, any>;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
  emailType?: 'platform' | 'tenant'; // Determines which email config to use
  fromEmail?: string; // Override from email
  fromName?: string; // Override from name
  priority?: 'high' | 'normal' | 'low';
  useQueue?: boolean; // Whether to use queue for sending
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// EMAIL CLIENT SETUP
// ============================================================================

let sesClient: SESClient | null = null;
let smtpTransportPlatform: nodemailer.Transporter | null = null;
let smtpTransportTenant: nodemailer.Transporter | null = null;

function getSESClient(): SESClient {
  if (!sesClient) {
    sesClient = new SESClient({ region: config.aws.region });
  }
  return sesClient;
}

function getSMTPTransport(emailType: 'platform' | 'tenant' = 'tenant'): nodemailer.Transporter {
  if (emailType === 'platform') {
    if (!smtpTransportPlatform) {
      smtpTransportPlatform = nodemailer.createTransport({
        host: config.email.platform.smtp.host,
        port: config.email.platform.smtp.port,
        secure: config.email.platform.smtp.secure,
        auth: config.email.platform.smtp.auth.user ? config.email.platform.smtp.auth : undefined,
      });
    }
    return smtpTransportPlatform;
  } else {
    if (!smtpTransportTenant) {
      smtpTransportTenant = nodemailer.createTransport({
        host: config.email.tenant.smtp.host,
        port: config.email.tenant.smtp.port,
        secure: config.email.tenant.smtp.secure,
        auth: config.email.tenant.smtp.auth.user ? config.email.tenant.smtp.auth : undefined,
      });
    }
    return smtpTransportTenant;
  }
}

// ============================================================================
// TEMPLATE HANDLING
// ============================================================================

const templateCache = new Map<string, Handlebars.TemplateDelegate>();

function getTemplate(templateName: string): Handlebars.TemplateDelegate | null {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }
  
  const templatePath = join(config.templates.basePath, `${templateName}.hbs`);
  
  if (!existsSync(templatePath)) {
    logger.warn({ templateName, templatePath }, 'Email template not found');
    return null;
  }
  
  try {
    const source = readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(source);
    templateCache.set(templateName, template);
    return template;
  } catch (error) {
    logger.error({ templateName, error }, 'Failed to compile template');
    return null;
  }
}

function renderTemplate(templateName: string, data: Record<string, any>): { html: string; text?: string } {
  const htmlTemplate = getTemplate(templateName);
  const textTemplate = getTemplate(`${templateName}.text`);
  
  const html = htmlTemplate ? htmlTemplate(data) : getDefaultTemplate(data);
  const text = textTemplate ? textTemplate(data) : undefined;
  
  return { html, text };
}

function getDefaultTemplate(data: Record<string, any>): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${data.title || 'Notification'}</h1>
        </div>
        <div class="content">
          ${data.body || data.message || ''}
          ${data.actionUrl ? `<p><a href="${data.actionUrl}" class="button">${data.actionText || 'View Details'}</a></p>` : ''}
        </div>
        <div class="footer">
          <p>Office Management System</p>
          <p>This is an automated message. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// EMAIL SENDING
// ============================================================================

/**
 * Send email via SMTP
 */
async function sendViaSMTP(input: SendEmailInput): Promise<EmailResult[]> {
  const emailType = input.emailType || 'tenant';
  const transport = getSMTPTransport(emailType);
  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const results: EmailResult[] = [];
  
  // Determine from email and name based on email type
  const emailConfig = emailType === 'platform' ? config.email.platform : config.email.tenant;
  const fromEmail = input.fromEmail || emailConfig.fromEmail;
  const fromName = input.fromName || emailConfig.fromName;
  
  for (const recipient of recipients) {
    try {
      let html = input.html;
      let text = input.text;
      let subject = input.subject || 'Notification';
      
      // Use new template system if templateName is provided
      if (input.templateName) {
        const mergedData = { ...input.data, ...recipient.data };
        const rendered = renderEmailTemplate(input.templateName, mergedData, emailType);
        if (rendered) {
          html = rendered.html;
          text = rendered.text;
          subject = rendered.subject;
        }
      } else if (input.template) {
        // Legacy template support
        const mergedData = { ...input.data, ...recipient.data };
        const rendered = renderTemplate(input.template, mergedData);
        html = rendered.html;
        text = rendered.text;
      }
      
      const info = await transport.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: recipient.name ? `"${recipient.name}" <${recipient.email}>` : recipient.email,
        subject,
        html,
        text,
        replyTo: input.replyTo,
        cc: input.cc,
        bcc: input.bcc,
        attachments: input.attachments,
        priority: input.priority || 'normal',
      });
      
      results.push({ success: true, messageId: info.messageId });
      
      logger.debug({ to: recipient.email, messageId: info.messageId, emailType }, 'Email sent via SMTP');
    } catch (error: any) {
      logger.error({ to: recipient.email, error: error.message, emailType }, 'Failed to send email via SMTP');
      results.push({ success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Send email via AWS SES
 */
async function sendViaSES(input: SendEmailInput): Promise<EmailResult[]> {
  const ses = getSESClient();
  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const results: EmailResult[] = [];
  
  for (const recipient of recipients) {
    try {
      let html = input.html;
      let text = input.text;
      
      if (input.template) {
        const mergedData = { ...input.data, ...recipient.data };
        const rendered = renderTemplate(input.template, mergedData);
        html = rendered.html;
        text = rendered.text;
      }
      
      const command = new SendEmailCommand({
        Source: `${config.aws.sesFromName} <${config.aws.sesFromEmail}>`,
        Destination: {
          ToAddresses: [recipient.email],
          CcAddresses: input.cc,
          BccAddresses: input.bcc,
        },
        Message: {
          Subject: { Data: input.subject, Charset: 'UTF-8' },
          Body: {
            Html: html ? { Data: html, Charset: 'UTF-8' } : undefined,
            Text: text ? { Data: text, Charset: 'UTF-8' } : undefined,
          },
        },
        ReplyToAddresses: input.replyTo ? [input.replyTo] : undefined,
      });
      
      const response = await ses.send(command);
      
      results.push({ success: true, messageId: response.MessageId });
      
      logger.debug({ to: recipient.email, messageId: response.MessageId }, 'Email sent via SES');
    } catch (error: any) {
      logger.error({ to: recipient.email, error: error.message }, 'Failed to send email via SES');
      results.push({ success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Send email using configured provider
 */
export async function sendEmail(input: SendEmailInput): Promise<EmailResult[]> {
  if (config.email.provider === 'ses') {
    return sendViaSES(input);
  }
  return sendViaSMTP(input);
}

/**
 * Send bulk emails with rate limiting
 */
export async function sendBulkEmails(
  inputs: SendEmailInput[],
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number; results: EmailResult[] }> {
  const results: EmailResult[] = [];
  let sent = 0;
  let failed = 0;
  
  // Process in batches
  const batches = [];
  for (let i = 0; i < inputs.length; i += config.email.batchSize) {
    batches.push(inputs.slice(i, i + config.email.batchSize));
  }
  
  for (const batch of batches) {
    const batchPromises = batch.map(input => sendEmail(input));
    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults.flat()) {
      results.push(result);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }
    
    onProgress?.(sent + failed, inputs.length);
    
    // Rate limiting delay
    if (config.email.provider === 'ses') {
      await new Promise(resolve => 
        setTimeout(resolve, (batch.length / config.email.rateLimitPerSecond) * 1000)
      );
    }
  }
  
  logger.info({ sent, failed, total: inputs.length }, 'Bulk email completed');
  
  return { sent, failed, results };
}

/**
 * Send notification email by type
 */
export async function sendNotificationEmail(
  type: NotificationType,
  recipient: EmailRecipient,
  data: Record<string, any>
): Promise<EmailResult> {
  const subjectMap: Record<NotificationType, string> = {
    'task.assigned': `Task Assigned: ${data.taskNumber || data.taskTitle || 'New Task'}`,
    'task.mentioned': `You were mentioned in ${data.taskNumber || 'a task'}`,
    'task.commented': `New comment on ${data.taskNumber || 'a task'}`,
    'task.status_changed': `Task ${data.taskNumber || ''} status changed to ${data.newStatus || 'updated'}`,
    'task.due_soon': `Task ${data.taskNumber || ''} is due soon`,
    'task.overdue': `Task ${data.taskNumber || ''} is overdue`,
    'leave.requested': 'New Leave Request',
    'leave.approved': 'Your Leave Request was Approved',
    'leave.rejected': 'Your Leave Request was Rejected',
    'leave.cancelled': 'Leave Request Cancelled',
    'attendance.reminder': 'Attendance Reminder',
    'attendance.missed': 'Missed Attendance Alert',
    'project.added': `You've been added to project: ${data.projectName || 'New Project'}`,
    'project.milestone': `Milestone reached: ${data.milestoneName || 'Project Milestone'}`,
    'timesheet.reminder': 'Timesheet Submission Reminder',
    'timesheet.approved': 'Your Timesheet was Approved',
    'timesheet.rejected': 'Your Timesheet was Rejected',
    'system.announcement': data.title || 'System Announcement',
    'system.maintenance': 'Scheduled Maintenance Notice',
    'employee.onboarded': `Welcome ${data.employeeName || ''} to the team!`,
    'employee.birthday': `🎂 Happy Birthday ${data.employeeName || ''}!`,
    'employee.anniversary': `🎉 Work Anniversary: ${data.employeeName || ''}`,
  };
  
  const subject = subjectMap[type] || 'Notification';
  
  const results = await sendEmail({
    to: recipient,
    subject,
    template: type.replace('.', '/'),
    data: { ...data, notificationType: type },
  });
  
  return results[0];
}

/**
 * Verify SMTP connection
 */
export async function verifyEmailConnection(): Promise<boolean> {
  if (config.email.provider === 'smtp') {
    try {
      const transport = getSMTPTransport('tenant');
      await transport.verify();
      logger.info('SMTP connection verified');
      return true;
    } catch (error) {
      logger.error({ error }, 'SMTP connection failed');
      return false;
    }
  }
  
  // For SES, we assume it's configured correctly
  return true;
}

/**
 * Send email to multiple recipients (bulk send)
 */
export async function sendBulkEmail(
  recipients: EmailRecipient[],
  input: Omit<SendEmailInput, 'to'>
): Promise<{
  sent: number;
  failed: number;
  results: EmailResult[];
}> {
  const results: EmailResult[] = [];
  let sent = 0;
  let failed = 0;
  
  // Process in batches
  const batches = [];
  for (let i = 0; i < recipients.length; i += config.email.batchSize) {
    batches.push(recipients.slice(i, i + config.email.batchSize));
  }
  
  for (const batch of batches) {
    const batchPromises = batch.map(recipient =>
      sendEmail({ ...input, to: recipient })
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults.flat()) {
      results.push(result);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }
    
    // Rate limiting delay
    if (config.email.provider === 'ses' && batches.length > 1) {
      await new Promise(resolve =>
        setTimeout(resolve, (batch.length / config.email.rateLimitPerSecond) * 1000)
      );
    }
  }
  
  logger.info({ sent, failed, total: recipients.length }, 'Bulk email completed');
  
  return { sent, failed, results };
}

/**
 * Send templated email (convenience function)
 */
export async function sendTemplatedEmail(
  to: EmailRecipient | EmailRecipient[],
  templateName: EmailTemplateName,
  data: Record<string, any>,
  options: {
    emailType?: 'platform' | 'tenant';
    priority?: 'high' | 'normal' | 'low';
    useQueue?: boolean;
  } = {}
): Promise<EmailResult[]> {
  return sendEmail({
    to,
    templateName,
    data,
    emailType: options.emailType || 'tenant',
    priority: options.priority,
    useQueue: options.useQueue,
  });
}

// ============================================================================
// TENANT-SPECIFIC EMAIL (uses organization's SMTP settings from database)
// ============================================================================

export interface TenantEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
}

export interface TenantSmtpSettings {
  smtpHost: string | null;
  smtpPort: number;
  smtpUsername: string | null;
  smtpPassword: string | null;
  smtpEncryption: string;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  emailConfigured: boolean;
}

/**
 * Send email using tenant's configured SMTP settings from the database
 */
export async function sendTenantEmail(
  tenantSlug: string,
  input: TenantEmailInput
): Promise<EmailResult> {
  try {
    // Get master prisma to get tenant settings
    const masterPrisma = await getMasterPrisma();
    
    // Get tenant and their settings
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: {
        settings: true,
      },
    });
    
    if (!tenant) {
      logger.error({ tenantSlug }, 'Tenant not found');
      return { success: false, error: 'Tenant not found' };
    }
    
    const settings = tenant.settings;
    
    if (!settings) {
      logger.warn({ tenantSlug }, 'Tenant settings not found, using default SMTP');
      // Fall back to default SMTP
      return sendWithDefaultSmtp(input);
    }
    
    // Check if tenant has configured their own SMTP
    if (!settings.emailConfigured || !settings.smtpHost) {
      logger.info({ tenantSlug }, 'Tenant SMTP not configured, using default SMTP');
      return sendWithDefaultSmtp(input);
    }
    
    // Create a transporter with tenant's SMTP settings
    const transport = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpEncryption === 'ssl',
      auth: settings.smtpUsername ? {
        user: settings.smtpUsername,
        pass: settings.smtpPassword || '',
      } : undefined,
      tls: settings.smtpEncryption === 'tls' ? {
        rejectUnauthorized: false,
      } : undefined,
    });
    
    const fromEmail = input.fromEmail || settings.smtpFromEmail || config.email.tenant.fromEmail;
    const fromName = input.fromName || settings.smtpFromName || settings.smtpFromEmail?.split('@')[0] || config.email.tenant.fromName;
    
    logger.info({ 
      tenantSlug, 
      to: input.to, 
      subject: input.subject,
      smtpHost: settings.smtpHost,
      fromEmail,
    }, 'Sending email using tenant SMTP configuration');
    
    const info = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    
    logger.info({ tenantSlug, to: input.to, messageId: info.messageId }, 'Tenant email sent successfully');
    
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    logger.error({ tenantSlug, to: input.to, error: error.message }, 'Failed to send tenant email');
    return { success: false, error: error.message };
  }
}

/**
 * Send email using default SMTP configuration (from env variables)
 */
async function sendWithDefaultSmtp(input: TenantEmailInput): Promise<EmailResult> {
  try {
    const transport = getSMTPTransport('tenant');
    const fromEmail = input.fromEmail || config.email.tenant.fromEmail;
    const fromName = input.fromName || config.email.tenant.fromName;
    
    const info = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    logger.error({ to: input.to, error: error.message }, 'Failed to send email with default SMTP');
    return { success: false, error: error.message };
  }
}
