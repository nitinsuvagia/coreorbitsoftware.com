/**
 * Auth Service - Tenant User Authentication
 * 
 * Handles authentication for tenant users:
 * - TenantAdmin
 * - HR Manager
 * - Project Manager
 * - Team Lead
 * - Employee
 * - Viewer
 * 
 * These users can ONLY login via their tenant's subdomain
 */

import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { signToken } from '../utils/jwt-helper';
import { getTenantDbManager } from '@oms/tenant-db-manager';

// ============================================================================
// TYPES
// ============================================================================

export interface TenantLoginRequest {
  email: string;
  password: string;
  tenantSlug: string;
  mfaCode?: string;
  rememberMe?: boolean;
  skipPasswordCheck?: boolean;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    fingerprint?: string;
    timezone?: string;
  };
}

export interface TenantLoginResponse {
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
    avatar?: string;
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    roles: string[];
    permissions: string[];
  };
  error?: {
    code: string;
    message: string;
    remainingAttempts?: number;
  };
}

// ============================================================================
// TENANT USER LOGIN
// ============================================================================

export async function loginTenantUser(
  request: TenantLoginRequest
): Promise<TenantLoginResponse> {
  const dbManager = getTenantDbManager();
  
  try {
    // Get tenant info and prisma client
    // Use verifyIfSuspended to check database if cached status shows suspended
    // This prevents stale cache from blocking logins after reactivation
    const tenantInfo = await dbManager.getTenantBySlug(request.tenantSlug, { verifyIfSuspended: true });
    
    // Check tenant status
    if (tenantInfo.status === 'SUSPENDED' || tenantInfo.status === 'TERMINATED') {
      logger.warn({ 
        tenantSlug: request.tenantSlug,
        status: tenantInfo.status 
      }, 'Tenant login failed: tenant suspended');
      
      return {
        success: false,
        requiresMfa: false,
        error: {
          code: 'TENANT_SUSPENDED',
          message: 'This organization\'s account has been suspended. Please contact support.',
        },
      };
    }
    
    const prisma = await dbManager.getClientBySlug(request.tenantSlug);
    
    // Find user by email
    const user = await (prisma as any).user.findUnique({
      where: { email: request.email.toLowerCase() },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        employee: true,
      },
    });
    
    if (!user) {
      logger.warn({ 
        email: request.email,
        tenantSlug: request.tenantSlug 
      }, 'Tenant login failed: user not found');
      
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
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      
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
    if (user.status !== 'ACTIVE') {
      // Special handling for frozen accounts (SUSPENDED + deletedAt)
      if (user.status === 'SUSPENDED' && user.deletedAt) {
        const metadata = (user.metadata || {}) as Record<string, any>;
        return {
          success: false,
          requiresMfa: false,
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: 'Your account has been frozen. Please check your email for reactivation instructions.',
            firstName: user.firstName,
            expiresAt: metadata.reactivationExpiry,
          },
        };
      }
      
      return {
        success: false,
        requiresMfa: false,
        error: {
          code: `ACCOUNT_${user.status}`,
          message: `Account is ${user.status.toLowerCase()}. Please contact your administrator.`,
        },
      };
    }
    
    // Verify password (skip if already verified via MFA flow)
    if (!request.skipPasswordCheck) {
      if (!user.passwordHash) {
        // User registered via SSO and has no password
        return {
          success: false,
          requiresMfa: false,
          error: {
            code: 'SSO_ONLY',
            message: 'Please use SSO to login. Password login is not available for this account.',
          },
        };
      }
      
      const passwordValid = await bcrypt.compare(request.password, user.passwordHash);
      
      if (!passwordValid) {
        // Increment login attempts
        const newAttempts = user.loginAttempts + 1;
        const shouldLock = newAttempts >= config.maxLoginAttempts;
        
        await (prisma as any).user.update({
          where: { id: user.id },
          data: {
            loginAttempts: newAttempts,
            lockedUntil: shouldLock 
              ? new Date(Date.now() + config.lockoutDuration * 1000)
              : null,
          },
        });
        
        // Log failed attempt
        await (prisma as any).loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: request.deviceInfo?.ipAddress || 'unknown',
            userAgent: request.deviceInfo?.userAgent || 'unknown',
            success: false,
            failureReason: 'Invalid password',
            mfaUsed: false,
          },
      });
      
      logger.warn({ 
        email: request.email,
        tenantSlug: request.tenantSlug,
        attempts: newAttempts 
      }, 'Tenant login failed: invalid password');
      
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
    if (user.mfaEnabled) {
      if (!request.mfaCode) {
        // Generate MFA token for the separate MFA verification step
        const jwt = require('jsonwebtoken');
        const mfaToken = jwt.sign(
          { 
            userId: user.id, 
            email: user.email, 
            tenantSlug: request.tenantSlug,
            type: 'tenant' 
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '5m' }
        );
        
        return {
          success: false,
          requiresMfa: true,
          mfaMethod: 'totp',
          mfaToken,
        };
      }
      
      // Verify MFA code
      const mfaValid = speakeasy.totp.verify({
        secret: user.mfaSecret!,
        encoding: 'base32',
        token: request.mfaCode,
        window: 1,
      });
      
      if (!mfaValid) {
        return {
          success: false,
          requiresMfa: true,
          mfaMethod: 'totp',
          error: {
            code: 'MFA_INVALID',
            message: 'Invalid verification code',
          },
        };
      }
    }
    
    // Extract roles and permissions
    const roles = user.roles.map((ur: any) => ur.role.slug);
    const permissions = extractPermissions(user.roles);
    
    // Generate tokens
    const tokens = generateTenantTokens({
      id: user.id,
      email: user.email,
      tenantId: tenantInfo.id,
      tenantSlug: tenantInfo.slug,
      roles,
      permissions,
    });
    
    // Create session
    const sessionExpiry = request.rememberMe 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await (prisma as any).userSession.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        tokenHash: hashToken(tokens.refreshToken),
        tokenFamily: uuidv4(),
        ipAddress: request.deviceInfo?.ipAddress || 'unknown',
        userAgent: request.deviceInfo?.userAgent || 'unknown',
        deviceId: request.deviceInfo?.fingerprint,
        expiresAt: sessionExpiry,
      },
    });
    
    // Reset login attempts and update last login
    await (prisma as any).user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
    
    // Log successful login
    await (prisma as any).loginHistory.create({
      data: {
        userId: user.id,
        ipAddress: request.deviceInfo?.ipAddress || 'unknown',
        userAgent: request.deviceInfo?.userAgent || 'unknown',
        success: true,
        mfaUsed: user.mfaEnabled,
      },
    });
    
    logger.info({ 
      userId: user.id,
      email: user.email,
      tenantSlug: request.tenantSlug,
      roles 
    }, 'Tenant user login successful');
    
    return {
      success: true,
      requiresMfa: false,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 15 * 60, // 15 minutes
      },
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar || undefined,
        tenantId: tenantInfo.id,
        tenantSlug: tenantInfo.slug,
        tenantName: tenantInfo.name,
        roles,
        permissions,
      },
    };
    
  } catch (error) {
    logger.error({ 
      error, 
      email: request.email,
      tenantSlug: request.tenantSlug 
    }, 'Tenant user login error');
    throw error;
  }
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

interface TenantUser {
  id: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  permissions: string[];
}

function generateTenantTokens(user: TenantUser) {
  const accessTokenPayload = {
    sub: user.id,
    email: user.email,
    type: 'tenant_user',
    domain: 'subdomain',
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    roles: user.roles,
    permissions: user.permissions,
    jti: uuidv4(),
  };
  
  const refreshTokenPayload = {
    sub: user.id,
    type: 'tenant_user',
    tenantId: user.tenantId,
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
// HELPER FUNCTIONS
// ============================================================================

function extractPermissions(userRoles: any[]): string[] {
  const permissions = new Set<string>();
  
  for (const userRole of userRoles) {
    for (const rolePermission of userRole.role.permissions || []) {
      const perm = rolePermission.permission;
      permissions.add(`${perm.resource}:${perm.action}`);
    }
  }
  
  return Array.from(permissions);
}

function hashToken(token: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================================================
// LOGOUT
// ============================================================================

export async function logoutTenantUser(
  tenantSlug: string,
  userId: string,
  sessionId?: string
): Promise<void> {
  const dbManager = getTenantDbManager();
  const prisma = await dbManager.getClientBySlug(tenantSlug);
  
  if (sessionId) {
    await (prisma as any).userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  } else {
    await (prisma as any).userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  
  logger.info({ userId, tenantSlug, sessionId }, 'Tenant user logged out');
}

export default {
  loginTenantUser,
  logoutTenantUser,
};
