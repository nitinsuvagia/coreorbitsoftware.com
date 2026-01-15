/**
 * Time Tracking Types - Task time logs
 */

import { AuditableEntity, BaseEntity } from '../common';

export type TimeLogStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface TaskTimeLog extends AuditableEntity {
  tenantId: string;
  taskId: string;
  projectId: string;
  employeeId: string;
  date: Date;
  hours: number;
  description?: string;
  status: TimeLogStatus;
  isBillable: boolean;
  billableHours?: number;
  billingRate?: number;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

export interface TaskComment extends AuditableEntity {
  tenantId: string;
  taskId: string;
  authorId: string;
  content: string;
  parentId?: string;
  mentions: string[];
  reactions: CommentReaction[];
  attachments?: string[];
  isEdited: boolean;
  editedAt?: Date;
}

export interface CommentReaction {
  emoji: string;
  userId: string;
  createdAt: Date;
}

export interface TaskActivity extends BaseEntity {
  tenantId: string;
  taskId: string;
  userId: string;
  action: TaskActivityAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
}

export type TaskActivityAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'commented'
  | 'time_logged'
  | 'attachment_added'
  | 'attachment_removed'
  | 'label_added'
  | 'label_removed'
  | 'sprint_changed'
  | 'milestone_changed';

export interface Timesheet extends AuditableEntity {
  tenantId: string;
  employeeId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  status: TimeLogStatus;
  entries: TimesheetEntry[];
  totalHours: number;
  billableHours: number;
  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;
}

export interface TimesheetEntry {
  date: Date;
  projectId: string;
  taskId?: string;
  hours: number;
  description?: string;
  isBillable: boolean;
}
