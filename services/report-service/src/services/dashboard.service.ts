/**
 * Dashboard Service - Dashboard configurations and widgets
 */

import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuid } from 'uuid';
import { getTenantPrisma } from '@oms/database';
import { logger } from '../utils/logger';
import * as analyticsService from './analytics.service';
import * as chartService from './chart.service';

export interface Widget {
  id: string;
  type: 'metric' | 'chart' | 'list' | 'table';
  title: string;
  dataSource: string;
  chartType?: 'bar' | 'line' | 'pie' | 'doughnut';
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  config?: Record<string, any>;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  widgets: Widget[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardData {
  dashboard: Dashboard;
  widgetData: Record<string, any>;
}

// Default dashboard widgets configuration
const defaultWidgets: Widget[] = [
  {
    id: 'overview-employees',
    type: 'metric',
    title: 'Total Employees',
    dataSource: 'employees.total',
    size: 'small',
    position: { x: 0, y: 0 },
  },
  {
    id: 'overview-projects',
    type: 'metric',
    title: 'Active Projects',
    dataSource: 'projects.active',
    size: 'small',
    position: { x: 1, y: 0 },
  },
  {
    id: 'overview-tasks',
    type: 'metric',
    title: 'Completed Tasks',
    dataSource: 'tasks.completed',
    size: 'small',
    position: { x: 2, y: 0 },
  },
  {
    id: 'overview-attendance',
    type: 'metric',
    title: 'Present Today',
    dataSource: 'attendance.presentToday',
    size: 'small',
    position: { x: 3, y: 0 },
  },
  {
    id: 'attendance-chart',
    type: 'chart',
    title: 'Attendance Trends',
    dataSource: 'attendance.trends',
    chartType: 'line',
    size: 'large',
    position: { x: 0, y: 1 },
  },
  {
    id: 'task-status',
    type: 'chart',
    title: 'Task Status',
    dataSource: 'tasks.statusDistribution',
    chartType: 'doughnut',
    size: 'medium',
    position: { x: 2, y: 1 },
  },
  {
    id: 'project-progress',
    type: 'chart',
    title: 'Project Progress',
    dataSource: 'projects.progress',
    chartType: 'bar',
    size: 'large',
    position: { x: 0, y: 2 },
  },
  {
    id: 'dept-distribution',
    type: 'chart',
    title: 'Employees by Department',
    dataSource: 'employees.distribution',
    chartType: 'pie',
    size: 'medium',
    position: { x: 2, y: 2 },
  },
];

/**
 * Get dashboard by ID or default
 */
export async function getDashboard(
  tenantSlug: string,
  dashboardId?: string
): Promise<Dashboard> {
  const prisma = await getTenantPrisma(tenantSlug);
  
  let dashboard: any;
  
  if (dashboardId) {
    dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
    });
  } else {
    dashboard = await prisma.dashboard.findFirst({
      where: { isDefault: true },
    });
  }
  
  if (!dashboard) {
    // Return default dashboard
    return {
      id: 'default',
      name: 'Overview Dashboard',
      description: 'Default system dashboard',
      isDefault: true,
      widgets: defaultWidgets,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  return {
    ...dashboard,
    widgets: dashboard.widgets ? JSON.parse(dashboard.widgets) : defaultWidgets,
  };
}

/**
 * Get dashboard with data
 */
export async function getDashboardWithData(
  tenantSlug: string,
  dashboardId?: string
): Promise<DashboardData> {
  const dashboard = await getDashboard(tenantSlug, dashboardId);
  
  // Fetch data for all widgets
  const widgetData: Record<string, any> = {};
  
  // Get overview metrics
  const overview = await analyticsService.getOverviewMetrics(tenantSlug);
  
  for (const widget of dashboard.widgets) {
    try {
      widgetData[widget.id] = await getWidgetData(tenantSlug, widget, overview);
    } catch (error) {
      logger.error({
        widgetId: widget.id,
        error,
      }, 'Failed to get widget data');
      widgetData[widget.id] = { error: 'Failed to load data' };
    }
  }
  
  return { dashboard, widgetData };
}

/**
 * Get data for a specific widget
 */
async function getWidgetData(
  tenantSlug: string,
  widget: Widget,
  overview: analyticsService.OverviewMetrics
): Promise<any> {
  const [category, metric] = widget.dataSource.split('.');
  
  switch (widget.dataSource) {
    // Metric widgets
    case 'employees.total':
      return { value: overview.employees.total, trend: '+' + overview.employees.newThisMonth };
    case 'employees.active':
      return { value: overview.employees.active };
    case 'projects.active':
      return { value: overview.projects.active };
    case 'projects.completed':
      return { value: overview.projects.completed };
    case 'tasks.completed':
      return { value: overview.tasks.completed, rate: overview.tasks.completionRate };
    case 'tasks.overdue':
      return { value: overview.tasks.overdue };
    case 'attendance.presentToday':
      return { value: overview.attendance.presentToday };
    case 'attendance.onTimePercentage':
      return { value: overview.attendance.onTimePercentage, suffix: '%' };
    
    // Chart widgets
    case 'attendance.trends':
      return analyticsService.getAttendanceTrends(tenantSlug);
    case 'tasks.statusDistribution':
      return analyticsService.getTaskStatusDistribution(tenantSlug);
    case 'projects.progress':
      return analyticsService.getProjectProgressTrends(tenantSlug);
    case 'employees.distribution':
      return analyticsService.getEmployeeDistribution(tenantSlug);
    case 'tasks.completionTrends':
      return analyticsService.getTaskCompletionTrends(tenantSlug);
    
    default:
      return { error: 'Unknown data source' };
  }
}

/**
 * Create custom dashboard
 */
export async function createDashboard(
  tenantSlug: string,
  input: {
    name: string;
    description?: string;
    widgets?: Widget[];
  },
  userId: string
): Promise<Dashboard> {
  const prisma = await getTenantPrisma(tenantSlug);
  
  const dashboard = await prisma.dashboard.create({
    data: {
      id: uuid(),
      name: input.name,
      description: input.description,
      isDefault: false,
      widgets: JSON.stringify(input.widgets || defaultWidgets),
      createdBy: userId,
    },
  });
  
  return {
    ...dashboard,
    widgets: input.widgets || defaultWidgets,
  };
}

/**
 * Update dashboard
 */
export async function updateDashboard(
  tenantSlug: string,
  dashboardId: string,
  input: {
    name?: string;
    description?: string;
    widgets?: Widget[];
    isDefault?: boolean;
  }
): Promise<Dashboard> {
  const prisma = await getTenantPrisma(tenantSlug);
  
  // If setting as default, unset other defaults
  if (input.isDefault) {
    await prisma.dashboard.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }
  
  const updated = await prisma.dashboard.update({
    where: { id: dashboardId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.widgets && { widgets: JSON.stringify(input.widgets) }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      updatedAt: new Date(),
    },
  });
  
  return {
    ...updated,
    widgets: input.widgets || JSON.parse(updated.widgets || '[]'),
  };
}

/**
 * Delete dashboard
 */
export async function deleteDashboard(
  tenantSlug: string,
  dashboardId: string
): Promise<void> {
  const prisma = await getTenantPrisma(tenantSlug);
  
  await prisma.dashboard.delete({
    where: { id: dashboardId },
  });
}

/**
 * List all dashboards
 */
export async function listDashboards(tenantSlug: string): Promise<Dashboard[]> {
  const prisma = await getTenantPrisma(tenantSlug);
  
  const dashboards = await prisma.dashboard.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
  
  return dashboards.map(d => ({
    ...d,
    widgets: d.widgets ? JSON.parse(d.widgets) : [],
  }));
}

/**
 * Generate chart configuration for widget
 */
export async function generateWidgetChart(
  tenantSlug: string,
  widgetId: string,
  dashboardId?: string
): Promise<chartService.ChartResult> {
  const dashboard = await getDashboard(tenantSlug, dashboardId);
  const widget = dashboard.widgets.find(w => w.id === widgetId);
  
  if (!widget) {
    throw new Error('Widget not found');
  }
  
  if (widget.type !== 'chart' || !widget.chartType) {
    throw new Error('Widget is not a chart');
  }
  
  const overview = await analyticsService.getOverviewMetrics(tenantSlug);
  const data = await getWidgetData(tenantSlug, widget, overview);
  
  return chartService.chartService.generateChart(widget.chartType, data, widget.title);
}
