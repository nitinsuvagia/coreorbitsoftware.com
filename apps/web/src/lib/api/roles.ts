/**
 * Roles API functions
 */

import { get, post, put, del } from './client';

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  isDefault: boolean;
  usersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleFormData {
  name: string;
  description?: string;
  isDefault?: boolean;
}

/**
 * Get all roles
 */
export async function getRoles(): Promise<Role[]> {
  try {
    const roles = await get<Role[]>('/api/v1/roles');
    return roles || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    return [];
  }
}

/**
 * Get a single role by ID
 */
export async function getRole(id: string): Promise<Role | null> {
  try {
    const role = await get<Role>(`/api/v1/roles/${id}`);
    return role || null;
  } catch (error) {
    console.error('Error fetching role:', error);
    return null;
  }
}

/**
 * Create a new role
 */
export async function createRole(data: RoleFormData): Promise<Role> {
  return await post<Role>('/api/v1/roles', data);
}

/**
 * Update a role
 */
export async function updateRole(id: string, data: Partial<RoleFormData>): Promise<Role> {
  return await put<Role>(`/api/v1/roles/${id}`, data);
}

/**
 * Delete a role
 */
export async function deleteRole(id: string): Promise<void> {
  await del(`/api/v1/roles/${id}`);
}

/**
 * Seed default roles
 */
export async function seedRoles(): Promise<{ created?: number; existingCount?: number }> {
  return await post<{ created?: number; existingCount?: number }>('/api/v1/roles/seed', {});
}

// ============================================================================
// PERMISSIONS API
// ============================================================================

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface GroupedPermissions {
  permissions: Permission[];
  grouped: Record<string, { id: string; action: string; description: string | null }[]>;
}

export interface RolePermissions {
  roleId: string;
  roleName: string;
  isSystem: boolean;
  permissionIds: string[];
  permissions: Array<{
    id: string;
    resource: string;
    action: string;
    description: string | null;
    scope?: string;
  }>;
}

/**
 * Get all available permissions grouped by resource
 */
export async function getAllPermissions(): Promise<GroupedPermissions> {
  try {
    const result = await get<GroupedPermissions>('/api/v1/roles/permissions');
    return result || { permissions: [], grouped: {} };
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return { permissions: [], grouped: {} };
  }
}

/**
 * Get permissions for a specific role
 */
export async function getRolePermissions(roleId: string): Promise<RolePermissions | null> {
  try {
    const result = await get<RolePermissions>(`/api/v1/roles/${roleId}/permissions`);
    return result || null;
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return null;
  }
}

/**
 * Update permissions for a role
 */
export async function updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  await put(`/api/v1/roles/${roleId}/permissions`, { permissionIds });
}
