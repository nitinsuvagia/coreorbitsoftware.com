/**
 * Task Types - Task management
 */

import { AuditableEntity } from '../common';

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'testing' | 'done' | 'cancelled';
export type TaskPriority = 'lowest' | 'low' | 'medium' | 'high' | 'highest';
export type TaskType = 'task' | 'bug' | 'feature' | 'improvement' | 'story' | 'epic' | 'subtask';

export interface Task extends AuditableEntity {
  tenantId: string;
  projectId: string;
  sprintId?: string;
  milestoneId?: string;
  parentId?: string;
  taskNumber: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  reporterId: string;
  reviewerId?: string;
  labels: string[];
  estimatedHours?: number;
  loggedHours?: number;
  remainingHours?: number;
  storyPoints?: number;
  startDate?: Date;
  dueDate?: Date;
  completedAt?: Date;
  order: number;
  watchers: string[];
  dependencies: TaskDependency[];
  attachments: TaskAttachment[];
  customFields?: Record<string, unknown>;
}

export interface TaskDependency {
  taskId: string;
  type: 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates' | 'clones';
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface TaskLabel extends AuditableEntity {
  tenantId: string;
  projectId?: string;
  name: string;
  color: string;
  description?: string;
}

export interface TaskChecklist {
  id: string;
  taskId: string;
  title: string;
  items: TaskChecklistItem[];
  progress: number;
}

export interface TaskChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
  assigneeId?: string;
  dueDate?: Date;
  order: number;
}
