'use client';

import { useAuth } from '@/lib/auth/auth-context';

/**
 * Hook for role and permission-based access control.
 * 
 * Usage:
 *   const { can, hasRole, isAdmin } = usePermissions();
 *   if (can('employees:read')) { ... }
 *   if (hasRole('hr_manager')) { ... }
 */
export function usePermissions() {
  const { user } = useAuth();

  const roles = user?.roles || [];
  const permissions = user?.permissions || [];
  const isAdmin = roles.includes('tenant_admin');

  /**
   * Check if user has a specific permission.
   * Tenant admins always return true.
   * If the token has no permissions (legacy/stale token), allow all — API layer enforces.
   */
  function can(permission: string): boolean {
    if (!user) return false;
    if (isAdmin) return true;
    if (permissions.length === 0) return true; // Legacy token — allow UI, API enforces
    return permissions.includes(permission);
  }

  /**
   * Check if user has ANY of the given permissions.
   */
  function canAny(...perms: string[]): boolean {
    if (!user) return false;
    if (isAdmin) return true;
    if (permissions.length === 0) return true; // Legacy token — allow UI, API enforces
    return perms.some((p) => permissions.includes(p));
  }

  /**
   * Check if user has ALL of the given permissions.
   */
  function canAll(...perms: string[]): boolean {
    if (!user) return false;
    if (isAdmin) return true;
    if (permissions.length === 0) return true; // Legacy token — allow UI, API enforces
    return perms.every((p) => permissions.includes(p));
  }

  /**
   * Check if user has a specific role.
   */
  function hasRole(role: string): boolean {
    if (!user) return false;
    return roles.includes(role);
  }

  /**
   * Check if user has ANY of the given roles.
   */
  function hasAnyRole(...roleList: string[]): boolean {
    if (!user) return false;
    return roleList.some((r) => roles.includes(r));
  }

  return {
    can,
    canAny,
    canAll,
    hasRole,
    hasAnyRole,
    isAdmin,
    roles,
    permissions,
    user,
  };
}
