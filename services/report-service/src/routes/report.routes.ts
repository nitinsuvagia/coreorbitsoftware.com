/**
 * Report Routes - API endpoints for reports and analytics
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantPrisma } from '@oms/database';
import * as analyticsService from '../services/analytics.service';
import * as exportService from '../services/export.service';
import * as dashboardService from '../services/dashboard.service';
import * as chartService from '../services/chart.service';
import * as storageService from '../services/storage.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).optional();

const exportSchema = z.object({
  format: z.enum(['excel', 'pdf', 'csv']).default('excel'),
  title: z.string().max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  filters: z.record(z.any()).optional(),
});

const dashboardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  widgets: z.array(z.object({
    id: z.string(),
    type: z.enum(['metric', 'chart', 'list', 'table']),
    title: z.string(),
    dataSource: z.string(),
    chartType: z.enum(['bar', 'line', 'pie', 'doughnut']).optional(),
    size: z.enum(['small', 'medium', 'large']),
    position: z.object({ x: z.number(), y: z.number() }),
    config: z.record(z.any()).optional(),
  })).optional(),
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

function getTenantContext(req: Request) {
  const tenantId = req.headers['x-tenant-id'] as string;
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  const userId = req.headers['x-user-id'] as string;
  
  if (!tenantId || !tenantSlug) {
    throw new Error('Tenant context not found');
  }
  
  return { tenantId, tenantSlug, userId };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

// Get overview metrics
router.get(
  '/analytics/overview',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    
    const metrics = await analyticsService.getOverviewMetrics(tenantSlug);
    
    res.json({ success: true, data: metrics });
  })
);

// Get attendance trends
router.get(
  '/analytics/attendance/trends',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const period = (req.query.period as analyticsService.Period) || 'month';
    
    const trends = await analyticsService.getAttendanceTrends(tenantSlug, period);
    
    res.json({ success: true, data: trends });
  })
);

// Get project progress trends
router.get(
  '/analytics/projects/progress',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const period = (req.query.period as analyticsService.Period) || 'month';
    
    const trends = await analyticsService.getProjectProgressTrends(tenantSlug, period);
    
    res.json({ success: true, data: trends });
  })
);

// Get task completion trends
router.get(
  '/analytics/tasks/completion',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const period = (req.query.period as analyticsService.Period) || 'month';
    
    const trends = await analyticsService.getTaskCompletionTrends(tenantSlug, period);
    
    res.json({ success: true, data: trends });
  })
);

// Get task status distribution
router.get(
  '/analytics/tasks/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    
    const distribution = await analyticsService.getTaskStatusDistribution(tenantSlug);
    
    res.json({ success: true, data: distribution });
  })
);

// Get employee distribution
router.get(
  '/analytics/employees/distribution',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    
    const distribution = await analyticsService.getEmployeeDistribution(tenantSlug);
    
    res.json({ success: true, data: distribution });
  })
);

// Get work hours analytics
router.get(
  '/analytics/work-hours',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const period = (req.query.period as analyticsService.Period) || 'month';
    
    const analytics = await analyticsService.getWorkHoursAnalytics(tenantSlug, period);
    
    res.json({ success: true, data: analytics });
  })
);

// Get leave analytics
router.get(
  '/analytics/leaves',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const period = (req.query.period as analyticsService.Period) || 'year';
    
    const analytics = await analyticsService.getLeaveAnalytics(tenantSlug, period);
    
    res.json({ success: true, data: analytics });
  })
);

// ============================================================================
// EXPORT ENDPOINTS
// ============================================================================

// Export employees
router.post(
  '/export/employees',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const options = exportSchema.parse(req.body);
    
    const result = await exportService.exportEmployeesToExcel(tenantSlug, {
      format: options.format,
      title: options.title,
      filters: options.filters,
    });
    
    res.json({ success: true, data: result });
  })
);

// Export attendance
router.post(
  '/export/attendance',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const options = exportSchema.parse(req.body);
    
    const dateRange = options.startDate && options.endDate
      ? { start: new Date(options.startDate), end: new Date(options.endDate) }
      : undefined;
    
    const result = await exportService.exportAttendanceToExcel(tenantSlug, {
      format: options.format,
      title: options.title,
      filters: options.filters,
      dateRange,
    });
    
    res.json({ success: true, data: result });
  })
);

// Export projects
router.post(
  '/export/projects',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const options = exportSchema.parse(req.body);
    
    const result = await exportService.exportProjectsToExcel(tenantSlug, {
      format: options.format,
      title: options.title,
      filters: options.filters,
    });
    
    res.json({ success: true, data: result });
  })
);

// Export tasks
router.post(
  '/export/tasks',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const options = exportSchema.parse(req.body);
    
    const result = await exportService.exportTasksToExcel(tenantSlug, {
      format: options.format,
      title: options.title,
      filters: options.filters,
    });
    
    res.json({ success: true, data: result });
  })
);

// Export leaves
router.post(
  '/export/leaves',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const options = exportSchema.parse(req.body);
    
    const dateRange = options.startDate && options.endDate
      ? { start: new Date(options.startDate), end: new Date(options.endDate) }
      : undefined;
    
    const result = await exportService.exportLeavesToExcel(tenantSlug, {
      format: options.format,
      title: options.title,
      filters: options.filters,
      dateRange,
    });
    
    res.json({ success: true, data: result });
  })
);

// Generate PDF report
router.post(
  '/export/pdf/:reportType',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const { reportType } = req.params;
    const options = exportSchema.parse(req.body);
    
    // Get data for the report
    let data: any;
    
    switch (reportType) {
      case 'overview':
        data = await analyticsService.getOverviewMetrics(tenantSlug);
        break;
      case 'attendance_summary':
        const overview = await analyticsService.getOverviewMetrics(tenantSlug);
        data = overview.attendance;
        break;
      case 'project_status':
        data = {
          projects: await analyticsService.getProjectProgressTrends(tenantSlug),
        };
        break;
      default:
        return res.status(400).json({ success: false, error: 'Unknown report type' });
    }
    
    const result = await exportService.generatePdfReport(tenantSlug, reportType, data, {
      format: 'pdf' as const,
      title: options.title,
      filters: options.filters,
    });
    
    res.json({ success: true, data: result });
  })
);

// Get export download URL
router.get(
  '/export/:id/download',
  asyncHandler(async (req: Request, res: Response) => {
    // Note: exportRecord model may not exist in the schema yet
    // This is a placeholder for future implementation
    const exportId = req.params.id;
    
    // For now, return a not implemented error
    return res.status(501).json({ 
      success: false, 
      error: 'Export download not yet implemented - exportRecord model pending' 
    });
  })
);

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

// Get dashboard with data
router.get(
  '/dashboard',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const dashboardId = req.query.id as string | undefined;
    
    const data = await dashboardService.getDashboardWithData(tenantSlug, dashboardId);
    
    res.json({ success: true, data });
  })
);

// List all dashboards
router.get(
  '/dashboards',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    
    const dashboards = await dashboardService.listDashboards(tenantSlug);
    
    res.json({ success: true, data: dashboards });
  })
);

// Create dashboard
router.post(
  '/dashboards',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const input = dashboardSchema.parse(req.body);
    
    const dashboard = await dashboardService.createDashboard(
      tenantSlug, 
      {
        name: input.name,
        description: input.description,
        widgets: input.widgets as dashboardService.Widget[] | undefined,
      }, 
      userId
    );
    
    res.status(201).json({ success: true, data: dashboard });
  })
);

// Update dashboard
router.patch(
  '/dashboards/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const input = dashboardSchema.partial().parse(req.body);
    
    const dashboard = await dashboardService.updateDashboard(
      tenantSlug,
      req.params.id,
      {
        name: input.name,
        description: input.description,
        widgets: input.widgets as dashboardService.Widget[] | undefined,
      }
    );
    
    res.json({ success: true, data: dashboard });
  })
);

// Delete dashboard
router.delete(
  '/dashboards/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    
    await dashboardService.deleteDashboard(tenantSlug, req.params.id);
    
    res.json({ success: true, message: 'Dashboard deleted' });
  })
);

// ============================================================================
// CHART ENDPOINTS
// ============================================================================

// Generate chart for widget
router.get(
  '/charts/:widgetId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const dashboardId = req.query.dashboardId as string | undefined;
    
    const chartResult = await dashboardService.generateWidgetChart(
      tenantSlug,
      req.params.widgetId,
      dashboardId
    );
    
    res.json(chartResult);
  })
);

// Generate custom chart
router.post(
  '/charts/generate',
  asyncHandler(async (req: Request, res: Response) => {
    const { type, data, title } = req.body;
    
    const chartResult = await chartService.chartService.generateChart(type, data, title);
    
    res.json(chartResult);
  })
);

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

// Clear analytics cache
router.post(
  '/cache/clear',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    
    analyticsService.clearCache(tenantSlug);
    
    res.json({ success: true, message: 'Cache cleared' });
  })
);

export default router;
