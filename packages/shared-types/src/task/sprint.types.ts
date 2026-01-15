/**
 * Sprint Types - Agile sprint management
 */

import { AuditableEntity } from '../common';

export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';

export interface Sprint extends AuditableEntity {
  tenantId: string;
  projectId: string;
  name: string;
  goal?: string;
  status: SprintStatus;
  startDate: Date;
  endDate: Date;
  capacity: number;
  velocity?: number;
  completedPoints?: number;
  order: number;
}

export interface SprintStats {
  sprintId: string;
  totalTasks: number;
  completedTasks: number;
  totalPoints: number;
  completedPoints: number;
  totalHours: number;
  loggedHours: number;
  burndownData: BurndownPoint[];
  velocityTrend: number[];
}

export interface BurndownPoint {
  date: Date;
  ideal: number;
  actual: number;
  remaining: number;
}

export interface SprintRetrospective extends AuditableEntity {
  tenantId: string;
  sprintId: string;
  whatWentWell: RetrospectiveItem[];
  whatWentWrong: RetrospectiveItem[];
  actionItems: RetrospectiveAction[];
  participants: string[];
  facilitatorId: string;
  notes?: string;
}

export interface RetrospectiveItem {
  id: string;
  content: string;
  votes: number;
  addedBy: string;
}

export interface RetrospectiveAction {
  id: string;
  action: string;
  assigneeId?: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'done';
}
