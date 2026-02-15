/**
 * Domain Resolver Middleware
 * 
 * This is the CRITICAL middleware that:
 * 1. Extracts subdomain from hostname
 * 2. Determines if it's main domain or tenant subdomain
 * 3. Sets allowed user types for authentication
 * 4. Resolves tenant context for tenant subdomains
 * 
 * Security:
 * - Main domain (youroms.com) → Platform admins ONLY
 * - Tenant subdomain (acme.youroms.com) → Tenant users ONLY
 */

import { Request, Response, NextFunction } from 'express';
import { 
  resolveDomain, 
  extractSubdomain, 
  isMainDomain,
  DomainConfig 
} from '@oms/shared-utils';
import { DomainResolution, AllowedUserType, DomainType } from '@oms/shared-types';
import { 
  getTenantDbManager, 
  TenantNotFoundError, 
  TenantSuspendedError 
} from '@oms/tenant-db-manager';
import { config } from '../config';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extended request with domain resolution
 */
export interface DomainResolvedRequest extends Request {
  domainResolution: DomainResolution;
  tenantContext?: {
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    tenantStatus: string;
  };
}

// ============================================================================
// DOMAIN CONFIGURATION
// ============================================================================

const domainConfig: DomainConfig = {
  mainDomain: config.mainDomain,
  platformAdminSubdomain: config.platformAdminSubdomain,
  allowCustomDomains: config.allowCustomDomains,
  environment: config.nodeEnv as 'development' | 'staging' | 'production',
};

// ============================================================================
// DOMAIN RESOLVER MIDDLEWARE
// ============================================================================

/**
 * Resolve domain and set context on request
 */
export async function domainResolverMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const extReq = req as DomainResolvedRequest;
  
  try {
    // Check for X-Forwarded-Host first (set by proxies like Next.js rewrites)
    // Then fall back to hostname or host header
    const xForwardedHost = req.headers['x-forwarded-host']?.toString();
    const hostname = xForwardedHost || req.hostname || req.headers.host || '';
    
    // Check for tenant slug from frontend header (for cases where API is on different port)
    const tenantSlugHeader = req.headers['x-tenant-slug']?.toString();
    
    logger.debug({ 
      hostname,
      xForwardedHost,
      originalUrl: req.originalUrl,
      ip: req.ip,
      tenantSlugHeader 
    }, 'Resolving domain');
    
    // Resolve domain type and allowed users
    let resolution = resolveDomain(hostname, domainConfig);
    
    // If we have a tenant slug header but domain resolution didn't find a tenant,
    // treat this as a tenant request (for cross-origin API calls)
    if (tenantSlugHeader && !resolution.isTenantDomain) {
      resolution = {
        ...resolution,
        type: 'subdomain',
        isTenantDomain: true,
        isMainDomain: false,
        tenantSlug: tenantSlugHeader,
        allowedUserTypes: ['tenant_admin', 'tenant_user'],
      };
    }
    
    extReq.domainResolution = resolution;
    
    logger.debug({ 
      type: resolution.type,
      isMainDomain: resolution.isMainDomain,
      tenantSlug: resolution.tenantSlug,
      allowedUserTypes: resolution.allowedUserTypes 
    }, 'Domain resolved');
    
    // If it's a tenant subdomain, resolve tenant from database
    if (resolution.isTenantDomain && resolution.tenantSlug) {
      await resolveTenantContext(extReq, resolution.tenantSlug);
    }
    
    // If it's a custom domain, look up tenant mapping
    if (resolution.type === 'custom') {
      await resolveCustomDomainTenant(extReq, hostname);
    }
    
    next();
    
  } catch (error) {
    handleDomainError(error, res, next);
  }
}

/**
 * Resolve tenant context from database
 */
async function resolveTenantContext(
  req: DomainResolvedRequest,
  tenantSlug: string
): Promise<void> {
  const dbManager = getTenantDbManager();
  
  // Check if this is a reactivation route - these should bypass suspended check
  const isReactivationRoute = req.originalUrl.includes('/auth/tenant/reactivate') ||
                              req.originalUrl.includes('/auth/account/reactivate');
  
  try {
    const tenant = await dbManager.getTenantBySlug(tenantSlug);
    
    // Update resolution with tenant ID
    req.domainResolution.tenantId = tenant.id;
    
    // Set tenant context
    req.tenantContext = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      tenantStatus: tenant.status,
    };
    
    logger.debug({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      status: tenant.status 
    }, 'Tenant context resolved');
    
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      throw error; // Will be handled by error handler
    }
    if (error instanceof TenantSuspendedError) {
      // For reactivation routes, we still need to allow the request through
      if (isReactivationRoute) {
        logger.info({ tenantSlug, url: req.originalUrl }, 'Allowing reactivation request for suspended tenant');
        // Set minimal tenant context for reactivation to work
        req.tenantContext = {
          tenantId: '',
          tenantSlug: tenantSlug,
          tenantName: '',
          tenantStatus: 'SUSPENDED',
        };
        return; // Don't throw, let request proceed
      }
      throw error;
    }
    throw error;
  }
}

/**
 * Resolve tenant from custom domain mapping
 */
async function resolveCustomDomainTenant(
  req: DomainResolvedRequest,
  hostname: string
): Promise<void> {
  const dbManager = getTenantDbManager();
  const masterClient = dbManager.getMasterClient();
  
  // Look up custom domain in master database
  const customDomain = await (masterClient as any).customDomain.findUnique({
    where: { domain: hostname.toLowerCase() },
    include: { tenant: true },
  });
  
  if (!customDomain) {
    throw new TenantNotFoundError(`Custom domain not found: ${hostname}`);
  }
  
  if (customDomain.status !== 'ACTIVE') {
    throw new Error(`Custom domain not active: ${hostname}`);
  }
  
  // Update resolution
  req.domainResolution.tenantId = customDomain.tenant.id;
  req.domainResolution.tenantSlug = customDomain.tenant.slug;
  req.domainResolution.customDomainId = customDomain.id;
  
  // Set tenant context
  req.tenantContext = {
    tenantId: customDomain.tenant.id,
    tenantSlug: customDomain.tenant.slug,
    tenantName: customDomain.tenant.name,
    tenantStatus: customDomain.tenant.status,
  };
}

/**
 * Handle domain resolution errors
 */
function handleDomainError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof TenantNotFoundError) {
    logger.warn({ error: (error as Error).message }, 'Tenant not found');
    res.status(404).json({
      success: false,
      error: {
        code: 'TENANT_NOT_FOUND',
        message: 'Organization not found. Please check the URL.',
      },
    });
    return;
  }
  
  if (error instanceof TenantSuspendedError) {
    logger.warn({ error: (error as Error).message }, 'Tenant suspended');
    res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_SUSPENDED',
        message: 'This organization\'s account has been suspended. Please contact support.',
      },
    });
    return;
  }
  
  logger.error({ error }, 'Domain resolution error');
  next(error);
}

// ============================================================================
// DOMAIN ACCESS GUARD
// ============================================================================

/**
 * Guard middleware that enforces domain-based access control
 * Use this AFTER authentication to verify user can access this domain
 */
export function domainAccessGuard(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const extReq = req as DomainResolvedRequest;
  const user = (req as any).user; // Set by auth middleware
  
  if (!user) {
    // Not authenticated yet, skip this check
    next();
    return;
  }
  
  const { domainResolution } = extReq;
  
  // Determine user type
  const userType: AllowedUserType = user.type === 'platform_admin' 
    ? mapPlatformRole(user.platformRole)
    : 'tenant_user';
  
  // Check if user type is allowed for this domain
  if (!domainResolution.allowedUserTypes.includes(userType)) {
    logger.warn({
      userType,
      domainType: domainResolution.type,
      allowedTypes: domainResolution.allowedUserTypes,
      userId: user.id,
    }, 'Domain access denied');
    
    res.status(403).json({
      success: false,
      error: {
        code: 'DOMAIN_ACCESS_DENIED',
        message: getDomainAccessDeniedMessage(userType, domainResolution.type),
      },
    });
    return;
  }
  
  // For tenant users, verify they belong to this tenant
  if (userType === 'tenant_user' || userType === 'tenant_admin') {
    if (user.tenantId !== domainResolution.tenantId) {
      logger.warn({
        userId: user.id,
        userTenantId: user.tenantId,
        requestedTenantId: domainResolution.tenantId,
      }, 'Cross-tenant access attempt');
      
      res.status(403).json({
        success: false,
        error: {
          code: 'CROSS_TENANT_ACCESS_DENIED',
          message: 'You do not have access to this organization.',
        },
      });
      return;
    }
  }
  
  next();
}

/**
 * Map platform role to allowed user type
 */
function mapPlatformRole(role: string): AllowedUserType {
  switch (role) {
    case 'super_admin':
      return 'platform_super_admin';
    case 'sub_admin':
      return 'platform_sub_admin';
    case 'admin_user':
    case 'billing_admin':
    case 'support_agent':
      return 'platform_admin_user';
    default:
      return 'platform_admin_user';
  }
}

/**
 * Get user-friendly error message for domain access denial
 */
function getDomainAccessDeniedMessage(userType: AllowedUserType, domainType: DomainType): string {
  if (userType.startsWith('platform_') && domainType !== 'main') {
    return 'Platform administrators can only access the main admin portal.';
  }
  
  if ((userType === 'tenant_user' || userType === 'tenant_admin') && domainType === 'main') {
    return 'Please use your organization\'s subdomain to login.';
  }
  
  return 'You do not have access to this domain.';
}

// ============================================================================
// REQUIRE TENANT MIDDLEWARE
// ============================================================================

/**
 * Middleware that requires tenant context
 * Use for routes that should only be accessible from tenant subdomains
 */
export function requireTenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip check for OPTIONS preflight requests (CORS)
  if (req.method === 'OPTIONS') {
    next();
    return;
  }
  
  const extReq = req as DomainResolvedRequest & { user?: any };

  // Attempt to hydrate missing tenant context from headers or JWT claims
  if (!extReq.tenantContext) {
    const headerTenantId = req.headers['x-tenant-id']?.toString();
    const headerTenantSlug = req.headers['x-tenant-slug']?.toString();
    const userTenantId = extReq.user?.tenantId;
    const userTenantSlug = extReq.user?.tenantSlug;

    const tenantId = headerTenantId || userTenantId;
    const tenantSlug = headerTenantSlug || userTenantSlug;

    if (tenantId && tenantSlug) {
      extReq.tenantContext = {
        tenantId,
        tenantSlug,
        tenantName: extReq.tenantContext?.tenantName || tenantSlug,
        tenantStatus: extReq.tenantContext?.tenantStatus || 'ACTIVE',
      };
    }
  }
  
  if (!extReq.tenantContext) {
    res.status(400).json({
      success: false,
      error: {
        code: 'TENANT_CONTEXT_REQUIRED',
        message: 'This endpoint requires tenant context. Please access via organization subdomain.',
      },
    });
    return;
  }
  
  next();
}

/**
 * Middleware that requires main domain (platform admin)
 * Use for routes that should only be accessible from main domain
 */
export function requireMainDomain(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip check for OPTIONS preflight requests (CORS)
  if (req.method === 'OPTIONS') {
    next();
    return;
  }
  
  const extReq = req as DomainResolvedRequest;
  
  if (!extReq.domainResolution.isMainDomain) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MAIN_DOMAIN_REQUIRED',
        message: 'This endpoint is only accessible from the main admin portal.',
      },
    });
    return;
  }
  
  next();
}

export default {
  domainResolverMiddleware,
  domainAccessGuard,
  requireTenantContext,
  requireMainDomain,
};
