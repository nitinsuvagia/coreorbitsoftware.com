/**
 * Maintenance Mode Middleware
 * Blocks tenant access when system maintenance is enabled
 */

import { Request, Response, NextFunction } from 'express';
import { getMasterPrisma } from '@oms/database';
import { logger } from '../utils/logger';

// Cache maintenance status to avoid DB queries on every request
let maintenanceCache: {
  enabled: boolean;
  message: string;
  lastChecked: number;
} = {
  enabled: false,
  message: '',
  lastChecked: 0,
};

const CACHE_TTL_MS = 30000; // Check DB every 30 seconds

async function getMaintenanceStatus(): Promise<{ enabled: boolean; message: string }> {
  const now = Date.now();
  
  // Return cached value if still valid
  if (now - maintenanceCache.lastChecked < CACHE_TTL_MS) {
    return { enabled: maintenanceCache.enabled, message: maintenanceCache.message };
  }
  
  try {
    const masterPrisma = getMasterPrisma();
    
    // Use Prisma model instead of raw SQL
    const settings = await masterPrisma.platformSettings.findUnique({
      where: { id: 'default' },
      select: { maintenance: true }
    });
    
    if (settings && settings.maintenance) {
      const maintenance = settings.maintenance as any || {};
      
      maintenanceCache = {
        enabled: maintenance.maintenanceMode === true,
        message: maintenance.maintenanceMessage || 'System is under maintenance. Please try again later.',
        lastChecked: now,
      };
    } else {
      maintenanceCache = {
        enabled: false,
        message: '',
        lastChecked: now,
      };
    }
  } catch (error) {
    logger.error({ error }, 'Failed to check maintenance status');
    // On error, use cached value but don't update lastChecked so we retry soon
  }
  
  return { enabled: maintenanceCache.enabled, message: maintenanceCache.message };
}

// Clear cache when settings are updated (call this from settings update route)
export function clearMaintenanceCache(): void {
  maintenanceCache.lastChecked = 0;
}

/**
 * Middleware that blocks tenant requests during maintenance mode
 * Platform admin routes are excluded
 */
export async function maintenanceModeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip maintenance check for:
  // 1. Health check endpoints
  // 2. Platform admin routes (they need to manage maintenance)
  // 3. Auth routes (for login to check admin status)
  // 4. API for getting maintenance status
  
  const path = req.path.toLowerCase();
  
  const bypassPaths = [
    '/health',
    '/ready',
    '/api/v1/platform',  // Platform admin routes
    '/api/v1/auth/login', // Allow login to check if user is admin
    '/api/v1/auth/tenant/login', // Allow tenant login (will show maintenance message in app)
    '/api/v1/auth/me',    // Allow checking current user
    '/api/v1/auth/refresh', // Allow token refresh
    '/api/maintenance-status', // Allow checking maintenance status
  ];
  
  const shouldBypass = bypassPaths.some(bp => path.startsWith(bp));
  
  if (shouldBypass) {
    return next();
  }
  
  // Check if user is platform admin (from auth middleware)
  const user = (req as any).user;
  if (user?.role === 'PLATFORM_ADMIN') {
    return next();
  }
  
  // Check maintenance status
  const { enabled, message } = await getMaintenanceStatus();
  
  if (enabled) {
    logger.info({ path, ip: req.ip }, 'Request blocked due to maintenance mode');
    
    res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: message || 'System is under maintenance. Please try again later.',
      maintenanceMode: true,
    });
    return;
  }
  
  next();
}

/**
 * Endpoint to get current maintenance status (for frontend)
 */
export async function getMaintenanceStatusHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { enabled, message } = await getMaintenanceStatus();
  
  res.json({
    maintenanceMode: enabled,
    message: enabled ? message : null,
  });
}
