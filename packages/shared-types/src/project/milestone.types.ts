/**
 * Milestone Types - Project milestones
 */

import { BaseEntity } from '../common';

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export interface Milestone extends BaseEntity {
  tenantId: string;
  projectId: string;
  name: string;
  description?: string;
  status: MilestoneStatus;
  startDate?: Date;
  dueDate: Date;
  completedDate?: Date;
  ownerId?: string;
  deliverables: MilestoneDeliverable[];
  dependencies?: string[];
  isBillable: boolean;
  billableAmount?: number;
  progress: number;
  order: number;
}

export interface MilestoneDeliverable {
  id: string;
  name: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
  attachments?: string[];
}

export interface ProjectPhase extends BaseEntity {
  tenantId: string;
  projectId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  color: string;
  milestones: string[];
  order: number;
}
