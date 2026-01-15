/**
 * Email Verification Service
 * Handles sending verification emails and verifying email tokens
 */

import { randomBytes } from 'crypto';
import { getTenantDbManager } from '@oms/tenant-db-manager';
import { logger } from '../utils/logger';
import { config } from '../config';

const TOKEN_EXPIRY_HOURS = 24;

interface VerificationResult {
  success: boolean;
  message: string;
}

/**
 * Request email verification for a tenant user
 */
export async function requestEmailVerification(
  tenantSlug: string,
  userId: string,
  email: string
): Promise<VerificationResult> {
  const tenantDb = getTenantDbManager();
  const prisma = await tenantDb.getClientBySlug(tenantSlug);
  
  try {
    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    
    // Invalidate any existing tokens for this user
    await prisma.emailVerificationToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
    
    // Create new token
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        email,
        token,
        expiresAt,
      },
    });
    
    // Build verification URL
    const verificationUrl = `${config.appUrl}/verify-email?token=${token}&tenant=${tenantSlug}`;
    
    // TODO: Send verification email via notification service
    // For now, log the URL for development
    logger.info({
      userId,
      email,
      verificationUrl,
    }, 'Email verification requested - send email to user');
    
    // In production, this would call the notification service
    // await notificationService.sendEmail({
    //   to: email,
    //   subject: 'Verify your email address',
    //   template: 'email-verification',
    //   data: {
    //     verificationUrl,
    //     expiresIn: `${TOKEN_EXPIRY_HOURS} hours`,
    //   },
    // });
    
    return {
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    };
  } catch (error) {
    logger.error({ error, userId, email }, 'Failed to request email verification');
    throw error;
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(
  tenantSlug: string,
  token: string
): Promise<VerificationResult> {
  const tenantDb = getTenantDbManager();
  const prisma = await tenantDb.getClientBySlug(tenantSlug);
  
  try {
    // Find valid token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });
    
    if (!verificationToken) {
      return {
        success: false,
        message: 'Invalid verification token.',
      };
    }
    
    if (verificationToken.usedAt) {
      return {
        success: false,
        message: 'This verification link has already been used.',
      };
    }
    
    if (verificationToken.expiresAt < new Date()) {
      return {
        success: false,
        message: 'Verification link has expired. Please request a new one.',
      };
    }
    
    // Mark token as used and update user
    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          // If user was pending, activate them
          status: verificationToken.user.status === 'PENDING' ? 'ACTIVE' : verificationToken.user.status,
        },
      }),
    ]);
    
    logger.info({
      userId: verificationToken.userId,
      email: verificationToken.email,
    }, 'Email verified successfully');
    
    return {
      success: true,
      message: 'Email verified successfully! You can now log in.',
    };
  } catch (error) {
    logger.error({ error, token }, 'Failed to verify email');
    throw error;
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(
  tenantSlug: string,
  email: string
): Promise<VerificationResult> {
  const tenantDb = getTenantDbManager();
  const prisma = await tenantDb.getClientBySlug(tenantSlug);
  
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      // Don't reveal if user exists
      return {
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      };
    }
    
    if (user.emailVerified) {
      return {
        success: false,
        message: 'Email is already verified.',
      };
    }
    
    // Check rate limiting - only allow resend every 2 minutes
    const recentToken = await prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 1000),
        },
      },
    });
    
    if (recentToken) {
      return {
        success: false,
        message: 'Please wait 2 minutes before requesting another verification email.',
      };
    }
    
    // Send new verification email
    return requestEmailVerification(tenantSlug, user.id, user.email);
  } catch (error) {
    logger.error({ error, email }, 'Failed to resend verification email');
    throw error;
  }
}
