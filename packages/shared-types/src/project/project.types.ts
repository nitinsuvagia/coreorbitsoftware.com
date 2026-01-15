/**
 * Project Types - Project management
 */

import { AuditableEntity } from '../common';

export type ProjectStatus = 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type ProjectType = 'internal' | 'client' | 'maintenance' | 'research' | 'poc';
export type BillingType = 'fixed' | 'time_and_material' | 'milestone' | 'retainer' | 'non_billable';

export interface Project extends AuditableEntity {
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  type: ProjectType;
  clientId?: string;
  departmentId?: string;
  managerId: string;
  startDate: Date;
  endDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  budget?: ProjectBudget;
  billing: ProjectBilling;
  tags?: string[];
  color?: string;
  isPublic: boolean;
  settings: ProjectSettings;
  progress?: ProjectProgress;
  metadata?: Record<string, unknown>;
}

export interface ProjectBudget {
  amount: number;
  currency: string;
  spent: number;
  remaining: number;
  contingency?: number;
}

export interface ProjectBilling {
  type: BillingType;
  ratePerHour?: number;
  currency?: string;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
}

export interface ProjectSettings {
  allowTimeTracking: boolean;
  allowExpenses: boolean;
  requireTimeApproval: boolean;
  allowExternalAccess: boolean;
  notifyOnMilestone: boolean;
  notifyOnTaskComplete: boolean;
  defaultTaskView: 'list' | 'board' | 'gantt' | 'calendar';
}

export interface ProjectProgress {
  tasksTotal: number;
  tasksCompleted: number;
  milestonesTotal: number;
  milestonesCompleted: number;
  percentComplete: number;
  healthStatus: 'on_track' | 'at_risk' | 'off_track';
}

export interface ProjectMember {
  projectId: string;
  employeeId: string;
  role: ProjectRole;
  allocation: number;
  startDate: Date;
  endDate?: Date;
  billableRate?: number;
  permissions: ProjectMemberPermissions;
}

export type ProjectRole = 'owner' | 'manager' | 'lead' | 'member' | 'viewer' | 'guest';

export interface ProjectMemberPermissions {
  canManageMembers: boolean;
  canManageTasks: boolean;
  canManageMilestones: boolean;
  canViewBudget: boolean;
  canManageBudget: boolean;
  canViewReports: boolean;
}
