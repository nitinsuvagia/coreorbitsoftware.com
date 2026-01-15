/**
 * Task Routes - API endpoints for task operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantPrisma } from '@oms/tenant-db-manager';
import * as taskService from '../services/task.service';
import * as commentService from '../services/comment.service';
import * as activityService from '../services/activity.service';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  parentTaskId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(50000).optional(),
  status: z.enum(config.task.statuses as [string, ...string[]]).optional(),
  priority: z.enum(config.task.priorities as [string, ...string[]]).optional(),
  type: z.enum(['task', 'bug', 'story', 'epic', 'subtask']).optional(),
  assigneeIds: z.array(z.string().uuid()).max(config.task.maxAssigneesPerTask).optional(),
  reporterId: z.string().uuid(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).max(9999).optional(),
  labels: z.array(z.string().max(50)).max(20).optional(),
  customFields: z.record(z.any()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(50000).optional(),
  status: z.enum(config.task.statuses as [string, ...string[]]).optional(),
  priority: z.enum(config.task.priorities as [string, ...string[]]).optional(),
  assigneeIds: z.array(z.string().uuid()).max(config.task.maxAssigneesPerTask).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().min(0).max(9999).optional(),
  actualHours: z.number().min(0).max(99999).optional(),
  labels: z.array(z.string().max(50)).max(20).optional(),
  customFields: z.record(z.any()).optional(),
  completedAt: z.string().datetime().optional(),
});

const taskFiltersSchema = z.object({
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  reporterId: z.string().uuid().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  parentTaskId: z.string().uuid().optional(),
  hasParent: z.enum(['true', 'false']).optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
  labels: z.string().optional().transform(v => v?.split(',').filter(Boolean)),
  search: z.string().max(200).optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  page: z.string().optional().transform(v => v ? parseInt(v, 10) : 1),
  pageSize: z.string().optional().transform(v => v ? parseInt(v, 10) : 20),
});

const addDependencySchema = z.object({
  dependsOnTaskId: z.string().uuid(),
  type: z.enum(['blocks', 'is_blocked_by', 'relates_to', 'duplicates']),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(config.comment.maxCommentLength),
  parentCommentId: z.string().uuid().optional(),
  mentions: z.array(z.string().uuid()).optional(),
  attachments: z.array(z.string().uuid()).optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(config.comment.maxCommentLength),
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

function getTenantContext(req: Request) {
  const tenantId = req.headers['x-tenant-id'] as string;
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  const userId = req.headers['x-user-id'] as string;
  const employeeId = req.headers['x-employee-id'] as string;
  
  if (!tenantId || !tenantSlug) {
    throw new Error('Tenant context not found');
  }
  
  return { tenantId, tenantSlug, userId, employeeId };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// TASK ENDPOINTS
// ============================================================================

// Create task
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, tenantSlug, userId } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const input = createTaskSchema.parse(req.body) as taskService.CreateTaskInput;
    
    const task = await taskService.createTask(
      prisma,
      input,
      userId,
      { tenantId, tenantSlug }
    );
    
    res.status(201).json({ success: true, data: task });
  })
);

// List tasks
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const filters = taskFiltersSchema.parse(req.query);
    
    const result = await taskService.listTasks(prisma, filters);
    
    res.json({ success: true, ...result });
  })
);

// Get my tasks
router.get(
  '/my-tasks',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, employeeId } = getTenantContext(req);
    
    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee context required' });
    }
    
    const prisma = getTenantPrisma();
    const status = req.query.status as string | undefined;
    
    const tasks = await taskService.getMyTasks(prisma, employeeId, status);
    
    res.json({ success: true, data: tasks });
  })
);

// Get kanban board
router.get(
  '/kanban/:projectId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const board = await taskService.getKanbanBoard(prisma, req.params.projectId);
    
    res.json({ success: true, data: board });
  })
);

// Get task by ID
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const task = await taskService.getTaskById(prisma, req.params.id);
    
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    
    res.json({ success: true, data: task });
  })
);

// Get task by number
router.get(
  '/number/:taskNumber',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const task = await taskService.getTaskByNumber(prisma, req.params.taskNumber);
    
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    
    res.json({ success: true, data: task });
  })
);

// Update task
router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, tenantSlug, userId } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const input = updateTaskSchema.parse(req.body);
    
    const task = await taskService.updateTask(
      prisma,
      req.params.id,
      input,
      userId,
      { tenantId, tenantSlug }
    );
    
    res.json({ success: true, data: task });
  })
);

// Delete task
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    await taskService.deleteTask(prisma, req.params.id);
    
    res.json({ success: true, message: 'Task deleted successfully' });
  })
);

// ============================================================================
// TASK ASSIGNMENT ENDPOINTS
// ============================================================================

// Assign task
router.post(
  '/:id/assign/:employeeId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, tenantSlug, userId } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const assignment = await taskService.assignTask(
      prisma,
      req.params.id,
      req.params.employeeId,
      userId,
      { tenantId, tenantSlug }
    );
    
    res.status(201).json({ success: true, data: assignment });
  })
);

// Unassign task
router.delete(
  '/:id/assign/:employeeId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    await taskService.unassignTask(
      prisma,
      req.params.id,
      req.params.employeeId,
      userId
    );
    
    res.json({ success: true, message: 'Unassigned successfully' });
  })
);

// ============================================================================
// TASK DEPENDENCY ENDPOINTS
// ============================================================================

// Add dependency
router.post(
  '/:id/dependencies',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const input = addDependencySchema.parse(req.body);
    
    const dependency = await taskService.addTaskDependency(
      prisma,
      {
        taskId: req.params.id,
        dependsOnTaskId: input.dependsOnTaskId,
        type: input.type,
      },
      userId
    );
    
    res.status(201).json({ success: true, data: dependency });
  })
);

// Remove dependency
router.delete(
  '/:id/dependencies/:dependsOnTaskId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    await taskService.removeTaskDependency(
      prisma,
      req.params.id,
      req.params.dependsOnTaskId,
      userId
    );
    
    res.json({ success: true, message: 'Dependency removed successfully' });
  })
);

// ============================================================================
// COMMENT ENDPOINTS
// ============================================================================

// Create comment
router.post(
  '/:id/comments',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, tenantSlug, userId, employeeId } = getTenantContext(req);
    
    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee context required' });
    }
    
    const prisma = getTenantPrisma();
    
    const input = createCommentSchema.parse(req.body);
    
    const comment = await commentService.createComment(
      prisma,
      { taskId: req.params.id, ...input } as commentService.CreateCommentInput,
      userId,
      employeeId,
      { tenantId, tenantSlug }
    );
    
    res.status(201).json({ success: true, data: comment });
  })
);

// List comments
router.get(
  '/:id/comments',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const result = await commentService.listComments(prisma, {
      taskId: req.params.id,
      includeReplies: req.query.includeReplies === 'true',
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20,
    });
    
    res.json({ success: true, ...result });
  })
);

// Get comment
router.get(
  '/comments/:commentId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const comment = await commentService.getCommentById(prisma, req.params.commentId);
    
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }
    
    res.json({ success: true, data: comment });
  })
);

// Update comment
router.patch(
  '/comments/:commentId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const input = updateCommentSchema.parse(req.body) as commentService.UpdateCommentInput;
    
    const comment = await commentService.updateComment(
      prisma,
      req.params.commentId,
      input,
      userId
    );
    
    res.json({ success: true, data: comment });
  })
);

// Delete comment
router.delete(
  '/comments/:commentId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    await commentService.deleteComment(prisma, req.params.commentId, userId);
    
    res.json({ success: true, message: 'Comment deleted successfully' });
  })
);

// Add reaction
router.post(
  '/comments/:commentId/reactions',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const { emoji } = req.body;
    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ success: false, error: 'Emoji is required' });
    }
    
    const reaction = await commentService.addReaction(
      prisma,
      req.params.commentId,
      emoji,
      userId
    );
    
    res.status(201).json({ success: true, data: reaction });
  })
);

// Remove reaction
router.delete(
  '/comments/:commentId/reactions/:emoji',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    await commentService.removeReaction(
      prisma,
      req.params.commentId,
      req.params.emoji,
      userId
    );
    
    res.json({ success: true, message: 'Reaction removed' });
  })
);

// Get reactions
router.get(
  '/comments/:commentId/reactions',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const reactions = await commentService.getCommentReactions(
      prisma,
      req.params.commentId
    );
    
    res.json({ success: true, data: reactions });
  })
);

// ============================================================================
// ACTIVITY ENDPOINTS
// ============================================================================

// Get task timeline
router.get(
  '/:id/timeline',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    
    const timeline = await activityService.getTaskTimeline(
      prisma,
      req.params.id,
      { limit }
    );
    
    res.json({ success: true, data: timeline });
  })
);

// Get task activity summary
router.get(
  '/:id/activity-summary',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const summary = await activityService.getTaskActivitySummary(
      prisma,
      req.params.id
    );
    
    res.json({ success: true, data: summary });
  })
);

// Get user activity feed
router.get(
  '/activity/my-feed',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const includeOwnActions = req.query.includeOwn === 'true';
    
    const feed = await activityService.getUserActivityFeed(
      prisma,
      userId,
      { limit, includeOwnActions }
    );
    
    res.json({ success: true, data: feed });
  })
);

// Get project activity feed
router.get(
  '/activity/project/:projectId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const actions = req.query.actions
      ? (req.query.actions as string).split(',') as activityService.ActivityAction[]
      : undefined;
    
    const feed = await activityService.getProjectActivityFeed(
      prisma,
      req.params.projectId,
      { limit, actions }
    );
    
    res.json({ success: true, data: feed });
  })
);

// Get activity stats
router.get(
  '/activity/stats/:projectId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const from = req.query.from
      ? new Date(req.query.from as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const to = req.query.to ? new Date(req.query.to as string) : new Date();
    
    const stats = await activityService.getActivityStats(
      prisma,
      req.params.projectId,
      from,
      to
    );
    
    res.json({ success: true, data: stats });
  })
);

export default router;
