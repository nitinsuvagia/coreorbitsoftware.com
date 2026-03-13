/**
 * Tenant Context Middleware for Task Service
 *
 * Reads tenant headers from API Gateway and sets up the tenant database
 * context so that getTenantPrisma() works inside route handlers.
 */

import { Request, Response, NextFunction } from 'express';
import {
  getTenantDbManager,
  createTenantContext,
  runInTenantContext,
} from '@oms/tenant-db-manager';
import { logger } from '../utils/logger';

export async function tenantContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  const tenantId  = req.headers['x-tenant-id']   as string;
  const userId    = req.headers['x-user-id']      as string;
  const userRoles = (req.headers['x-user-roles'] as string)?.split(',').filter(Boolean);
  const requestId = req.headers['x-request-id']  as string;

  if (!tenantSlug) {
    res.status(400).json({
      success: false,
      error: 'X-Tenant-Slug header is required',
    });
    return;
  }

  try {
    const dbManager = getTenantDbManager();
    const [prisma, tenantInfo] = await Promise.all([
      dbManager.getClientBySlug(tenantSlug),
      dbManager.getTenantBySlug(tenantSlug),
    ]);

    const context = createTenantContext(
      {
        id:           tenantInfo.id,
        slug:         tenantInfo.slug,
        name:         tenantInfo.name,
        status:       tenantInfo.status,
        databaseName: tenantInfo.databaseName,
      },
      prisma,
      { requestId, userId, userRoles }
    );

    // Store prisma directly on the request as a fallback access method
    (req as any).prisma = prisma;

    // Call next() INSIDE runInTenantContext so getTenantPrisma() works in
    // all route handlers within this request's async execution tree.
    runInTenantContext(context, () => next());
  } catch (error: any) {
    logger.error({ error: error.message, tenantSlug, path: req.path }, 'Failed to establish tenant context');
    res.status(500).json({
      success: false,
      error: 'Failed to establish tenant database context',
    });
  }
}

export default tenantContextMiddleware;
