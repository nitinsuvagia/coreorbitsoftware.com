/**
 * Badge Routes - API endpoints for badges & achievements
 * 
 * Badge Definitions (Admin/HR):
 *   GET    /badges          - List all badge definitions
 *   GET    /badges/stats    - Get badge statistics
 *   GET    /badges/:id      - Get a badge definition
 *   POST   /badges          - Create a badge definition
 *   PUT    /badges/:id      - Update a badge definition
 *   DELETE /badges/:id      - Delete a badge definition
 * 
 * Badge Assignments (HR/Admin/PM):
 *   POST   /badges/assign             - Assign a badge to an employee
 *   DELETE /badges/assignments/:id    - Revoke a badge assignment
 *   GET    /badges/employee/:employeeId - Get badges for an employee
 *   GET    /badges/leaderboard        - Get badge leaderboard
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '.prisma/tenant-client';
import * as badgeService from '../services/badge.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createBadgeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  category: z.enum([
    'PERFORMANCE', 'ATTENDANCE', 'TEAMWORK', 'LEADERSHIP',
    'INNOVATION', 'LEARNING', 'MILESTONE', 'SPECIAL',
  ]),
  points: z.number().int().min(1).max(1000).optional(),
  isActive: z.boolean().optional(),
});

const updateBadgeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  category: z.enum([
    'PERFORMANCE', 'ATTENDANCE', 'TEAMWORK', 'LEADERSHIP',
    'INNOVATION', 'LEARNING', 'MILESTONE', 'SPECIAL',
  ]).optional(),
  points: z.number().int().min(1).max(1000).optional(),
  isActive: z.boolean().optional(),
});

const assignBadgeSchema = z.object({
  employeeId: z.string().uuid(),
  badgeId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

const listBadgesSchema = z.object({
  search: z.string().optional(),
  category: z.enum([
    'PERFORMANCE', 'ATTENDANCE', 'TEAMWORK', 'LEADERSHIP',
    'INNOVATION', 'LEARNING', 'MILESTONE', 'SPECIAL',
  ]).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
});

// ============================================================================
// DEFAULT BADGES FOR SEEDING
// ============================================================================

const DEFAULT_BADGES = [
  { name: 'Early Bird', description: 'Consistently arrives early and starts the day with energy', icon: 'Sun', color: 'bg-yellow-500', category: 'ATTENDANCE', points: 10 },
  { name: 'Team Player', description: 'Goes above and beyond to help colleagues succeed', icon: 'Users', color: 'bg-blue-500', category: 'TEAMWORK', points: 15 },
  { name: 'Problem Solver', description: 'Finds creative solutions to complex challenges', icon: 'Lightbulb', color: 'bg-purple-500', category: 'INNOVATION', points: 20 },
  { name: 'Mentor', description: 'Guides and supports new team members effectively', icon: 'GraduationCap', color: 'bg-green-500', category: 'LEADERSHIP', points: 25 },
  { name: 'Star Performer', description: 'Consistently exceeds performance expectations', icon: 'Star', color: 'bg-amber-500', category: 'PERFORMANCE', points: 30 },
  { name: 'Quick Learner', description: 'Rapidly masters new skills and technologies', icon: 'Zap', color: 'bg-cyan-500', category: 'LEARNING', points: 15 },
  { name: 'Innovation Champion', description: 'Drives innovation and proposes new ideas', icon: 'Rocket', color: 'bg-pink-500', category: 'INNOVATION', points: 25 },
  { name: 'Reliable Rock', description: 'Dependable team member who always delivers', icon: 'Shield', color: 'bg-slate-500', category: 'PERFORMANCE', points: 20 },
  { name: '1 Year Milestone', description: 'Celebrating one year with the company', icon: 'Trophy', color: 'bg-orange-500', category: 'MILESTONE', points: 50 },
  { name: '5 Year Milestone', description: 'Celebrating five years of dedication', icon: 'Crown', color: 'bg-amber-600', category: 'MILESTONE', points: 100 },
  { name: 'Customer Hero', description: 'Exceptional customer service and satisfaction', icon: 'Heart', color: 'bg-red-500', category: 'SPECIAL', points: 25 },
  { name: 'Code Ninja', description: 'Outstanding technical skills and code quality', icon: 'Code', color: 'bg-indigo-500', category: 'INNOVATION', points: 20 },
];

// ============================================================================
// HELPERS
// ============================================================================

function getUserId(req: Request): string {
  return req.headers['x-user-id'] as string || 'system';
}

function getUserName(req: Request): string {
  const firstName = req.headers['x-user-first-name'] as string || '';
  const lastName = req.headers['x-user-last-name'] as string || '';
  return `${firstName} ${lastName}`.trim() || 'System';
}

function getPrismaFromRequest(req: Request): PrismaClient {
  const prisma = (req as any).prisma as PrismaClient;
  if (!prisma) {
    throw new Error('Prisma client not found on request. Ensure tenant context middleware is configured.');
  }
  return prisma;
}

// ============================================================================
// BADGE DEFINITION ROUTES
// ============================================================================

/**
 * GET /badges - List all badge definitions
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const filters = listBadgesSchema.parse(req.query);
    const result = await badgeService.listBadges(prisma, filters);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: filters.page || 1,
        pageSize: filters.pageSize || 50,
        total: result.total,
        totalPages: Math.ceil(result.total / (filters.pageSize || 50)),
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to list badges');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.errors } });
    }
    res.status(500).json({ success: false, error: { message: 'Failed to list badges' } });
  }
});

/**
 * GET /badges/stats - Get badge statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const stats = await badgeService.getBadgeStats(prisma);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get badge stats');
    res.status(500).json({ success: false, error: { message: 'Failed to get badge statistics' } });
  }
});

/**
 * GET /badges/leaderboard - Get badge leaderboard
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = await badgeService.getBadgeLeaderboard(prisma, Math.min(limit, 50));
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get leaderboard');
    res.status(500).json({ success: false, error: { message: 'Failed to get leaderboard' } });
  }
});

/**
 * GET /badges/employee/:employeeId - Get badges for a specific employee
 */
router.get('/employee/:employeeId', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId } = req.params;
    const badges = await badgeService.getEmployeeBadges(prisma, employeeId);
    res.json({ success: true, data: badges });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get employee badges');
    res.status(500).json({ success: false, error: { message: 'Failed to get employee badges' } });
  }
});

/**
 * GET /badges/:id - Get a badge definition by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const badge = await badgeService.getBadgeById(prisma, req.params.id);

    if (!badge) {
      return res.status(404).json({ success: false, error: { message: 'Badge not found' } });
    }

    res.json({ success: true, data: badge });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get badge');
    res.status(500).json({ success: false, error: { message: 'Failed to get badge' } });
  }
});

/**
 * POST /badges - Create a new badge definition
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const data = createBadgeSchema.parse(req.body) as badgeService.CreateBadgeInput;
    const userId = getUserId(req);

    const badge = await badgeService.createBadge(prisma, data, userId);

    res.status(201).json({ success: true, data: badge });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to create badge');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.errors } });
    }
    res.status(500).json({ success: false, error: { message: 'Failed to create badge' } });
  }
});

/**
 * POST /badges/assign - Assign a badge to an employee
 */
router.post('/assign', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const data = assignBadgeSchema.parse(req.body) as badgeService.AssignBadgeInput;
    const userId = getUserId(req);
    const userName = getUserName(req);

    const assignment = await badgeService.assignBadge(prisma, data, userId, userName);

    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to assign badge');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.errors } });
    }
    if ((error as Error).message.includes('not found') || (error as Error).message.includes('not active')) {
      return res.status(400).json({ success: false, error: { message: (error as Error).message } });
    }
    res.status(500).json({ success: false, error: { message: 'Failed to assign badge' } });
  }
});

/**
 * PUT /badges/:id - Update a badge definition
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const data = updateBadgeSchema.parse(req.body);

    const badge = await badgeService.updateBadge(prisma, req.params.id, data);

    if (!badge) {
      return res.status(404).json({ success: false, error: { message: 'Badge not found' } });
    }

    res.json({ success: true, data: badge });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to update badge');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.errors } });
    }
    res.status(500).json({ success: false, error: { message: 'Failed to update badge' } });
  }
});

/**
 * DELETE /badges/:id - Delete a badge definition
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    await badgeService.deleteBadge(prisma, req.params.id);
    res.json({ success: true, message: 'Badge deleted successfully' });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to delete badge');
    res.status(500).json({ success: false, error: { message: 'Failed to delete badge' } });
  }
});

/**
 * DELETE /badges/assignments/:id - Revoke a badge assignment
 */
router.delete('/assignments/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    await badgeService.revokeBadge(prisma, req.params.id);
    res.json({ success: true, message: 'Badge revoked successfully' });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to revoke badge');
    res.status(500).json({ success: false, error: { message: 'Failed to revoke badge' } });
  }
});

/**
 * POST /badges/seed - Seed default badges (for initial setup)
 */
router.post('/seed', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    
    // Check if badges already exist (using raw SQL since Badge isn't in Prisma schema)
    const countResult = await (prisma as any).$queryRaw`SELECT COUNT(*) as count FROM badges`;
    const existingCount = Number(countResult[0]?.count || 0);
    
    if (existingCount > 0) {
      return res.json({
        success: true,
        message: 'Badges already exist, skipping seed',
        data: { existingCount },
      });
    }

    // Create default badges using raw SQL
    let createdCount = 0;
    for (const badge of DEFAULT_BADGES) {
      await (prisma as any).$queryRaw`
        INSERT INTO badges (id, name, description, icon, color, category, points, is_active, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          ${badge.name},
          ${badge.description},
          ${badge.icon},
          ${badge.color},
          ${badge.category}::"BadgeCategory",
          ${badge.points},
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT DO NOTHING
      `;
      createdCount++;
    }

    logger.info({ count: createdCount }, 'Default badges seeded');

    res.status(201).json({
      success: true,
      message: 'Default badges created successfully',
      data: { created: createdCount },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to seed badges');
    res.status(500).json({ success: false, error: { message: 'Failed to seed badges' } });
  }
});

export default router;
