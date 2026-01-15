/**
 * Platform Settings Routes - API endpoints for platform-wide configuration
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getMasterPrisma } from '@oms/database';
import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';
import * as backupService from '../services/backup.service';
import { clearMaintenanceCache } from '../middleware';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const generalSettingsSchema = z.object({
  platformName: z.string().min(1).max(100),
  primaryDomain: z.string().min(1).max(255),
  supportEmail: z.string().email(),
  defaultTimezone: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});

const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUsername: z.string().min(1),
  smtpPassword: z.string().min(1),
  fromEmail: z.string().email(),
  fromName: z.string().min(1).max(100),
  encryption: z.enum(['none', 'tls', 'ssl']).default('tls'),
});

const securitySettingsSchema = z.object({
  requireMfaForAdmins: z.boolean(),
  sessionTimeoutMinutes: z.number().int().min(5).max(1440),
  ipAllowlistEnabled: z.boolean(),
  ipAllowlist: z.array(z.string()).optional(),
  passwordMinLength: z.number().int().min(6).max(32),
  passwordRequireUppercase: z.boolean(),
  passwordRequireNumbers: z.boolean(),
  passwordRequireSymbols: z.boolean(),
  maxLoginAttempts: z.number().int().min(3).max(10),
  lockoutDurationMinutes: z.number().int().min(5).max(1440),
});

const billingSettingsSchema = z.object({
  stripePublishableKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  defaultCurrency: z.string().length(3),
  taxEnabled: z.boolean(),
  defaultTaxRate: z.number().min(0).max(100),
});

const integrationSettingsSchema = z.object({
  slack: z.object({
    enabled: z.boolean(),
    webhookUrl: z.string().optional(),
    botToken: z.string().optional(),
  }).optional(),
  aws: z.object({
    enabled: z.boolean(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    region: z.string().optional(),
    s3Bucket: z.string().optional(),
  }).optional(),
  googleAnalytics: z.object({
    enabled: z.boolean(),
    trackingId: z.string().optional(),
  }).optional(),
  sentry: z.object({
    enabled: z.boolean(),
    dsn: z.string().optional(),
  }).optional(),
});

const maintenanceSettingsSchema = z.object({
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(500).optional(),
  scheduledMaintenanceAt: z.string().datetime().optional().nullable(),
  scheduledMaintenanceEndAt: z.string().datetime().optional().nullable(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Default settings values
const defaultSettings = {
  general: {
    platformName: 'Office Management System',
    primaryDomain: 'localhost:3000',
    supportEmail: 'support@oms.local',
    defaultTimezone: 'UTC',
    description: 'Enterprise SaaS Office Management System',
  },
  email: {
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    fromEmail: 'noreply@oms.local',
    fromName: 'Office Management',
    encryption: 'tls',
    configured: false,
  },
  security: {
    requireMfaForAdmins: false,
    sessionTimeoutMinutes: 60,
    ipAllowlistEnabled: false,
    ipAllowlist: [],
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: false,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
  },
  billing: {
    stripeConfigured: false,
    defaultCurrency: 'USD',
    taxEnabled: false,
    defaultTaxRate: 0,
  },
  integrations: {
    slack: { enabled: false },
    aws: { enabled: false },
    googleAnalytics: { enabled: false },
    sentry: { enabled: false },
  },
  maintenance: {
    maintenanceMode: false,
    maintenanceMessage: '',
    scheduledMaintenanceAt: null,
    scheduledMaintenanceEndAt: null,
  },
};

async function getOrCreateSettings() {
  const masterPrisma = getMasterPrisma();
  
  try {
    // Try to find existing settings using Prisma
    let settings = await masterPrisma.platformSettings.findUnique({
      where: { id: 'default' }
    });
    
    if (!settings) {
      // Create default settings record
      settings = await masterPrisma.platformSettings.create({
        data: {
          id: 'default',
          general: defaultSettings.general,
          email: defaultSettings.email,
          security: defaultSettings.security,
          billing: defaultSettings.billing,
          integrations: defaultSettings.integrations,
          maintenance: defaultSettings.maintenance,
        }
      });
      logger.info('Created default platform settings');
    }
    
    // Merge with defaults to ensure all fields exist
    return {
      general: { ...defaultSettings.general, ...(settings.general as any || {}) },
      email: { ...defaultSettings.email, ...(settings.email as any || {}) },
      security: { ...defaultSettings.security, ...(settings.security as any || {}) },
      billing: { ...defaultSettings.billing, ...(settings.billing as any || {}) },
      integrations: { ...defaultSettings.integrations, ...(settings.integrations as any || {}) },
      maintenance: { ...defaultSettings.maintenance, ...(settings.maintenance as any || {}) },
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get/create platform settings');
    return { ...defaultSettings };
  }
}

function getDefaultSettings() {
  return { ...defaultSettings };
}

async function saveSettings(section: string, data: any) {
  const masterPrisma = getMasterPrisma();
  
  try {
    // Get current settings
    const currentSettings = await getOrCreateSettings();
    
    // Merge the new data with existing section data
    const updatedSectionData = { ...(currentSettings as any)[section], ...data };
    
    // Update using Prisma upsert
    const updated = await masterPrisma.platformSettings.upsert({
      where: { id: 'default' },
      update: {
        [section]: updatedSectionData,
        updatedAt: new Date(),
      },
      create: {
        id: 'default',
        general: section === 'general' ? updatedSectionData : defaultSettings.general,
        email: section === 'email' ? updatedSectionData : defaultSettings.email,
        security: section === 'security' ? updatedSectionData : defaultSettings.security,
        billing: section === 'billing' ? updatedSectionData : defaultSettings.billing,
        integrations: section === 'integrations' ? updatedSectionData : defaultSettings.integrations,
        maintenance: section === 'maintenance' ? updatedSectionData : defaultSettings.maintenance,
      }
    });
    
    logger.info({ section }, 'Platform settings updated successfully');
    return (updated as any)[section];
  } catch (error) {
    logger.error({ error, section }, 'Failed to save platform settings');
    throw error;
  }
}

// ============================================================================
// ROUTES
// ============================================================================

// Get all platform settings
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    
    // Mask sensitive data
    const maskedSettings = { ...settings };
    if (maskedSettings.email?.smtpPassword) {
      maskedSettings.email.smtpPassword = '••••••••';
    }
    if (maskedSettings.billing?.stripeSecretKey) {
      maskedSettings.billing.stripeSecretKey = maskedSettings.billing.stripeSecretKey.substring(0, 12) + '••••••••';
    }
    if (maskedSettings.billing?.stripeWebhookSecret) {
      maskedSettings.billing.stripeWebhookSecret = '••••••••';
    }
    
    res.json({ success: true, data: maskedSettings });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get platform settings');
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// Get general settings
router.get('/general', async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ success: true, data: settings.general });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get general settings');
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// Update general settings
router.put('/general', async (req: Request, res: Response) => {
  try {
    const parsed = generalSettingsSchema.parse(req.body);
    const updated = await saveSettings('general', parsed);
    
    logger.info({ adminId: req.headers['x-user-id'] }, 'General settings updated');
    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ success: false, error: messages });
    }
    logger.error({ error }, 'Failed to update general settings');
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// Get email settings
router.get('/email', async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    const emailSettings = { ...settings.email };
    if (emailSettings.smtpPassword) {
      emailSettings.smtpPassword = '••••••••';
    }
    res.json({ success: true, data: emailSettings });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get email settings');
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// Update email settings
router.put('/email', async (req: Request, res: Response) => {
  try {
    const parsed = emailSettingsSchema.parse(req.body);
    const updated = await saveSettings('email', { ...parsed, configured: true });
    
    logger.info({ adminId: req.headers['x-user-id'] }, 'Email settings updated');
    res.json({ success: true, data: { ...updated, smtpPassword: '••••••••' } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ success: false, error: messages });
    }
    logger.error({ error }, 'Failed to update email settings');
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// Test email configuration
router.post('/email/test', async (req: Request, res: Response) => {
  try {
    const { testEmail } = req.body;
    if (!testEmail) {
      return res.status(400).json({ success: false, error: 'Test email address required' });
    }
    
    const settings = await getOrCreateSettings();
    const emailConfig = settings.email;
    
    if (!emailConfig.smtpHost || !emailConfig.smtpUsername) {
      return res.status(400).json({ success: false, error: 'Email not configured' });
    }
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      secure: emailConfig.encryption === 'ssl',
      auth: {
        user: emailConfig.smtpUsername,
        pass: emailConfig.smtpPassword,
      },
    });
    
    // Send test email
    await transporter.sendMail({
      from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
      to: testEmail,
      subject: 'OMS - Test Email Configuration',
      text: 'This is a test email from Office Management System. Your email configuration is working correctly!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email</h2>
          <p>This is a test email from <strong>Office Management System</strong>.</p>
          <p>Your email configuration is working correctly!</p>
          <hr />
          <p style="color: #666; font-size: 12px;">
            Sent from OMS Platform Admin
          </p>
        </div>
      `,
    });
    
    logger.info({ testEmail, adminId: req.headers['x-user-id'] }, 'Test email sent successfully');
    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (error: any) {
    logger.error({ error }, 'Failed to send test email');
    res.status(500).json({ success: false, error: error.message || 'Failed to send test email' });
  }
});

// Get security settings
router.get('/security', async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ success: true, data: settings.security });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get security settings');
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// Update security settings
router.put('/security', async (req: Request, res: Response) => {
  try {
    const parsed = securitySettingsSchema.parse(req.body);
    const updated = await saveSettings('security', parsed);
    
    logger.info({ adminId: req.headers['x-user-id'] }, 'Security settings updated');
    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ success: false, error: messages });
    }
    logger.error({ error }, 'Failed to update security settings');
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// Get billing settings
router.get('/billing', async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    const billingSettings = { ...settings.billing };
    if (billingSettings.stripeSecretKey) {
      billingSettings.stripeSecretKey = billingSettings.stripeSecretKey.substring(0, 12) + '••••••••';
    }
    if (billingSettings.stripeWebhookSecret) {
      billingSettings.stripeWebhookSecret = '••••••••';
    }
    res.json({ success: true, data: billingSettings });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get billing settings');
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// Update billing settings
router.put('/billing', async (req: Request, res: Response) => {
  try {
    const parsed = billingSettingsSchema.parse(req.body);
    const updated = await saveSettings('billing', { 
      ...parsed, 
      stripeConfigured: !!(parsed.stripePublishableKey && parsed.stripeSecretKey) 
    });
    
    logger.info({ adminId: req.headers['x-user-id'] }, 'Billing settings updated');
    
    // Mask sensitive data in response
    const response = { ...updated };
    if (response.stripeSecretKey) {
      response.stripeSecretKey = response.stripeSecretKey.substring(0, 12) + '••••••••';
    }
    if (response.stripeWebhookSecret) {
      response.stripeWebhookSecret = '••••••••';
    }
    
    res.json({ success: true, data: response });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ success: false, error: messages });
    }
    logger.error({ error }, 'Failed to update billing settings');
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// Get integration settings
router.get('/integrations', async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    // Mask sensitive data
    const integrations = { ...settings.integrations };
    if (integrations.aws?.secretAccessKey) {
      integrations.aws.secretAccessKey = '••••••••';
    }
    if (integrations.slack?.botToken) {
      integrations.slack.botToken = '••••••••';
    }
    res.json({ success: true, data: integrations });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get integration settings');
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// Update integration settings
router.put('/integrations', async (req: Request, res: Response) => {
  try {
    const parsed = integrationSettingsSchema.parse(req.body);
    const updated = await saveSettings('integrations', parsed);
    
    logger.info({ adminId: req.headers['x-user-id'] }, 'Integration settings updated');
    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ success: false, error: messages });
    }
    logger.error({ error }, 'Failed to update integration settings');
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// Test Slack integration
router.post('/integrations/slack/test', async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    const slackConfig = settings.integrations?.slack;
    
    if (!slackConfig?.enabled || !slackConfig?.webhookUrl) {
      return res.status(400).json({ success: false, error: 'Slack not configured' });
    }
    
    // Send test message to Slack
    const response = await fetch(slackConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '✅ OMS Platform - Slack integration test successful!',
      }),
    });
    
    if (!response.ok) {
      throw new Error('Slack webhook failed');
    }
    
    res.json({ success: true, message: 'Test message sent to Slack' });
  } catch (error: any) {
    logger.error({ error }, 'Failed to test Slack integration');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get maintenance settings
router.get('/maintenance', async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ success: true, data: settings.maintenance });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get maintenance settings');
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// Update maintenance settings
router.put('/maintenance', async (req: Request, res: Response) => {
  try {
    const parsed = maintenanceSettingsSchema.parse(req.body);
    const updated = await saveSettings('maintenance', parsed);
    
    // Clear the maintenance cache so changes take effect immediately
    clearMaintenanceCache();
    
    logger.info({ 
      adminId: req.headers['x-user-id'],
      maintenanceMode: parsed.maintenanceMode 
    }, 'Maintenance settings updated');
    
    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ success: false, error: messages });
    }
    logger.error({ error }, 'Failed to update maintenance settings');
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// Get database stats
router.get('/maintenance/database-stats', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    
    // Get database size
    const dbSize = await masterPrisma.$queryRaw<any[]>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    
    // Get table counts
    const tenantCount = await masterPrisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM tenants WHERE deleted_at IS NULL
    `;
    
    const adminCount = await masterPrisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM platform_admins WHERE deleted_at IS NULL
    `;
    
    const subscriptionCount = await masterPrisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM subscriptions
    `;
    
    res.json({
      success: true,
      data: {
        databaseSize: dbSize[0]?.size || 'Unknown',
        tenantCount: Number(tenantCount[0]?.count || 0),
        adminCount: Number(adminCount[0]?.count || 0),
        subscriptionCount: Number(subscriptionCount[0]?.count || 0),
        lastBackup: null, // Would come from backup system
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get database stats');
    res.status(500).json({ success: false, error: 'Failed to get database stats' });
  }
});

// Trigger manual backup
router.post('/maintenance/backup', async (req: Request, res: Response) => {
  try {
    const { destination = 'local' } = req.body;
    
    logger.info({ adminId: req.headers['x-user-id'], destination }, 'Manual backup requested');

    // Get AWS config from integration settings if using S3
    let awsConfig: { accessKeyId: string; secretAccessKey: string; region: string; s3Bucket: string } | undefined;
    
    if (destination === 's3') {
      const allSettings = await getOrCreateSettings();
      const integrations = allSettings.integrations || {};
      
      if (!integrations.aws?.enabled || !integrations.aws?.accessKeyId) {
        return res.status(400).json({ 
          success: false, 
          error: 'AWS integration is not configured. Please configure it in Integrations settings.' 
        });
      }
      
      awsConfig = {
        accessKeyId: integrations.aws.accessKeyId,
        secretAccessKey: integrations.aws.secretAccessKey,
        region: integrations.aws.region || 'us-east-1',
        s3Bucket: integrations.aws.s3Bucket,
      };
    }

    const backup = await backupService.createBackup(destination, 'manual', awsConfig);
    
    let downloadUrl: string | undefined;
    if (destination === 'local' && backup.status === 'completed') {
      downloadUrl = await backupService.getBackupDownloadUrl(backup.id);
    }

    res.json({ 
      success: true, 
      message: 'Backup completed successfully',
      data: {
        ...backup,
        downloadUrl,
      }
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to create backup');
    res.status(500).json({ success: false, error: error.message || 'Failed to create backup' });
  }
});

// Get backup history
router.get('/maintenance/backups', async (req: Request, res: Response) => {
  try {
    const history = backupService.getBackupHistory();
    res.json({ success: true, data: history });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get backup history');
    res.status(500).json({ success: false, error: 'Failed to get backup history' });
  }
});

// Get backup settings
router.get('/maintenance/backup-settings', async (req: Request, res: Response) => {
  try {
    const settings = backupService.getBackupSettings();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get backup settings');
    res.status(500).json({ success: false, error: 'Failed to get backup settings' });
  }
});

// Update backup settings
router.put('/maintenance/backup-settings', async (req: Request, res: Response) => {
  try {
    const settings = backupService.updateBackupSettings(req.body);
    logger.info({ settings }, 'Backup settings updated');
    res.json({ success: true, data: settings });
  } catch (error: any) {
    logger.error({ error }, 'Failed to update backup settings');
    res.status(500).json({ success: false, error: 'Failed to update backup settings' });
  }
});

// Get backup download URL
router.get('/maintenance/backups/:backupId/download', async (req: Request, res: Response) => {
  try {
    const { backupId } = req.params;
    
    // Get AWS config if needed
    const allSettings = await getOrCreateSettings();
    const integrations = allSettings.integrations || {};
    const awsConfig = integrations.aws?.enabled ? {
      accessKeyId: integrations.aws.accessKeyId,
      secretAccessKey: integrations.aws.secretAccessKey,
      region: integrations.aws.region || 'us-east-1',
      s3Bucket: integrations.aws.s3Bucket,
    } : undefined;

    const downloadUrl = await backupService.getBackupDownloadUrl(backupId, awsConfig);
    res.json({ success: true, data: { downloadUrl } });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get backup download URL');
    res.status(404).json({ success: false, error: error.message || 'Backup not found' });
  }
});

// Download local backup file
router.get('/maintenance/backups/download-file/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = backupService.getBackupFilePath(filename);
    
    if (!filePath) {
      return res.status(404).json({ success: false, error: 'Backup file not found' });
    }

    res.download(filePath, filename);
  } catch (error: any) {
    logger.error({ error }, 'Failed to download backup file');
    res.status(500).json({ success: false, error: 'Failed to download backup' });
  }
});

// Delete backup
router.delete('/maintenance/backups/:backupId', async (req: Request, res: Response) => {
  try {
    const { backupId } = req.params;
    
    // Get AWS config if needed
    const allSettings = await getOrCreateSettings();
    const integrations = allSettings.integrations || {};
    const awsConfig = integrations.aws?.enabled ? {
      accessKeyId: integrations.aws.accessKeyId,
      secretAccessKey: integrations.aws.secretAccessKey,
      region: integrations.aws.region || 'us-east-1',
      s3Bucket: integrations.aws.s3Bucket,
    } : undefined;

    await backupService.deleteBackup(backupId, awsConfig);
    res.json({ success: true, message: 'Backup deleted' });
  } catch (error: any) {
    logger.error({ error }, 'Failed to delete backup');
    res.status(500).json({ success: false, error: error.message || 'Failed to delete backup' });
  }
});

export default router;