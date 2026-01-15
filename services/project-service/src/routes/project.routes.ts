/**
 * Project Routes - API endpoints for project management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantPrisma } from '@oms/tenant-db-manager';
import {
  createProject,
  getProjectById,
  updateProject,
  listProjects,
  createPhase,
  updatePhase,
  deletePhase,
  createMilestone,
  updateMilestone,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  getEmployeeProjects,
} from '../services/project.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createProjectSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().min(2).max(20).optional(),
  description: z.string().max(2000).optional(),
  clientId: z.string().uuid(),
  managerId: z.string().uuid(),
  type: z.enum(['fixed_price', 'time_and_material', 'internal', 'retainer']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimatedHours: z.number().min(0).optional(),
  budgetCents: z.number().min(0).optional(),
  hourlyRateCents: z.number().min(0).optional(),
  isBillable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  managerId: z.string().uuid().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimatedHours: z.number().min(0).optional(),
  budgetCents: z.number().min(0).optional(),
  hourlyRateCents: z.number().min(0).optional(),
  isBillable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  completedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const createPhaseSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  order: z.number().min(1),
});

const createMilestoneSchema = z.object({
  phaseId: z.string().uuid().optional(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isBillable: z.boolean().optional(),
  amountCents: z.number().min(0).optional(),
});

const addTeamMemberSchema = z.object({
  employeeId: z.string().uuid(),
  role: z.string().min(2).max(100),
  hourlyRateCents: z.number().min(0).optional(),
  allocatedHours: z.number().min(0).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const listProjectsSchema = z.object({
  clientId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  priority: z.string().optional(),
  isBillable: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

// ============================================================================
// PROJECT ROUTES
// ============================================================================

/**
 * POST /projects
 */
router.post(
  '/',
  validateBody(createProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const userId = (req as any).userId;
      const { tenantId, tenantSlug } = req as any;
      
      const project = await createProject(
        prisma, 
        req.body, 
        userId, 
        { tenantId, tenantSlug }
      );
      
      res.status(201).json({
        message: 'Project created successfully',
        data: project,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Create project failed');
      if ((error as Error).message.includes('not found')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * GET /projects
 */
router.get(
  '/',
  validateQuery(listProjectsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      
      const result = await listProjects(prisma, req.query as any);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /projects/my
 * Get projects for the current employee
 */
router.get(
  '/my',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const employeeId = req.query.employeeId as string;
      
      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' });
      }
      
      const projects = await getEmployeeProjects(prisma, employeeId);
      
      res.json({ data: projects });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /projects/:id
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      
      const project = await getProjectById(prisma, id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json({ data: project });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /projects/:id
 */
router.put(
  '/:id',
  validateBody(updateProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      const userId = (req as any).userId;
      const { tenantId, tenantSlug } = req as any;
      
      const project = await updateProject(
        prisma, 
        id, 
        req.body, 
        userId,
        { tenantId, tenantSlug }
      );
      
      res.json({
        message: 'Project updated successfully',
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// PHASE ROUTES
// ============================================================================

/**
 * POST /projects/:id/phases
 */
router.post(
  '/:id/phases',
  validateBody(createPhaseSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      const userId = (req as any).userId;
      
      const phase = await createPhase(
        prisma, 
        { ...req.body, projectId: id }, 
        userId
      );
      
      res.status(201).json({
        message: 'Phase created successfully',
        data: phase,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /projects/:projectId/phases/:phaseId
 */
router.put(
  '/:projectId/phases/:phaseId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { phaseId } = req.params;
      const userId = (req as any).userId;
      
      const phase = await updatePhase(prisma, phaseId, req.body, userId);
      
      res.json({
        message: 'Phase updated successfully',
        data: phase,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /projects/:projectId/phases/:phaseId
 */
router.delete(
  '/:projectId/phases/:phaseId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { phaseId } = req.params;
      
      await deletePhase(prisma, phaseId);
      
      res.json({ message: 'Phase deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// MILESTONE ROUTES
// ============================================================================

/**
 * POST /projects/:id/milestones
 */
router.post(
  '/:id/milestones',
  validateBody(createMilestoneSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      const userId = (req as any).userId;
      
      const milestone = await createMilestone(
        prisma, 
        { ...req.body, projectId: id }, 
        userId
      );
      
      res.status(201).json({
        message: 'Milestone created successfully',
        data: milestone,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /projects/:projectId/milestones/:milestoneId
 */
router.put(
  '/:projectId/milestones/:milestoneId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { milestoneId } = req.params;
      const userId = (req as any).userId;
      
      const milestone = await updateMilestone(prisma, milestoneId, req.body, userId);
      
      res.json({
        message: 'Milestone updated successfully',
        data: milestone,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// TEAM MEMBER ROUTES
// ============================================================================

/**
 * POST /projects/:id/team
 */
router.post(
  '/:id/team',
  validateBody(addTeamMemberSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      const userId = (req as any).userId;
      
      const member = await addTeamMember(
        prisma, 
        { ...req.body, projectId: id }, 
        userId
      );
      
      res.status(201).json({
        message: 'Team member added successfully',
        data: member,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Add team member failed');
      if ((error as Error).message.includes('already a team member') ||
          (error as Error).message.includes('Maximum team size')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * PUT /projects/:projectId/team/:memberId
 */
router.put(
  '/:projectId/team/:memberId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { memberId } = req.params;
      const userId = (req as any).userId;
      
      const member = await updateTeamMember(prisma, memberId, req.body, userId);
      
      res.json({
        message: 'Team member updated successfully',
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /projects/:projectId/team/:memberId
 */
router.delete(
  '/:projectId/team/:memberId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { memberId } = req.params;
      const userId = (req as any).userId;
      
      await removeTeamMember(prisma, memberId, userId);
      
      res.json({ message: 'Team member removed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
