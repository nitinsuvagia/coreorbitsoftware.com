/**
 * Middleware Index - Export all middleware
 */

export { 
  domainResolverMiddleware, 
  domainAccessGuard,
  requireTenantContext,
  requireMainDomain,
  DomainResolvedRequest,
} from './domain-resolver';

export { 
  authMiddleware, 
  requireAuth,
  requirePlatformAdmin,
  requireTenantUser,
  requirePermission,
  AuthenticatedRequest,
  AuthenticatedUser,
  TokenPayload,
} from './auth';

export { 
  tenantContextMiddleware,
  TenantContextRequest,
} from './tenant-context';

export {
  tenantRateLimiter,
  burstProtection,
  closeRateLimiter,
  RATE_LIMIT_TIERS,
} from './tenant-rate-limiter';

export {
  maintenanceModeMiddleware,
  getMaintenanceStatusHandler,
  clearMaintenanceCache,
} from './maintenance';
