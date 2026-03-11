/**
 * Employee Notes CRUD Routes
 * Mounted at /api/v1/employees/:employeeId/notes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger as parentLogger } from '../utils/logger';

const logger = parentLogger.child({ module: 'note-routes' });

function getPrismaFromRequest(req: Request): any {
  return (req as any).tenantPrisma || (req as any).prisma;
}

const createNoteSchema = z.object({
  content: z.string().min(1).max(5000),
  isPrivate: z.boolean().default(false),
});

function transformNote(row: any) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    authorUserId: row.author_user_id,
    authorName: row.author_name,
    content: row.content,
    isPrivate: row.is_private,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const router = Router({ mergeParams: true });

/**
 * GET /api/v1/employees/:employeeId/notes
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId } = req.params;

    const notes = await prisma.$queryRawUnsafe(
      `SELECT * FROM employee_notes
       WHERE employee_id = $1
       ORDER BY created_at DESC`,
      employeeId
    ) as any[];

    res.json({ success: true, data: notes.map(transformNote) });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch notes');
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v1/employees/:employeeId/notes
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId } = req.params;
    const authUserId = (req as any).userId || 'unknown';
    const data = createNoteSchema.parse(req.body);

    // Get user name
    let authorName = 'Unknown';
    try {
      const users = await prisma.$queryRawUnsafe(
        'SELECT first_name, last_name FROM users WHERE id = $1 LIMIT 1',
        authUserId
      ) as any[];
      if (users.length > 0) {
        authorName = `${users[0].first_name} ${users[0].last_name}`.trim();
      }
    } catch {}

    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO employee_notes (id, employee_id, author_user_id, author_name, content, is_private)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) RETURNING *`,
      employeeId,
      authUserId,
      authorName,
      data.content,
      data.isPrivate,
    ) as any[];

    res.status(201).json({ success: true, data: transformNote(result[0]) });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const messages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: messages } });
    }
    logger.error({ error: error.message }, 'Failed to create note');
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/v1/employees/:employeeId/notes/:noteId
 */
router.delete('/:noteId', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId, noteId } = req.params;
    const authUserId = (req as any).userId || '';

    const result = await prisma.$queryRawUnsafe(
      'DELETE FROM employee_notes WHERE id = $1 AND employee_id = $2 AND author_user_id = $3 RETURNING id',
      noteId,
      employeeId,
      authUserId
    ) as any[];

    if (result.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Note not found or not authorized' } });
    }

    res.json({ success: true, message: 'Note deleted' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to delete note');
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: error.message } });
  }
});

export default router;
