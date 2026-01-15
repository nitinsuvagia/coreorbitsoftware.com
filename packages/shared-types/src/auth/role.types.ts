/**
 * Role & Permission Types - RBAC
 */

import { BaseEntity } from '../common';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'export' | 'import';
export type ResourceType =
  | 'employee'
  | 'attendance'
  | 'leave'
  | 'project'
  | 'task'
  | 'client'
  | 'asset'
  | 'payroll'
  | 'meeting'
  | 'recruitment'
  | 'report'
  | 'settings'
  | 'user'
  | 'role';

export interface Role extends BaseEntity {
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  isSystem: boolean;
  isDefault: boolean;
  permissions: Permission[];
  userCount?: number;
}

export interface Permission {
  id: string;
  resource: ResourceType;
  action: PermissionAction;
  scope?: PermissionScope;
  conditions?: PermissionCondition[];
}

export type PermissionScope = 'own' | 'team' | 'department' | 'all';

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'lt' | 'gte' | 'lte';
  value: unknown;
}

export interface RoleAssignment {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
}

export const SystemRoles = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  HR_MANAGER: 'hr_manager',
  PROJECT_MANAGER: 'project_manager',
  TEAM_LEAD: 'team_lead',
  EMPLOYEE: 'employee',
  VIEWER: 'viewer',
} as const;

export type SystemRole = (typeof SystemRoles)[keyof typeof SystemRoles];
