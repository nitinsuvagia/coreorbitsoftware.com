/**
 * Tenant Context Middleware for Employee Service
 * 
 * Reads tenant headers from API Gateway and sets up tenant database context
 */

import { Request, Response, NextFunction } from 'express';
import { 
  getTenantDbManager, 
  createTenantContext, 
  runInTenantContext,
  TenantContext 
} from '@oms/tenant-db-manager';
import { logger } from '../utils/logger';

export interface TenantRequest extends Request {
  tenantId?: string;
  tenantSlug?: string;
  userId?: string;
  userRoles?: string[];
  tenantDbContext?: TenantContext;
}

/**
 * Middleware that establishes tenant context from gateway headers
 */
export async function tenantContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const tenantReq = req as TenantRequest;
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = req.headers['x-user-id'] as string;
  const userRoles = (req.headers['x-user-roles'] as string)?.split(',').filter(Boolean);
  const requestId = req.headers['x-request-id'] as string;

  if (!tenantSlug) {
    logger.warn({ path: req.path }, 'Request missing tenant slug header');
    res.status(400).json({
      success: false,
      error: {
        code: 'TENANT_REQUIRED',
        message: 'X-Tenant-Slug header is required',
      },
    });
    return;
  }

  try {
    // Store tenant info on request for easy access
    tenantReq.tenantId = tenantId;
    tenantReq.tenantSlug = tenantSlug;
    tenantReq.userId = userId;
    tenantReq.userRoles = userRoles;

    const dbManager = getTenantDbManager();
    
    // Get Prisma client for this tenant
    const prisma = await dbManager.getClientBySlug(tenantSlug);
    
    // Get tenant info
    const tenantInfo = await dbManager.getTenantBySlug(tenantSlug);
    
    // Create tenant context
    const tenantDbContext = createTenantContext(
      {
        id: tenantInfo.id,
        slug: tenantInfo.slug,
        name: tenantInfo.name,
        status: tenantInfo.status,
        databaseName: tenantInfo.databaseName,
      },
      prisma,
      {
        requestId,
        userId,
        userRoles,
      }
    );
    
    tenantReq.tenantDbContext = tenantDbContext;
    
    // IMPORTANT: Store prisma client directly on request for route handlers
    // AsyncLocalStorage context doesn't persist across Express's async middleware chain
    (tenantReq as any).prisma = prisma;
    
    logger.debug({ 
      tenantSlug, 
      tenantId: tenantInfo.id,
      path: req.path 
    }, 'Tenant context established');
    
    next();
    
  } catch (error) {
    const err = error as Error;
    logger.error({ 
      error: err.message, 
      tenantSlug,
      path: req.path 
    }, 'Failed to establish tenant context');
    
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_CONTEXT_ERROR',
        message: 'Failed to establish tenant database context',
      },
    });
  }
}

export default tenantContextMiddleware;
