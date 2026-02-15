/**
 * Tenant Context Middleware
 * 
 * Sets up the tenant database context for the request.
 * Uses AsyncLocalStorage to make tenant context available throughout the request.
 */

import { Request, Response, NextFunction } from 'express';
import { 
  getTenantDbManager, 
  createTenantContext, 
  runInTenantContext,
  TenantContext 
} from '@oms/tenant-db-manager';
import { DomainResolvedRequest } from './domain-resolver';
import { AuthenticatedRequest } from './auth';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Request with full tenant context
 */
export interface TenantContextRequest extends AuthenticatedRequest {
  tenantDbContext?: TenantContext;
}

// ============================================================================
// TENANT CONTEXT MIDDLEWARE
// ============================================================================

/**
 * Middleware that sets up tenant database context
 * Should be used after domain resolver and auth middleware
 */
export async function tenantContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ctxReq = req as TenantContextRequest;
  
  // Only set up context for tenant domains
  if (!ctxReq.tenantContext) {
    next();
    return;
  }
  
  // Check if this is a reactivation route - skip tenant context setup
  const isReactivationRoute = req.originalUrl.includes('/auth/tenant/reactivate') ||
                              req.originalUrl.includes('/auth/account/reactivate');
  if (isReactivationRoute) {
    // For reactivation routes, we don't need full tenant context since the
    // endpoint handles it directly with skipStatusCheck
    logger.info({ url: req.originalUrl }, 'Bypassing tenant context for reactivation route');
    next();
    return;
  }
  
  try {
    const dbManager = getTenantDbManager();
    const { tenantSlug, tenantId, tenantName, tenantStatus } = ctxReq.tenantContext;
    
    // Get Prisma client for this tenant
    const prisma = await dbManager.getClientBySlug(tenantSlug);
    
    // Create tenant context
    const tenantDbContext = createTenantContext(
      {
        id: tenantId,
        slug: tenantSlug,
        name: tenantName,
        status: tenantStatus,
        databaseName: `oms_tenant_${tenantSlug}`,
      },
      prisma,
      {
        requestId: (req as any).id,
        userId: ctxReq.user?.id,
        userRoles: ctxReq.user?.roles,
      }
    );
    
    ctxReq.tenantDbContext = tenantDbContext;
    
    // Run the rest of the request in tenant context
    runInTenantContext(tenantDbContext, () => {
      next();
    });
    
  } catch (error) {
    logger.error({ 
      error, 
      tenantSlug: ctxReq.tenantContext.tenantSlug 
    }, 'Tenant context middleware error');
    
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_CONTEXT_ERROR',
        message: 'Failed to establish tenant database context.',
      },
    });
  }
}

export default tenantContextMiddleware;
