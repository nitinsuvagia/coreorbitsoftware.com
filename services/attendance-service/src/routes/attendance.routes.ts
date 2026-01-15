/**
 * Attendance Routes - API endpoints for attendance operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantPrisma } from '@oms/tenant-db-manager';
import {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  getTodayAttendance,
  getAttendanceById,
  listAttendance,
  getMonthlyAttendanceSummary,
  getDepartmentAttendanceSummary,
} from '../services/attendance.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const checkInSchema = z.object({
  employeeId: z.string().uuid(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
  }).optional(),
  deviceInfo: z.object({
    type: z.enum(['web', 'mobile', 'biometric', 'rfid']),
    deviceId: z.string().optional(),
    userAgent: z.string().optional(),
  }).optional(),
  isRemote: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

const checkOutSchema = z.object({
  attendanceId: z.string().uuid(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
  }).optional(),
  notes: z.string().max(500).optional(),
});

const breakSchema = z.object({
  attendanceId: z.string().uuid(),
  breakType: z.enum(['lunch', 'short', 'other']),
  notes: z.string().max(200).optional(),
});

const endBreakSchema = z.object({
  attendanceId: z.string().uuid(),
  breakId: z.string().uuid(),
});

const listAttendanceSchema = z.object({
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['present', 'absent', 'half_day', 'on_leave', 'holiday', 'weekend']).optional(),
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
});

const monthlySummarySchema = z.object({
  employeeId: z.string().uuid(),
  year: z.coerce.number().min(2020).max(2100),
  month: z.coerce.number().min(1).max(12),
});

const departmentSummarySchema = z.object({
  departmentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
// ROUTES
// ============================================================================

/**
 * POST /attendance/check-in
 * Check in for the day
 */
router.post(
  '/check-in',
  validateBody(checkInSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { tenantId, tenantSlug } = req as any;
      
      const attendance = await checkIn(
        prisma,
        req.body,
        { tenantId, tenantSlug }
      );
      
      res.status(201).json({
        message: 'Check-in successful',
        data: attendance,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Check-in failed');
      if ((error as Error).message.includes('already checked in')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * POST /attendance/check-out
 * Check out for the day
 */
router.post(
  '/check-out',
  validateBody(checkOutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { tenantId, tenantSlug } = req as any;
      
      const attendance = await checkOut(
        prisma,
        req.body,
        { tenantId, tenantSlug }
      );
      
      res.status(200).json({
        message: 'Check-out successful',
        data: attendance,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Check-out failed');
      if ((error as Error).message.includes('already checked out') ||
          (error as Error).message.includes('not found')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * POST /attendance/break/start
 * Start a break
 */
router.post(
  '/break/start',
  validateBody(breakSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      
      const result = await startBreak(prisma, req.body);
      
      res.status(200).json({
        message: 'Break started',
        data: result,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Start break failed');
      if ((error as Error).message.includes('active break') ||
          (error as Error).message.includes('not found')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * POST /attendance/break/end
 * End a break
 */
router.post(
  '/break/end',
  validateBody(endBreakSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      
      const result = await endBreak(prisma, req.body);
      
      res.status(200).json({
        message: 'Break ended',
        data: result,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'End break failed');
      if ((error as Error).message.includes('not found')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * GET /attendance/today/:employeeId
 * Get today's attendance for an employee
 */
router.get(
  '/today/:employeeId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { employeeId } = req.params;
      
      const attendance = await getTodayAttendance(prisma, employeeId);
      
      if (!attendance) {
        return res.status(404).json({
          message: 'No attendance record for today',
        });
      }
      
      res.json({ data: attendance });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /attendance/:id
 * Get attendance by ID
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      
      const attendance = await getAttendanceById(prisma, id);
      
      if (!attendance) {
        return res.status(404).json({
          error: 'Attendance record not found',
        });
      }
      
      res.json({ data: attendance });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /attendance
 * List attendance records with filters
 */
router.get(
  '/',
  validateQuery(listAttendanceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      
      const result = await listAttendance(prisma, req.query as any);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /attendance/summary/monthly
 * Get monthly attendance summary for an employee
 */
router.get(
  '/summary/monthly',
  validateQuery(monthlySummarySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { employeeId, year, month } = req.query as any;
      
      const summary = await getMonthlyAttendanceSummary(
        prisma,
        employeeId,
        year,
        month
      );
      
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /attendance/summary/department
 * Get department attendance summary for a date
 */
router.get(
  '/summary/department',
  validateQuery(departmentSummarySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { departmentId, date } = req.query as any;
      
      const summary = await getDepartmentAttendanceSummary(
        prisma,
        departmentId,
        date
      );
      
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
