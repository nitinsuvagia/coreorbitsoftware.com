/**
 * Auth Service - Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { loginPlatformAdmin, logoutPlatformAdmin } from '../services/platform-auth.service';
import { loginTenantUser, logoutTenantUser } from '../services/tenant-auth.service';
import { refreshToken } from '../services/token.service';
import { forgotPassword, resetPassword } from '../services/password-reset.service';
import { 
  requestEmailVerification, 
  verifyEmail, 
  resendVerificationEmail 
} from '../services/email-verification.service';
import * as ssoService from '../services/sso.service';
import { logger } from '../utils/logger';
import { getTenantDbManager } from '@oms/tenant-db-manager';
import { getMasterPrisma } from '../utils/database';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const profileUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  dateFormat: z.string().optional(),
  skills: z.array(z.string()).optional(),
  location: z.string().optional(),
  avatar: z.string().nullable().optional(),
});

// ============================================================================
// HELPERS
// ============================================================================

function buildDisplayName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

async function fetchPlatformProfile(userId: string) {
  const prisma = getMasterPrisma();
  const admin = await prisma.platformAdmin.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      role: true,
      avatar: true,
      phone: true,
      timezone: true,
      language: true,
    },
  });
  if (!admin) {
    return null;
  }
  return {
    id: admin.id,
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    phone: admin.phone || undefined,
    avatar: admin.avatar || undefined,
    timezone: admin.timezone || undefined,
    language: admin.language || undefined,
    role: admin.role,
    isPlatformAdmin: true,
  };
}

async function fetchTenantProfile(tenantSlug: string, userId: string) {
  const dbManager = getTenantDbManager();
  const prisma = await dbManager.getClientBySlug(tenantSlug);
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    include: {
      employee: {
        include: {
          department: { select: { name: true } },
          designation: { select: { name: true } },
          reportingManager: { select: { firstName: true, lastName: true } },
        },
      },
      roles: { include: { role: true } },
    },
  });

  if (!user) {
    return null;
  }

  const employee = user.employee;
  const metadata = (employee?.metadata as Record<string, any> | null) || {};
  const managerName = employee?.reportingManager
    ? buildDisplayName(employee.reportingManager.firstName, employee.reportingManager.lastName)
    : undefined;

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || undefined,
    avatar: user.avatar || undefined,
    bio: metadata.bio || undefined,
    timezone: user.timezone || undefined,
    language: user.language || undefined,
    dateFormat: metadata.dateFormat || undefined,
    skills: employee?.skills || [],
    location: employee?.workLocation || undefined,
    role: employee?.designation?.name || undefined,
    department: employee?.department?.name || undefined,
    manager: managerName,
    joinDate: employee?.joinDate ? employee.joinDate.toISOString() : undefined,
    employeeId: employee?.employeeCode || undefined,
    roles: user.roles?.map((userRole: any) => userRole.role.slug) || [],
  };
}

// ============================================================================
// PLATFORM ADMIN LOGIN (Main Domain Only)
// ============================================================================

router.post('/platform/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
          details: parsed.error.errors,
        },
      });
    }
    
    // Check domain type from gateway header
    const domainType = req.headers['x-domain-type'];
    if (domainType !== 'main') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'WRONG_DOMAIN',
          message: 'Platform admin login is only available on the main domain.',
        },
      });
    }
    
    const result = await loginPlatformAdmin({
      email: parsed.data.email,
      password: parsed.data.password,
      mfaCode: parsed.data.mfaCode,
      deviceInfo: {
        userAgent: req.headers['user-agent'] || 'unknown',
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
      },
    });
    
    if (!result.success) {
      const statusCode = result.error?.code === 'INVALID_CREDENTIALS' ? 401 : 400;
      return res.status(statusCode).json(result);
    }
    if (result.tokens?.accessToken) {
      res.cookie('accessToken', result.tokens.accessToken, {
        httpOnly: false, // set to true for extra security if you don't need JS access
        secure: false,   // set to true if using HTTPS
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
    }
    res.json(result);
    
  } catch (error) {
    logger.error({ error }, 'Platform login route error');
    next(error);
  }
});

// ============================================================================
// TENANT USER LOGIN (Subdomain Only)
// ============================================================================

router.post('/tenant/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
    }
    
    // Get tenant slug from gateway header
    const tenantSlug = req.headers['x-tenant-slug']?.toString();
    const domainType = req.headers['x-domain-type'];
    
    if (domainType === 'main') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'WRONG_DOMAIN',
          message: 'Tenant user login is not available on the main domain. Please use your organization subdomain.',
        },
      });
    }
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_REQUIRED',
          message: 'Tenant context is required for login.',
        },
      });
    }
    
    const result = await loginTenantUser({
      email: parsed.data.email,
      password: parsed.data.password,
      tenantSlug,
      mfaCode: parsed.data.mfaCode,
      rememberMe: parsed.data.rememberMe,
      deviceInfo: {
        userAgent: req.headers['user-agent'] || 'unknown',
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
      },
    });
    
    if (!result.success) {
      const statusCode = result.error?.code === 'INVALID_CREDENTIALS' ? 401 : 400;
      return res.status(statusCode).json(result);
    }
    if (result.tokens?.accessToken) {
      res.cookie('accessToken', result.tokens.accessToken, {
        httpOnly: false, // set to true for extra security if you don't need JS access
        secure: false,   // set to true if using HTTPS
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
    }
    res.json(result);
    
  } catch (error) {
    logger.error({ error }, 'Tenant login route error');
    next(error);
  }
});

// ============================================================================
// UNIFIED LOGIN (Auto-detect based on domain)
// ============================================================================

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const domainType = req.headers['x-domain-type'];
    const tenantSlug = req.headers['x-tenant-slug']?.toString();
    
    // Validate request body
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
    }
    
    // Route to appropriate login handler
    if (domainType === 'main') {
      // Platform admin login
      const result = await loginPlatformAdmin({
        email: parsed.data.email,
        password: parsed.data.password,
        mfaCode: parsed.data.mfaCode,
        deviceInfo: {
          userAgent: req.headers['user-agent'] || 'unknown',
          ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
        },
      });
      
      if (!result.success) {
        const statusCode = result.error?.code === 'INVALID_CREDENTIALS' ? 401 : 400;
        return res.status(statusCode).json(result);
      }
      if (result.tokens?.accessToken) {
        res.cookie('accessToken', result.tokens.accessToken, {
          httpOnly: false, // set to true for extra security if you don't need JS access
          secure: false,   // set to true if using HTTPS
          sameSite: 'lax',
          path: '/',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
      }
      return res.json(result);
    }
    
    // Tenant user login
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_REQUIRED',
          message: 'Tenant context is required for login.',
        },
      });
    }
    
    const result = await loginTenantUser({
      email: parsed.data.email,
      password: parsed.data.password,
      tenantSlug,
      mfaCode: parsed.data.mfaCode,
      rememberMe: parsed.data.rememberMe,
      deviceInfo: {
        userAgent: req.headers['user-agent'] || 'unknown',
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
      },
    });
    
    if (!result.success) {
      const statusCode = result.error?.code === 'INVALID_CREDENTIALS' ? 401 : 400;
      return res.status(statusCode).json(result);
    }
    if (result.tokens?.accessToken) {
      res.cookie('accessToken', result.tokens.accessToken, {
        httpOnly: false, // set to true for extra security if you don't need JS access
        secure: false,   // set to true if using HTTPS
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
    }
    return res.json(result);
    
  } catch (error) {
    logger.error({ error }, 'Unified login route error');
    next(error);
  }
});

// ============================================================================
// TOKEN REFRESH
// ============================================================================

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
    }
    
    const result = await refreshToken({
      refreshToken: parsed.data.refreshToken,
      deviceInfo: {
        userAgent: req.headers['user-agent'] || 'unknown',
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
      },
    });
    
    if (!result.success) {
      return res.status(401).json(result);
    }
    
    res.json(result);
    
  } catch (error) {
    logger.error({ error }, 'Token refresh route error');
    next(error);
  }
});

// ============================================================================
// FORGOT PASSWORD
// ============================================================================

router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
    }
    
    const domainType = req.headers['x-domain-type'];
    const tenantSlug = req.headers['x-tenant-slug']?.toString();
    
    const result = await forgotPassword({
      email: parsed.data.email,
      type: domainType === 'main' ? 'platform_admin' : 'tenant_user',
      tenantSlug,
    });
    
    // Always return 200 to prevent email enumeration
    res.json(result);
    
  } catch (error) {
    logger.error({ error }, 'Forgot password route error');
    next(error);
  }
});

// ============================================================================
// RESET PASSWORD
// ============================================================================

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
    }
    
    // Get type from query param or body
    const type = (req.query.type || req.body.type) as string;
    const tenantSlug = (req.query.slug || req.body.tenantSlug || req.headers['x-tenant-slug']) as string;
    
    const result = await resetPassword({
      token: parsed.data.token,
      newPassword: parsed.data.newPassword,
      type: type === 'platform' ? 'platform_admin' : 'tenant_user',
      tenantSlug,
    });
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
    
  } catch (error) {
    logger.error({ error }, 'Reset password route error');
    next(error);
  }
});

// ============================================================================
// MFA VERIFY (Separate endpoint for two-step MFA verification)
// ============================================================================

const mfaVerifySchema = z.object({
  code: z.string().min(6, 'MFA code is required'),
  mfaToken: z.string().min(1, 'MFA token is required'),
});

router.post('/mfa/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = mfaVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
    }

    const { code, mfaToken } = parsed.data;
    
    // Decode MFA token to get user info
    // The mfaToken contains: { userId, email, tenantSlug?, type: 'platform' | 'tenant' }
    let tokenPayload: any;
    try {
      const jwt = require('jsonwebtoken');
      tokenPayload = jwt.verify(mfaToken, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired MFA token',
        },
      });
    }

    const { userId, email, tenantSlug, type } = tokenPayload;
    
    // Import speakeasy for TOTP verification
    const speakeasy = require('speakeasy');
    
    if (type === 'platform') {
      // Platform admin MFA verification
      const prisma = getMasterPrisma();
      const admin = await prisma.platformAdmin.findUnique({ where: { id: userId } });
      
      if (!admin || !admin.mfaEnabled || !admin.mfaSecret) {
        return res.status(400).json({
          success: false,
          error: { code: 'MFA_NOT_ENABLED', message: 'MFA is not enabled for this account' },
        });
      }
      
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
      
      // MFA verified - complete login
      const result = await loginPlatformAdmin({
        email: admin.email,
        password: '', // Skip password check
        mfaCode: code,
        skipPasswordCheck: true,
        deviceInfo: {
          userAgent: req.headers['user-agent'] || 'unknown',
          ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
        },
      });
      
      if (result.tokens?.accessToken) {
        res.cookie('accessToken', result.tokens.accessToken, {
          httpOnly: false,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 24 * 60 * 60 * 1000,
        });
      }
      
      return res.json(result);
    } else {
      // Tenant user MFA verification
      if (!tenantSlug) {
        return res.status(400).json({
          success: false,
          error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' },
        });
      }
      
      const dbManager = getTenantDbManager();
      const prisma = await dbManager.getClientBySlug(tenantSlug);
      const user = await (prisma as any).user.findUnique({ where: { id: userId } });
      
      if (!user || !user.mfaEnabled || !user.mfaSecret) {
        return res.status(400).json({
          success: false,
          error: { code: 'MFA_NOT_ENABLED', message: 'MFA is not enabled for this account' },
        });
      }
      
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
      
      // MFA verified - complete login
      const result = await loginTenantUser({
        tenantSlug,
        email: user.email,
        password: '', // Skip password check
        mfaCode: code,
        skipPasswordCheck: true,
        deviceInfo: {
          userAgent: req.headers['user-agent'] || 'unknown',
          ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
        },
      });
      
      if (result.tokens?.accessToken) {
        res.cookie('accessToken', result.tokens.accessToken, {
          httpOnly: false,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 24 * 60 * 60 * 1000,
        });
      }
      
      return res.json(result);
    }
  } catch (error) {
    logger.error({ error }, 'MFA verify route error');
    next(error);
  }
});

// ============================================================================
// LOGOUT
// ============================================================================

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id']?.toString();
    const userType = req.headers['x-user-type']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();
    const sessionId = req.body.sessionId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }
    
    if (userType === 'platform_admin') {
      await logoutPlatformAdmin(userId, sessionId);
    } else if (tenantSlug) {
      await logoutTenantUser(tenantSlug, userId, sessionId);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
    
  } catch (error) {
    logger.error({ error }, 'Logout route error');
    next(error);
  }
});

// ============================================================================
// GET CURRENT USER
// ============================================================================

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id']?.toString();
    const userType = req.headers['x-user-type']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Platform admin user
    if (userType === 'platform_admin') {
      const adminProfile = await fetchPlatformProfile(userId);
      if (!adminProfile) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      }
      res.json({
        success: true,
        data: adminProfile,
      });
      return;
    }

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context missing' },
      });
    }

    const tenantProfile = await fetchTenantProfile(tenantSlug, userId);
    if (!tenantProfile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const dbManager = getTenantDbManager();
    const tenantInfo = await dbManager.getTenantBySlug(tenantSlug);
    const role = tenantProfile.roles?.[0] || 'tenant_user';

    res.json({
      success: true,
      data: {
        id: tenantProfile.id,
        email: tenantProfile.email,
        firstName: tenantProfile.firstName,
        lastName: tenantProfile.lastName,
        avatar: tenantProfile.avatar,
        role,
        roles: tenantProfile.roles,
        tenantId: tenantInfo.id,
        tenantSlug: tenantInfo.slug,
        isPlatformAdmin: false,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get current user error');
    next(error);
  }
});

// ============================================================================
// USER PROFILE
// ============================================================================

router.get('/users/profile', async (req: Request, res: Response, next: NextFunction) => {
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
      const profile = await fetchPlatformProfile(userId);
      if (!profile) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      }
      return res.json({ success: true, data: profile });
    }

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context missing' },
      });
    }

    const profile = await fetchTenantProfile(tenantSlug, userId);
    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    return res.json({ success: true, data: profile });
  } catch (error) {
    logger.error({ error }, 'Get user profile error');
    next(error);
  }
});

router.put('/users/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = profileUpdateSchema.safeParse(req.body);
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

    if (userType === 'platform_admin') {
      const prisma = getMasterPrisma();
      const admin = await prisma.platformAdmin.findUnique({ where: { id: userId } });
      if (!admin) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      }

      const data: Record<string, any> = {};
      if (parsed.data.firstName !== undefined) data.firstName = parsed.data.firstName;
      if (parsed.data.lastName !== undefined) data.lastName = parsed.data.lastName;
      if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
      if (parsed.data.timezone !== undefined) data.timezone = parsed.data.timezone;
      if (parsed.data.language !== undefined) data.language = parsed.data.language;
      if (parsed.data.avatar !== undefined) data.avatar = parsed.data.avatar;

      if (parsed.data.firstName !== undefined || parsed.data.lastName !== undefined) {
        const firstName = parsed.data.firstName ?? admin.firstName;
        const lastName = parsed.data.lastName ?? admin.lastName;
        data.displayName = buildDisplayName(firstName, lastName);
      }

      await prisma.platformAdmin.update({
        where: { id: userId },
        data,
      });

      const profile = await fetchPlatformProfile(userId);
      return res.json({ success: true, data: profile });
    }

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context missing' },
      });
    }

    const dbManager = getTenantDbManager();
    const prisma = await dbManager.getClientBySlug(tenantSlug);
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const userUpdate: Record<string, any> = {};
    if (parsed.data.firstName !== undefined) userUpdate.firstName = parsed.data.firstName;
    if (parsed.data.lastName !== undefined) userUpdate.lastName = parsed.data.lastName;
    if (parsed.data.phone !== undefined) userUpdate.phone = parsed.data.phone;
    if (parsed.data.timezone !== undefined) userUpdate.timezone = parsed.data.timezone;
    if (parsed.data.language !== undefined) userUpdate.language = parsed.data.language;
    if (parsed.data.avatar !== undefined) userUpdate.avatar = parsed.data.avatar;

    if (parsed.data.firstName !== undefined || parsed.data.lastName !== undefined) {
      const firstName = parsed.data.firstName ?? user.firstName;
      const lastName = parsed.data.lastName ?? user.lastName;
      userUpdate.displayName = buildDisplayName(firstName, lastName);
    }

    const employeeUpdate: Record<string, any> = {};
    if (user.employeeId) {
      if (parsed.data.firstName !== undefined) employeeUpdate.firstName = parsed.data.firstName;
      if (parsed.data.lastName !== undefined) employeeUpdate.lastName = parsed.data.lastName;
      if (parsed.data.phone !== undefined) employeeUpdate.phone = parsed.data.phone;
      if (parsed.data.location !== undefined) employeeUpdate.workLocation = parsed.data.location;
      if (parsed.data.timezone !== undefined) employeeUpdate.timezone = parsed.data.timezone;
      if (parsed.data.skills !== undefined) employeeUpdate.skills = parsed.data.skills;
      if (parsed.data.avatar !== undefined) employeeUpdate.avatar = parsed.data.avatar;

      const metadata = { ...((user.employee?.metadata as Record<string, any>) || {}) };
      if (parsed.data.bio !== undefined) metadata.bio = parsed.data.bio;
      if (parsed.data.dateFormat !== undefined) metadata.dateFormat = parsed.data.dateFormat;
      if (Object.keys(metadata).length) employeeUpdate.metadata = metadata;
    }

    await (prisma as any).$transaction(async (tx: any) => {
      if (Object.keys(userUpdate).length) {
        await tx.user.update({
          where: { id: userId },
          data: userUpdate,
        });
      }

      if (user.employeeId && Object.keys(employeeUpdate).length) {
        await tx.employee.update({
          where: { id: user.employeeId },
          data: employeeUpdate,
        });
      }
    });

    const profile = await fetchTenantProfile(tenantSlug, userId);
    return res.json({ success: true, data: profile });
  } catch (error) {
    logger.error({ error }, 'Update user profile error');
    next(error);
  }
});

// ============================================================================
// CHANGE PASSWORD
// ============================================================================

router.post('/change-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
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

    if (userType === 'platform_admin') {
      const prisma = getMasterPrisma();
      const admin = await prisma.platformAdmin.findUnique({ where: { id: userId } });
      if (!admin) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      }

      const isValid = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' },
        });
      }

      const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
      await prisma.platformAdmin.update({
        where: { id: userId },
        data: {
          passwordHash: newHash,
          passwordChangedAt: new Date(),
        },
      });

      return res.json({ success: true });
    }

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context missing' },
      });
    }

    const dbManager = getTenantDbManager();
    const prisma = await dbManager.getClientBySlug(tenantSlug);
    const user = await (prisma as any).user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        error: { code: 'PASSWORD_NOT_SET', message: 'Password not set for this account' },
      });
    }

    const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' },
      });
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await (prisma as any).user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        passwordChangedAt: new Date(),
      },
    });

    return res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Change password error');
    next(error);
  }
});

// ============================================================================
// EMAIL VERIFICATION ROUTES
// ============================================================================

/**
 * Verify email with token
 * POST /verify-email
 */
router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
    }

    const { token } = parsed.data;
    const tenantSlug = req.headers['x-tenant-slug'] as string;

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'Tenant context required for email verification.',
        },
      });
    }

    const result = await verifyEmail(tenantSlug, token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: result.message,
        },
      });
    }

    res.json({
      success: true,
      data: {
        message: result.message,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Email verification error');
    next(error);
  }
});

/**
 * Resend verification email
 * POST /resend-verification
 */
router.post('/resend-verification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = resendVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
    }

    const { email } = parsed.data;
    const tenantSlug = req.headers['x-tenant-slug'] as string;

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'Tenant context required.',
        },
      });
    }

    const result = await resendVerificationEmail(tenantSlug, email);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'RESEND_FAILED',
          message: result.message,
        },
      });
    }

    res.json({
      success: true,
      data: {
        message: result.message,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Resend verification error');
    next(error);
  }
});

// ============================================================================
// SSO / LDAP ENDPOINTS
// ============================================================================

const ssoConfigSchema = z.object({
  type: z.enum(['saml', 'oauth', 'oidc', 'ldap']),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  config: z.record(z.any()),
});

const ldapLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * Get SSO configuration status
 * GET /sso/status
 */
router.get('/sso/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantSlug || !tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required.' },
      });
    }

    const provider = await ssoService.getSSOProvider(tenantId);

    res.json({
      success: true,
      data: {
        enabled: !!provider?.enabled,
        type: provider?.type,
        name: provider?.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Configure SSO provider (Admin only)
 * POST /sso/configure
 */
router.post('/sso/configure', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required.' },
      });
    }

    const parsed = ssoConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
    }

    const providerPayload: Omit<ssoService.SSOProviderConfig, 'id' | 'tenantId'> = {
      type: parsed.data.type,
      name: parsed.data.name,
      enabled: parsed.data.enabled,
      config: parsed.data.config as ssoService.SSOProviderConfig['config'],
    };

    const provider = await ssoService.saveSSOProvider(tenantId, providerPayload);

    res.status(201).json({
      success: true,
      data: { providerId: provider.id, type: provider.type },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Initiate SAML SSO
 * GET /sso/saml/login
 */
router.get('/sso/saml/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required.' },
      });
    }

    const result = await ssoService.generateSAMLAuthUrl(tenantSlug);

    if (!result) {
      return res.status(400).json({
        success: false,
        error: { code: 'SSO_NOT_CONFIGURED', message: 'SAML SSO is not configured for this tenant.' },
      });
    }

    res.json({
      success: true,
      data: {
        authUrl: result.url,
        relayState: result.relayState,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * SAML callback
 * POST /sso/saml/callback
 */
router.post('/sso/saml/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const { SAMLResponse, RelayState } = req.body;

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required.' },
      });
    }

    const result = await ssoService.handleSAMLCallback(tenantSlug, SAMLResponse, RelayState);

    if (!result.success || !result.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'SSO_AUTH_FAILED', message: result.error || 'Authentication failed.' },
      });
    }

    // Provision user and generate tokens
    const tenantId = req.headers['x-tenant-id'] as string;
    const tokens = await ssoService.provisionSSOUser(tenantSlug, result.user, 'saml');

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isNewUser: tokens.isNew,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Initiate OAuth/OIDC SSO
 * GET /sso/oauth/login
 */
router.get('/sso/oauth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required.' },
      });
    }

    const result = await ssoService.generateOAuthAuthUrl(tenantSlug);

    if (!result) {
      return res.status(400).json({
        success: false,
        error: { code: 'SSO_NOT_CONFIGURED', message: 'OAuth SSO is not configured for this tenant.' },
      });
    }

    res.json({
      success: true,
      data: {
        authUrl: result.url,
        state: result.state,
        codeVerifier: result.codeVerifier,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * OAuth callback
 * GET /sso/oauth/callback
 */
router.get('/sso/oauth/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const { code, state } = req.query;
    const codeVerifier = req.headers['x-code-verifier'] as string;

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required.' },
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CODE', message: 'Authorization code required.' },
      });
    }

    const result = await ssoService.handleOAuthCallback(tenantSlug, code as string, codeVerifier);

    if (!result.success || !result.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'SSO_AUTH_FAILED', message: result.error || 'Authentication failed.' },
      });
    }

    // Provision user and generate tokens
    const tokens = await ssoService.provisionSSOUser(tenantSlug, result.user, 'oauth');

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isNewUser: tokens.isNew,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * LDAP login
 * POST /sso/ldap/login
 */
router.post('/sso/ldap/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required.' },
      });
    }

    const parsed = ldapLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
    }

    const { username, password } = parsed.data;
    const result = await ssoService.authenticateLDAP(tenantSlug, username, password);

    if (!result.success || !result.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'LDAP_AUTH_FAILED', message: result.error || 'Authentication failed.' },
      });
    }

    // Provision user and generate tokens
    const tokens = await ssoService.provisionSSOUser(tenantSlug, result.user, 'ldap');

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isNewUser: tokens.isNew,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  taskReminders: z.boolean().optional(),
  leaveUpdates: z.boolean().optional(),
  projectUpdates: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  mentionAlerts: z.boolean().optional(),
  systemAnnouncements: z.boolean().optional(),
});

router.get('/users/notification-preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();
    const userType = req.headers['x-user-type']?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // Default preferences
    const defaultPrefs = {
      emailNotifications: true,
      pushNotifications: true,
      taskReminders: true,
      leaveUpdates: true,
      projectUpdates: true,
      weeklyDigest: false,
      mentionAlerts: true,
      systemAnnouncements: true,
    };

    if (userType === 'platform_admin') {
      const prisma = getMasterPrisma();
      const admin = await prisma.platformAdmin.findUnique({
        where: { id: userId },
        select: { notificationPreferences: true },
      });
      
      const prefs = (admin?.notificationPreferences as Record<string, boolean>) || {};
      return res.json({ success: true, data: { ...defaultPrefs, ...prefs } });
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
      select: { notifyEmail: true, notifyPush: true, notifyDesktop: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    // Build preferences from user flags and defaults
    const preferences = {
      ...defaultPrefs,
      emailNotifications: user.notifyEmail ?? true,
      pushNotifications: user.notifyPush ?? true,
    };

    res.json({ success: true, data: preferences });
  } catch (error) {
    logger.error({ error }, 'Get notification preferences error');
    next(error);
  }
});

router.put('/users/notification-preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();
    const userType = req.headers['x-user-type']?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const parsed = notificationPreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
    }

    if (userType === 'platform_admin') {
      const prisma = getMasterPrisma();
      await prisma.platformAdmin.update({
        where: { id: userId },
        data: { notificationPreferences: parsed.data as any },
      });
      return res.json({ success: true, message: 'Notification preferences saved' });
    }

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' },
      });
    }

    const dbManager = getTenantDbManager();
    const prisma = await dbManager.getClientBySlug(tenantSlug);
    
    await (prisma as any).user.update({
      where: { id: userId },
      data: {
        notifyEmail: parsed.data.emailNotifications,
        notifyPush: parsed.data.pushNotifications,
        notifyDesktop: parsed.data.pushNotifications, // Sync with push
      },
    });

    res.json({ success: true, message: 'Notification preferences saved' });
  } catch (error) {
    logger.error({ error }, 'Update notification preferences error');
    next(error);
  }
});

// ============================================================================
// APPEARANCE PREFERENCES
// ============================================================================

const appearancePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  accentColor: z.string().optional(),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  fontFamily: z.enum(['inter', 'roboto', 'open-sans', 'lato', 'poppins', 'montserrat', 'nunito', 'raleway', 'source-sans', 'work-sans']).optional(),
  compactMode: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  sidebarCollapsed: z.boolean().optional(),
});

router.get('/users/appearance-preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();
    const userType = req.headers['x-user-type']?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // Default preferences
    const defaultPrefs = {
      theme: 'system',
      accentColor: 'blue',
      fontSize: 'medium',
      fontFamily: 'inter',
      compactMode: false,
      reducedMotion: false,
      sidebarCollapsed: false,
    };

    if (userType === 'platform_admin') {
      const prisma = getMasterPrisma();
      const admin = await prisma.platformAdmin.findUnique({
        where: { id: userId },
        select: { appearancePreferences: true },
      });
      
      const prefs = (admin?.appearancePreferences as Record<string, any>) || {};
      return res.json({ success: true, data: { ...defaultPrefs, ...prefs } });
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
      select: { theme: true, appearancePreferences: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    const storedPrefs = (user.appearancePreferences as Record<string, any>) || {};
    const preferences = {
      ...defaultPrefs,
      ...storedPrefs,
      theme: storedPrefs.theme || user.theme?.toLowerCase() || 'system',
    };

    res.json({ success: true, data: preferences });
  } catch (error) {
    logger.error({ error }, 'Get appearance preferences error');
    next(error);
  }
});

router.put('/users/appearance-preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id']?.toString();
    const tenantSlug = req.headers['x-tenant-slug']?.toString();
    const userType = req.headers['x-user-type']?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const parsed = appearancePreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
    }

    if (userType === 'platform_admin') {
      const prisma = getMasterPrisma();
      await prisma.platformAdmin.update({
        where: { id: userId },
        data: { appearancePreferences: parsed.data as any },
      });
      return res.json({ success: true, message: 'Appearance preferences saved' });
    }

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' },
      });
    }

    const dbManager = getTenantDbManager();
    const prisma = await dbManager.getClientBySlug(tenantSlug);
    
    // Store all preferences in the JSON field
    const appearancePreferences = {
      theme: parsed.data.theme || 'system',
      accentColor: parsed.data.accentColor || 'blue',
      fontSize: parsed.data.fontSize || 'medium',
      fontFamily: parsed.data.fontFamily || 'inter',
      compactMode: parsed.data.compactMode ?? false,
      reducedMotion: parsed.data.reducedMotion ?? false,
      sidebarCollapsed: parsed.data.sidebarCollapsed ?? false,
    };
    
    const updateData: Record<string, any> = {
      appearancePreferences,
    };
    
    // Also update the theme enum field for backwards compatibility
    if (parsed.data.theme) {
      updateData.theme = parsed.data.theme.toUpperCase();
    }
    
    await (prisma as any).user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json({ success: true, message: 'Appearance preferences saved' });
  } catch (error) {
    logger.error({ error }, 'Update appearance preferences error');
    next(error);
  }
});

export default router;
