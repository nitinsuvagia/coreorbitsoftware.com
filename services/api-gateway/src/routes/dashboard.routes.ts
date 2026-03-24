/**
 * Dashboard Routes - Employee-facing dashboard API
 * 
 * These routes are accessible by all authenticated users with dashboard:view permission.
 * Returns role-appropriate data (personal stats for employees, org stats for admins).
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getTenantPrismaBySlug } from '../utils/database';
import { logger } from '../utils/logger';

const router = Router();

// Extended request with tenant + auth context
interface DashboardRequest extends Request {
  tenantContext?: {
    tenantId: string;
    tenantSlug: string;
    databaseUrl: string;
  };
  domainResolution?: {
    tenantSlug?: string;
  };
  user?: {
    id: string;
    email: string;
    type: string;
    roles?: string[];
    permissions?: string[];
    tenantSlug?: string;
  };
}

// ============================================================================
// GET EMPLOYEE DASHBOARD STATS (Personal)
// ============================================================================

router.get('/my-stats', async (req: DashboardRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    const userId = req.user?.id;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication is required' },
      });
    }
    
    try {
      const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
      
      // Find the user and their linked employee
      const user = await tenantPrisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });
      
      if (!user || !user.employeeId) {
        return res.status(404).json({
          success: false,
          error: { code: 'EMPLOYEE_NOT_FOUND', message: 'No employee record linked to this user' },
        });
      }
      
      const employeeId = user.employeeId;
      
      // Get today's date boundaries (use UTC midnight to match DATE columns)
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10); // e.g. '2026-03-01'
      const today = new Date(todayStr + 'T00:00:00.000Z');
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      
      // Get current year
      const currentYear = new Date().getFullYear();
      
      // Query personal stats in parallel
      const [
        // All today's sessions (pick open/latest in JS + aggregate work time)
        todayAllSessions,
        // My attendance this month (distinct days)
        monthlyDays,
        // My leave balances
        leaveBalances,
        // My pending leave requests
        pendingLeaveRequests,
        // My todos (pending)
        pendingTodos,
        // My todos (completed)
        completedTodos,
        // My project assignments
        myProjects,
        // My employee details
        employee,
      ] = await Promise.all([
        // Today's all sessions (we'll pick the right one in JS)
        tenantPrisma.attendance.findMany({
          where: {
            employeeId,
            date: { gte: today, lt: tomorrow },
          },
          orderBy: { checkInTime: 'desc' },
          select: {
            id: true,
            checkInTime: true,
            checkOutTime: true,
            status: true,
            workMinutes: true,
            isLate: true,
            isRemote: true,
          },
        }),
        
        // Monthly attendance — distinct days with a check-in
        tenantPrisma.attendance.findMany({
          where: {
            employeeId,
            date: {
              gte: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
              lt: tomorrow,
            },
            checkInTime: { not: null },
          },
          distinct: ['date'],
          select: { date: true },
        }),
        
        // Leave balances for current year (active leave types only)
        tenantPrisma.leaveBalance.findMany({
          where: {
            employeeId,
            year: currentYear,
            leaveType: { isActive: true },
          },
          include: {
            leaveType: {
              select: { name: true, code: true, isPaid: true },
            },
          },
        }),
        
        // Pending leave requests
        tenantPrisma.leaveRequest.count({
          where: {
            employeeId,
            status: { in: ['pending', 'PENDING'] },
          },
        }),
        
        // Pending todos
        (tenantPrisma as any).userTodo?.count?.({
          where: {
            userId,
            isCompleted: false,
          },
        }).catch(() => 0) || Promise.resolve(0),
        
        // Completed todos
        (tenantPrisma as any).userTodo?.count?.({
          where: {
            userId,
            isCompleted: true,
          },
        }).catch(() => 0) || Promise.resolve(0),
        
        // My project assignments (count)
        tenantPrisma.projectMember.count({
          where: { employeeId },
        }).catch(() => 0),
        
        // Employee details (department, designation, join date)
        tenantPrisma.employee.findUnique({
          where: { id: employeeId },
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
            avatar: true,
            status: true,
            joinDate: true,
            employmentType: true,
            department: {
              select: { id: true, name: true },
            },
            designation: {
              select: { id: true, name: true },
            },
            reportingManager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        }),
      ]);
      
      // Calculate leave balance summary (only paid leaves count toward totals)
      const paidLeaveBalances = leaveBalances.filter((lb: any) => lb.leaveType?.isPaid === true);
      const totalLeaveAllotted = paidLeaveBalances.reduce(
        (sum: number, lb: any) => sum + Number(lb.totalDays), 0
      );
      const totalLeaveUsed = paidLeaveBalances.reduce(
        (sum: number, lb: any) => sum + Number(lb.usedDays), 0
      );
      const totalLeavePending = paidLeaveBalances.reduce(
        (sum: number, lb: any) => sum + Number(lb.pendingDays), 0
      );
      const totalLeaveRemaining = totalLeaveAllotted - totalLeaveUsed - totalLeavePending;
      
      // Pick the right session: prefer open (no checkout), fall back to latest
      const todayAttendance =
        todayAllSessions.find((s) => s.checkInTime && !s.checkOutTime) ||
        todayAllSessions[0] ||
        null;
      
      // Determine attendance status
      let attendanceStatus: 'not_checked_in' | 'checked_in' | 'checked_out' = 'not_checked_in';
      if (todayAttendance) {
        attendanceStatus = todayAttendance.checkOutTime ? 'checked_out' : 'checked_in';
      }
      
      // Total work minutes across all sessions today
      const totalWorkMinutesToday = todayAllSessions.reduce((sum, s) => {
        if (s.checkInTime && s.checkOutTime) {
          return sum + Math.round(
            (new Date(s.checkOutTime).getTime() - new Date(s.checkInTime).getTime()) / 60000
          );
        }
        if (s.checkInTime && !s.checkOutTime) {
          return sum + Math.round((Date.now() - new Date(s.checkInTime).getTime()) / 60000);
        }
        return sum;
      }, 0);
      
      // Monthly distinct present days
      const monthlyAttendance = monthlyDays.length;
      
      // Get working days in current month (Mon-Fri) up to today
      const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      let workingDaysThisMonth = 0;
      for (let d = new Date(monthStart); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
        const dayOfWeek = d.getUTCDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDaysThisMonth++;
      }
      
      const monthlyAttendanceRate = workingDaysThisMonth > 0
        ? Math.round((monthlyAttendance / workingDaysThisMonth) * 100)
        : 0;
      
      res.json({
        success: true,
        data: {
          employee: employee || {
            id: employeeId,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: `${user.firstName} ${user.lastName}`,
            email: user.email,
          },
          attendance: {
            today: todayAttendance ? {
              status: attendanceStatus,
              checkInTime: todayAttendance.checkInTime,
              checkOutTime: todayAttendance.checkOutTime,
              workMinutes: totalWorkMinutesToday,
              isLate: todayAttendance.isLate,
              isRemote: todayAttendance.isRemote,
              sessionCount: todayAllSessions.length,
            } : {
              status: 'not_checked_in',
              checkInTime: null,
              checkOutTime: null,
              workMinutes: 0,
              isLate: false,
              isRemote: false,
            },
            monthlyPresent: monthlyAttendance,
            monthlyTotal: workingDaysThisMonth,
            monthlyRate: monthlyAttendanceRate,
          },
          leave: {
            totalAllotted: totalLeaveAllotted,
            totalUsed: totalLeaveUsed,
            totalPending: totalLeavePending,
            totalRemaining: Math.max(0, totalLeaveRemaining),
            pendingRequests: pendingLeaveRequests,
            balances: leaveBalances.map((lb: any) => ({
              leaveType: lb.leaveType.name,
              leaveCode: lb.leaveType.code,
              isPaid: lb.leaveType.isPaid ?? true,
              total: Number(lb.totalDays),
              used: Number(lb.usedDays),
              pending: Number(lb.pendingDays),
              remaining: Math.max(0, Number(lb.totalDays) - Number(lb.usedDays) - Number(lb.pendingDays)),
            })),
          },
          tasks: {
            pending: pendingTodos || 0,
            completed: completedTodos || 0,
            total: (pendingTodos || 0) + (completedTodos || 0),
          },
          projects: {
            active: myProjects || 0,
          },
        },
      });
      
    } catch (dbError) {
      logger.warn({ error: (dbError as Error).message, stack: (dbError as Error).stack }, 'Failed to query tenant database for employee stats');
      res.status(500).json({
        success: false,
        error: { code: 'DB_ERROR', message: 'Failed to fetch employee dashboard data' },
      });
    }
    
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get employee dashboard stats');
    next(error);
  }
});

export default router;
