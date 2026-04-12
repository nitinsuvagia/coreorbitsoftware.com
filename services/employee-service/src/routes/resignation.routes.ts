/**
 * Resignation Routes - API endpoints for resignation workflow and offboarding
 * 
 * Resignation Flow:
 *   POST   /resignations/activate              - HR activates resignation for employee
 *   POST   /resignations/:id/submit            - Employee submits resignation
 *   POST   /resignations/:id/approve           - HR approves with last working day
 *   POST   /resignations/:id/withdraw          - Employee withdraws resignation
 *   POST   /resignations/:id/cancel            - HR cancels resignation
 *   GET    /resignations                        - List all resignations
 *   GET    /resignations/stats                  - Dashboard statistics
 *   GET    /resignations/:id                    - Get resignation details
 *   GET    /resignations/employee/:employeeId   - Get active resignation for employee
 * 
 * Offboarding Flow:
 *   POST   /resignations/:id/offboarding/start               - HR starts offboarding
 *   GET    /resignations/:id/offboarding                     - Get offboarding with checklist
 *   PATCH  /offboarding/checklist/:itemId                    - Update checklist item
 *   POST   /offboarding/:offboardingId/checklist             - Add custom checklist item
 *   POST   /offboarding/:offboardingId/complete              - Complete offboarding
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '.prisma/tenant-client';
import { logger } from '../utils/logger';
import {
  activateResignation,
  submitResignation,
  approveResignation,
  withdrawResignation,
  cancelResignation,
  getResignation,
  getResignationByEmployeeId,
  listResignations,
  getResignationStats,
  startOffboarding,
  getOffboarding,
  getOffboardingByResignationId,
  updateChecklistItem,
  addChecklistItem,
  completeOffboarding,
  type ActivateResignationInput,
  type SubmitResignationInput,
  type ReviewResignationInput,
  type WithdrawResignationInput,
  type CancelResignationInput,
  type UpdateChecklistItemInput,
} from '../services/resignation.service';

function getPrismaFromRequest(req: Request): PrismaClient {
  const prisma = (req as any).prisma as PrismaClient;
  if (!prisma) {
    throw new Error('Prisma client not found on request.');
  }
  return prisma;
}

// Role helpers
function getUserRoles(req: Request): string[] {
  return ((req.headers['x-user-roles'] as string) || '').split(',').map(r => r.trim().toLowerCase()).filter(Boolean);
}

function isHRRole(req: Request): boolean {
  const roles = getUserRoles(req);
  return roles.some(r => ['tenant_admin', 'hr_admin', 'hr_manager'].includes(r));
}

function isManagerRole(req: Request): boolean {
  const roles = getUserRoles(req);
  return roles.some(r => ['tenant_admin', 'hr_admin', 'hr_manager', 'project_manager'].includes(r));
}

/** Look up the employee record ID for the current auth user */
async function getEmployeeRecordId(prisma: PrismaClient, authUserId: string): Promise<string | null> {
  const rows = await (prisma as any).$queryRaw`
    SELECT id FROM employees WHERE user_id = ${authUserId} AND deleted_at IS NULL LIMIT 1
  `;
  return (rows as any[])?.[0]?.id || null;
}

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const activateSchema = z.object({
  employeeId: z.string().uuid(),
  activationNotes: z.string().optional(),
});

const submitSchema = z.object({
  resignationReason: z.string().min(1, 'Resignation reason is required'),
  personalReason: z.string().optional(),
  resignationLetterUrl: z.string().optional(),
});

const approveSchema = z.object({
  hrSummary: z.string().min(1, 'HR summary is required'),
  hrNotes: z.string().optional(),
  lastWorkingDate: z.string().min(1, 'Last working date is required'),
  noticePeriodDays: z.number().min(0).optional(),
});

const withdrawSchema = z.object({
  withdrawalReason: z.string().min(1, 'Withdrawal reason is required'),
});

const cancelSchema = z.object({
  cancellationReason: z.string().min(1, 'Cancellation reason is required'),
});

const startOffboardingSchema = z.object({
  resignationId: z.string().uuid(),
});

const updateChecklistSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'NOT_APPLICABLE']),
  notes: z.string().optional(),
});

const addChecklistItemSchema = z.object({
  category: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

const completeOffboardingSchema = z.object({
  completionNotes: z.string().optional(),
});

const listFilterSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ============================================================================
// RESIGNATION ROUTES
// ============================================================================

/**
 * GET /resignations/stats - Dashboard statistics (HR/Admin/PM only)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    if (!isManagerRole(req)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }
    const prisma = getPrismaFromRequest(req);
    const stats = await getResignationStats(prisma);

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get resignation stats');
    res.status(500).json({
      success: false,
      error: { code: 'STATS_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /resignations - List all resignations (HR/Admin/PM only)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!isManagerRole(req)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }
    const filters = listFilterSchema.parse(req.query);
    const prisma = getPrismaFromRequest(req);
    const result = await listResignations(prisma, filters);

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }
    logger.error({ error: (error as Error).message }, 'Failed to list resignations');
    res.status(500).json({
      success: false,
      error: { code: 'LIST_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /resignations/employee/:employeeId - Get active resignation for an employee
 * Managers can query any employee; employees can only query themselves.
 */
router.get('/employee/:employeeId', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);

    // Non-managers can only query their own
    if (!isManagerRole(req)) {
      const userId = (req as any).userId;
      const myEmployeeId = await getEmployeeRecordId(prisma, userId);
      if (myEmployeeId !== req.params.employeeId) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }
    }
    const resignation = await getResignationByEmployeeId(prisma, req.params.employeeId);

    if (!resignation) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: resignation });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get employee resignation');
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /resignations/:id - Get resignation details
 * Managers can view any; employees can view own only.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const resignation = await getResignation(prisma, req.params.id);

    // Non-managers can only view their own resignation
    if (!isManagerRole(req)) {
      const userId = (req as any).userId;
      const myEmployeeId = await getEmployeeRecordId(prisma, userId);
      if ((resignation as any).employee_id !== myEmployeeId) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }
    }

    res.json({ success: true, data: resignation });
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Resignation not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message },
      });
    }
    logger.error({ error: message }, 'Failed to get resignation');
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message },
    });
  }
});

/**
 * POST /resignations/activate - HR activates resignation for an employee (HR only)
 */
router.post('/activate', async (req: Request, res: Response) => {
  try {
    if (!isHRRole(req)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only HR can activate resignations' } });
    }
    const data = activateSchema.parse(req.body) as ActivateResignationInput;
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;
    const tenantContext = {
      tenantId: (req as any).tenantId,
      tenantSlug: (req as any).tenantSlug,
    };

    const result = await activateResignation(prisma, data, userId, tenantContext);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Resignation activated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }
    const message = (error as Error).message;
    logger.error({ error: message }, 'Failed to activate resignation');

    const statusCode = message.includes('not found') ? 404 :
      message.includes('already has') ? 409 :
      message.includes('Cannot activate') ? 422 : 500;

    res.status(statusCode).json({
      success: false,
      error: { code: 'ACTIVATION_FAILED', message },
    });
  }
});

/**
 * POST /resignations/:id/submit - Employee submits resignation (own or HR)
 */
router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const data = submitSchema.parse(req.body) as SubmitResignationInput;
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;

    // Verify ownership for non-HR users
    if (!isHRRole(req)) {
      const resignation = await getResignation(prisma, req.params.id);
      const myEmployeeId = await getEmployeeRecordId(prisma, userId);
      if ((resignation as any).employee_id !== myEmployeeId) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only submit your own resignation' } });
      }
    }

    const result = await submitResignation(prisma, req.params.id, data, userId);

    res.json({
      success: true,
      data: result,
      message: 'Resignation submitted successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }
    const message = (error as Error).message;
    logger.error({ error: message }, 'Failed to submit resignation');

    const statusCode = message.includes('not found') ? 404 :
      message.includes('Cannot submit') ? 422 : 500;

    res.status(statusCode).json({
      success: false,
      error: { code: 'SUBMIT_FAILED', message },
    });
  }
});

/**
 * POST /resignations/:id/approve - HR approves resignation with last working day (HR only)
 */
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    if (!isHRRole(req)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only HR can approve resignations' } });
    }
    const data = approveSchema.parse(req.body) as ReviewResignationInput;
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;
    const tenantContext = {
      tenantId: (req as any).tenantId,
      tenantSlug: (req as any).tenantSlug,
    };

    const result = await approveResignation(prisma, req.params.id, data, userId, tenantContext);

    res.json({
      success: true,
      data: result,
      message: 'Resignation approved successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }
    const message = (error as Error).message;
    logger.error({ error: message }, 'Failed to approve resignation');

    const statusCode = message.includes('not found') ? 404 :
      message.includes('Cannot approve') ? 422 :
      message.includes('past') ? 422 : 500;

    res.status(statusCode).json({
      success: false,
      error: { code: 'APPROVAL_FAILED', message },
    });
  }
});

/**
 * POST /resignations/:id/withdraw - Employee withdraws resignation (own or HR)
 */
router.post('/:id/withdraw', async (req: Request, res: Response) => {
  try {
    const data = withdrawSchema.parse(req.body) as WithdrawResignationInput;
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;

    // Verify ownership for non-HR users
    if (!isHRRole(req)) {
      const resignation = await getResignation(prisma, req.params.id);
      const myEmployeeId = await getEmployeeRecordId(prisma, userId);
      if ((resignation as any).employee_id !== myEmployeeId) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only withdraw your own resignation' } });
      }
    }

    const result = await withdrawResignation(prisma, req.params.id, data, userId);

    res.json({
      success: true,
      data: result,
      message: 'Resignation withdrawn successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }
    const message = (error as Error).message;
    logger.error({ error: message }, 'Failed to withdraw resignation');
    res.status(message.includes('not found') ? 404 : 422).json({
      success: false,
      error: { code: 'WITHDRAW_FAILED', message },
    });
  }
});

/**
 * POST /resignations/:id/cancel - HR cancels resignation (HR only)
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    if (!isHRRole(req)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only HR can cancel resignations' } });
    }
    const data = cancelSchema.parse(req.body) as CancelResignationInput;
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;

    const result = await cancelResignation(prisma, req.params.id, data, userId);

    res.json({
      success: true,
      data: result,
      message: 'Resignation cancelled successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }
    const message = (error as Error).message;
    logger.error({ error: message }, 'Failed to cancel resignation');
    res.status(message.includes('not found') ? 404 : 422).json({
      success: false,
      error: { code: 'CANCEL_FAILED', message },
    });
  }
});

// ============================================================================
// OFFBOARDING ROUTES
// ============================================================================

/**
 * POST /resignations/:id/offboarding/start - Start offboarding process (HR only)
 */
router.post('/:id/offboarding/start', async (req: Request, res: Response) => {
  try {
    if (!isHRRole(req)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only HR can start offboarding' } });
    }
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;
    const tenantContext = {
      tenantId: (req as any).tenantId,
      tenantSlug: (req as any).tenantSlug,
    };

    const result = await startOffboarding(
      prisma,
      { resignationId: req.params.id },
      userId,
      tenantContext
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Offboarding process started successfully',
    });
  } catch (error) {
    const message = (error as Error).message;
    logger.error({ error: message }, 'Failed to start offboarding');

    const statusCode = message.includes('not found') ? 404 :
      message.includes('already in progress') ? 409 :
      message.includes('Can only start') ? 422 : 500;

    res.status(statusCode).json({
      success: false,
      error: { code: 'OFFBOARDING_START_FAILED', message },
    });
  }
});

/**
 * GET /resignations/:id/offboarding - Get offboarding for a resignation
 */
router.get('/:id/offboarding', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const offboarding = await getOffboardingByResignationId(prisma, req.params.id);

    res.json({ success: true, data: offboarding });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get offboarding');
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * PATCH /offboarding/checklist/:itemId - Update checklist item status (HR only)
 */
router.patch('/offboarding/checklist/:itemId', async (req: Request, res: Response) => {
  try {
    if (!isHRRole(req)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only HR can update checklist items' } });
    }
    const data = updateChecklistSchema.parse(req.body) as UpdateChecklistItemInput;
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;

    const result = await updateChecklistItem(prisma, req.params.itemId, data, userId);

    res.json({
      success: true,
      data: result,
      message: 'Checklist item updated',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }
    const message = (error as Error).message;
    logger.error({ error: message }, 'Failed to update checklist item');
    res.status(message.includes('not found') ? 404 : 500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message },
    });
  }
});

/**
 * POST /offboarding/:offboardingId/checklist - Add custom checklist item (HR only)
 */
router.post('/offboarding/:offboardingId/checklist', async (req: Request, res: Response) => {
  try {
    if (!isHRRole(req)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only HR can add checklist items' } });
    }
    const data = addChecklistItemSchema.parse(req.body) as { category: string; title: string; description?: string };
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;

    const result = await addChecklistItem(prisma, req.params.offboardingId, data, userId);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Checklist item added',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }
    logger.error({ error: (error as Error).message }, 'Failed to add checklist item');
    res.status(500).json({
      success: false,
      error: { code: 'ADD_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * POST /offboarding/:offboardingId/complete - Complete offboarding (HR only)
 */
router.post('/offboarding/:offboardingId/complete', async (req: Request, res: Response) => {
  try {
    if (!isHRRole(req)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only HR can complete offboarding' } });
    }
    const data = completeOffboardingSchema.parse(req.body);
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;
    const tenantContext = {
      tenantId: (req as any).tenantId,
      tenantSlug: (req as any).tenantSlug,
    };

    const result = await completeOffboarding(prisma, req.params.offboardingId, data, userId, tenantContext);

    res.json({
      success: true,
      data: result,
      message: 'Offboarding completed. User account has been deactivated.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }
    const message = (error as Error).message;
    logger.error({ error: message }, 'Failed to complete offboarding');

    const statusCode = message.includes('not found') ? 404 :
      message.includes('already completed') ? 409 :
      message.includes('still pending') ? 422 : 500;

    res.status(statusCode).json({
      success: false,
      error: { code: 'COMPLETE_FAILED', message },
    });
  }
});

export default router;
