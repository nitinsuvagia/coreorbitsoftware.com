/**
 * Time Entry Routes - API endpoints for time tracking
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantPrisma } from '@oms/tenant-db-manager';
import {
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  submitTimeEntries,
  approveTimeEntries,
  rejectTimeEntries,
  listTimeEntries,
  getWeeklyTimesheet,
  getPendingTimeEntriesForApproval,
  getProjectTimeSummary,
} from '../services/time-entry.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTimeEntrySchema = z.object({
  employeeId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMinutes: z.number().min(1).optional(),
  description: z.string().min(5).max(1000),
  isBillable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const updateTimeEntrySchema = z.object({
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMinutes: z.number().min(1).optional(),
  description: z.string().min(5).max(1000).optional(),
  isBillable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const submitEntriesSchema = z.object({
  timeEntryIds: z.array(z.string().uuid()).min(1),
});

const approveEntriesSchema = z.object({
  timeEntryIds: z.array(z.string().uuid()).min(1),
  approverId: z.string().uuid(),
  comments: z.string().max(500).optional(),
});

const rejectEntriesSchema = z.object({
  timeEntryIds: z.array(z.string().uuid()).min(1),
  approverId: z.string().uuid(),
  reason: z.string().min(5).max(500),
});

const listTimeEntriesSchema = z.object({
  employeeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isBillable: z.coerce.boolean().optional(),
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
// TIME ENTRY ROUTES
// ============================================================================

/**
 * POST /time-entries
 */
router.post(
  '/',
  validateBody(createTimeEntrySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const userId = (req as any).userId;
      const { tenantId, tenantSlug } = req as any;
      
      const entry = await createTimeEntry(
        prisma, 
        req.body, 
        userId, 
        { tenantId, tenantSlug }
      );
      
      res.status(201).json({
        message: 'Time entry created successfully',
        data: entry,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Create time entry failed');
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('not a member') ||
          errorMsg.includes('Future time') ||
          errorMsg.includes('older than') ||
          errorMsg.includes('Minimum') ||
          errorMsg.includes('exceed')) {
        return res.status(400).json({ error: errorMsg });
      }
      next(error);
    }
  }
);

/**
 * GET /time-entries
 */
router.get(
  '/',
  validateQuery(listTimeEntriesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      
      const result = await listTimeEntries(prisma, req.query as any);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /time-entries/timesheet
 * Get weekly timesheet for an employee
 */
router.get(
  '/timesheet',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const employeeId = req.query.employeeId as string;
      const weekDate = req.query.weekDate as string;
      
      if (!employeeId || !weekDate) {
        return res.status(400).json({ 
          error: 'employeeId and weekDate are required' 
        });
      }
      
      const timesheet = await getWeeklyTimesheet(prisma, employeeId, weekDate);
      
      res.json({ data: timesheet });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /time-entries/pending-approval
 * Get pending time entries for approval (for managers)
 */
router.get(
  '/pending-approval',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const managerId = req.query.managerId as string;
      
      if (!managerId) {
        return res.status(400).json({ error: 'managerId is required' });
      }
      
      const entries = await getPendingTimeEntriesForApproval(prisma, managerId);
      
      res.json({ data: entries });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /time-entries/project/:projectId/summary
 * Get time summary for a project
 */
router.get(
  '/project/:projectId/summary',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { projectId } = req.params;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      
      const summary = await getProjectTimeSummary(prisma, projectId, dateFrom, dateTo);
      
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /time-entries/:id
 */
router.put(
  '/:id',
  validateBody(updateTimeEntrySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      const userId = (req as any).userId;
      
      const entry = await updateTimeEntry(prisma, id, req.body, userId);
      
      res.json({
        message: 'Time entry updated successfully',
        data: entry,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Update time entry failed');
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('not found') ||
          errorMsg.includes('approved') ||
          errorMsg.includes('older than')) {
        return res.status(400).json({ error: errorMsg });
      }
      next(error);
    }
  }
);

/**
 * DELETE /time-entries/:id
 */
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      
      await deleteTimeEntry(prisma, id);
      
      res.json({ message: 'Time entry deleted successfully' });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Delete time entry failed');
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('not found') || errorMsg.includes('approved')) {
        return res.status(400).json({ error: errorMsg });
      }
      next(error);
    }
  }
);

/**
 * POST /time-entries/submit
 * Submit time entries for approval
 */
router.post(
  '/submit',
  validateBody(submitEntriesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const employeeId = req.body.employeeId || (req as any).employeeId;
      
      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' });
      }
      
      const entries = await submitTimeEntries(
        prisma, 
        req.body.timeEntryIds, 
        employeeId
      );
      
      res.json({
        message: `${entries.length} time entries submitted for approval`,
        data: entries,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Submit time entries failed');
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('do not belong') || errorMsg.includes('not in draft')) {
        return res.status(400).json({ error: errorMsg });
      }
      next(error);
    }
  }
);

/**
 * POST /time-entries/approve
 * Approve time entries
 */
router.post(
  '/approve',
  validateBody(approveEntriesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { tenantId, tenantSlug } = req as any;
      
      const entries = await approveTimeEntries(
        prisma, 
        req.body, 
        { tenantId, tenantSlug }
      );
      
      res.json({
        message: `${entries.length} time entries approved`,
        data: entries,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Approve time entries failed');
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('not in submitted')) {
        return res.status(400).json({ error: errorMsg });
      }
      next(error);
    }
  }
);

/**
 * POST /time-entries/reject
 * Reject time entries
 */
router.post(
  '/reject',
  validateBody(rejectEntriesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      
      const entries = await rejectTimeEntries(prisma, req.body);
      
      res.json({
        message: `${entries.length} time entries rejected`,
        data: entries,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Reject time entries failed');
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('not in submitted')) {
        return res.status(400).json({ error: errorMsg });
      }
      next(error);
    }
  }
);

export default router;
