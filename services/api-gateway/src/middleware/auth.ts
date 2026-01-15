/**
 * Authentication Middleware
 * 
 * Validates JWT tokens and sets user context on request.
 * Works with domain resolver to enforce domain-based access control.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { DomainResolvedRequest } from './domain-resolver';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Decoded access token payload
 */
export interface TokenPayload {
  sub: string;          // User ID
  email: string;
  type: 'platform_admin' | 'tenant_user';
  
  // Domain context
  domain: 'main' | 'subdomain' | 'custom';
  
  // For platform admins
  platformRole?: string;
  
  // For tenant users
  tenantId?: string;
  tenantSlug?: string;
  roles?: string[];
  permissions?: string[];
  
  // Standard JWT claims
  iat: number;
  exp: number;
  jti: string;
}

/**
 * Authenticated user on request
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  type: 'platform_admin' | 'tenant_user';
  platformRole?: string;
  tenantId?: string;
  tenantSlug?: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * Extended request with authentication
 */
export interface AuthenticatedRequest extends DomainResolvedRequest {
  user?: AuthenticatedUser;
  token?: string;
  tokenPayload?: TokenPayload;
}

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

/**
 * Authentication middleware
 * Validates JWT token and sets user on request
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // No token - continue without user context
      next();
      return;
    }
    
    // Validate Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_AUTH_HEADER',
          message: 'Authorization header must use Bearer scheme',
        },
      });
      return;
    }
    
    const token = authHeader.substring(7);
    authReq.token = token;
    
    // Verify token
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    authReq.tokenPayload = payload;
    
    // Set user on request
    authReq.user = {
      id: payload.sub,
      email: payload.email,
      type: payload.type,
      platformRole: payload.platformRole,
      tenantId: payload.tenantId,
      tenantSlug: payload.tenantSlug,
      roles: payload.roles,
      permissions: payload.permissions,
    };
    
    logger.debug({
      userId: payload.sub,
      type: payload.type,
      tenantId: payload.tenantId,
    }, 'User authenticated');
    
    next();
    
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired. Please refresh or login again.',
        },
      });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token.',
        },
      });
      return;
    }
    
    logger.error({ error }, 'Auth middleware error');
    next(error);
  }
}

// ============================================================================
// REQUIRE AUTH MIDDLEWARE
// ============================================================================

/**
 * Middleware that requires authentication
 * Use this for protected routes
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip auth check for OPTIONS preflight requests (CORS)
  if (req.method === 'OPTIONS') {
    next();
    return;
  }
  
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'You must be logged in to access this resource.',
      },
    });
    return;
  }
  
  next();
}

/**
 * Middleware that requires platform admin role
 */
export function requirePlatformAdmin(allowedRoles?: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'You must be logged in to access this resource.',
        },
      });
      return;
    }
    
    if (authReq.user.type !== 'platform_admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'PLATFORM_ADMIN_REQUIRED',
          message: 'This resource is only accessible to platform administrators.',
        },
      });
      return;
    }
    
    // Check specific roles if provided
    if (allowedRoles && allowedRoles.length > 0) {
      if (!authReq.user.platformRole || !allowedRoles.includes(authReq.user.platformRole)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have the required permissions for this action.',
          },
        });
        return;
      }
    }
    
    next();
  };
}

/**
 * Middleware that requires tenant user role
 */
export function requireTenantUser(requiredRoles?: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'You must be logged in to access this resource.',
        },
      });
      return;
    }
    
    if (authReq.user.type !== 'tenant_user') {
      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_USER_REQUIRED',
          message: 'This resource is only accessible to organization users.',
        },
      });
      return;
    }
    
    // Check specific roles if provided
    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles = authReq.user.roles || [];
      const hasRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRole) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have the required role for this action.',
          },
        });
        return;
      }
    }
    
    next();
  };
}

/**
 * Middleware that requires specific permissions
 */
export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'You must be logged in to access this resource.',
        },
      });
      return;
    }
    
    const userPermissions = authReq.user.permissions || [];
    const hasPermission = permissions.every(perm => userPermissions.includes(perm));
    
    if (!hasPermission) {
      logger.warn({
        userId: authReq.user.id,
        required: permissions,
        has: userPermissions,
      }, 'Permission denied');
      
      res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to perform this action.',
        },
      });
      return;
    }
    
    next();
  };
}

export default {
  authMiddleware,
  requireAuth,
  requirePlatformAdmin,
  requireTenantUser,
  requirePermission,
};
