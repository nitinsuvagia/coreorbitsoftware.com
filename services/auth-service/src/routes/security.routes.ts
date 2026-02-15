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

// Helper to build tenant-aware URLs (with subdomain)
function getTenantUrl(tenantSlug: string, path: string): string {
  const baseUrl = config.appUrl; // e.g., http://localhost:3000
  try {
    const url = new URL(baseUrl);
    // Insert tenant slug as subdomain
    url.hostname = `${tenantSlug}.${url.hostname}`;
    return `${url.origin}${path}`;
  } catch {
    // Fallback if URL parsing fails
    return `${baseUrl}${path}`;
  }
}

// Notification service helper
async function sendNotificationEmail(email: string, subject: string, message: string, html?: string): Promise<boolean> {
  try {
    const response = await fetch(`${config.notificationServiceUrl}/api/notifications/platform/email`, {
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

    // Check if user is the tenant owner (email matches tenant registration email)
    const masterPrisma = getMasterPrisma();
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, email: true, name: true },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' },
      });
    }

    const isTenantOwner = user.email.toLowerCase() === tenant.email.toLowerCase();

    // Generate reactivation token
    const reactivationToken = crypto.randomBytes(32).toString('hex');
    const reactivationExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    if (isTenantOwner) {
      // TENANT OWNER: Freeze entire tenant and all users
      logger.info({ userId, tenantSlug, email: user.email }, 'Tenant owner deleting account - freezing entire tenant');

      // Freeze tenant in master database
      await masterPrisma.tenant.update({
        where: { slug: tenantSlug },
        data: {
          status: 'SUSPENDED',
          suspendedAt: new Date(),
          metadata: {
            ...(tenant as any).metadata,
            frozenAt: new Date().toISOString(),
            frozenBy: userId,
            frozenReason: 'OWNER_REQUESTED_DELETION',
            reactivationToken,
            reactivationExpiry: reactivationExpiry.toISOString(),
          },
        },
      });

      // Freeze all users in tenant database
      await (prisma as any).$transaction(async (tx: any) => {
        // Suspend all users
        await tx.user.updateMany({
          data: {
            status: 'SUSPENDED',
            deletedAt: new Date(),
          },
        });

        // Store reactivation token for owner
        await tx.passwordResetToken.deleteMany({
          where: { userId },
        });
        
        await tx.passwordResetToken.create({
          data: {
            userId,
            token: `reactivate_tenant_${reactivationToken}`,
            expiresAt: reactivationExpiry,
          },
        });

        // Revoke all sessions for all users
        await tx.userSession.updateMany({
          data: { revokedAt: new Date() },
        });
      });

      // Send reactivation email to tenant owner
      const reactivationUrl = getTenantUrl(tenantSlug, `/reactivate-tenant?token=${reactivationToken}`);
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc3545; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h2 { margin: 0; color: white; }
    .content { background: #fff; padding: 30px; border: 1px solid #e9ecef; border-top: none; }
    .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .danger { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Organization Account Frozen</h2>
    </div>
    <div class="content">
      <p>Hi ${user.firstName || 'there'},</p>
      <p>As requested, your organization <strong>"${tenant.name}"</strong> has been frozen. This affects:</p>
      
      <ul>
        <li>All user accounts have been suspended</li>
        <li>No one can log in to the organization</li>
        <li>All data has been preserved</li>
      </ul>
      
      <div class="danger">
        <strong>🚨 Critical:</strong> The entire organization and all user accounts will be permanently deleted after 30 days if not reactivated.
      </div>
      
      <p>To reactivate your organization and all accounts, click the button below:</p>
      
      <center>
        <a href="${reactivationUrl}" class="button">Reactivate Organization</a>
      </center>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">${reactivationUrl}</p>
      
      <div class="warning">
        <strong>⚠️ Note:</strong> Only you, as the organization owner, can reactivate the account.
      </div>
      
      <p>If you didn't request this action, please contact our support team immediately.</p>
      
      <p>Best regards,<br>The Office Management Team</p>
    </div>
    <div class="footer">
      <p>This email was sent regarding your organization deletion request.</p>
      <p>© ${new Date().getFullYear()} Office Management System</p>
    </div>
  </div>
</body>
</html>`;

      await sendNotificationEmail(
        user.email,
        `🚨 Organization "${tenant.name}" Has Been Frozen - Reactivation Required`,
        `Hi ${user.firstName || 'there'},\n\nAs requested, your organization "${tenant.name}" has been frozen. All user accounts have been suspended.\n\nYou can reactivate the organization within 30 days by visiting: ${reactivationUrl}\n\nAfter 30 days, the organization and all data will be permanently deleted.`,
        emailHtml
      );

      logger.info({ userId, tenantSlug, email: user.email }, 'Tenant frozen by owner');

      return res.json({
        success: true,
        data: {
          message: 'Your organization has been frozen. All users have been suspended. You will receive an email with instructions to reactivate within 30 days.',
          frozenUntil: reactivationExpiry.toISOString(),
          tenantFrozen: true,
        },
      });
    }

    // REGULAR USER: Freeze only this user (existing behavior)
    const userReactivationToken = crypto.randomBytes(32).toString('hex');
    const userReactivationExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await (prisma as any).$transaction(async (tx: any) => {
      // Update user status to SUSPENDED and set deletedAt
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'SUSPENDED',
          deletedAt: new Date(),
        },
      });

      // Store reactivation token (using PasswordResetToken table)
      // Delete any existing reactivation tokens for this user
      await tx.passwordResetToken.deleteMany({
        where: { userId },
      });
      
      // Create new reactivation token
      await tx.passwordResetToken.create({
        data: {
          userId,
          token: `reactivate_${userReactivationToken}`,
          expiresAt: userReactivationExpiry,
        },
      });

      // Revoke all sessions
      await tx.userSession.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
    });

    // Send reactivation email
    const reactivationUrl = getTenantUrl(tenantSlug, `/reactivate-account?token=${userReactivationToken}&tenant=${tenantSlug}`);
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
        frozenUntil: userReactivationExpiry.toISOString(),
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

    // Find the reactivation token in PasswordResetToken table (prefixed with reactivate_)
    const reactivationTokenRecord = await (prisma as any).passwordResetToken.findFirst({
      where: {
        userId: user.id,
        token: `reactivate_${token}`,
        usedAt: null,
      },
    });

    if (!reactivationTokenRecord) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid reactivation token' },
      });
    }

    // Check expiry
    if (new Date(reactivationTokenRecord.expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Reactivation token has expired. Please contact support.' },
      });
    }

    // Reactivate account in transaction
    await (prisma as any).$transaction(async (tx: any) => {
      // Update user status
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      // Mark token as used
      await tx.passwordResetToken.update({
        where: { id: reactivationTokenRecord.id },
        data: { usedAt: new Date() },
      });
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
// REACTIVATE FROZEN TENANT (For owner to reactivate entire organization)
// ============================================================================

router.post('/tenant/reactivate', async (req: Request, res: Response, next: NextFunction) => {
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

    // Get master tenant to verify it's suspended
    const masterPrisma = getMasterPrisma();
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      });
    }

    if (tenant.status !== 'SUSPENDED') {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_SUSPENDED', message: 'Organization is not suspended' },
      });
    }

    // Verify the reactivation token from tenant metadata
    const tenantMetadata = (tenant.metadata || {}) as Record<string, any>;
    if (tenantMetadata.reactivationToken !== token) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid reactivation token' },
      });
    }

    // Check token expiry
    if (tenantMetadata.reactivationExpiry && new Date(tenantMetadata.reactivationExpiry) < new Date()) {
      return res.status(400).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Reactivation token has expired. Please contact support.' },
      });
    }

    // Verify email matches tenant owner email
    if (email.toLowerCase() !== tenant.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Only the organization owner can reactivate the organization' },
      });
    }

    const dbManager = getTenantDbManager();
    // Skip status check since we're reactivating a suspended tenant
    const prisma = await dbManager.getClientBySlug(tenantSlug, { skipStatusCheck: true });

    // Find the owner user
    const ownerUser = await (prisma as any).user.findFirst({
      where: { email: tenant.email },
    });

    if (!ownerUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'OWNER_NOT_FOUND', message: 'Organization owner user not found' },
      });
    }

    // Reactivate tenant and all users in transaction
    await masterPrisma.$transaction(async (masterTx) => {
      // Reactivate tenant in master database
      await masterTx.tenant.update({
        where: { id: tenant.id },
        data: {
          status: 'ACTIVE',
          suspendedAt: null,
          metadata: {
            ...tenantMetadata,
            reactivationToken: null,
            reactivationExpiry: null,
            frozenReason: null,
            reactivatedAt: new Date().toISOString(),
          },
        },
      });
    });

    // Reactivate all users in tenant database
    await (prisma as any).$transaction(async (tx: any) => {
      // Reactivate all users
      await tx.user.updateMany({
        where: { status: 'SUSPENDED' },
        data: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      // Mark the reactivation token as used
      await tx.passwordResetToken.updateMany({
        where: {
          userId: ownerUser.id,
          token: `reactivate_tenant_${token}`,
        },
        data: { usedAt: new Date() },
      });
    });

    // Send confirmation emails
    const loginUrl = getTenantUrl(tenantSlug, '/login');
    
    // Get all users to send notification
    const users = await (prisma as any).user.findMany({
      where: { status: 'ACTIVE' },
      select: { email: true, firstName: true },
    });

    // Send confirmation to owner
    const ownerConfirmationHtml = `
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
      <h2 style="margin: 0;">✓ Organization Reactivated!</h2>
    </div>
    <div class="content">
      <p>Hi ${ownerUser.firstName || 'there'},</p>
      
      <div class="success">
        <strong>🎉 Great news!</strong> Your organization <strong>"${tenant.name}"</strong> has been successfully reactivated.
      </div>
      
      <p>All user accounts have been restored, and everyone can now log in with their existing credentials.</p>
      
      <center>
        <a href="${loginUrl}" class="button">Log In Now</a>
      </center>
      
      <p>If you didn't request this reactivation, please contact our support team immediately.</p>
      
      <p>Welcome back!<br>The Office Management Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Office Management System</p>
    </div>
  </div>
</body>
</html>`;

    await sendNotificationEmail(
      ownerUser.email,
      'Your Organization Has Been Reactivated!',
      `Hi ${ownerUser.firstName || 'there'},\n\nYour organization "${tenant.name}" has been successfully reactivated! All user accounts have been restored. You can now log in at: ${loginUrl}\n\nWelcome back!`,
      ownerConfirmationHtml
    );

    // Optionally send notification to other users
    for (const user of users) {
      if (user.email !== ownerUser.email) {
        await sendNotificationEmail(
          user.email,
          'Your Account Has Been Reactivated!',
          `Hi ${user.firstName || 'there'},\n\nGreat news! Your organization "${tenant.name}" has been reactivated by the administrator. You can now log in at: ${loginUrl}\n\nWelcome back!`,
          `<p>Hi ${user.firstName || 'there'},</p><p>Great news! Your organization "${tenant.name}" has been reactivated. You can now log in at <a href="${loginUrl}">${loginUrl}</a></p>`
        );
      }
    }

    logger.info({ tenantId: tenant.id, tenantSlug, ownerEmail: ownerUser.email }, 'Tenant reactivated');

    // Invalidate tenant cache in api-gateway so new requests get fresh status
    try {
      const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:4000';
      const internalSecret = process.env.INTERNAL_SECRET || 'internal-api-secret';
      logger.info({ tenantSlug, gatewayUrl }, 'Attempting to invalidate API Gateway tenant cache');
      
      const cacheResponse = await fetch(`${gatewayUrl}/internal/invalidate-tenant-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantSlug, internalSecret }),
      });
      
      const cacheResult = await cacheResponse.json();
      if (cacheResponse.ok && cacheResult.success) {
        logger.info({ tenantSlug, cacheResult }, 'API Gateway tenant cache invalidated successfully');
      } else {
        logger.warn({ tenantSlug, status: cacheResponse.status, cacheResult }, 'API Gateway cache invalidation returned non-success');
      }
    } catch (cacheError: any) {
      logger.warn({ error: cacheError?.message, tenantSlug }, 'Failed to invalidate API gateway cache (non-fatal)');
    }

    res.json({
      success: true,
      data: { message: 'Your organization has been reactivated. All users can now log in.' },
    });
  } catch (error) {
    logger.error({ error }, 'Reactivate tenant error');
    next(error);
  }
});

// ============================================================================
// RESEND REACTIVATION LINK (For frozen tenants)
// ============================================================================

router.post('/resend-reactivation-link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email is required' },
      });
    }

    logger.info({ email }, 'Resend reactivation link request');

    // Find frozen tenant by owner email
    const masterPrisma = getMasterPrisma();
    const tenant = await masterPrisma.tenant.findFirst({
      where: {
        email: email.toLowerCase(),
        status: 'SUSPENDED',
      },
    });

    if (!tenant) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        data: { message: 'If an account exists with this email, a reactivation link has been sent.' },
      });
    }

    const tenantSlug = tenant.slug;
    const dbManager = getTenantDbManager();
    const prisma = await dbManager.getClientBySlug(tenantSlug);

    // Find the owner user
    const ownerUser = await (prisma as any).user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!ownerUser) {
      return res.json({
        success: true,
        data: { message: 'If an account exists with this email, a reactivation link has been sent.' },
      });
    }

    // Generate new reactivation token
    const reactivationToken = crypto.randomBytes(32).toString('hex');
    const reactivationExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Update tenant metadata with new token
    await masterPrisma.tenant.update({
      where: { id: tenant.id },
      data: {
        metadata: {
          ...(tenant as any).metadata,
          reactivationToken,
          reactivationExpiry: reactivationExpiry.toISOString(),
        },
      },
    });

    // Update user's reactivation token in tenant database
    await (prisma as any).passwordResetToken.deleteMany({
      where: {
        userId: ownerUser.id,
        token: { startsWith: 'reactivate_' },
      },
    });

    await (prisma as any).passwordResetToken.create({
      data: {
        userId: ownerUser.id,
        token: `reactivate_tenant_${reactivationToken}`,
        expiresAt: reactivationExpiry,
      },
    });

    // Send reactivation email
    const reactivationUrl = getTenantUrl(tenantSlug, `/reactivate-tenant?token=${reactivationToken}`);
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc3545; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h2 { margin: 0; color: white; }
    .content { background: #fff; padding: 30px; border: 1px solid #e9ecef; border-top: none; }
    .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .danger { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Reactivation Link</h2>
    </div>
    <div class="content">
      <p>Hi ${ownerUser.firstName || 'there'},</p>
      <p>You requested a new reactivation link for your organization <strong>"${tenant.name}"</strong>.</p>
      
      <div class="danger">
        <strong>🚨 Important:</strong> Your organization and all user accounts will be permanently deleted after 30 days if not reactivated.
      </div>
      
      <p>To reactivate your organization and all accounts, click the button below:</p>
      
      <center>
        <a href="${reactivationUrl}" class="button">Reactivate Organization</a>
      </center>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">${reactivationUrl}</p>
      
      <div class="warning">
        <strong>⚠️ Note:</strong> Only you, as the organization owner, can reactivate the account.
      </div>
      
      <p>If you didn't request this, you can safely ignore this email.</p>
      
      <p>Best regards,<br>The Office Management Team</p>
    </div>
    <div class="footer">
      <p>This email was sent regarding your reactivation link request.</p>
      <p>© ${new Date().getFullYear()} Office Management System</p>
    </div>
  </div>
</body>
</html>`;

    await sendNotificationEmail(
      ownerUser.email,
      `🔑 Reactivation Link for "${tenant.name}"`,
      `Hi ${ownerUser.firstName || 'there'},\n\nYou requested a new reactivation link for your organization "${tenant.name}".\n\nClick here to reactivate: ${reactivationUrl}\n\nThis link expires in 30 days.\n\nIf you didn't request this, you can safely ignore this email.`,
      emailHtml
    );

    logger.info({ email, tenantSlug }, 'Reactivation link resent');

    res.json({
      success: true,
      data: { message: 'If an account exists with this email, a reactivation link has been sent.' },
    });
  } catch (error) {
    logger.error({ error }, 'Resend reactivation link error');
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
      },
    });

    if (!frozenUser) {
      return res.json({
        success: true,
        data: { isFrozen: false },
      });
    }

    // Check for reactivation token in PasswordResetToken table
    const reactivationToken = await (prisma as any).passwordResetToken.findFirst({
      where: {
        userId: frozenUser.id,
        token: { startsWith: 'reactivate_' },
        usedAt: null,
      },
      select: {
        expiresAt: true,
      },
    });

    const isExpired = reactivationToken && new Date(reactivationToken.expiresAt) < new Date();

    res.json({
      success: true,
      data: {
        isFrozen: true,
        canReactivate: !isExpired && !!reactivationToken,
        firstName: frozenUser.firstName,
        expiresAt: reactivationToken?.expiresAt?.toISOString() || null,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Check frozen account error');
    next(error);
  }
});

export default router;
