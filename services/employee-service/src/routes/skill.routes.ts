/**
 * Employee Skills CRUD Routes
 * Mounted at /api/v1/employees/:employeeId/skills
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger as parentLogger } from '../utils/logger';

const logger = parentLogger.child({ module: 'skill-routes' });

function getPrismaFromRequest(req: Request): any {
  return (req as any).tenantPrisma || (req as any).prisma;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(50).default('general'),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate'),
  yearsExperience: z.number().min(0).max(50).nullable().optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(500).nullable().optional(),
});

const updateSkillSchema = createSkillSchema.partial();

const bulkAddSchema = z.object({
  skills: z.array(createSkillSchema).min(1).max(50),
});

// ============================================================================
// HELPERS
// ============================================================================

function transformSkill(row: any) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    name: row.name,
    category: row.category,
    level: row.level,
    yearsExperience: row.years_experience ? parseFloat(row.years_experience) : null,
    isPrimary: row.is_primary,
    endorsedBy: row.endorsed_by || [],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// ROUTES
// ============================================================================

const router = Router({ mergeParams: true });

/**
 * GET /api/v1/employees/:employeeId/skills
 * List all skills for an employee
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId } = req.params;

    const skills = await prisma.$queryRawUnsafe(
      `SELECT * FROM employee_skills
       WHERE employee_id = $1
       ORDER BY is_primary DESC, level DESC, name ASC`,
      employeeId
    ) as any[];

    res.json({
      success: true,
      data: skills.map(transformSkill),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch skills');
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v1/employees/:employeeId/skills
 * Add a single skill
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId } = req.params;
    const data = createSkillSchema.parse(req.body);

    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO employee_skills (id, employee_id, name, category, level, years_experience, is_primary, notes)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (employee_id, name)
       DO UPDATE SET
         category = EXCLUDED.category,
         level = EXCLUDED.level,
         years_experience = EXCLUDED.years_experience,
         is_primary = EXCLUDED.is_primary,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING *`,
      employeeId,
      data.name.trim(),
      data.category,
      data.level,
      data.yearsExperience ?? null,
      data.isPrimary,
      data.notes ?? null,
    ) as any[];

    res.status(201).json({
      success: true,
      data: transformSkill(result[0]),
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const messages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: messages } });
    }
    logger.error({ error: error.message }, 'Failed to add skill');
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v1/employees/:employeeId/skills/bulk
 * Add multiple skills at once
 */
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId } = req.params;
    const { skills } = bulkAddSchema.parse(req.body);

    const results: any[] = [];
    for (const skill of skills) {
      const result = await prisma.$queryRawUnsafe(
        `INSERT INTO employee_skills (id, employee_id, name, category, level, years_experience, is_primary, notes)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (employee_id, name)
         DO UPDATE SET
           category = EXCLUDED.category,
           level = EXCLUDED.level,
           years_experience = EXCLUDED.years_experience,
           is_primary = EXCLUDED.is_primary,
           notes = EXCLUDED.notes,
           updated_at = NOW()
         RETURNING *`,
        employeeId,
        skill.name.trim(),
        skill.category,
        skill.level,
        skill.yearsExperience ?? null,
        skill.isPrimary,
        skill.notes ?? null,
      ) as any[];
      results.push(transformSkill(result[0]));
    }

    res.status(201).json({
      success: true,
      data: results,
      message: `${results.length} skill(s) added`,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const messages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: messages } });
    }
    logger.error({ error: error.message }, 'Failed to bulk add skills');
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/v1/employees/:employeeId/skills/:skillId
 * Update a skill
 */
router.put('/:skillId', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId, skillId } = req.params;
    const data = updateSkillSchema.parse(req.body);

    // Build dynamic SET clause
    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let idx = 1;

    if (data.name !== undefined) { params.push(data.name.trim()); sets.push(`name = $${idx++}`); }
    if (data.category !== undefined) { params.push(data.category); sets.push(`category = $${idx++}`); }
    if (data.level !== undefined) { params.push(data.level); sets.push(`level = $${idx++}`); }
    if (data.yearsExperience !== undefined) { params.push(data.yearsExperience); sets.push(`years_experience = $${idx++}`); }
    if (data.isPrimary !== undefined) { params.push(data.isPrimary); sets.push(`is_primary = $${idx++}`); }
    if (data.notes !== undefined) { params.push(data.notes); sets.push(`notes = $${idx++}`); }

    params.push(skillId);
    params.push(employeeId);

    const result = await prisma.$queryRawUnsafe(
      `UPDATE employee_skills SET ${sets.join(', ')} WHERE id = $${idx++}::uuid AND employee_id = $${idx++} RETURNING *`,
      ...params
    ) as any[];

    if (result.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Skill not found' } });
    }

    res.json({ success: true, data: transformSkill(result[0]) });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const messages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: messages } });
    }
    logger.error({ error: error.message }, 'Failed to update skill');
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/v1/employees/:employeeId/skills/:skillId
 * Remove a skill
 */
router.delete('/:skillId', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId, skillId } = req.params;

    const result = await prisma.$queryRawUnsafe(
      'DELETE FROM employee_skills WHERE id = $1::uuid AND employee_id = $2 RETURNING id',
      skillId,
      employeeId
    ) as any[];

    if (result.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Skill not found' } });
    }

    res.json({ success: true, message: 'Skill removed' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to delete skill');
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: error.message } });
  }
});

export default router;
