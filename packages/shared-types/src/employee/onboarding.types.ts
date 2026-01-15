/**
 * Onboarding Types - New employee onboarding
 */

import { BaseEntity } from '../common';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';
export type ChecklistItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface OnboardingChecklist extends BaseEntity {
  tenantId: string;
  employeeId: string;
  templateId?: string;
  status: OnboardingStatus;
  startDate: Date;
  dueDate: Date;
  completedDate?: Date;
  progress: number;
  items: OnboardingItem[];
  assignees: OnboardingAssignee[];
}

export interface OnboardingItem {
  id: string;
  category: string;
  title: string;
  description?: string;
  status: ChecklistItemStatus;
  dueDate?: Date;
  completedAt?: Date;
  completedBy?: string;
  assigneeId?: string;
  order: number;
  isRequired: boolean;
  attachments?: string[];
  notes?: string;
}

export interface OnboardingAssignee {
  userId: string;
  role: 'hr' | 'manager' | 'it' | 'buddy' | 'other';
  name: string;
  email: string;
}

export interface OnboardingTemplate extends BaseEntity {
  tenantId: string;
  name: string;
  description?: string;
  departmentId?: string;
  designationId?: string;
  items: OnboardingTemplateItem[];
  isDefault: boolean;
  isActive: boolean;
}

export interface OnboardingTemplateItem {
  id: string;
  category: string;
  title: string;
  description?: string;
  daysAfterJoining: number;
  assigneeRole: 'hr' | 'manager' | 'it' | 'buddy' | 'other';
  order: number;
  isRequired: boolean;
}
