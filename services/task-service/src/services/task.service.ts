/**
 * Task Service - Task CRUD, assignments, status management
 */

import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuidv4 } from 'uuid';
import { parseISO, differenceInHours } from 'date-fns';
import { getEventBus, SQS_QUEUES } from '@oms/event-bus';
import { logger } from '../utils/logger';
import { config } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateTaskInput {
  projectId: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  type?: 'task' | 'bug' | 'story' | 'epic' | 'subtask';
  assigneeIds?: string[];
  reporterId: string;
  dueDate?: string;
  estimatedHours?: number;
  labels?: string[];
  customFields?: Record<string, any>;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeIds?: string[];
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  labels?: string[];
  customFields?: Record<string, any>;
  completedAt?: string;
}

export interface CreateSubtaskInput {
  parentTaskId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  estimatedHours?: number;
}

export interface TaskFilters {
  projectId?: string;
  assigneeId?: string;
  reporterId?: string;
  status?: string;
  priority?: string;
  type?: string;
  parentTaskId?: string;
  hasParent?: boolean;
  labels?: string[];
  search?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface TaskDependencyInput {
  taskId: string;
  dependsOnTaskId: string;
  type: 'blocks' | 'is_blocked_by' | 'relates_to' | 'duplicates';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generateTaskNumber(
  prisma: PrismaClient,
  projectId: string
): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { code: true },
  });
  
  if (!project?.code) {
    throw new Error('Project not found');
  }
  
  // Get the last task number for this project
  const lastTask = await prisma.task.findFirst({
    where: { projectId },
    orderBy: { taskNumber: 'desc' },
    select: { taskNumber: true },
  });
  
  let nextNum = 1;
  if (lastTask?.taskNumber) {
    const numPart = lastTask.taskNumber.split('-').pop();
    if (numPart) {
      nextNum = parseInt(numPart, 10) + 1;
    }
  }
  
  return `${project.code}-${nextNum}`;
}

async function calculateCompletionPercentage(
  prisma: PrismaClient,
  taskId: string
): Promise<number> {
  const subtasks = await prisma.task.findMany({
    where: { parentTaskId: taskId },
    select: { status: true },
  });
  
  if (subtasks.length === 0) return 0;
  
  const completed = subtasks.filter(s => s.status === 'done').length;
  return Math.round((completed / subtasks.length) * 100);
}

// ============================================================================
// TASK OPERATIONS
// ============================================================================

/**
 * Create a new task
 */
export async function createTask(
  prisma: PrismaClient,
  input: CreateTaskInput,
  userId: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('task-service');
  const id = uuidv4();
  
  // Generate task number
  const taskNumber = await generateTaskNumber(prisma, input.projectId);
  
  // Validate parent task if provided
  if (input.parentTaskId) {
    const parentTask = await prisma.task.findUnique({
      where: { id: input.parentTaskId },
    });
    
    if (!parentTask) {
      throw new Error('Parent task not found');
    }
    
    // Check max subtasks limit
    const subtaskCount = await prisma.task.count({
      where: { parentTaskId: input.parentTaskId },
    });
    
    if (subtaskCount >= config.task.maxSubtasksPerTask) {
      throw new Error(`Maximum ${config.task.maxSubtasksPerTask} subtasks allowed per task`);
    }
  }
  
  // Create the task
  const task = await prisma.task.create({
    data: {
      id,
      projectId: input.projectId,
      parentTaskId: input.parentTaskId,
      taskNumber,
      title: input.title,
      description: input.description,
      status: input.status || 'backlog',
      priority: input.priority || config.task.defaultPriority,
      type: input.type || (input.parentTaskId ? 'subtask' : 'task'),
      reporterId: input.reporterId,
      dueDate: input.dueDate ? parseISO(input.dueDate) : null,
      estimatedHours: input.estimatedHours,
      labels: input.labels || [],
      customFields: input.customFields || {},
      createdBy: userId,
      updatedBy: userId,
    },
    include: {
      project: { select: { id: true, name: true, code: true } },
      reporter: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  
  // Add assignees
  if (input.assigneeIds?.length) {
    const limitedAssignees = input.assigneeIds.slice(0, config.task.maxAssigneesPerTask);
    
    await prisma.taskAssignee.createMany({
      data: limitedAssignees.map((employeeId, index) => ({
        id: uuidv4(),
        taskId: id,
        employeeId,
        isPrimary: index === 0,
        assignedAt: new Date(),
        assignedBy: userId,
      })),
    });
  }
  
  // Log activity
  await prisma.taskActivity.create({
    data: {
      id: uuidv4(),
      taskId: id,
      userId,
      action: 'created',
      details: { title: input.title },
    },
  });
  
  // Emit event
  await eventBus.sendToQueue(
    SQS_QUEUES.TASK_CREATED,
    'task.created',
    {
      taskId: id,
      taskNumber,
      projectId: input.projectId,
      title: input.title,
      assigneeIds: input.assigneeIds,
      reporterId: input.reporterId,
    },
    tenantContext
  );
  
  logger.info({ taskId: id, taskNumber, projectId: input.projectId }, 'Task created');
  
  return task;
}

/**
 * Get task by ID
 */
export async function getTaskById(
  prisma: PrismaClient,
  id: string
): Promise<any | null> {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, code: true } },
      parentTask: { select: { id: true, taskNumber: true, title: true } },
      reporter: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      assignees: {
        where: { isActive: true },
        include: {
          employee: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
              designation: { select: { name: true } },
            },
          },
        },
        orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
      },
      subtasks: {
        select: {
          id: true,
          taskNumber: true,
          title: true,
          status: true,
          priority: true,
          assignees: {
            where: { isActive: true, isPrimary: true },
            include: {
              employee: {
                select: {
                  id: true,
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      dependencies: {
        include: {
          dependsOnTask: {
            select: { id: true, taskNumber: true, title: true, status: true },
          },
        },
      },
      dependents: {
        include: {
          task: {
            select: { id: true, taskNumber: true, title: true, status: true },
          },
        },
      },
      _count: {
        select: { comments: true, attachments: true, activities: true },
      },
    },
  });
  
  if (!task) return null;
  
  // Calculate completion percentage if has subtasks
  const completionPercentage = task.subtasks.length > 0
    ? await calculateCompletionPercentage(prisma, id)
    : null;
  
  return {
    ...task,
    completionPercentage,
    commentCount: task._count.comments,
    attachmentCount: task._count.attachments,
    activityCount: task._count.activities,
  };
}

/**
 * Get task by task number
 */
export async function getTaskByNumber(
  prisma: PrismaClient,
  taskNumber: string
): Promise<any | null> {
  const task = await prisma.task.findFirst({
    where: { taskNumber },
    select: { id: true },
  });
  
  if (!task) return null;
  
  return getTaskById(prisma, task.id);
}

/**
 * Update a task
 */
export async function updateTask(
  prisma: PrismaClient,
  id: string,
  input: UpdateTaskInput,
  userId: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('task-service');
  
  const existing = await prisma.task.findUnique({
    where: { id },
    include: { assignees: { where: { isActive: true } } },
  });
  
  if (!existing) {
    throw new Error('Task not found');
  }
  
  const changes: Record<string, { from: any; to: any }> = {};
  const data: any = {
    updatedBy: userId,
    updatedAt: new Date(),
  };
  
  // Track changes for activity log
  if (input.title && input.title !== existing.title) {
    changes.title = { from: existing.title, to: input.title };
    data.title = input.title;
  }
  
  if (input.description !== undefined && input.description !== existing.description) {
    changes.description = { from: 'changed', to: 'changed' };
    data.description = input.description;
  }
  
  if (input.status && input.status !== existing.status) {
    changes.status = { from: existing.status, to: input.status };
    data.status = input.status;
    
    if (input.status === 'done') {
      data.completedAt = input.completedAt ? parseISO(input.completedAt) : new Date();
    } else if (existing.status === 'done') {
      data.completedAt = null;
    }
  }
  
  if (input.priority && input.priority !== existing.priority) {
    changes.priority = { from: existing.priority, to: input.priority };
    data.priority = input.priority;
  }
  
  if (input.dueDate !== undefined) {
    const newDueDate = input.dueDate ? parseISO(input.dueDate) : null;
    if (newDueDate?.getTime() !== existing.dueDate?.getTime()) {
      changes.dueDate = { from: existing.dueDate, to: newDueDate };
      data.dueDate = newDueDate;
    }
  }
  
  if (input.estimatedHours !== undefined && input.estimatedHours !== existing.estimatedHours) {
    changes.estimatedHours = { from: existing.estimatedHours, to: input.estimatedHours };
    data.estimatedHours = input.estimatedHours;
  }
  
  if (input.actualHours !== undefined) data.actualHours = input.actualHours;
  if (input.labels) data.labels = input.labels;
  if (input.customFields) data.customFields = input.customFields;
  
  // Update the task
  const task = await prisma.task.update({
    where: { id },
    data,
    include: {
      project: { select: { id: true, name: true } },
    },
  });
  
  // Handle assignee changes
  if (input.assigneeIds) {
    const currentAssigneeIds = existing.assignees.map(a => a.employeeId);
    const newAssigneeIds = input.assigneeIds.slice(0, config.task.maxAssigneesPerTask);
    
    const toAdd = newAssigneeIds.filter(id => !currentAssigneeIds.includes(id));
    const toRemove = currentAssigneeIds.filter(id => !newAssigneeIds.includes(id));
    
    if (toRemove.length > 0) {
      await prisma.taskAssignee.updateMany({
        where: { taskId: id, employeeId: { in: toRemove } },
        data: { isActive: false, unassignedAt: new Date() },
      });
      changes.assignees = { from: 'removed', to: toRemove.length };
    }
    
    if (toAdd.length > 0) {
      await prisma.taskAssignee.createMany({
        data: toAdd.map((employeeId, index) => ({
          id: uuidv4(),
          taskId: id,
          employeeId,
          isPrimary: currentAssigneeIds.length === 0 && index === 0,
          assignedAt: new Date(),
          assignedBy: userId,
        })),
      });
      changes.assignees = { from: 'added', to: toAdd.length };
    }
  }
  
  // Log activity if there were changes
  if (Object.keys(changes).length > 0) {
    await prisma.taskActivity.create({
      data: {
        id: uuidv4(),
        taskId: id,
        userId,
        action: 'updated',
        details: { changes },
      },
    });
    
    // Emit event for status changes
    if (changes.status) {
      await eventBus.sendToQueue(
        SQS_QUEUES.TASK_UPDATED,
        'task.status_changed',
        {
          taskId: id,
          taskNumber: task.taskNumber,
          projectId: task.projectId,
          fromStatus: changes.status.from,
          toStatus: changes.status.to,
        },
        tenantContext
      );
    }
  }
  
  logger.info({ taskId: id, changes: Object.keys(changes) }, 'Task updated');
  
  // Auto-close parent if all subtasks done
  if (input.status === 'done' && existing.parentTaskId && config.task.autoCloseParent) {
    const allSubtasksDone = await prisma.task.count({
      where: {
        parentTaskId: existing.parentTaskId,
        status: { not: 'done' },
      },
    }) === 0;
    
    if (allSubtasksDone) {
      await updateTask(
        prisma,
        existing.parentTaskId,
        { status: 'done' },
        userId,
        tenantContext
      );
    }
  }
  
  return getTaskById(prisma, id);
}

/**
 * Delete a task
 */
export async function deleteTask(
  prisma: PrismaClient,
  id: string
): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { subtasks: { select: { id: true } } },
  });
  
  if (!task) {
    throw new Error('Task not found');
  }
  
  // Delete subtasks first
  if (task.subtasks.length > 0) {
    const subtaskIds = task.subtasks.map(s => s.id);
    
    await prisma.taskAssignee.deleteMany({ where: { taskId: { in: subtaskIds } } });
    await prisma.taskComment.deleteMany({ where: { taskId: { in: subtaskIds } } });
    await prisma.taskActivity.deleteMany({ where: { taskId: { in: subtaskIds } } });
    await prisma.taskAttachment.deleteMany({ where: { taskId: { in: subtaskIds } } });
    await prisma.task.deleteMany({ where: { id: { in: subtaskIds } } });
  }
  
  // Delete task relations
  await prisma.taskAssignee.deleteMany({ where: { taskId: id } });
  await prisma.taskComment.deleteMany({ where: { taskId: id } });
  await prisma.taskActivity.deleteMany({ where: { taskId: id } });
  await prisma.taskAttachment.deleteMany({ where: { taskId: id } });
  await prisma.taskDependency.deleteMany({
    where: { OR: [{ taskId: id }, { dependsOnTaskId: id }] },
  });
  
  // Delete the task
  await prisma.task.delete({ where: { id } });
  
  logger.info({ taskId: id, taskNumber: task.taskNumber }, 'Task deleted');
}

/**
 * List tasks with filters
 */
export async function listTasks(
  prisma: PrismaClient,
  filters: TaskFilters
): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const page = filters.page || 1;
  const pageSize = Math.min(filters.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  
  const where: any = {};
  
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.reporterId) where.reporterId = filters.reporterId;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.type) where.type = filters.type;
  if (filters.parentTaskId) where.parentTaskId = filters.parentTaskId;
  if (filters.hasParent === false) where.parentTaskId = null;
  if (filters.hasParent === true) where.parentTaskId = { not: null };
  
  if (filters.assigneeId) {
    where.assignees = {
      some: { employeeId: filters.assigneeId, isActive: true },
    };
  }
  
  if (filters.labels?.length) {
    where.labels = { hasSome: filters.labels };
  }
  
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { taskNumber: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  
  if (filters.dueDateFrom || filters.dueDateTo) {
    where.dueDate = {};
    if (filters.dueDateFrom) where.dueDate.gte = parseISO(filters.dueDateFrom);
    if (filters.dueDateTo) where.dueDate.lte = parseISO(filters.dueDateTo);
  }
  
  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        project: { select: { id: true, name: true, code: true } },
        assignees: {
          where: { isActive: true },
          include: {
            employee: {
              select: {
                id: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
          take: 3,
        },
        _count: { select: { subtasks: true, comments: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);
  
  return {
    data: tasks.map(t => ({
      ...t,
      subtaskCount: t._count.subtasks,
      commentCount: t._count.comments,
    })),
    total,
    page,
    pageSize,
  };
}

// ============================================================================
// TASK DEPENDENCY OPERATIONS
// ============================================================================

/**
 * Add task dependency
 */
export async function addTaskDependency(
  prisma: PrismaClient,
  input: TaskDependencyInput,
  userId: string
): Promise<any> {
  if (!config.task.enableDependencies) {
    throw new Error('Task dependencies are disabled');
  }
  
  if (input.taskId === input.dependsOnTaskId) {
    throw new Error('A task cannot depend on itself');
  }
  
  // Check for circular dependency
  const checkCircular = async (taskId: string, visited: Set<string>): Promise<boolean> => {
    if (visited.has(taskId)) return true;
    visited.add(taskId);
    
    const deps = await prisma.taskDependency.findMany({
      where: { taskId },
      select: { dependsOnTaskId: true },
    });
    
    for (const dep of deps) {
      if (await checkCircular(dep.dependsOnTaskId, visited)) {
        return true;
      }
    }
    
    return false;
  };
  
  const visited = new Set<string>([input.dependsOnTaskId]);
  if (await checkCircular(input.taskId, visited)) {
    throw new Error('This dependency would create a circular reference');
  }
  
  // Check if dependency already exists
  const existing = await prisma.taskDependency.findFirst({
    where: {
      taskId: input.taskId,
      dependsOnTaskId: input.dependsOnTaskId,
    },
  });
  
  if (existing) {
    throw new Error('Dependency already exists');
  }
  
  const dependency = await prisma.taskDependency.create({
    data: {
      id: uuidv4(),
      taskId: input.taskId,
      dependsOnTaskId: input.dependsOnTaskId,
      type: input.type,
      createdBy: userId,
    },
    include: {
      dependsOnTask: {
        select: { id: true, taskNumber: true, title: true, status: true },
      },
    },
  });
  
  // Log activity
  await prisma.taskActivity.create({
    data: {
      id: uuidv4(),
      taskId: input.taskId,
      userId,
      action: 'dependency_added',
      details: {
        dependsOnTaskId: input.dependsOnTaskId,
        type: input.type,
      },
    },
  });
  
  logger.info({
    taskId: input.taskId,
    dependsOnTaskId: input.dependsOnTaskId,
    type: input.type,
  }, 'Task dependency added');
  
  return dependency;
}

/**
 * Remove task dependency
 */
export async function removeTaskDependency(
  prisma: PrismaClient,
  taskId: string,
  dependsOnTaskId: string,
  userId: string
): Promise<void> {
  await prisma.taskDependency.deleteMany({
    where: { taskId, dependsOnTaskId },
  });
  
  // Log activity
  await prisma.taskActivity.create({
    data: {
      id: uuidv4(),
      taskId,
      userId,
      action: 'dependency_removed',
      details: { dependsOnTaskId },
    },
  });
  
  logger.info({ taskId, dependsOnTaskId }, 'Task dependency removed');
}

// ============================================================================
// ASSIGNMENT OPERATIONS
// ============================================================================

/**
 * Assign task to employee
 */
export async function assignTask(
  prisma: PrismaClient,
  taskId: string,
  employeeId: string,
  userId: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('task-service');
  
  // Check current assignee count
  const currentCount = await prisma.taskAssignee.count({
    where: { taskId, isActive: true },
  });
  
  if (currentCount >= config.task.maxAssigneesPerTask) {
    throw new Error(`Maximum ${config.task.maxAssigneesPerTask} assignees allowed per task`);
  }
  
  // Check if already assigned
  const existing = await prisma.taskAssignee.findFirst({
    where: { taskId, employeeId, isActive: true },
  });
  
  if (existing) {
    throw new Error('Employee is already assigned to this task');
  }
  
  const assignment = await prisma.taskAssignee.create({
    data: {
      id: uuidv4(),
      taskId,
      employeeId,
      isPrimary: currentCount === 0,
      assignedAt: new Date(),
      assignedBy: userId,
    },
    include: {
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      task: { select: { taskNumber: true, title: true, projectId: true } },
    },
  });
  
  // Log activity
  await prisma.taskActivity.create({
    data: {
      id: uuidv4(),
      taskId,
      userId,
      action: 'assigned',
      details: { employeeId },
    },
  });
  
  // Emit event
  await eventBus.sendToQueue(
    SQS_QUEUES.TASK_ASSIGNED,
    'task.assigned',
    {
      taskId,
      taskNumber: assignment.task.taskNumber,
      taskTitle: assignment.task.title,
      projectId: assignment.task.projectId,
      employeeId,
      assignedBy: userId,
    },
    tenantContext
  );
  
  logger.info({ taskId, employeeId }, 'Task assigned');
  
  return assignment;
}

/**
 * Unassign task from employee
 */
export async function unassignTask(
  prisma: PrismaClient,
  taskId: string,
  employeeId: string,
  userId: string
): Promise<void> {
  await prisma.taskAssignee.updateMany({
    where: { taskId, employeeId, isActive: true },
    data: { isActive: false, unassignedAt: new Date() },
  });
  
  // Log activity
  await prisma.taskActivity.create({
    data: {
      id: uuidv4(),
      taskId,
      userId,
      action: 'unassigned',
      details: { employeeId },
    },
  });
  
  logger.info({ taskId, employeeId }, 'Task unassigned');
}

/**
 * Get tasks assigned to an employee
 */
export async function getMyTasks(
  prisma: PrismaClient,
  employeeId: string,
  status?: string
): Promise<any[]> {
  const where: any = {
    assignees: {
      some: { employeeId, isActive: true },
    },
  };
  
  if (status) {
    where.status = status;
  } else {
    where.status = { notIn: ['done', 'cancelled'] };
  }
  
  return prisma.task.findMany({
    where,
    orderBy: [
      { priority: 'desc' },
      { dueDate: 'asc' },
    ],
    include: {
      project: { select: { id: true, name: true, code: true } },
      _count: { select: { subtasks: true, comments: true } },
    },
  });
}

/**
 * Get kanban board data for a project
 */
export async function getKanbanBoard(
  prisma: PrismaClient,
  projectId: string
): Promise<Record<string, any[]>> {
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      parentTaskId: null, // Only top-level tasks
    },
    orderBy: [
      { priority: 'desc' },
      { dueDate: 'asc' },
    ],
    include: {
      assignees: {
        where: { isActive: true },
        include: {
          employee: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        take: 3,
      },
      _count: { select: { subtasks: true, comments: true } },
    },
  });
  
  // Group by status
  const board: Record<string, any[]> = {};
  for (const status of config.task.statuses) {
    board[status] = [];
  }
  
  for (const task of tasks) {
    const status = task.status as string;
    if (board[status]) {
      board[status].push({
        ...task,
        subtaskCount: task._count.subtasks,
        commentCount: task._count.comments,
      });
    }
  }
  
  return board;
}
