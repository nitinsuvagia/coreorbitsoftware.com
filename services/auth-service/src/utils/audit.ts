/**
 * Audit Logging Utility
 */

import { getMasterPrisma } from './database';
import { logger } from './logger';

export interface AuditLogInput {
  adminId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const prisma = getMasterPrisma();
    
    await prisma.platformAuditLog.create({
      data: {
        adminId: input.adminId || null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId || null,
        description: input.description || null,
        metadata: input.metadata || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });
    
    logger.info(
      { 
        action: input.action, 
        resource: input.resource, 
        resourceId: input.resourceId,
        adminId: input.adminId 
      },
      'Audit log created'
    );
  } catch (error) {
    logger.error({ error, input }, 'Failed to create audit log');
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Helper to get request context for audit logs
 */
export function getRequestContext(req: any) {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    adminId: req.user?.id || req.headers['x-admin-id'],
  };
}
