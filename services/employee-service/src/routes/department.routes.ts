/**
 * Department & Team Routes - API endpoints for organizational structure
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '.prisma/tenant-client';

import * as departmentService from '../services/department.service';
import type { CreateDepartmentInput, CreateTeamInput } from '../services/department.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(2).max(20),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  headId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(2).max(20).optional(),
  description: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  headId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(2).max(20),
  description: z.string().optional(),
  departmentId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(2).max(20).optional(),
  description: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  leadId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const listSchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  parentId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().optional(),
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(1).max(1000).optional(),
});

// ============================================================================
// HELPER
// ============================================================================

function getUserId(req: Request): string {
  return req.headers['x-user-id'] as string || 'system';
}

/**
 * Get Prisma client from request (set by tenant context middleware)
 */
function getPrismaFromRequest(req: Request): PrismaClient {
  const prisma = (req as any).prisma as PrismaClient;
  if (!prisma) {
    throw new Error('Prisma client not found on request. Ensure tenant context middleware is configured.');
  }
  return prisma;
}

// ============================================================================
// DEPARTMENT ROUTES
// ============================================================================

/**
 * POST /departments - Create department
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createDepartmentSchema.parse(req.body) as CreateDepartmentInput;
    const prisma = getPrismaFromRequest(req);
    const userId = getUserId(req);
    
    const department = await departmentService.createDepartment(prisma, data, userId);
    
    res.status(201).json({
      success: true,
      data: department,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to create department');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }
    
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /departments - List departments
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = listSchema.parse(req.query);
    const prisma = getPrismaFromRequest(req);
    
    const result = await departmentService.listDepartments(prisma, filters);
    
    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'LIST_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /departments/hierarchy - Get department hierarchy (org chart)
 */
router.get('/hierarchy', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const hierarchy = await departmentService.getDepartmentHierarchy(prisma);
    
    res.json({
      success: true,
      data: hierarchy,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /departments/:id - Get department by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const department = await departmentService.getDepartmentById(prisma, req.params.id);
    
    res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: (error as Error).message },
    });
  }
});

/**
 * PATCH /departments/:id - Update department
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateDepartmentSchema.parse(req.body);
    const prisma = getPrismaFromRequest(req);
    const userId = getUserId(req);
    
    const department = await departmentService.updateDepartment(
      prisma,
      req.params.id,
      data,
      userId
    );
    
    res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }
    
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * DELETE /departments/:id/permanent - Permanently delete department
 * NOTE: This route must come BEFORE /:id to avoid being caught by it
 */
router.delete('/:id/permanent', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const userId = getUserId(req);
    
    await departmentService.permanentlyDeleteDepartment(prisma, req.params.id, userId);
    
    res.json({
      success: true,
      message: 'Department permanently deleted',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 'PERMANENT_DELETE_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * DELETE /departments/:id - Delete department (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const userId = getUserId(req);
    
    await departmentService.deleteDepartment(prisma, req.params.id, userId);
    
    res.json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: (error as Error).message },
    });
  }
});

// ============================================================================
// TEAM ROUTES (nested under departments)
// ============================================================================

/**
 * POST /departments/:departmentId/teams - Create team
 */
router.post('/:departmentId/teams', async (req: Request, res: Response) => {
  try {
    const data = createTeamSchema.parse({
      ...req.body,
      departmentId: req.params.departmentId,
    }) as CreateTeamInput;
    const prisma = getPrismaFromRequest(req);
    const userId = getUserId(req);
    
    const team = await departmentService.createTeam(prisma, data, userId);
    
    res.status(201).json({
      success: true,
      data: team,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }
    
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /departments/:departmentId/teams - List teams in department
 */
router.get('/:departmentId/teams', async (req: Request, res: Response) => {
  try {
    const filters = listSchema.parse({
      ...req.query,
      departmentId: req.params.departmentId,
    });
    const prisma = getPrismaFromRequest(req);
    
    const result = await departmentService.listTeams(prisma, filters);
    
    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'LIST_FAILED', message: (error as Error).message },
    });
  }
});

export default router;

// ============================================================================
// STANDALONE TEAM ROUTES
// ============================================================================

export const teamRouter = Router();

/**
 * GET /teams - List all teams
 */
teamRouter.get('/', async (req: Request, res: Response) => {
  try {
    const filters = listSchema.parse(req.query);
    const prisma = getPrismaFromRequest(req);
    
    const result = await departmentService.listTeams(prisma, filters);
    
    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'LIST_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /teams/:id - Get team by ID
 */
teamRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const team = await departmentService.getTeamById(prisma, req.params.id);
    
    res.json({
      success: true,
      data: team,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: (error as Error).message },
    });
  }
});

/**
 * PATCH /teams/:id - Update team
 */
teamRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateTeamSchema.parse(req.body);
    const prisma = getPrismaFromRequest(req);
    const userId = getUserId(req);
    
    const team = await departmentService.updateTeam(prisma, req.params.id, data, userId);
    
    res.json({
      success: true,
      data: team,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }
    
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * DELETE /teams/:id - Delete team
 */
teamRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const userId = getUserId(req);
    
    await departmentService.deleteTeam(prisma, req.params.id, userId);
    
    res.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: (error as Error).message },
    });
  }
});
