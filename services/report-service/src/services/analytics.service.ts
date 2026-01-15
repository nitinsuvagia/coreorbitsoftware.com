/**
 * Analytics Service - Generate analytics and metrics
 */

import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import Decimal from 'decimal.js';
import NodeCache from 'node-cache';
import { getTenantPrisma } from '@oms/database';
import { config } from '../config';
import { logger } from '../utils/logger';

// Cache for analytics data
const analyticsCache = new NodeCache({
  stdTTL: config.analytics.dashboardCacheTtl,
  checkperiod: 60,
});

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface OverviewMetrics {
  employees: {
    total: number;
    active: number;
    onLeave: number;
    newThisMonth: number;
  };
  attendance: {
    presentToday: number;
    absentToday: number;
    onTimePercentage: number;
    avgWorkHours: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
  };
}

export interface TrendData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

/**
 * Get date range for period
 */
export function getDateRange(period: Period, referenceDate?: Date): DateRange {
  const ref = referenceDate ? DateTime.fromJSDate(referenceDate) : DateTime.now();
  
  switch (period) {
    case 'day':
      return {
        start: ref.startOf('day').toJSDate(),
        end: ref.endOf('day').toJSDate(),
      };
    case 'week':
      return {
        start: ref.startOf('week').toJSDate(),
        end: ref.endOf('week').toJSDate(),
      };
    case 'month':
      return {
        start: ref.startOf('month').toJSDate(),
        end: ref.endOf('month').toJSDate(),
      };
    case 'quarter':
      return {
        start: ref.startOf('quarter').toJSDate(),
        end: ref.endOf('quarter').toJSDate(),
      };
    case 'year':
      return {
        start: ref.startOf('year').toJSDate(),
        end: ref.endOf('year').toJSDate(),
      };
  }
}

/**
 * Get overview metrics for dashboard
 */
export async function getOverviewMetrics(tenantSlug: string): Promise<OverviewMetrics> {
  const cacheKey = `overview:${tenantSlug}`;
  const cached = analyticsCache.get<OverviewMetrics>(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const prisma = await getTenantPrisma(tenantSlug);
  const now = DateTime.now();
  const today = now.startOf('day').toJSDate();
  const monthStart = now.startOf('month').toJSDate();
  
  // Employee metrics
  const [totalEmployees, activeEmployees, onLeaveEmployees, newEmployees] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: 'active' } }),
    prisma.employee.count({ where: { status: 'on_leave' } }),
    prisma.employee.count({
      where: {
        createdAt: { gte: monthStart },
      },
    }),
  ]);
  
  // Attendance metrics
  const [presentToday, totalAttendanceToday, lateArrivals, avgWorkHoursResult] = await Promise.all([
    prisma.attendance.count({
      where: {
        date: today,
        status: { in: ['present', 'late'] },
      },
    }),
    prisma.attendance.count({
      where: { date: today },
    }),
    prisma.attendance.count({
      where: {
        date: today,
        status: 'late',
      },
    }),
    prisma.attendance.aggregate({
      where: {
        date: { gte: monthStart },
        workHours: { not: null },
      },
      _avg: { workHours: true },
    }),
  ]);
  
  const absentToday = activeEmployees - presentToday;
  const onTimeToday = presentToday - lateArrivals;
  const onTimePercentage = presentToday > 0 ? (onTimeToday / presentToday) * 100 : 0;
  
  // Project metrics
  const [totalProjects, activeProjects, completedProjects, overdueProjects] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: 'in_progress' } }),
    prisma.project.count({ where: { status: 'completed' } }),
    prisma.project.count({
      where: {
        status: { notIn: ['completed', 'cancelled'] },
        endDate: { lt: now.toJSDate() },
      },
    }),
  ]);
  
  // Task metrics
  const [totalTasks, completedTasks, inProgressTasks, overdueTasks] = await Promise.all([
    prisma.task.count(),
    prisma.task.count({ where: { status: 'done' } }),
    prisma.task.count({ where: { status: 'in_progress' } }),
    prisma.task.count({
      where: {
        status: { notIn: ['done', 'cancelled'] },
        dueDate: { lt: now.toJSDate() },
      },
    }),
  ]);
  
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const metrics: OverviewMetrics = {
    employees: {
      total: totalEmployees,
      active: activeEmployees,
      onLeave: onLeaveEmployees,
      newThisMonth: newEmployees,
    },
    attendance: {
      presentToday,
      absentToday,
      onTimePercentage: Math.round(onTimePercentage),
      avgWorkHours: Math.round((avgWorkHoursResult._avg.workHours || 0) * 10) / 10,
    },
    projects: {
      total: totalProjects,
      active: activeProjects,
      completed: completedProjects,
      overdue: overdueProjects,
    },
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      overdue: overdueTasks,
      completionRate: Math.round(completionRate),
    },
  };
  
  analyticsCache.set(cacheKey, metrics);
  
  return metrics;
}

/**
 * Get attendance trends
 */
export async function getAttendanceTrends(
  tenantSlug: string,
  period: Period = 'month'
): Promise<TrendData> {
  const prisma = await getTenantPrisma(tenantSlug);
  const range = getDateRange(period);
  
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      date: {
        gte: range.start,
        lte: range.end,
      },
    },
    select: {
      date: true,
      status: true,
    },
    orderBy: { date: 'asc' },
  });
  
  // Group by date
  const dailyData = new Map<string, { present: number; absent: number; late: number }>();
  
  for (const record of attendanceRecords) {
    const dateKey = DateTime.fromJSDate(record.date).toFormat('yyyy-MM-dd');
    
    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, { present: 0, absent: 0, late: 0 });
    }
    
    const data = dailyData.get(dateKey)!;
    
    if (record.status === 'present') {
      data.present++;
    } else if (record.status === 'late') {
      data.late++;
    } else if (record.status === 'absent') {
      data.absent++;
    }
  }
  
  const labels: string[] = [];
  const presentData: number[] = [];
  const lateData: number[] = [];
  const absentData: number[] = [];
  
  for (const [date, data] of dailyData) {
    labels.push(DateTime.fromFormat(date, 'yyyy-MM-dd').toFormat('MMM dd'));
    presentData.push(data.present);
    lateData.push(data.late);
    absentData.push(data.absent);
  }
  
  return {
    labels,
    datasets: [
      { label: 'Present', data: presentData },
      { label: 'Late', data: lateData },
      { label: 'Absent', data: absentData },
    ],
  };
}

/**
 * Get project progress trends
 */
export async function getProjectProgressTrends(
  tenantSlug: string,
  period: Period = 'month'
): Promise<TrendData> {
  const prisma = await getTenantPrisma(tenantSlug);
  const range = getDateRange(period);
  
  const projects = await prisma.project.findMany({
    where: {
      status: { in: ['in_progress', 'completed'] },
      startDate: { lte: range.end },
    },
    select: {
      id: true,
      name: true,
      progress: true,
    },
    take: 10, // Top 10 projects
  });
  
  return {
    labels: projects.map(p => p.name.substring(0, 20)),
    datasets: [
      {
        label: 'Progress %',
        data: projects.map(p => p.progress || 0),
      },
    ],
  };
}

/**
 * Get task completion trends
 */
export async function getTaskCompletionTrends(
  tenantSlug: string,
  period: Period = 'month'
): Promise<TrendData> {
  const prisma = await getTenantPrisma(tenantSlug);
  const range = getDateRange(period);
  
  const completedTasks = await prisma.task.findMany({
    where: {
      status: 'done',
      updatedAt: {
        gte: range.start,
        lte: range.end,
      },
    },
    select: {
      updatedAt: true,
    },
    orderBy: { updatedAt: 'asc' },
  });
  
  // Group by date
  const dailyCounts = new Map<string, number>();
  
  for (const task of completedTasks) {
    const dateKey = DateTime.fromJSDate(task.updatedAt).toFormat('yyyy-MM-dd');
    dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
  }
  
  const labels: string[] = [];
  const data: number[] = [];
  
  for (const [date, count] of dailyCounts) {
    labels.push(DateTime.fromFormat(date, 'yyyy-MM-dd').toFormat('MMM dd'));
    data.push(count);
  }
  
  return {
    labels,
    datasets: [{ label: 'Completed Tasks', data }],
  };
}

/**
 * Get employee distribution by department
 */
export async function getEmployeeDistribution(tenantSlug: string): Promise<TrendData> {
  const prisma = await getTenantPrisma(tenantSlug);
  
  const departments = await prisma.department.findMany({
    include: {
      _count: {
        select: { employees: true },
      },
    },
  });
  
  return {
    labels: departments.map(d => d.name),
    datasets: [
      {
        label: 'Employees',
        data: departments.map(d => d._count.employees),
      },
    ],
  };
}

/**
 * Get task distribution by status
 */
export async function getTaskStatusDistribution(tenantSlug: string): Promise<TrendData> {
  const prisma = await getTenantPrisma(tenantSlug);
  
  const statusCounts = await prisma.task.groupBy({
    by: ['status'],
    _count: { id: true },
  });
  
  const statusLabels: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
    cancelled: 'Cancelled',
  };
  
  return {
    labels: statusCounts.map(s => statusLabels[s.status] || s.status),
    datasets: [
      {
        label: 'Tasks',
        data: statusCounts.map(s => s._count.id),
      },
    ],
  };
}

/**
 * Get work hours analytics
 */
export async function getWorkHoursAnalytics(
  tenantSlug: string,
  period: Period = 'month'
): Promise<{
  totalHours: number;
  avgHoursPerDay: number;
  avgHoursPerEmployee: number;
  topPerformers: { employeeId: string; name: string; hours: number }[];
}> {
  const prisma = await getTenantPrisma(tenantSlug);
  const range = getDateRange(period);
  
  const attendance = await prisma.attendance.findMany({
    where: {
      date: {
        gte: range.start,
        lte: range.end,
      },
      workHours: { not: null },
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
  
  const totalHours = attendance.reduce((sum, a) => sum + (a.workHours || 0), 0);
  const uniqueDays = new Set(attendance.map(a => a.date.toISOString().split('T')[0])).size;
  const uniqueEmployees = new Set(attendance.map(a => a.employeeId)).size;
  
  // Calculate top performers
  const employeeHours = new Map<string, { name: string; hours: number }>();
  
  for (const record of attendance) {
    const key = record.employeeId;
    const current = employeeHours.get(key) || {
      name: `${record.employee.firstName} ${record.employee.lastName}`,
      hours: 0,
    };
    current.hours += record.workHours || 0;
    employeeHours.set(key, current);
  }
  
  const topPerformers = Array.from(employeeHours.entries())
    .map(([id, data]) => ({ employeeId: id, ...data }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);
  
  return {
    totalHours: Math.round(totalHours * 10) / 10,
    avgHoursPerDay: uniqueDays > 0 ? Math.round((totalHours / uniqueDays) * 10) / 10 : 0,
    avgHoursPerEmployee: uniqueEmployees > 0 ? Math.round((totalHours / uniqueEmployees) * 10) / 10 : 0,
    topPerformers,
  };
}

/**
 * Get leave analytics
 */
export async function getLeaveAnalytics(
  tenantSlug: string,
  period: Period = 'year'
): Promise<{
  totalLeaves: number;
  leavesByType: { type: string; count: number }[];
  leavesByMonth: TrendData;
}> {
  const prisma = await getTenantPrisma(tenantSlug);
  const range = getDateRange(period);
  
  const leaves = await prisma.leave.findMany({
    where: {
      startDate: {
        gte: range.start,
        lte: range.end,
      },
      status: 'approved',
    },
  });
  
  // Count by type
  const typeCounts = new Map<string, number>();
  for (const leave of leaves) {
    typeCounts.set(leave.leaveType, (typeCounts.get(leave.leaveType) || 0) + 1);
  }
  
  // Count by month
  const monthCounts = new Map<string, number>();
  for (const leave of leaves) {
    const monthKey = DateTime.fromJSDate(leave.startDate).toFormat('yyyy-MM');
    monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
  }
  
  const sortedMonths = Array.from(monthCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  
  return {
    totalLeaves: leaves.length,
    leavesByType: Array.from(typeCounts.entries()).map(([type, count]) => ({ type, count })),
    leavesByMonth: {
      labels: sortedMonths.map(([m]) => DateTime.fromFormat(m, 'yyyy-MM').toFormat('MMM yyyy')),
      datasets: [
        {
          label: 'Leaves',
          data: sortedMonths.map(([, count]) => count),
        },
      ],
    },
  };
}

/**
 * Clear analytics cache
 */
export function clearCache(tenantSlug?: string): void {
  if (tenantSlug) {
    const keys = analyticsCache.keys().filter(k => k.startsWith(`${tenantSlug}:`));
    analyticsCache.del(keys);
  } else {
    analyticsCache.flushAll();
  }
}
