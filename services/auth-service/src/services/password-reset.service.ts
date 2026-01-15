/**
 * Password Reset Service
 * Handles forgot password and reset password flows for both platform admins and tenant users
 */

import { getTenantDbManager } from '@oms/tenant-db-manager';
import { getMasterPrisma } from '../utils/database';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config';

interface ForgotPasswordRequest {
  email: string;
  type: 'platform_admin' | 'tenant_user';
  tenantSlug?: string;
}

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  type: 'platform_admin' | 'tenant_user';
  tenantSlug?: string;
}

interface ForgotPasswordResult {
  success: boolean;
  message?: string;
  error?: { code: string; message: string };
}

interface ResetPasswordResult {
  success: boolean;
  message?: string;
  error?: { code: string; message: string };
}

// Token expires in 1 hour
const TOKEN_EXPIRY_HOURS = 1;

/**
 * Generate a secure random token
 */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Request password reset for platform admin
 */
export async function forgotPasswordPlatformAdmin(
  email: string
): Promise<ForgotPasswordResult> {
  try {
    const prisma = getMasterPrisma();
    
    // Find admin by email
    const admin = await prisma.platformAdmin.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    // Always return success to prevent email enumeration
    if (!admin) {
      logger.info({ email }, 'Password reset requested for non-existent platform admin');
      return {
        success: true,
        message: 'If an account with this email exists, a password reset link will be sent.',
      };
    }
    
    // Check if account is active
    if (admin.status !== 'ACTIVE') {
      logger.warn({ email, status: admin.status }, 'Password reset attempted for inactive admin');
      return {
        success: true,
        message: 'If an account with this email exists, a password reset link will be sent.',
      };
    }
    
    // Generate token
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    
    // Invalidate any existing tokens
    await prisma.passwordResetToken.updateMany({
      where: { adminId: admin.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    
    // Create new token
    await prisma.passwordResetToken.create({
      data: {
        adminId: admin.id,
        token,
        expiresAt,
      },
    });
    
    // TODO: Send email with reset link
    // For now, log the token (in production, this should be removed)
    const resetLink = `${config.appUrl}/reset-password?token=${token}&type=platform`;
    logger.info({ email, resetLink }, 'Password reset link generated for platform admin');
    
    // In a real implementation, you would call the notification service here:
    // await notificationService.sendPasswordResetEmail(admin.email, resetLink);
    
    return {
      success: true,
      message: 'If an account with this email exists, a password reset link will be sent.',
    };
  } catch (error) {
    logger.error({ error, email }, 'Error in forgotPasswordPlatformAdmin');
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred processing your request' },
    };
  }
}

/**
 * Request password reset for tenant user
 */
export async function forgotPasswordTenantUser(
  email: string,
  tenantSlug: string
): Promise<ForgotPasswordResult> {
  try {
    const dbManager = getTenantDbManager();
    const tenantClient = await dbManager.getClientBySlug(tenantSlug);
    
    if (!tenantClient) {
      logger.warn({ tenantSlug }, 'Password reset attempted for invalid tenant');
      return {
        success: true,
        message: 'If an account with this email exists, a password reset link will be sent.',
      };
    }
    
    // Find user by email
    const user = await (tenantClient as any).user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!user) {
      logger.info({ email, tenantSlug }, 'Password reset requested for non-existent tenant user');
      return {
        success: true,
        message: 'If an account with this email exists, a password reset link will be sent.',
      };
    }
    
    // Check if account is active
    if (user.status !== 'ACTIVE') {
      logger.warn({ email, tenantSlug, status: user.status }, 'Password reset attempted for inactive user');
      return {
        success: true,
        message: 'If an account with this email exists, a password reset link will be sent.',
      };
    }
    
    // Generate token
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    
    // Invalidate any existing tokens
    await (tenantClient as any).passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    
    // Create new token
    await (tenantClient as any).passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });
    
    // TODO: Send email with reset link
    const resetLink = `${config.appUrl}/reset-password?token=${token}&type=tenant&slug=${tenantSlug}`;
    logger.info({ email, tenantSlug, resetLink }, 'Password reset link generated for tenant user');
    
    return {
      success: true,
      message: 'If an account with this email exists, a password reset link will be sent.',
    };
  } catch (error) {
    logger.error({ error, email, tenantSlug }, 'Error in forgotPasswordTenantUser');
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred processing your request' },
    };
  }
}

/**
 * Reset password for platform admin
 */
export async function resetPasswordPlatformAdmin(
  token: string,
  newPassword: string
): Promise<ResetPasswordResult> {
  try {
    const prisma = getMasterPrisma();
    
    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { admin: true },
    });
    
    if (!resetToken) {
      return {
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' },
      };
    }
    
    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      return {
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Reset token has expired' },
      };
    }
    
    // Check if token has been used
    if (resetToken.usedAt) {
      return {
        success: false,
        error: { code: 'TOKEN_USED', message: 'Reset token has already been used' },
      };
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      return {
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' },
      };
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Update password and mark token as used
    await prisma.$transaction([
      prisma.platformAdmin.update({
        where: { id: resetToken.adminId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          loginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all sessions for security
      prisma.platformAdminSession.updateMany({
        where: { adminId: resetToken.adminId },
        data: { revokedAt: new Date() },
      }),
    ]);
    
    logger.info({ adminId: resetToken.adminId }, 'Password reset successful for platform admin');
    
    return {
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.',
    };
  } catch (error) {
    logger.error({ error }, 'Error in resetPasswordPlatformAdmin');
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred processing your request' },
    };
  }
}

/**
 * Reset password for tenant user
 */
export async function resetPasswordTenantUser(
  token: string,
  newPassword: string,
  tenantSlug: string
): Promise<ResetPasswordResult> {
  try {
    const dbManager = getTenantDbManager();
    const tenantClient = await dbManager.getClientBySlug(tenantSlug);
    
    if (!tenantClient) {
      return {
        success: false,
        error: { code: 'INVALID_TENANT', message: 'Invalid tenant' },
      };
    }
    
    // Find valid token
    const resetToken = await (tenantClient as any).passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });
    
    if (!resetToken) {
      return {
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' },
      };
    }
    
    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      return {
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Reset token has expired' },
      };
    }
    
    // Check if token has been used
    if (resetToken.usedAt) {
      return {
        success: false,
        error: { code: 'TOKEN_USED', message: 'Reset token has already been used' },
      };
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      return {
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' },
      };
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Update password and mark token as used
    await (tenantClient as any).$transaction([
      (tenantClient as any).user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          loginAttempts: 0,
          lockedUntil: null,
        },
      }),
      (tenantClient as any).passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all sessions for security
      (tenantClient as any).userSession.updateMany({
        where: { userId: resetToken.userId },
        data: { revokedAt: new Date() },
      }),
    ]);
    
    logger.info({ userId: resetToken.userId, tenantSlug }, 'Password reset successful for tenant user');
    
    return {
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.',
    };
  } catch (error) {
    logger.error({ error, tenantSlug }, 'Error in resetPasswordTenantUser');
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred processing your request' },
    };
  }
}

/**
 * Unified forgot password handler
 */
export async function forgotPassword(request: ForgotPasswordRequest): Promise<ForgotPasswordResult> {
  if (request.type === 'platform_admin') {
    return forgotPasswordPlatformAdmin(request.email);
  } else if (request.tenantSlug) {
    return forgotPasswordTenantUser(request.email, request.tenantSlug);
  }
  return {
    success: false,
    error: { code: 'INVALID_REQUEST', message: 'Invalid request type' },
  };
}

/**
 * Unified reset password handler
 */
export async function resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResult> {
  if (request.type === 'platform_admin') {
    return resetPasswordPlatformAdmin(request.token, request.newPassword);
  } else if (request.tenantSlug) {
    return resetPasswordTenantUser(request.token, request.newPassword, request.tenantSlug);
  }
  return {
    success: false,
    error: { code: 'INVALID_REQUEST', message: 'Invalid request type' },
  };
}
