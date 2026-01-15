/**
 * Project Events - Project and task events
 */

export interface ProjectCreatedEvent {
  tenantId: string;
  projectId: string;
  name: string;
  code: string;
  clientId?: string;
  managerId: string;
  startDate: Date;
  createdBy: string;
  createdAt: Date;
}

export interface ProjectStatusChangedEvent {
  tenantId: string;
  projectId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  changedAt: Date;
}

export interface ProjectCompletedEvent {
  tenantId: string;
  projectId: string;
  completedAt: Date;
  completedBy: string;
  summary: {
    totalTasks: number;
    completedTasks: number;
    totalHours: number;
  };
}

export interface TaskCreatedEvent {
  tenantId: string;
  projectId: string;
  taskId: string;
  taskNumber: string;
  title: string;
  assigneeId?: string;
  createdBy: string;
  createdAt: Date;
}

export interface TaskAssignedEvent {
  tenantId: string;
  projectId: string;
  taskId: string;
  previousAssigneeId?: string;
  newAssigneeId: string;
  assignedBy: string;
  assignedAt: Date;
}

export interface TaskStatusChangedEvent {
  tenantId: string;
  projectId: string;
  taskId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  changedAt: Date;
}

export interface TaskCompletedEvent {
  tenantId: string;
  projectId: string;
  taskId: string;
  completedBy: string;
  completedAt: Date;
  totalTimeLogged: number;
}

export interface MilestoneCompletedEvent {
  tenantId: string;
  projectId: string;
  milestoneId: string;
  name: string;
  completedAt: Date;
  completedBy: string;
}
