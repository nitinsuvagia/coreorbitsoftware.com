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
    communicationRating: r.communication ? parseFloat(r.communication) : null,
    technicalSkillsRating: r.quality_of_work ? parseFloat(r.quality_of_work) : null,
    teamworkRating: r.teamwork ? parseFloat(r.teamwork) : null,
    problemSolvingRating: r.productivity ? parseFloat(r.productivity) : null,
    punctualityRating: r.punctuality ? parseFloat(r.punctuality) : null,
    initiativeRating: r.initiative ? parseFloat(r.initiative) : null,
    overallRating: r.performance_score ? parseFloat(r.performance_score) : null,
    strengths: r.strengths,
    areasForImprovement: r.areas_for_improvement,
    goalsNextPeriod: r.goals,
    additionalComments: r.reviewer_comments,
    employeeComments: r.employee_comments,
    status: r.status,
    submittedAt: r.review_date,
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
  reviewType: z.enum(['monthly', 'quarterly', 'annual', '360', 'probation', 'periodic']).default('periodic'),
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
  status: z.enum(['draft', 'submitted', 'DRAFT', 'SUBMITTED']).default('draft').transform(v => v.toUpperCase()),
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
        COALESCE(AVG(performance_score), 0) AS avg_rating,
        COUNT(*) FILTER (WHERE status = 'DRAFT'::"ReviewStatus")::int AS drafts,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED'::"ReviewStatus")::int AS submitted,
        COUNT(*) FILTER (WHERE status = 'ACKNOWLEDGED'::"ReviewStatus")::int AS acknowledged,
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
        COALESCE(AVG(communication), 0) AS communication,
        COALESCE(AVG(quality_of_work), 0) AS technical_skills,
        COALESCE(AVG(teamwork), 0) AS teamwork,
        COALESCE(AVG(productivity), 0) AS problem_solving,
        COALESCE(AVG(punctuality), 0) AS punctuality,
        COALESCE(AVG(initiative), 0) AS initiative,
        COALESCE(AVG(performance_score), 0) AS overall_rating,
        MAX(review_period) AS latest_period
      FROM performance_reviews
      WHERE employee_id = $1
        AND status IN ('SUBMITTED'::"ReviewStatus", 'ACKNOWLEDGED'::"ReviewStatus")
    `, employeeId) as any[];

    const avg = avgResult[0] || {};

    const trendResult = await prisma.$queryRawUnsafe(`
      SELECT performance_score
      FROM performance_reviews
      WHERE employee_id = $1
        AND status IN ('SUBMITTED'::"ReviewStatus", 'ACKNOWLEDGED'::"ReviewStatus")
        AND performance_score IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 2
    `, employeeId) as any[];

    let trendValue = 0;
    let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
    if (trendResult.length >= 2) {
      trendValue = parseFloat(trendResult[0].performance_score) - parseFloat(trendResult[1].performance_score);
      trendValue = Math.round(trendValue * 10) / 10;
      trendDirection = trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'neutral';
    }

    const percentileResult = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(DISTINCT employee_id)::int AS total_employees,
        COUNT(DISTINCT employee_id) FILTER (WHERE avg_overall <= $1)::int AS rank_below
      FROM (
        SELECT employee_id, AVG(performance_score) AS avg_overall
        FROM performance_reviews
        WHERE status IN ('SUBMITTED'::"ReviewStatus", 'ACKNOWLEDGED'::"ReviewStatus")
          AND performance_score IS NOT NULL
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
      `SELECT COUNT(*)::int AS count FROM performance_reviews WHERE status = 'SUBMITTED'::"ReviewStatus"`
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
      conditions.push('pr.status = $' + params.length + '::"ReviewStatus"');
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
    const authUserId = (req as any).userId || req.headers['x-user-id'] as string || null;
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
    
    // Fallback: use the employee being reviewed as reviewer (self-assessment scenario)
    if (!reviewerId) {
      reviewerId = validatedData.employeeId;
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

    const reviewDate = validatedData.status === 'SUBMITTED' ? new Date() : null;

    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO performance_reviews (id, employee_id, reviewer_id, review_period, review_type, communication, quality_of_work, teamwork, productivity, punctuality, initiative, performance_score, strengths, areas_for_improvement, goals, reviewer_comments, status, review_date, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::"ReviewStatus", $17::timestamp, NOW(), NOW())
       ON CONFLICT (employee_id, review_period, review_type)
       DO UPDATE SET
         reviewer_id = EXCLUDED.reviewer_id,
         communication = EXCLUDED.communication,
         quality_of_work = EXCLUDED.quality_of_work,
         teamwork = EXCLUDED.teamwork,
         productivity = EXCLUDED.productivity,
         punctuality = EXCLUDED.punctuality,
         initiative = EXCLUDED.initiative,
         performance_score = EXCLUDED.performance_score,
         strengths = EXCLUDED.strengths,
         areas_for_improvement = EXCLUDED.areas_for_improvement,
         goals = EXCLUDED.goals,
         reviewer_comments = EXCLUDED.reviewer_comments,
         status = EXCLUDED.status,
         review_date = EXCLUDED.review_date,
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
      reviewDate,
    ) as any[];

    const r = result[0];
    logger.info({ reviewId: r.id, employeeId: validatedData.employeeId }, 'Performance review created');

    res.status(201).json({
      success: true,
      data: transformReview(r),
      message: validatedData.status === 'SUBMITTED' ? 'Review submitted successfully' : 'Review saved as draft',
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
      communicationRating: 'communication',
      technicalSkillsRating: 'quality_of_work',
      teamworkRating: 'teamwork',
      problemSolvingRating: 'productivity',
      punctualityRating: 'punctuality',
      initiativeRating: 'initiative',
      overallRating: 'performance_score',
      strengths: 'strengths',
      areasForImprovement: 'areas_for_improvement',
      goalsNextPeriod: 'goals',
      additionalComments: 'reviewer_comments',
      status: 'status',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      const val = (validatedData as any)[key];
      if (val !== undefined) {
        values.push(val);
        if (col === 'status') {
          setClauses.push(col + ' = $' + values.length + '::"ReviewStatus"');
        } else {
          setClauses.push(col + ' = $' + values.length);
        }
      }
    }

    if (validatedData.status === 'submitted' || validatedData.status === 'SUBMITTED') {
      setClauses.push('review_date = NOW()');
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
      message: (validatedData.status === 'submitted' || validatedData.status === 'SUBMITTED') ? 'Review submitted successfully' : 'Review updated',
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
      `UPDATE performance_reviews SET status = 'ACKNOWLEDGED'::"ReviewStatus", acknowledged_at = NOW(), updated_at = NOW() WHERE id = $1 AND status = 'SUBMITTED'::"ReviewStatus"`,
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
      `DELETE FROM performance_reviews WHERE id = $1 AND status = 'DRAFT'::"ReviewStatus"`,
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
