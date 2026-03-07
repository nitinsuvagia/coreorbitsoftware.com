/**
 * Platform Email Utility
 * Sends emails using SMTP settings from platform_settings table in the database.
 * This ensures Platform Admin email configuration (set via Settings > Email tab) is used.
 */

import nodemailer from 'nodemailer';
import { getMasterPrisma } from './database';
import { logger } from './logger';

interface PlatformEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface PlatformEmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  encryption: string;
  fromEmail: string;
  fromName: string;
}

/**
 * Load platform email settings from the database
 */
async function getPlatformEmailConfig(): Promise<PlatformEmailConfig | null> {
  try {
    const prisma = getMasterPrisma();
    const settings = await prisma.platformSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) return null;

    const emailConfig = settings.email as any;
    if (!emailConfig?.smtpHost || !emailConfig?.smtpUsername) return null;

    return {
      smtpHost: emailConfig.smtpHost,
      smtpPort: emailConfig.smtpPort || 587,
      smtpUsername: emailConfig.smtpUsername,
      smtpPassword: emailConfig.smtpPassword,
      encryption: emailConfig.encryption || 'tls',
      fromEmail: emailConfig.fromEmail || emailConfig.smtpUsername,
      fromName: emailConfig.fromName || 'Office Management System',
    };
  } catch (error) {
    logger.error({ error }, 'Failed to load platform email config from DB');
    return null;
  }
}

/**
 * Send an email using platform SMTP settings from the database
 */
export async function sendPlatformEmail(options: PlatformEmailOptions): Promise<boolean> {
  const emailConfig = await getPlatformEmailConfig();

  if (!emailConfig) {
    logger.warn('Platform email not configured in Settings > Email. Cannot send email.');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      secure: emailConfig.encryption === 'ssl',
      auth: {
        user: emailConfig.smtpUsername,
        pass: emailConfig.smtpPassword,
      },
    });

    await transporter.sendMail({
      from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info({ to: options.to, subject: options.subject }, 'Platform email sent successfully');
    return true;
  } catch (error) {
    logger.error({ error, to: options.to }, 'Failed to send platform email');
    return false;
  }
}
