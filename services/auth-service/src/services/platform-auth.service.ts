/**
 * Auth Service - Platform Admin Authentication
 * 
 * Handles authentication for:
 * - SuperAdmin
 * - SubAdmin
 * - AdminUser
 * - BillingAdmin
 * - SupportAgent
 * 
 * These users can ONLY login via main domain
 */

import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getMasterPrisma } from '../utils/database';
import { signToken } from '../utils/jwt-helper';

// ============================================================================
// TYPES
// ============================================================================

export interface PlatformLoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
  skipPasswordCheck?: boolean;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    fingerprint?: string;
  };
}

export interface PlatformLoginResponse {
  success: boolean;
  requiresMfa: boolean;
  mfaMethod?: 'totp' | 'sms' | 'email';
  mfaToken?: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  user?: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    avatar?: string;
  };
  error?: {
    code: string;
    message: string;
    remainingAttempts?: number;
  };
}

// ============================================================================
// PLATFORM ADMIN LOGIN
// ============================================================================

export async function loginPlatformAdmin(
  request: PlatformLoginRequest
): Promise<PlatformLoginResponse> {
  const prisma = getMasterPrisma();
  
  try {
    // Find admin by email
    const admin = await prisma.platformAdmin.findUnique({
      where: { email: request.email.toLowerCase() },
    });
    
    if (!admin) {
      logger.warn({ email: request.email }, 'Platform admin login failed: user not found');
      return {
        success: false,
        requiresMfa: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      };
    }
    
    // Check if account is locked
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const remainingMs = admin.lockedUntil.getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      
      logger.warn({ 
        email: request.email,
        lockedUntil: admin.lockedUntil 
      }, 'Platform admin login failed: account locked');
      
      return {
        success: false,
        requiresMfa: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is locked. Try again in ${remainingMins} minutes.`,
        },
      };
    }
    
    // Check account status
    if (admin.status !== 'ACTIVE') {
      logger.warn({ 
        email: request.email,
        status: admin.status 
      }, 'Platform admin login failed: account not active');
      
      return {
        success: false,
        requiresMfa: false,
        error: {
          code: `ACCOUNT_${admin.status}`,
          message: `Account is ${admin.status.toLowerCase()}. Please contact support.`,
        },
      };
    }
    
    // Verify password (skip if already verified via MFA flow)
    if (!request.skipPasswordCheck) {
      const passwordValid = await bcrypt.compare(request.password, admin.passwordHash);
      
      if (!passwordValid) {
        // Increment login attempts
        const newAttempts = admin.loginAttempts + 1;
        const shouldLock = newAttempts >= config.maxLoginAttempts;
        
        await prisma.platformAdmin.update({
          where: { id: admin.id },
          data: {
            loginAttempts: newAttempts,
            lockedUntil: shouldLock 
              ? new Date(Date.now() + config.lockoutDuration * 1000)
              : null,
          },
        });
        
        // Log failed attempt
        await prisma.platformLoginHistory.create({
          data: {
            adminId: admin.id,
            ipAddress: request.deviceInfo?.ipAddress || 'unknown',
            userAgent: request.deviceInfo?.userAgent || 'unknown',
            success: false,
            failureReason: 'Invalid password',
            mfaUsed: false,
          },
        });
        
        logger.warn({ 
          email: request.email,
          attempts: newAttempts 
        }, 'Platform admin login failed: invalid password');
        
        return {
          success: false,
          requiresMfa: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            remainingAttempts: config.maxLoginAttempts - newAttempts,
          },
        };
      }
    }
    
    // Check MFA requirement
    if (admin.mfaEnabled) {
      if (!request.mfaCode) {
        // Generate MFA token for the separate MFA verification step
        const jwt = require('jsonwebtoken');
        const mfaToken = jwt.sign(
          { 
            userId: admin.id, 
            email: admin.email, 
            type: 'platform' 
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '5m' }
        );
        
        return {
          success: false,
          requiresMfa: true,
          mfaMethod: admin.mfaType as 'totp' | 'sms' | 'email',
          mfaToken,
        };
      }
      
      // Verify MFA code
      const mfaValid = verifyMfaCode(admin.mfaSecret!, request.mfaCode);
      
      if (!mfaValid) {
        logger.warn({ email: request.email }, 'Platform admin login failed: invalid MFA code');
        
        return {
          success: false,
          requiresMfa: true,
          mfaMethod: admin.mfaType as 'totp' | 'sms' | 'email',
          error: {
            code: 'MFA_INVALID',
            message: 'Invalid verification code',
          },
        };
      }
    }
    
    // Generate tokens
    const tokens = generatePlatformTokens(admin);
    
    // Create session
    const sessionId = uuidv4();
    await prisma.platformAdminSession.create({
      data: {
        id: sessionId,
        adminId: admin.id,
        tokenHash: hashToken(tokens.refreshToken),
        tokenFamily: uuidv4(),
        ipAddress: request.deviceInfo?.ipAddress || 'unknown',
        userAgent: request.deviceInfo?.userAgent || 'unknown',
        deviceId: request.deviceInfo?.fingerprint,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
    
    // Reset login attempts and update last login
    await prisma.platformAdmin.update({
      where: { id: admin.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
    
    // Log successful login
    await prisma.platformLoginHistory.create({
      data: {
        adminId: admin.id,
        ipAddress: request.deviceInfo?.ipAddress || 'unknown',
        userAgent: request.deviceInfo?.userAgent || 'unknown',
        success: true,
        mfaUsed: admin.mfaEnabled,
      },
    });
    
    logger.info({ 
      adminId: admin.id,
      email: admin.email,
      role: admin.role 
    }, 'Platform admin login successful');
    
    return {
      success: true,
      requiresMfa: false,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
      },
      user: {
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        role: admin.role,
        avatar: admin.avatar || undefined,
      },
    };
    
  } catch (error) {
    logger.error({ error, email: request.email }, 'Platform admin login error');
    throw error;
  }
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

interface PlatformAdmin {
  id: string;
  email: string;
  role: string;
  displayName: string;
}

function generatePlatformTokens(admin: PlatformAdmin) {
  const accessTokenPayload = {
    sub: admin.id,
    email: admin.email,
    type: 'platform_admin',
    domain: 'main',
    platformRole: admin.role,
    jti: uuidv4(),
  };
  
  const refreshTokenPayload = {
    sub: admin.id,
    type: 'platform_admin',
    jti: uuidv4(),
    family: uuidv4(),
  };
  
  const accessToken = signToken(accessTokenPayload, config.jwtSecret, {
    expiresIn: config.jwtAccessTokenExpiry,
    issuer: config.jwtIssuer,
  });
  
  const refreshToken = signToken(refreshTokenPayload, config.jwtSecret, {
    expiresIn: config.jwtRefreshTokenExpiry,
    issuer: config.jwtIssuer,
  });
  
  return { accessToken, refreshToken };
}

// ============================================================================
// MFA UTILITIES
// ============================================================================

function verifyMfaCode(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1, // Allow 1 step tolerance (30 seconds)
  });
}

function hashToken(token: string): string {
  // Simple hash for token storage (in production, use proper hashing)
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================================================
// LOGOUT
// ============================================================================

export async function logoutPlatformAdmin(
  adminId: string,
  sessionId?: string
): Promise<void> {
  const prisma = getMasterPrisma();
  
  if (sessionId) {
    // Revoke specific session
    await prisma.platformAdminSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  } else {
    // Revoke all sessions
    await prisma.platformAdminSession.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  
  logger.info({ adminId, sessionId }, 'Platform admin logged out');
}

export default {
  loginPlatformAdmin,
  logoutPlatformAdmin,
};
