/**
 * Attendance Routes - API endpoints for attendance operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantPrismaBySlug } from '../utils/database';
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
  getTodayAttendanceOverview,
  getAttendanceOverviewForDate,
  checkIsLate,
  getTenantTimezone,
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
  pageSize: z.coerce.number().min(1).max(5000).optional(),
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
// HELPERS
// ============================================================================

/**
 * Resolve userId (from JWT / x-user-id header) to employeeId.
 * The User model has employeeId → Employee, so we look up User first.
 */
async function resolveEmployeeId(prisma: any, userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { employeeId: true },
  });
  if (!user?.employeeId) {
    throw new Error('Employee profile not found for the current user');
  }
  // Verify the employee is not terminated/resigned/retired
  const employee = await prisma.employee.findUnique({
    where: { id: user.employeeId },
    select: { id: true, status: true },
  });
  const blockedStatuses = ['RESIGNED', 'RETIRED', 'TERMINATED'];
  if (!employee || blockedStatuses.includes(employee.status)) {
    throw new Error('Employee profile not found or inactive');
  }
  return employee.id;
}

// ============================================================================
// SELF-SERVICE ROUTES (must be registered before parameterized /:id route)
// ============================================================================

/**
 * GET /attendance/my
 * Get the current user's attendance records (self-service)
 */
router.get(
  '/my',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const userId = (req as any).userId;
      const prisma = await getTenantPrismaBySlug(tenantSlug);

      const employeeId = await resolveEmployeeId(prisma, userId);

      // Re-use the existing listAttendance with the resolved employeeId
      const filters: any = {
        employeeId,
        dateFrom: req.query.startDate as string || req.query.dateFrom as string,
        dateTo: req.query.endDate as string || req.query.dateTo as string,
        status: req.query.status as string,
        page: req.query.page ? Number(req.query.page) : 1,
        pageSize: req.query.limit ? Number(req.query.limit) : req.query.pageSize ? Number(req.query.pageSize) : 20,
      };

      // Clean undefined values
      Object.keys(filters).forEach(k => { if (filters[k] === undefined) delete filters[k]; });

      const result = await listAttendance(prisma, filters);
      const timezone = await getTenantTimezone(tenantSlug);

      // Recompute isLate live from the earliest check-in of each day.
      // The stored DB flag can be stale (admin edits, imports, config changes).
      const earliestCheckInByDate = new Map<string, Date>();
      for (const r of result.data) {
        if (!r.checkInTime) continue;
        const dateKey = r.date instanceof Date
          ? r.date.toISOString().slice(0, 10)
          : String(r.date).slice(0, 10);
        const existing = earliestCheckInByDate.get(dateKey);
        if (!existing || new Date(r.checkInTime) < existing) {
          earliestCheckInByDate.set(dateKey, new Date(r.checkInTime));
        }
      }

      // Map to the shape the frontend expects: { items, total }
      // Also map checkInTime/checkOutTime → checkIn/checkOut, workMinutes → workHours
      const items = result.data.map((r: any) => {
        const dateKey = r.date instanceof Date
          ? r.date.toISOString().slice(0, 10)
          : String(r.date).slice(0, 10);
        const earliest = earliestCheckInByDate.get(dateKey);
        // Only the first session of the day can be marked late
        const isFirstSession = r.checkInTime && earliest &&
          new Date(r.checkInTime).getTime() === earliest.getTime();
        const isLateComputed = isFirstSession ? checkIsLate(new Date(r.checkInTime), timezone) : false;
        return {
          ...r,
          isLate: isLateComputed,
          checkIn: r.checkInTime ? r.checkInTime : undefined,
          checkOut: r.checkOutTime ? r.checkOutTime : undefined,
          workHours: r.workMinutes ? r.workMinutes / 60 : 0,
          overtime: r.overtimeMinutes ? r.overtimeMinutes / 60 : 0,
        };
      });

      res.json({ data: { items, total: result.total } });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get my attendance');
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * POST /attendance/check-in/self
 * Self-service check-in — resolves employeeId from JWT userId
 */
router.post(
  '/check-in/self',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const tenantId = (req as any).tenantId;
      const userId = (req as any).userId;
      const prisma = await getTenantPrismaBySlug(tenantSlug);

      const employeeId = await resolveEmployeeId(prisma, userId);

      const attendance = await checkIn(
        prisma,
        { employeeId, ...req.body },
        { tenantId, tenantSlug }
      );

      res.status(201).json({
        message: 'Check-in successful',
        data: attendance,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Self check-in failed');
      const msg = (error as Error).message.toLowerCase();
      if (msg.includes('already checked in') ||
          msg.includes('not found') ||
          msg.includes('inactive') ||
          msg.includes('already completed')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * POST /attendance/check-out/self
 * Self-service check-out — finds today's attendance record for the current user
 */
router.post(
  '/check-out/self',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const tenantId = (req as any).tenantId;
      const userId = (req as any).userId;
      const prisma = await getTenantPrismaBySlug(tenantSlug);

      const employeeId = await resolveEmployeeId(prisma, userId);

      // Find today's open attendance record
      const todayRecord = await getTodayAttendance(prisma, employeeId, tenantSlug);
      if (!todayRecord) {
        throw new Error('No check-in record found for today. Please check in first.');
      }
      if (todayRecord.checkOutTime) {
        throw new Error('Already checked out for today');
      }

      const attendance = await checkOut(
        prisma,
        { attendanceId: todayRecord.id, ...req.body },
        { tenantId, tenantSlug }
      );

      res.status(200).json({
        message: 'Check-out successful',
        data: attendance,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Self check-out failed');
      if ((error as Error).message.includes('already checked out') ||
          (error as Error).message.includes('Already checked out') ||
          (error as Error).message.includes('not found') ||
          (error as Error).message.includes('No check-in') ||
          (error as Error).message.includes('check in first')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * POST /attendance/check-in
 * Check in for the day (admin — requires employeeId in body)
 */
router.post(
  '/check-in',
  validateBody(checkInSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const tenantId = (req as any).tenantId;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      
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
      const msg = (error as Error).message.toLowerCase();
      if (msg.includes('already checked in') ||
          msg.includes('not found') ||
          msg.includes('inactive')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * POST /attendance/check-out
 * Check out for the day (admin — requires attendanceId in body)
 */
router.post(
  '/check-out',
  validateBody(checkOutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const tenantId = (req as any).tenantId;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      
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
 * GET /attendance/admin/weekly
 * Get all employees' attendance for a date range (admin weekly monitor view)
 * Query params: dateFrom (YYYY-MM-DD), dateTo (YYYY-MM-DD)
 * 
 * OPTIMIZED: Uses pre-aggregated employee_daily_status table for historical data,
 * raw attendance table for today's live data.
 */
router.get(
  '/admin/weekly',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);

      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: 'dateFrom and dateTo are required' });
      }

      const [fy, fm, fd] = dateFrom.split('-').map(Number);
      const [ty, tm, td] = dateTo.split('-').map(Number);
      const fromDate = new Date(Date.UTC(fy, fm - 1, fd));
      const toDate = new Date(Date.UTC(ty, tm - 1, td));
      
      // Determine today's date for splitting query
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Fetch active employees only — exclude TERMINATED, RESIGNED, RETIRED
      const employees = await prisma.employee.findMany({
        where: { status: { in: ['ACTIVE', 'ONBOARDING', 'ON_LEAVE', 'PROBATION', 'NOTICE_PERIOD'] } },
        include: {
          department: { select: { name: true, code: true } },
          designation: { select: { name: true } },
        },
        orderBy: [{ firstName: 'asc' }],
      });

      // Initialize result maps
      const attendanceMap: Record<string, Record<string, any[]>> = {};
      const leaveMap: Record<string, Record<string, { leaveName: string; leaveCode: string; halfDay: boolean }>> = {};

      // ========================================================================
      // HISTORICAL DATA: Use pre-aggregated employee_daily_status table
      // ========================================================================
      const historicalToDate = toDate < today ? toDate : new Date(today.getTime() - 86400000); // yesterday or earlier
      
      if (fromDate <= historicalToDate) {
        try {
          const dailyStatuses = await prisma.employeeDailyStatus.findMany({
            where: {
              date: { gte: fromDate, lte: historicalToDate },
            },
            orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
          });

          // Build attendance map from pre-aggregated data
          for (const status of dailyStatuses) {
            const empId = status.employeeId;
            const dateKey = status.date instanceof Date
              ? status.date.toISOString().slice(0, 10)
              : String(status.date).slice(0, 10);
            
            if (!attendanceMap[empId]) attendanceMap[empId] = {};
            if (!attendanceMap[empId][dateKey]) attendanceMap[empId][dateKey] = [];
            
            // Convert aggregated status to session format for backwards compatibility
            // P=present, A=absent (no session), HD=half_day, L=on_leave, H=holiday, WO=week-off
            if (status.status === 'P' || status.status === 'HD') {
              // If sessions JSON is available, use it for full session details
              const storedSessions = status.sessions as any[];
              if (storedSessions && Array.isArray(storedSessions) && storedSessions.length > 0) {
                // Return all sessions from the JSON field
                for (const sess of storedSessions) {
                  attendanceMap[empId][dateKey].push({
                    id: sess.id,
                    checkIn: sess.checkIn,
                    checkOut: sess.checkOut,
                    workMinutes: sess.workMinutes || 0,
                    status: sess.status || 'present',
                    isLate: sess.isLate || false,
                    isEarlyLeave: sess.isEarlyLeave || false,
                    isRemote: sess.isRemote || false,
                    notes: sess.notes,
                  });
                }
              } else {
                // Fallback: create single session from aggregated data
                attendanceMap[empId][dateKey].push({
                  id: status.id,
                  checkIn: status.checkInTime,
                  checkOut: status.checkOutTime,
                  workMinutes: status.workMinutes,
                  status: status.status === 'P' ? 'present' : 'half_day',
                  isLate: status.isLate,
                  isEarlyLeave: status.isEarlyLeave,
                  isRemote: status.isRemote,
                  notes: status.notes,
                });
              }
            }
            
            // If on leave, add to leave map
            if ((status.status === 'L' || status.status === 'HD') && status.leaveCode) {
              if (!leaveMap[empId]) leaveMap[empId] = {};
              leaveMap[empId][dateKey] = {
                leaveName: status.notes || 'Leave',
                leaveCode: status.leaveCode,
                halfDay: status.status === 'HD',
              };
            }
          }
          
          logger.debug({ from: fromDate.toISOString(), to: historicalToDate.toISOString(), count: dailyStatuses.length }, 'Loaded historical data from employee_daily_status');
        } catch (dailyStatusError) {
          // Fallback: If employee_daily_status table doesn't exist yet (migration not run),
          // the endpoint still works by falling through to the original query below
          logger.warn({ error: (dailyStatusError as Error).message }, 'employee_daily_status table not available, falling back to raw data');
        }
      }

      // ========================================================================
      // TODAY'S LIVE DATA: Use raw attendance table
      // ========================================================================
      if (toDate >= today) {
        const todayRecords = await prisma.attendance.findMany({
          where: {
            date: today,
          },
          orderBy: [{ employeeId: 'asc' }, { checkInTime: 'asc' }],
        });

        const todayKey = today.toISOString().slice(0, 10);
        for (const rec of todayRecords) {
          const empId = rec.employeeId;
          if (!attendanceMap[empId]) attendanceMap[empId] = {};
          if (!attendanceMap[empId][todayKey]) attendanceMap[empId][todayKey] = [];
          attendanceMap[empId][todayKey].push({
            id: rec.id,
            checkIn: rec.checkInTime,
            checkOut: rec.checkOutTime,
            workMinutes: rec.workMinutes,
            status: rec.status,
            isLate: rec.isLate,
            isEarlyLeave: rec.isEarlyLeave,
            isRemote: rec.isRemote,
            notes: rec.notes,
          });
        }
      }

      // ========================================================================
      // LEAVES: Fetch approved leaves in range (for display, supplements daily status)
      // ========================================================================
      const leaveRecords = await prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          fromDate: { lte: toDate },
          toDate: { gte: fromDate },
        },
        include: {
          leaveType: { select: { name: true, code: true } },
        },
      });

      // Build leave lookup (may override/supplement pre-aggregated data for UI)
      for (const leave of leaveRecords) {
        const empId = leave.employeeId;
        const from = new Date(leave.fromDate);
        const to = new Date(leave.toDate);
        const halfDay = (leave as any).isHalfDay ?? false;
        const cur = new Date(from);
        while (cur <= to) {
          const dk = cur.toISOString().slice(0, 10);
          if (!leaveMap[empId]) leaveMap[empId] = {};
          if (!leaveMap[empId][dk]) {
            leaveMap[empId][dk] = {
              leaveName: (leave.leaveType as any)?.name ?? 'Leave',
              leaveCode: (leave.leaveType as any)?.code ?? 'LV',
              halfDay,
            };
          }
          cur.setDate(cur.getDate() + 1);
        }
      }

      // Build result
      const result = employees.map((emp: any) => {
        const attByDate = attendanceMap[emp.id] || {};
        const leaveByDate = leaveMap[emp.id] || {};

        return {
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          firstName: emp.firstName ?? '',
          lastName: emp.lastName ?? '',
          avatar: emp.avatar ?? null,
          department: emp.department?.name ?? '',
          designation: emp.designation?.name ?? '',
          status: emp.status,
          attendance: attByDate,
          leaves: leaveByDate,
        };
      });

      res.json({ success: true, data: result });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get admin weekly attendance');
      next(error);
    }
  }
);

/**
 * POST /attendance/admin/aggregate
 * Manually trigger daily status aggregation for a specific date
 * Body: { date?: 'YYYY-MM-DD' } (defaults to yesterday)
 * 
 * Admin-only endpoint for re-computing daily status.
 */
router.post(
  '/admin/aggregate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const tenantId = (req as any).tenantId;
      const prisma = await getTenantPrismaBySlug(tenantSlug);

      const dateStr = req.body.date as string | undefined;
      let targetDate: Date;
      
      if (dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        targetDate = new Date(Date.UTC(y, m - 1, d));
      } else {
        // Default to yesterday
        targetDate = new Date();
        targetDate.setUTCDate(targetDate.getUTCDate() - 1);
        targetDate.setUTCHours(0, 0, 0, 0);
      }

      // Import and call the aggregation function
      const { aggregateDailyStatusForDate } = await import('../services/daily-status.service');
      const result = await aggregateDailyStatusForDate(prisma, tenantSlug, targetDate);

      res.json({
        success: true,
        message: `Daily status aggregation completed for ${targetDate.toISOString().slice(0, 10)}`,
        data: result,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to trigger daily status aggregation');
      next(error);
    }
  }
);

/**
 * POST /attendance/admin/backfill
 * Backfill daily status for a date range
 * Body: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
 * 
 * Admin-only endpoint for backfilling historical data.
 */
router.post(
  '/admin/backfill',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);

      const { from, to } = req.body;
      
      if (!from || !to) {
        return res.status(400).json({ error: 'from and to dates are required (YYYY-MM-DD format)' });
      }

      const [fy, fm, fd] = from.split('-').map(Number);
      const [ty, tm, td] = to.split('-').map(Number);
      const fromDate = new Date(Date.UTC(fy, fm - 1, fd));
      const toDate = new Date(Date.UTC(ty, tm - 1, td));

      // Import and call the backfill function
      const { backfillDailyStatus } = await import('../services/daily-status.service');
      const result = await backfillDailyStatus(prisma, tenantSlug, fromDate, toDate);

      res.json({
        success: true,
        message: `Backfill completed for ${from} to ${to}`,
        data: result,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to backfill daily status');
      next(error);
    }
  }
);

/**
 * GET /attendance/overview/today
 * Get today's attendance overview for the entire company
 */
router.get(
  '/overview/today',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      
      const overview = await getTodayAttendanceOverview(prisma, tenantSlug);
      
      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get today attendance overview');
      next(error);
    }
  }
);

/**
 * GET /attendance/overview/date/:date
 * Get attendance overview for a specific date (YYYY-MM-DD)
 */
router.get(
  '/overview/date/:date',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      const { date } = req.params;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }

      const overview = await getAttendanceOverviewForDate(prisma, tenantSlug, date);

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get attendance overview for date');
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      const { employeeId } = req.params;
      
      const attendance = await getTodayAttendance(prisma, employeeId, tenantSlug);
      
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      
      const result = await listAttendance(prisma, req.query as any);
      
      res.json({ success: true, data: result });
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      const { employeeId, year, month } = req.query as any;
      
      const summary = await getMonthlyAttendanceSummary(
        prisma,
        employeeId,
        year,
        month,
        tenantSlug
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
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
