/**
 * Leave Routes - API endpoints for leave management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantPrisma } from '@oms/tenant-db-manager';
import {
  createLeaveType,
  listLeaveTypes,
  updateLeaveType,
  getLeaveBalances,
  adjustLeaveBalance,
  requestLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  listLeaveRequests,
  getPendingApprovals,
} from '../services/leave.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createLeaveTypeSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).toUpperCase(),
  description: z.string().max(500).optional(),
  defaultDaysPerYear: z.number().min(0).max(365),
  carryForwardAllowed: z.boolean(),
  maxCarryForwardDays: z.number().min(0).max(100).optional(),
  requiresApproval: z.boolean(),
  isPaid: z.boolean(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().optional(),
});

const updateLeaveTypeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  defaultDaysPerYear: z.number().min(0).max(365).optional(),
  carryForwardAllowed: z.boolean().optional(),
  maxCarryForwardDays: z.number().min(0).max(100).optional(),
  requiresApproval: z.boolean().optional(),
  isPaid: z.boolean().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().optional(),
});

const requestLeaveSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isHalfDay: z.boolean().optional(),
  halfDayType: z.enum(['first_half', 'second_half']).optional(),
  reason: z.string().min(5).max(1000),
  attachmentUrl: z.string().url().optional(),
});

const approveLeaveSchema = z.object({
  leaveRequestId: z.string().uuid(),
  approverId: z.string().uuid(),
  comments: z.string().max(500).optional(),
});

const rejectLeaveSchema = z.object({
  leaveRequestId: z.string().uuid(),
  approverId: z.string().uuid(),
  reason: z.string().min(5).max(500),
});

const adjustBalanceSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  year: z.number().min(2020).max(2100),
  adjustmentDays: z.number().min(-100).max(100),
  reason: z.string().min(5).max(500),
});

const listLeaveRequestsSchema = z.object({
  employeeId: z.string().uuid().optional(),
  leaveTypeId: z.string().uuid().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
// LEAVE TYPE ROUTES
// ============================================================================

/**
 * POST /leaves/types
 * Create a leave type
 */
router.post(
  '/types',
  validateBody(createLeaveTypeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const userId = (req as any).userId;
      
      const leaveType = await createLeaveType(prisma, req.body, userId);
      
      res.status(201).json({
        message: 'Leave type created successfully',
        data: leaveType,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Create leave type failed');
      if ((error as Error).message.includes('already exists')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * GET /leaves/types
 * List leave types
 */
router.get(
  '/types',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const activeOnly = req.query.activeOnly !== 'false';
      
      const leaveTypes = await listLeaveTypes(prisma, activeOnly);
      
      res.json({ data: leaveTypes });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /leaves/types/:id
 * Update a leave type
 */
router.put(
  '/types/:id',
  validateBody(updateLeaveTypeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      const userId = (req as any).userId;
      
      const leaveType = await updateLeaveType(prisma, id, req.body, userId);
      
      res.json({
        message: 'Leave type updated successfully',
        data: leaveType,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// LEAVE BALANCE ROUTES
// ============================================================================

/**
 * GET /leaves/balances/:employeeId
 * Get leave balances for an employee
 */
router.get(
  '/balances/:employeeId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { employeeId } = req.params;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      
      const balances = await getLeaveBalances(prisma, employeeId, year);
      
      res.json({ data: balances });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /leaves/balances/adjust
 * Adjust leave balance
 */
router.post(
  '/balances/adjust',
  validateBody(adjustBalanceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const userId = (req as any).userId;
      const { employeeId, leaveTypeId, year, adjustmentDays, reason } = req.body;
      
      const balance = await adjustLeaveBalance(
        prisma,
        employeeId,
        leaveTypeId,
        year,
        adjustmentDays,
        reason,
        userId
      );
      
      res.json({
        message: 'Leave balance adjusted successfully',
        data: balance,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Adjust balance failed');
      next(error);
    }
  }
);

// ============================================================================
// LEAVE REQUEST ROUTES
// ============================================================================

/**
 * POST /leaves/requests
 * Request leave
 */
router.post(
  '/requests',
  validateBody(requestLeaveSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { tenantId, tenantSlug } = req as any;
      
      const leaveRequest = await requestLeave(
        prisma,
        req.body,
        { tenantId, tenantSlug }
      );
      
      res.status(201).json({
        message: 'Leave request submitted successfully',
        data: leaveRequest,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Request leave failed');
      if ((error as Error).message.includes('Insufficient') ||
          (error as Error).message.includes('overlapping') ||
          (error as Error).message.includes('advance notice') ||
          (error as Error).message.includes('not found')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * GET /leaves/requests
 * List leave requests
 */
router.get(
  '/requests',
  validateQuery(listLeaveRequestsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      
      const result = await listLeaveRequests(prisma, req.query as any);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /leaves/requests/pending
 * Get pending leave requests for approval (for managers)
 */
router.get(
  '/requests/pending',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const managerId = req.query.managerId as string;
      
      if (!managerId) {
        return res.status(400).json({ error: 'Manager ID is required' });
      }
      
      const requests = await getPendingApprovals(prisma, managerId);
      
      res.json({ data: requests });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /leaves/requests/approve
 * Approve a leave request
 */
router.post(
  '/requests/approve',
  validateBody(approveLeaveSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { tenantId, tenantSlug } = req as any;
      
      const leaveRequest = await approveLeave(
        prisma,
        req.body,
        { tenantId, tenantSlug }
      );
      
      res.json({
        message: 'Leave request approved successfully',
        data: leaveRequest,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Approve leave failed');
      if ((error as Error).message.includes('Cannot approve') ||
          (error as Error).message.includes('not found')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * POST /leaves/requests/reject
 * Reject a leave request
 */
router.post(
  '/requests/reject',
  validateBody(rejectLeaveSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { tenantId, tenantSlug } = req as any;
      
      const leaveRequest = await rejectLeave(
        prisma,
        req.body,
        { tenantId, tenantSlug }
      );
      
      res.json({
        message: 'Leave request rejected',
        data: leaveRequest,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Reject leave failed');
      if ((error as Error).message.includes('Cannot reject') ||
          (error as Error).message.includes('not found')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * POST /leaves/requests/:id/cancel
 * Cancel a leave request
 */
router.post(
  '/requests/:id/cancel',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      const userId = (req as any).userId;
      const reason = req.body.reason;
      
      const leaveRequest = await cancelLeave(prisma, id, userId, reason);
      
      res.json({
        message: 'Leave request cancelled',
        data: leaveRequest,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Cancel leave failed');
      if ((error as Error).message.includes('Cannot cancel') ||
          (error as Error).message.includes('not found')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

export default router;
