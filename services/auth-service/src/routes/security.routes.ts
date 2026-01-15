/**
 * Security Routes - 2FA, Sessions, Account Management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import { getTenantDbManager } from '@oms/tenant-db-manager';
import { getMasterPrisma } from '../utils/database';
import { UAParser } from 'ua-parser-js';
import { config } from '../config';

// Notification service helper
async function sendNotificationEmail(email: string, subject: string, message: string, html?: string): Promise<boolean> {
  try {
    const response = await fetch(`${config.notificationServiceUrl}/api/v1/notifications/platform/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject,
        message,
        html: html || message.replace(/\n/g, '<br>'),
      }),
    });
    const result = await response.json();
    return result.success;
  } catch (error) {
    logger.error({ error, email }, 'Failed to send notification email');
    return false;
  }
}

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const verify2FASchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

const disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmation: z.literal('DELETE'),
});

// ============================================================================
// HELPERS
// ============================================================================

function parseUserAgent(userAgentStr: string) {
  const parser = new UAParser(userAgentStr);
  const result = parser.getResult();
  
  const device = result.device.vendor && result.device.model 
    ? `${result.device.vendor} ${result.device.model}`
    : result.os.name 
      ? `${result.os.name} ${result.os.version || ''}`
      : 'Unknown Device';
  
  const browser = result.browser.name
    ? `${result.browser.name} ${result.browser.major || ''}`
    : 'Unknown Browser';
  
  const deviceType = result.device.type || 'desktop';
  
  return { device: device.trim(), browser: browser.trim(), deviceType };
}

function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(code => bcrypt.hash(code, 10)));
}

// ============================================================================
// 2FA SETUP - Generate QR Code
// ============================================================================

router.post('/2fa/setup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id']?.toString();
    const userType = req.headers['x-user-type']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // Generate secret using speakeasy (base32 encoding for compatibility)
    const secretObj = speakeasy.generateSecret({
      name: 'Office Management',
      issuer: 'Office Management',
    });
    const secret = secretObj.base32;
    let email = '';
    let issuer = 'Office Management';

    if (userType === 'platform_admin') {
      const prisma = getMasterPrisma();
      const admin = await prisma.platformAdmin.findUnique({ where: { id: userId } });
      if (!admin) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }
      
      if (admin.mfaEnabled) {
        return res.status(400).json({
          success: false,
          error: { code: 'ALREADY_ENABLED', message: '2FA is already enabled' },
        });
      }
      
      email = admin.email;
      issuer = 'OMS Platform Admin';

      // Store pending secret temporarily (will be confirmed on verify)
      await prisma.platformAdmin.update({
        where: { id: userId },
        data: { mfaSecret: secret },
      });
    } else {
      if (!tenantSlug) {
        return res.status(400).json({
          success: false,
          error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' },
        });
      }

      const dbManager = getTenantDbManager();
      const prisma = await dbManager.getClientBySlug(tenantSlug);
      const user = await (prisma as any).user.findUnique({ where: { id: userId } });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      if (user.mfaEnabled) {
        return res.status(400).json({
          success: false,
          error: { code: 'ALREADY_ENABLED', message: '2FA is already enabled' },
        });
      }

      email = user.email;

      // Store pending secret
      await (prisma as any).user.update({
        where: { id: userId },
        data: { mfaSecret: secret },
      });
    }

    // Generate OTP Auth URL using speakeasy
    const otpauth = speakeasy.otpauthURL({
      secret: secret,
      label: email,
      issuer: issuer,
      encoding: 'base32',
    });
    
    // Generate QR Code
    const qrCode = await QRCode.toDataURL(otpauth);

    res.json({
      success: true,
      data: {
        qrCode,
        secret, // Also return secret for manual entry
        otpauth,
      },
    });
  } catch (error) {
    logger.error({ error }, '2FA setup error');
    next(error);
  }
});

// ============================================================================
// 2FA VERIFY - Enable 2FA after verifying code
// ============================================================================

router.post('/2fa/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = verify2FASchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
    }

    const userId = req.headers['x-user-id']?.toString();
    const userType = req.headers['x-user-type']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { code } = parsed.data;
    let backupCodes: string[] = [];

    if (userType === 'platform_admin') {
      const prisma = getMasterPrisma();
      const admin = await prisma.platformAdmin.findUnique({ where: { id: userId } });
      
      if (!admin || !admin.mfaSecret) {
        return res.status(400).json({
          success: false,
          error: { code: 'SETUP_REQUIRED', message: 'Please setup 2FA first' },
        });
      }

      // Verify the code using speakeasy
      const isValid = speakeasy.totp.verify({
        secret: admin.mfaSecret,
        encoding: 'base32',
        token: code,
        window: 2,
      });
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CODE', message: 'Invalid verification code' },
        });
      }

      // Generate backup codes
      backupCodes = generateBackupCodes();
      const hashedCodes = await hashBackupCodes(backupCodes);

      // Enable 2FA
      await prisma.platformAdmin.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaType: 'TOTP',
          mfaBackupCodes: hashedCodes,
        },
      });
    } else {
      if (!tenantSlug) {
        return res.status(400).json({
          success: false,
          error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' },
        });
      }

      const dbManager = getTenantDbManager();
      const prisma = await dbManager.getClientBySlug(tenantSlug);
      const user = await (prisma as any).user.findUnique({ where: { id: userId } });

      if (!user || !user.mfaSecret) {
        return res.status(400).json({
          success: false,
          error: { code: 'SETUP_REQUIRED', message: 'Please setup 2FA first' },
        });
      }

      // Verify the code using speakeasy
      const isValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: code,
        window: 2,
      });
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CODE', message: 'Invalid verification code' },
        });
      }

      // Generate backup codes
      backupCodes = generateBackupCodes();
      const hashedCodes = await hashBackupCodes(backupCodes);

      // Enable 2FA
      await (prisma as any).user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaBackupCodes: hashedCodes,
        },
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Two-factor authentication enabled successfully',
        backupCodes, // Show backup codes only once
      },
    });
  } catch (error) {
    logger.error({ error }, '2FA verify error');
    next(error);
  }
});

// ============================================================================
// 2FA DISABLE
// ============================================================================

router.post('/2fa/disable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = disable2FASchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
    }

    const userId = req.headers['x-user-id']?.toString();
    const userType = req.headers['x-user-type']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { password } = parsed.data;

    if (userType === 'platform_admin') {
      const prisma = getMasterPrisma();
      const admin = await prisma.platformAdmin.findUnique({ where: { id: userId } });
      
      if (!admin) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, admin.passwordHash);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Incorrect password' },
        });
      }

      // Disable 2FA
      await prisma.platformAdmin.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaType: null,
          mfaSecret: null,
          mfaBackupCodes: [],
        },
      });
    } else {
      if (!tenantSlug) {
        return res.status(400).json({
          success: false,
          error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' },
        });
      }

      const dbManager = getTenantDbManager();
      const prisma = await dbManager.getClientBySlug(tenantSlug);
      const user = await (prisma as any).user.findUnique({ where: { id: userId } });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      // Verify password
      if (!user.passwordHash) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_PASSWORD', message: 'Password not set' },
        });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Incorrect password' },
        });
      }

      // Disable 2FA
      await (prisma as any).user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: [],
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'Two-factor authentication disabled' },
    });
  } catch (error) {
    logger.error({ error }, '2FA disable error');
    next(error);
  }
});

// ============================================================================
// 2FA STATUS
// ============================================================================

router.get('/2fa/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id']?.toString();
    const userType = req.headers['x-user-type']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    let mfaEnabled = false;
    let mfaType: string | null = null;

    if (userType === 'platform_admin') {
      const prisma = getMasterPrisma();
      const admin = await prisma.platformAdmin.findUnique({
        where: { id: userId },
        select: { mfaEnabled: true, mfaType: true },
      });
      
      if (admin) {
        mfaEnabled = admin.mfaEnabled;
        mfaType = admin.mfaType;
      }
    } else {
      if (!tenantSlug) {
        return res.status(400).json({
          success: false,
          error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' },
        });
      }

      const dbManager = getTenantDbManager();
      const prisma = await dbManager.getClientBySlug(tenantSlug);
      const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { mfaEnabled: true },
      });

      if (user) {
        mfaEnabled = user.mfaEnabled;
        mfaType = mfaEnabled ? 'TOTP' : null;
      }
    }

    res.json({
      success: true,
      data: { enabled: mfaEnabled, type: mfaType },
    });
  } catch (error) {
    logger.error({ error }, '2FA status error');
    next(error);
  }
});

// ============================================================================
// LIST ACTIVE SESSIONS
// ============================================================================

router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id']?.toString();
    const userType = req.headers['x-user-type']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();
    const currentSessionToken = req.headers['authorization']?.replace('Bearer ', '');

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    let sessions: any[] = [];

    if (userType === 'platform_admin') {
      const prisma = getMasterPrisma();
      const dbSessions = await prisma.platformAdminSession.findMany({
        where: {
          adminId: userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { lastActivityAt: 'desc' },
      });

      sessions = dbSessions.map(session => {
        const { device, browser, deviceType } = parseUserAgent(session.userAgent);
        // Check if this is current session by comparing token family or other identifier
        const isCurrent = false; // Would need to compare token hash
        
        return {
          id: session.id,
          device,
          browser,
          deviceType,
          deviceId: session.deviceId,
          location: 'Unknown', // Would need GeoIP lookup
          ip: session.ipAddress,
          lastActive: session.lastActivityAt.toISOString(),
          createdAt: session.createdAt.toISOString(),
          isCurrent,
        };
      });
    } else {
      if (!tenantSlug) {
        return res.status(400).json({
          success: false,
          error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' },
        });
      }

      const dbManager = getTenantDbManager();
      const prisma = await dbManager.getClientBySlug(tenantSlug);
      const dbSessions = await (prisma as any).userSession.findMany({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { lastActivityAt: 'desc' },
      });

      sessions = dbSessions.map((session: any) => {
        const { device, browser, deviceType } = parseUserAgent(session.userAgent);
        
        return {
          id: session.id,
          device,
          browser,
          deviceType,
          deviceId: session.deviceId,
          location: 'Unknown',
          ip: session.ipAddress,
          lastActive: session.lastActivityAt.toISOString(),
          createdAt: session.createdAt.toISOString(),
          isCurrent: false,
        };
      });
    }

    // Mark the most recent session as current (simplified)
    if (sessions.length > 0) {
      sessions[0].isCurrent = true;
    }

    res.json({ success: true, data: sessions });
  } catch (error) {
    logger.error({ error }, 'List sessions error');
    next(error);
  }
});

// ============================================================================
// TERMINATE SINGLE SESSION
// ============================================================================

router.delete('/sessions/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id']?.toString();
    const userType = req.headers['x-user-type']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (userType === 'platform_admin') {
      const prisma = getMasterPrisma();
      
      // Verify session belongs to user
      const session = await prisma.platformAdminSession.findFirst({
        where: { id: sessionId, adminId: userId },
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session not found' },
        });
      }

      // Revoke session
      await prisma.platformAdminSession.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
    } else {
      if (!tenantSlug) {
        return res.status(400).json({
          success: false,
          error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' },
        });
      }

      const dbManager = getTenantDbManager();
      const prisma = await dbManager.getClientBySlug(tenantSlug);

      const session = await (prisma as any).userSession.findFirst({
        where: { id: sessionId, userId },
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session not found' },
        });
      }

      await (prisma as any).userSession.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
    }

    res.json({ success: true, data: { message: 'Session terminated' } });
  } catch (error) {
    logger.error({ error }, 'Terminate session error');
    next(error);
  }
});

// ============================================================================
// TERMINATE ALL OTHER SESSIONS
// ============================================================================

router.delete('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id']?.toString();
    const userType = req.headers['x-user-type']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (userType === 'platform_admin') {
      const prisma = getMasterPrisma();
      
      // Get all active sessions except current (we'll keep the most recent one)
      const sessions = await prisma.platformAdminSession.findMany({
        where: {
          adminId: userId,
          revokedAt: null,
        },
        orderBy: { lastActivityAt: 'desc' },
      });

      // Keep the most recent session (current), revoke all others
      if (sessions.length > 1) {
        const sessionIdsToRevoke = sessions.slice(1).map(s => s.id);
        await prisma.platformAdminSession.updateMany({
          where: { id: { in: sessionIdsToRevoke } },
          data: { revokedAt: new Date() },
        });
      }
    } else {
      if (!tenantSlug) {
        return res.status(400).json({
          success: false,
          error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' },
        });
      }

      const dbManager = getTenantDbManager();
      const prisma = await dbManager.getClientBySlug(tenantSlug);

      const sessions = await (prisma as any).userSession.findMany({
        where: {
          userId,
          revokedAt: null,
        },
        orderBy: { lastActivityAt: 'desc' },
      });

      if (sessions.length > 1) {
        const sessionIdsToRevoke = sessions.slice(1).map((s: any) => s.id);
        await (prisma as any).userSession.updateMany({
          where: { id: { in: sessionIdsToRevoke } },
          data: { revokedAt: new Date() },
        });
      }
    }

    res.json({ success: true, data: { message: 'All other sessions terminated' } });
  } catch (error) {
    logger.error({ error }, 'Terminate all sessions error');
    next(error);
  }
});

// ============================================================================
// DELETE (FREEZE) ACCOUNT
// ============================================================================

router.delete('/account', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = deleteAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
    }

    const userId = req.headers['x-user-id']?.toString();
    const userType = req.headers['x-user-type']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { password } = parsed.data;

    if (userType === 'platform_admin') {
      // Platform admins cannot self-delete - must be done by super admin
      return res.status(403).json({
        success: false,
        error: { 
          code: 'FORBIDDEN', 
          message: 'Platform admins cannot delete their own account. Contact a super admin.' 
        },
      });
    }

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' },
      });
    }

    const dbManager = getTenantDbManager();
    const prisma = await dbManager.getClientBySlug(tenantSlug);
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    // Verify password
    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_PASSWORD', message: 'Password not set' },
      });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Incorrect password' },
      });
    }

    // Generate reactivation token
    const reactivationToken = crypto.randomBytes(32).toString('hex');
    const reactivationExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Freeze account instead of deleting
    await (prisma as any).$transaction(async (tx: any) => {
      // Update user status to SUSPENDED and set deletedAt
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'SUSPENDED',
          deletedAt: new Date(),
          metadata: {
            ...(user.metadata || {}),
            frozenAt: new Date().toISOString(),
            reactivationToken,
            reactivationExpiry: reactivationExpiry.toISOString(),
            frozenReason: 'USER_REQUESTED',
          },
        },
      });

      // Revoke all sessions
      await tx.userSession.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });

      // Log the action
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ACCOUNT_FROZEN',
          entityType: 'USER',
          entityId: userId,
          details: { reason: 'User requested account deletion' },
          ipAddress: req.headers['x-forwarded-for']?.toString() || req.ip,
          userAgent: req.headers['user-agent'] || '',
        },
      });
    });

    // Send reactivation email
    const reactivationUrl = `${config.appUrl}/reactivate-account?token=${reactivationToken}&tenant=${tenantSlug}`;
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e9ecef; border-top: none; }
    .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0; color: #333;">Account Frozen</h2>
    </div>
    <div class="content">
      <p>Hi ${user.firstName || 'there'},</p>
      <p>Your account has been frozen as requested. All your data has been preserved, and you can reactivate your account at any time within the next 30 days.</p>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> Your account will be permanently deleted after 30 days if not reactivated.
      </div>
      
      <p>To reactivate your account, click the button below:</p>
      
      <center>
        <a href="${reactivationUrl}" class="button">Reactivate My Account</a>
      </center>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">${reactivationUrl}</p>
      
      <p>If you didn't request this action, please contact our support team immediately.</p>
      
      <p>Best regards,<br>The Office Management Team</p>
    </div>
    <div class="footer">
      <p>This email was sent regarding your account deletion request.</p>
      <p>© ${new Date().getFullYear()} Office Management System</p>
    </div>
  </div>
</body>
</html>`;

    await sendNotificationEmail(
      user.email,
      'Your Account Has Been Frozen - Reactivation Required',
      `Hi ${user.firstName || 'there'},\n\nYour account has been frozen as requested. You can reactivate it within 30 days by visiting: ${reactivationUrl}\n\nAfter 30 days, your account will be permanently deleted.`,
      emailHtml
    );

    logger.info({ userId, email: user.email }, 'Account frozen');

    res.json({
      success: true,
      data: {
        message: 'Your account has been frozen. You will receive an email with instructions to reactivate within 30 days.',
        frozenUntil: reactivationExpiry.toISOString(),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Delete account error');
    next(error);
  }
});

// ============================================================================
// REACTIVATE FROZEN ACCOUNT
// ============================================================================

router.post('/account/reactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, email } = req.body;
    const tenantSlug = req.headers['x-tenant-slug']?.toString();

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Token and email are required' },
      });
    }

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' },
      });
    }

    const dbManager = getTenantDbManager();
    const prisma = await dbManager.getClientBySlug(tenantSlug);

    // Find frozen user by email
    const user = await (prisma as any).user.findFirst({
      where: {
        email,
        status: 'SUSPENDED',
        deletedAt: { not: null },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No frozen account found with this email' },
      });
    }

    const metadata = (user.metadata || {}) as Record<string, any>;
    
    // Verify token
    if (metadata.reactivationToken !== token) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid reactivation token' },
      });
    }

    // Check expiry
    if (metadata.reactivationExpiry && new Date(metadata.reactivationExpiry) < new Date()) {
      return res.status(400).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Reactivation token has expired. Please contact support.' },
      });
    }

    // Reactivate account
    await (prisma as any).user.update({
      where: { id: user.id },
      data: {
        status: 'ACTIVE',
        deletedAt: null,
        metadata: {
          ...metadata,
          reactivationToken: null,
          reactivationExpiry: null,
          reactivatedAt: new Date().toISOString(),
        },
      },
    });

    // Send confirmation email
    const loginUrl = `${config.appUrl}/login`;
    const confirmationHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #28a745; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h2 { color: white; margin: 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e9ecef; border-top: none; }
    .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
    .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">✓ Account Reactivated!</h2>
    </div>
    <div class="content">
      <p>Hi ${user.firstName || 'there'},</p>
      
      <div class="success">
        <strong>🎉 Great news!</strong> Your account has been successfully reactivated.
      </div>
      
      <p>All your data has been restored, and you can now log in with your existing credentials.</p>
      
      <center>
        <a href="${loginUrl}" class="button">Log In Now</a>
      </center>
      
      <p>If you didn't request this reactivation, please contact our support team immediately and change your password.</p>
      
      <p>Welcome back!<br>The Office Management Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Office Management System</p>
    </div>
  </div>
</body>
</html>`;

    await sendNotificationEmail(
      user.email,
      'Your Account Has Been Reactivated!',
      `Hi ${user.firstName || 'there'},\n\nYour account has been successfully reactivated! You can now log in at: ${loginUrl}\n\nWelcome back!`,
      confirmationHtml
    );

    logger.info({ userId: user.id, email: user.email }, 'Account reactivated');

    res.json({
      success: true,
      data: { message: 'Your account has been reactivated. You can now log in.' },
    });
  } catch (error) {
    logger.error({ error }, 'Reactivate account error');
    next(error);
  }
});

// ============================================================================
// CHECK IF EMAIL HAS FROZEN ACCOUNT (For registration flow)
// ============================================================================

router.post('/account/check-frozen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const tenantSlug = req.headers['x-tenant-slug']?.toString();

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email is required' },
      });
    }

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' },
      });
    }

    const dbManager = getTenantDbManager();
    const prisma = await dbManager.getClientBySlug(tenantSlug);

    const frozenUser = await (prisma as any).user.findFirst({
      where: {
        email,
        status: 'SUSPENDED',
        deletedAt: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        metadata: true,
      },
    });

    if (!frozenUser) {
      return res.json({
        success: true,
        data: { isFrozen: false },
      });
    }

    const metadata = (frozenUser.metadata || {}) as Record<string, any>;
    const isExpired = metadata.reactivationExpiry && new Date(metadata.reactivationExpiry) < new Date();

    res.json({
      success: true,
      data: {
        isFrozen: true,
        canReactivate: !isExpired,
        firstName: frozenUser.firstName,
        expiresAt: metadata.reactivationExpiry,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Check frozen account error');
    next(error);
  }
});

export default router;
