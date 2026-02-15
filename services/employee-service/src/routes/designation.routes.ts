/**
 * Designation Routes - API endpoints for job titles
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '.prisma/tenant-client';

import * as designationService from '../services/designation.service';
import type { CreateDesignationInput } from '../services/designation.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(2).max(20),
  description: z.string().optional(),
  level: z.number().int().min(1).max(20),
  departmentId: z.string().uuid().optional(),
  minSalary: z.number().positive().optional(),
  maxSalary: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(2).max(20).optional(),
  description: z.string().optional(),
  level: z.number().int().min(1).max(20).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  minSalary: z.number().positive().nullable().optional(),
  maxSalary: z.number().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const listSchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  departmentId: z.string().uuid().optional(),
  minLevel: z.coerce.number().optional(),
  maxLevel: z.coerce.number().optional(),
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
// ROUTES
// ============================================================================

/**
 * POST /designations - Create designation
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body) as CreateDesignationInput;
    const prisma = getPrismaFromRequest(req);
    const userId = getUserId(req);
    
    const designation = await designationService.createDesignation(prisma, data, userId);
    
    res.status(201).json({
      success: true,
      data: designation,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to create designation');
    
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
 * GET /designations - List designations
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = listSchema.parse(req.query);
    const prisma = getPrismaFromRequest(req);
    
    const result = await designationService.listDesignations(prisma, filters);
    
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
 * GET /designations/by-level - Get designations grouped by level
 */
router.get('/by-level', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const byLevel = await designationService.getDesignationsByLevel(prisma);
    
    // Convert Map to object for JSON serialization
    const data: Record<number, any[]> = {};
    for (const [level, designations] of byLevel) {
      data[level] = designations;
    }
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /designations/:id - Get designation by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const designation = await designationService.getDesignationById(prisma, req.params.id);
    
    res.json({
      success: true,
      data: designation,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: (error as Error).message },
    });
  }
});

/**
 * PATCH /designations/:id - Update designation
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateSchema.parse(req.body);
    const prisma = getPrismaFromRequest(req);
    const userId = getUserId(req);
    
    const designation = await designationService.updateDesignation(
      prisma,
      req.params.id,
      data,
      userId
    );
    
    res.json({
      success: true,
      data: designation,
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
 * DELETE /designations/:id/permanent - Permanently delete designation
 * NOTE: This route must come BEFORE /:id to avoid being caught by it
 */
router.delete('/:id/permanent', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const userId = getUserId(req);
    
    await designationService.permanentlyDeleteDesignation(prisma, req.params.id, userId);
    
    res.json({
      success: true,
      message: 'Designation permanently deleted',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 'PERMANENT_DELETE_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * DELETE /designations/:id - Delete designation (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const userId = getUserId(req);
    
    await designationService.deleteDesignation(prisma, req.params.id, userId);
    
    res.json({
      success: true,
      message: 'Designation deleted successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: (error as Error).message },
    });
  }
});

export default router;
