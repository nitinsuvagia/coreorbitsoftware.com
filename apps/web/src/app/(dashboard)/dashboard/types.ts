// Dashboard Types
// Centralized type definitions for the dashboard page

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  attendanceRate: number;
  activeProjects: number;
  projectsDueThisWeek: number;
  pendingTasks: number;
  highPriorityTasks: number;
  pendingLeaveRequests: number;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  daysRemaining: number | null;
}

export interface DashboardLimits {
  maxUsers: number;
  maxProjects: number;
  maxStorageBytes: string;
  maxStorageGB: number;
}

export interface DashboardData {
  tenant: TenantInfo;
  stats: DashboardStats;
  limits: DashboardLimits;
  modules: Record<string, boolean> | null;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  loading?: boolean;
}

export interface AlertItem {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  icon?: React.ReactNode;
}
