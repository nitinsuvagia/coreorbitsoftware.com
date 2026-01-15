/**
 * Auth Service - Token Refresh Service
 * 
 * Handles token refresh for both platform admins and tenant users
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getMasterPrisma } from '../utils/database';
import { getTenantDbManager } from '@oms/tenant-db-manager';
import { signToken } from '../utils/jwt-helper';

// ============================================================================
// TYPES
// ============================================================================

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
  };
}

export interface RefreshTokenResponse {
  success: boolean;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface RefreshTokenPayload {
  sub: string;
  type: 'platform_admin' | 'tenant_user';
  tenantId?: string;
  jti: string;
  family: string;
  iat: number;
  exp: number;
}

// ============================================================================
// REFRESH TOKEN
// ============================================================================

export async function refreshToken(
  request: RefreshTokenRequest
): Promise<RefreshTokenResponse> {
  try {
    // Verify refresh token
    const payload = jwt.verify(
      request.refreshToken, 
      config.jwtSecret
    ) as RefreshTokenPayload;
    
    // Route to appropriate handler
    if (payload.type === 'platform_admin') {
      return refreshPlatformAdminToken(payload, request);
    } else {
      return refreshTenantUserToken(payload, request);
    }
    
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Refresh token has expired. Please login again.',
        },
      };
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid refresh token.',
        },
      };
    }
    
    logger.error({ error }, 'Token refresh error');
    throw error;
  }
}

// ============================================================================
// PLATFORM ADMIN TOKEN REFRESH
// ============================================================================

async function refreshPlatformAdminToken(
  payload: RefreshTokenPayload,
  request: RefreshTokenRequest
): Promise<RefreshTokenResponse> {
  const prisma = getMasterPrisma();
  const tokenHash = hashToken(request.refreshToken);
  
  // Find session
  const session = await prisma.platformAdminSession.findUnique({
    where: { tokenHash },
    include: { admin: true },
  });
  
  if (!session) {
    logger.warn('Platform admin token refresh failed: session not found');
    return {
      success: false,
      error: {
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found. Please login again.',
      },
    };
  }
  
  // Check if session is revoked
  if (session.revokedAt) {
    // Possible token reuse - revoke all sessions in this family
    await prisma.platformAdminSession.updateMany({
      where: { tokenFamily: session.tokenFamily },
      data: { revokedAt: new Date() },
    });
    
    logger.warn({ 
      adminId: session.adminId,
      family: session.tokenFamily 
    }, 'Platform admin token reuse detected');
    
    return {
      success: false,
      error: {
        code: 'TOKEN_REUSED',
        message: 'Security alert: Token reuse detected. All sessions have been revoked.',
      },
    };
  }
  
  // Check if session is expired
  if (session.expiresAt < new Date()) {
    return {
      success: false,
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Session has expired. Please login again.',
      },
    };
  }
  
  // Check admin status
  if (session.admin.status !== 'ACTIVE') {
    return {
      success: false,
      error: {
        code: 'ACCOUNT_INACTIVE',
        message: 'Account is no longer active.',
      },
    };
  }
  
  // Generate new tokens
  const newAccessToken = signToken({
    sub: session.admin.id,
    email: session.admin.email,
    type: 'platform_admin',
    domain: 'main',
    platformRole: session.admin.role,
    jti: uuidv4(),
  }, config.jwtSecret, {
    expiresIn: config.jwtAccessTokenExpiry,
    issuer: config.jwtIssuer,
  });
  
  const newRefreshToken = signToken({
    sub: session.admin.id,
    type: 'platform_admin',
    jti: uuidv4(),
    family: session.tokenFamily, // Keep same family for rotation tracking
  }, config.jwtSecret, {
    expiresIn: config.jwtRefreshTokenExpiry,
    issuer: config.jwtIssuer,
  });
  
  // Rotate token - revoke old, create new
  await prisma.platformAdminSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });
  
  await prisma.platformAdminSession.create({
    data: {
      adminId: session.adminId,
      tokenHash: hashToken(newRefreshToken),
      tokenFamily: session.tokenFamily,
      ipAddress: request.deviceInfo?.ipAddress || session.ipAddress,
      userAgent: request.deviceInfo?.userAgent || session.userAgent,
      deviceId: session.deviceId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  
  logger.info({ adminId: session.adminId }, 'Platform admin token refreshed');
  
  return {
    success: true,
    tokens: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
    },
  };
}

// ============================================================================
// TENANT USER TOKEN REFRESH
// ============================================================================

async function refreshTenantUserToken(
  payload: RefreshTokenPayload,
  request: RefreshTokenRequest
): Promise<RefreshTokenResponse> {
  if (!payload.tenantId) {
    return {
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid refresh token: missing tenant context.',
      },
    };
  }
  
  const dbManager = getTenantDbManager();
  
  // Get tenant info
  const tenantInfo = await dbManager.getTenantById(payload.tenantId);
  
  if (tenantInfo.status === 'SUSPENDED' || tenantInfo.status === 'TERMINATED') {
    return {
      success: false,
      error: {
        code: 'TENANT_SUSPENDED',
        message: 'Organization account has been suspended.',
      },
    };
  }
  
  const prisma = await dbManager.getClientById(payload.tenantId);
  const tokenHash = hashToken(request.refreshToken);
  
  // Find session
  const session = await (prisma as any).userSession.findUnique({
    where: { tokenHash },
    include: { 
      user: {
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  
  if (!session) {
    return {
      success: false,
      error: {
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found. Please login again.',
      },
    };
  }
  
  // Check if session is revoked
  if (session.revokedAt) {
    await (prisma as any).userSession.updateMany({
      where: { tokenFamily: session.tokenFamily },
      data: { revokedAt: new Date() },
    });
    
    logger.warn({ 
      userId: session.userId,
      tenantId: payload.tenantId 
    }, 'Tenant user token reuse detected');
    
    return {
      success: false,
      error: {
        code: 'TOKEN_REUSED',
        message: 'Security alert: Token reuse detected. All sessions have been revoked.',
      },
    };
  }
  
  // Check if session is expired
  if (session.expiresAt < new Date()) {
    return {
      success: false,
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Session has expired. Please login again.',
      },
    };
  }
  
  // Check user status
  if (session.user.status !== 'ACTIVE') {
    return {
      success: false,
      error: {
        code: 'ACCOUNT_INACTIVE',
        message: 'Account is no longer active.',
      },
    };
  }
  
  // Extract roles and permissions
  const roles = session.user.roles.map((ur: any) => ur.role.slug);
  const permissions = extractPermissions(session.user.roles);
  
  // Generate new tokens
  const newAccessToken = signToken({
    sub: session.user.id,
    email: session.user.email,
    type: 'tenant_user',
    domain: 'subdomain',
    tenantId: tenantInfo.id,
    tenantSlug: tenantInfo.slug,
    roles,
    permissions,
    jti: uuidv4(),
  }, config.jwtSecret, {
    expiresIn: config.jwtAccessTokenExpiry,
    issuer: config.jwtIssuer,
  });
  
  const newRefreshToken = signToken({
    sub: session.user.id,
    type: 'tenant_user',
    tenantId: tenantInfo.id,
    jti: uuidv4(),
    family: session.tokenFamily,
  }, config.jwtSecret, {
    expiresIn: config.jwtRefreshTokenExpiry,
    issuer: config.jwtIssuer,
  });
  
  // Rotate token
  await (prisma as any).userSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });
  
  await (prisma as any).userSession.create({
    data: {
      userId: session.userId,
      tokenHash: hashToken(newRefreshToken),
      tokenFamily: session.tokenFamily,
      ipAddress: request.deviceInfo?.ipAddress || session.ipAddress,
      userAgent: request.deviceInfo?.userAgent || session.userAgent,
      deviceId: session.deviceId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  
  logger.info({ 
    userId: session.userId,
    tenantId: payload.tenantId 
  }, 'Tenant user token refreshed');
  
  return {
    success: true,
    tokens: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function hashToken(token: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

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

export default {
  refreshToken,
};
