/**
 * Performance Review Routes - API endpoints for employee performance reviews
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '.prisma/tenant-client';
import { logger } from '../utils/logger';

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

/**
 * Transform a snake_case DB row to camelCase
 */
function transformReview(r: any) {
  return {
    id: r.id,
    employeeId: r.employee_id,
    reviewerId: r.reviewer_id,
    reviewPeriod: r.review_period,
    reviewType: r.review_type,
    communicationRating: r.communication_rating,
    technicalSkillsRating: r.technical_skills_rating,
    teamworkRating: r.teamwork_rating,
    problemSolvingRating: r.problem_solving_rating,
    punctualityRating: r.punctuality_rating,
    initiativeRating: r.initiative_rating,
    overallRating: r.overall_rating ? parseFloat(r.overall_rating) : null,
    strengths: r.strengths,
    areasForImprovement: r.areas_for_improvement,
    goalsNextPeriod: r.goals_next_period,
    additionalComments: r.additional_comments,
    status: r.status,
    submittedAt: r.submitted_at,
    acknowledgedAt: r.acknowledged_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    employee: r.employee_first_name ? {
      id: r.employee_id,
      firstName: r.employee_first_name,
      lastName: r.employee_last_name,
      email: r.employee_email,
      employeeCode: r.employee_code,
    } : undefined,
    reviewer: r.reviewer_first_name ? {
      id: r.reviewer_id,
      firstName: r.reviewer_first_name,
      lastName: r.reviewer_last_name,
      email: r.reviewer_email,
    } : null,
  };
}

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const optionalRating = z.number().min(1).max(10).nullable().optional().transform(val => val === null ? undefined : val);

const createReviewSchema = z.object({
  employeeId: z.string().min(1),
  reviewPeriod: z.string().min(1).max(50),
  reviewType: z.enum(['monthly', 'quarterly', 'annual', '360', 'probation']).default('monthly'),
  communicationRating: optionalRating,
  technicalSkillsRating: optionalRating,
  teamworkRating: optionalRating,
  problemSolvingRating: optionalRating,
  punctualityRating: optionalRating,
  initiativeRating: optionalRating,
  overallRating: optionalRating,
  strengths: z.string().nullable().optional(),
  areasForImprovement: z.string().nullable().optional(),
  goalsNextPeriod: z.string().nullable().optional(),
  additionalComments: z.string().nullable().optional(),
  status: z.enum(['draft', 'submitted']).default('draft'),
});

const updateReviewSchema = createReviewSchema.partial().omit({ employeeId: true });

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/performance-reviews/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const result = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*)::int AS total,
        COALESCE(AVG(overall_rating), 0) AS avg_rating,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS drafts,
        COUNT(*) FILTER (WHERE status = 'submitted')::int AS submitted,
        COUNT(*) FILTER (WHERE status = 'acknowledged')::int AS acknowledged,
        COUNT(DISTINCT employee_id)::int AS employees_reviewed,
        COUNT(DISTINCT reviewer_id)::int AS unique_reviewers
      FROM performance_reviews
    `) as any[];
    const s = result[0] || {};
    res.json({
      success: true,
      data: {
        totalReviews: s.total || 0,
        avgOverallRating: s.avg_rating ? parseFloat(Number(s.avg_rating).toFixed(1)) : 0,
        reviewsDraft: s.drafts || 0,
        reviewsSubmitted: s.submitted || 0,
        reviewsAcknowledged: s.acknowledged || 0,
        employeesReviewed: s.employees_reviewed || 0,
        uniqueReviewers: s.unique_reviewers || 0,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch performance review stats');
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v1/performance-reviews/summary/:employeeId
 */
router.get('/summary/:employeeId', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId } = req.params;

    const avgResult = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*)::int AS review_count,
        COALESCE(AVG(communication_rating), 0) AS communication,
        COALESCE(AVG(technical_skills_rating), 0) AS technical_skills,
        COALESCE(AVG(teamwork_rating), 0) AS teamwork,
        COALESCE(AVG(problem_solving_rating), 0) AS problem_solving,
        COALESCE(AVG(punctuality_rating), 0) AS punctuality,
        COALESCE(AVG(initiative_rating), 0) AS initiative,
        COALESCE(AVG(overall_rating), 0) AS overall_rating,
        MAX(review_period) AS latest_period
      FROM performance_reviews
      WHERE employee_id = $1
        AND status IN ('submitted', 'acknowledged')
    `, employeeId) as any[];

    const avg = avgResult[0] || {};

    const trendResult = await prisma.$queryRawUnsafe(`
      SELECT overall_rating
      FROM performance_reviews
      WHERE employee_id = $1
        AND status IN ('submitted', 'acknowledged')
        AND overall_rating IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 2
    `, employeeId) as any[];

    let trendValue = 0;
    let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
    if (trendResult.length >= 2) {
      trendValue = parseFloat(trendResult[0].overall_rating) - parseFloat(trendResult[1].overall_rating);
      trendValue = Math.round(trendValue * 10) / 10;
      trendDirection = trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'neutral';
    }

    const percentileResult = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(DISTINCT employee_id)::int AS total_employees,
        COUNT(DISTINCT employee_id) FILTER (WHERE avg_overall <= $1)::int AS rank_below
      FROM (
        SELECT employee_id, AVG(overall_rating) AS avg_overall
        FROM performance_reviews
        WHERE status IN ('submitted', 'acknowledged')
          AND overall_rating IS NOT NULL
        GROUP BY employee_id
      ) sub
    `, avg.overall_rating || 0) as any[];

    const pct = percentileResult[0] || {};
    const totalEmp = pct.total_employees || 1;
    const rankBelow = pct.rank_below || 0;
    const percentile = Math.round((rankBelow / totalEmp) * 100);

    res.json({
      success: true,
      data: {
        totalReviews: avg.review_count || 0,
        latestReviewPeriod: avg.latest_period || null,
        latestReviewDate: null,
        overallRating: avg.overall_rating ? parseFloat(Number(avg.overall_rating).toFixed(1)) : 0,
        trend: trendDirection,
        percentile,
        scores: {
          communication: parseFloat(Number(avg.communication || 0).toFixed(1)),
          technicalSkills: parseFloat(Number(avg.technical_skills || 0).toFixed(1)),
          teamwork: parseFloat(Number(avg.teamwork || 0).toFixed(1)),
          problemSolving: parseFloat(Number(avg.problem_solving || 0).toFixed(1)),
          punctuality: parseFloat(Number(avg.punctuality || 0).toFixed(1)),
          initiative: parseFloat(Number(avg.initiative || 0).toFixed(1)),
        },
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch performance summary');
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v1/performance-reviews/pending/count
 */
router.get('/pending/count', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const result = await prisma.$queryRawUnsafe(
      "SELECT COUNT(*)::int AS count FROM performance_reviews WHERE status = 'submitted'"
    ) as any[];
    res.json({ success: true, data: { count: result[0]?.count || 0 } });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch pending reviews count');
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v1/performance-reviews/employee/:employeeId
 */
router.get('/employee/:employeeId', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId } = req.params;
    const reviews = await prisma.$queryRawUnsafe(
      `SELECT pr.*,
              r.first_name AS reviewer_first_name,
              r.last_name AS reviewer_last_name,
              r.email AS reviewer_email
       FROM performance_reviews pr
       LEFT JOIN employees r ON pr.reviewer_id = r.id
       WHERE pr.employee_id = $1
       ORDER BY pr.created_at DESC`,
      employeeId
    ) as any[];
    res.json({ success: true, data: reviews.map(transformReview) });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch employee reviews');
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v1/performance-reviews/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { id } = req.params;
    const reviews = await prisma.$queryRawUnsafe(
      `SELECT pr.*,
              e.first_name AS employee_first_name, e.last_name AS employee_last_name, e.email AS employee_email, e.employee_code,
              r.first_name AS reviewer_first_name,
              r.last_name AS reviewer_last_name,
              r.email AS reviewer_email
       FROM performance_reviews pr
       LEFT JOIN employees e ON pr.employee_id = e.id
       LEFT JOIN employees r ON pr.reviewer_id = r.id
       WHERE pr.id = $1`,
      id
    ) as any[];
    if (reviews.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found' } });
    }
    res.json({ success: true, data: transformReview(reviews[0]) });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch review');
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v1/performance-reviews
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId, reviewerId, status, reviewType, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (employeeId) {
      params.push(employeeId);
      conditions.push('pr.employee_id = $' + params.length);
    }
    if (reviewerId) {
      params.push(reviewerId);
      conditions.push('pr.reviewer_id = $' + params.length);
    }
    if (status) {
      params.push(status);
      conditions.push('pr.status = $' + params.length);
    }
    if (reviewType) {
      params.push(reviewType);
      conditions.push('pr.review_type = $' + params.length);
    }

    const whereClause = conditions.join(' AND ');
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const dataParams = [...params, limitNum, skip];

    const dataQuery = `SELECT pr.*,
      e.first_name AS employee_first_name, e.last_name AS employee_last_name, e.email AS employee_email, e.employee_code,
      r.first_name AS reviewer_first_name,
      r.last_name AS reviewer_last_name,
      r.email AS reviewer_email
      FROM performance_reviews pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      LEFT JOIN employees r ON pr.reviewer_id = r.id
      WHERE ${whereClause}
      ORDER BY pr.created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
    const countQuery = 'SELECT COUNT(*)::int AS count FROM performance_reviews pr WHERE ' + whereClause;

    const [reviews, totalResult] = await Promise.all([
      prisma.$queryRawUnsafe(dataQuery, ...dataParams) as Promise<any[]>,
      prisma.$queryRawUnsafe(countQuery, ...params) as Promise<any[]>,
    ]);
    const total = totalResult[0]?.count || 0;

    res.json({
      success: true,
      data: reviews.map(transformReview),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch performance reviews');
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v1/performance-reviews
 * Only Admin, HR Manager, Team Lead can create reviews. Employees cannot.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Check user roles — only writers can create reviews
    const userRoles = ((req.headers['x-user-roles'] as string) || '').split(',').map(r => r.trim().toLowerCase());
    const canWrite = userRoles.some(r => ['tenant_admin', 'hr_manager', 'team_lead', 'project_manager'].includes(r));
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'Only Admin, HR, Manager, or Team Lead can write performance reviews' },
      });
    }

    const prisma = getPrismaFromRequest(req);
    const authUserId = (req as any).userId || null;
    const validatedData = createReviewSchema.parse(req.body);

    // Look up employee ID from auth user ID for the reviewer
    let reviewerId: string | null = null;
    if (authUserId) {
      const empResult = await prisma.$queryRawUnsafe(
        'SELECT e.id FROM employees e JOIN users u ON e.email = u.email WHERE u.id = $1 LIMIT 1',
        authUserId
      ) as any[];
      reviewerId = empResult.length > 0 ? empResult[0].id : null;
    }

    let overallRating = validatedData.overallRating ?? null;
    if (!overallRating) {
      const ratings = [
        validatedData.communicationRating,
        validatedData.technicalSkillsRating,
        validatedData.teamworkRating,
        validatedData.problemSolvingRating,
        validatedData.punctualityRating,
        validatedData.initiativeRating,
      ].filter((r): r is number => r !== undefined && r !== null);
      if (ratings.length > 0) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        overallRating = Math.round(avg * 10) / 10;
      }
    }

    const submittedAt = validatedData.status === 'submitted' ? new Date() : null;

    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO performance_reviews (employee_id, reviewer_id, review_period, review_type, communication_rating, technical_skills_rating, teamwork_rating, problem_solving_rating, punctuality_rating, initiative_rating, overall_rating, strengths, areas_for_improvement, goals_next_period, additional_comments, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::timestamp)
       ON CONFLICT (employee_id, review_period, review_type)
       DO UPDATE SET
         reviewer_id = EXCLUDED.reviewer_id,
         communication_rating = EXCLUDED.communication_rating,
         technical_skills_rating = EXCLUDED.technical_skills_rating,
         teamwork_rating = EXCLUDED.teamwork_rating,
         problem_solving_rating = EXCLUDED.problem_solving_rating,
         punctuality_rating = EXCLUDED.punctuality_rating,
         initiative_rating = EXCLUDED.initiative_rating,
         overall_rating = EXCLUDED.overall_rating,
         strengths = EXCLUDED.strengths,
         areas_for_improvement = EXCLUDED.areas_for_improvement,
         goals_next_period = EXCLUDED.goals_next_period,
         additional_comments = EXCLUDED.additional_comments,
         status = EXCLUDED.status,
         submitted_at = EXCLUDED.submitted_at,
         updated_at = NOW()
       RETURNING *`,
      validatedData.employeeId,
      reviewerId,
      validatedData.reviewPeriod,
      validatedData.reviewType,
      validatedData.communicationRating ?? null,
      validatedData.technicalSkillsRating ?? null,
      validatedData.teamworkRating ?? null,
      validatedData.problemSolvingRating ?? null,
      validatedData.punctualityRating ?? null,
      validatedData.initiativeRating ?? null,
      overallRating,
      validatedData.strengths ?? null,
      validatedData.areasForImprovement ?? null,
      validatedData.goalsNextPeriod ?? null,
      validatedData.additionalComments ?? null,
      validatedData.status,
      submittedAt,
    ) as any[];

    const r = result[0];
    logger.info({ reviewId: r.id, employeeId: validatedData.employeeId }, 'Performance review created');

    res.status(201).json({
      success: true,
      data: transformReview(r),
      message: validatedData.status === 'submitted' ? 'Review submitted successfully' : 'Review saved as draft',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const messages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: messages } });
    }
    logger.error({ error: error.message }, 'Failed to create performance review');
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/v1/performance-reviews/:id
 * Only Admin, HR Manager, Team Lead can update reviews.
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userRoles = ((req.headers['x-user-roles'] as string) || '').split(',').map(r => r.trim().toLowerCase());
    const canWrite = userRoles.some(r => ['tenant_admin', 'hr_manager', 'team_lead', 'project_manager'].includes(r));
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'Only Admin, HR, Manager, or Team Lead can update performance reviews' },
      });
    }

    const prisma = getPrismaFromRequest(req);
    const { id } = req.params;
    const validatedData = updateReviewSchema.parse(req.body);

    const setClauses: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      reviewPeriod: 'review_period',
      reviewType: 'review_type',
      communicationRating: 'communication_rating',
      technicalSkillsRating: 'technical_skills_rating',
      teamworkRating: 'teamwork_rating',
      problemSolvingRating: 'problem_solving_rating',
      punctualityRating: 'punctuality_rating',
      initiativeRating: 'initiative_rating',
      overallRating: 'overall_rating',
      strengths: 'strengths',
      areasForImprovement: 'areas_for_improvement',
      goalsNextPeriod: 'goals_next_period',
      additionalComments: 'additional_comments',
      status: 'status',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      const val = (validatedData as any)[key];
      if (val !== undefined) {
        values.push(val);
        setClauses.push(col + ' = $' + values.length);
      }
    }

    if (validatedData.status === 'submitted') {
      setClauses.push('submitted_at = NOW()');
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_UPDATES', message: 'No fields to update' } });
    }

    setClauses.push('updated_at = NOW()');
    values.push(id);
    const idIdx = values.length;
    const sql = 'UPDATE performance_reviews SET ' + setClauses.join(', ') + ' WHERE id = $' + idIdx;
    const result = await prisma.$executeRawUnsafe(sql, ...values);

    if (result === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found' } });
    }

    logger.info({ reviewId: id }, 'Performance review updated');
    res.json({
      success: true,
      message: validatedData.status === 'submitted' ? 'Review submitted successfully' : 'Review updated',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const messages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: messages } });
    }
    logger.error({ error: error.message }, 'Failed to update performance review');
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/v1/performance-reviews/:id/acknowledge
 * Only Admin, HR Manager, Team Lead can acknowledge reviews.
 */
router.put('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const userRoles = ((req.headers['x-user-roles'] as string) || '').split(',').map(r => r.trim().toLowerCase());
    const canWrite = userRoles.some(r => ['tenant_admin', 'hr_manager', 'team_lead', 'project_manager'].includes(r));
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'Only Admin, HR, Manager, or Team Lead can acknowledge reviews' },
      });
    }

    const prisma = getPrismaFromRequest(req);
    const { id } = req.params;
    const result = await prisma.$executeRawUnsafe(
      "UPDATE performance_reviews SET status = 'acknowledged', acknowledged_at = NOW(), updated_at = NOW() WHERE id = $1 AND status = 'submitted'",
      id
    );
    if (result === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found or already acknowledged' } });
    }
    logger.info({ reviewId: id }, 'Performance review acknowledged');
    res.json({ success: true, message: 'Review acknowledged' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to acknowledge review');
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/v1/performance-reviews/:id
 * Only Admin, HR Manager can delete reviews.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userRoles = ((req.headers['x-user-roles'] as string) || '').split(',').map(r => r.trim().toLowerCase());
    const canWrite = userRoles.some(r => ['tenant_admin', 'hr_manager', 'team_lead', 'project_manager'].includes(r));
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'Only Admin, HR, Manager, or Team Lead can delete reviews' },
      });
    }

    const prisma = getPrismaFromRequest(req);
    const { id } = req.params;
    const result = await prisma.$executeRawUnsafe(
      "DELETE FROM performance_reviews WHERE id = $1 AND status = 'draft'",
      id
    );
    if (result === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found or cannot be deleted (only drafts can be deleted)' } });
    }
    logger.info({ reviewId: id }, 'Performance review deleted');
    res.json({ success: true, message: 'Review deleted' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to delete performance review');
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: error.message } });
  }
});

export default router;
