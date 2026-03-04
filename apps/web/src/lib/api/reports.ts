/**
 * Reports API - Analytics and report export functions
 */

import { api } from './client';

// ============================================================================
// TYPES - Overview Metrics
// ============================================================================

export interface EmployeeMetrics {
  total: number;
  active: number;
  onLeave: number;
  newThisMonth: number;
}

export interface AttendanceMetrics {
  presentToday: number;
  absentToday: number;
  onTimePercentage: number;
  avgWorkHours: number;
}

export interface ProjectMetrics {
  total: number;
  active: number;
  completed: number;
  overdue: number;
}

export interface TaskMetrics {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}

export interface OverviewMetrics {
  employees: EmployeeMetrics;
  attendance: AttendanceMetrics;
  projects: ProjectMetrics;
  tasks: TaskMetrics;
}

// ============================================================================
// TYPES - Trend Data
// ============================================================================

export interface TrendDataset {
  label: string;
  data: number[];
}

export interface TrendData {
  labels: string[];
  datasets: TrendDataset[];
}

// ============================================================================
// TYPES - Work Hours Analytics
// ============================================================================

export interface TopPerformer {
  employeeId: string;
  name: string;
  hours: number;
}

export interface WorkHoursAnalytics {
  totalHours: number;
  avgHoursPerDay: number;
  avgHoursPerEmployee: number;
  topPerformers: TopPerformer[];
}

// ============================================================================
// TYPES - Leave Analytics
// ============================================================================

export interface LeaveByType {
  type: string;
  count: number;
}

export interface LeaveAnalytics {
  totalLeaves: number;
  leavesByType: LeaveByType[];
  leavesByMonth: TrendData;
}

// ============================================================================
// TYPES - Export
// ============================================================================

export type ExportFormat = 'excel' | 'pdf' | 'csv';
export type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface ExportOptions {
  format: ExportFormat;
  title?: string;
  startDate?: string;
  endDate?: string;
  filters?: Record<string, any>;
}

export interface ExportResult {
  id: string;
  filename: string;
  format: ExportFormat;
  size: number;
  downloadUrl: string;
  expiresAt: string;
}

// ============================================================================
// API FUNCTIONS - Analytics
// ============================================================================

/**
 * Get overview metrics for dashboard
 */
export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  const response = await api.get('/api/v1/reports/analytics/overview');
  return response.data.data;
}

/**
 * Get attendance trends
 */
export async function getAttendanceTrends(period: ReportPeriod = 'month'): Promise<TrendData> {
  const response = await api.get('/api/v1/reports/analytics/attendance/trends', {
    params: { period },
  });
  return response.data.data;
}

/**
 * Get project progress trends
 */
export async function getProjectProgressTrends(period: ReportPeriod = 'month'): Promise<TrendData> {
  const response = await api.get('/api/v1/reports/analytics/projects/progress', {
    params: { period },
  });
  return response.data.data;
}

/**
 * Get task completion trends
 */
export async function getTaskCompletionTrends(period: ReportPeriod = 'month'): Promise<TrendData> {
  const response = await api.get('/api/v1/reports/analytics/tasks/completion', {
    params: { period },
  });
  return response.data.data;
}

/**
 * Get task status distribution
 */
export async function getTaskStatusDistribution(): Promise<TrendData> {
  const response = await api.get('/api/v1/reports/analytics/tasks/status');
  return response.data.data;
}

/**
 * Get employee distribution by department
 */
export async function getEmployeeDistribution(): Promise<TrendData> {
  const response = await api.get('/api/v1/reports/analytics/employees/distribution');
  return response.data.data;
}

/**
 * Get work hours analytics with top performers
 */
export async function getWorkHoursAnalytics(period: ReportPeriod = 'month'): Promise<WorkHoursAnalytics> {
  const response = await api.get('/api/v1/reports/analytics/work-hours', {
    params: { period },
  });
  return response.data.data;
}

/**
 * Get leave analytics
 */
export async function getLeaveAnalytics(period: ReportPeriod = 'year'): Promise<LeaveAnalytics> {
  const response = await api.get('/api/v1/reports/analytics/leaves', {
    params: { period },
  });
  return response.data.data;
}

// ============================================================================
// API FUNCTIONS - Export
// ============================================================================

/**
 * Export employees report
 */
export async function exportEmployees(options: ExportOptions): Promise<ExportResult> {
  const response = await api.post('/api/v1/reports/export/employees', options);
  return response.data.data;
}

/**
 * Export attendance report
 */
export async function exportAttendance(options: ExportOptions): Promise<ExportResult> {
  const response = await api.post('/api/v1/reports/export/attendance', options);
  return response.data.data;
}

/**
 * Export projects report
 */
export async function exportProjects(options: ExportOptions): Promise<ExportResult> {
  const response = await api.post('/api/v1/reports/export/projects', options);
  return response.data.data;
}

/**
 * Export tasks report
 */
export async function exportTasks(options: ExportOptions): Promise<ExportResult> {
  const response = await api.post('/api/v1/reports/export/tasks', options);
  return response.data.data;
}

/**
 * Export leaves report
 */
export async function exportLeaves(options: ExportOptions): Promise<ExportResult> {
  const response = await api.post('/api/v1/reports/export/leaves', options);
  return response.data.data;
}

/**
 * Generate PDF report
 */
export async function generatePdfReport(
  reportType: 'overview' | 'attendance_summary' | 'project_status',
  options?: Omit<ExportOptions, 'format'>
): Promise<ExportResult> {
  const response = await api.post(`/api/v1/reports/export/pdf/${reportType}`, {
    ...options,
    format: 'pdf',
  });
  return response.data.data;
}

/**
 * Clear analytics cache
 */
export async function clearAnalyticsCache(): Promise<void> {
  await api.post('/api/v1/reports/cache/clear');
}
