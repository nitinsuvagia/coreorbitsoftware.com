'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getEmployeeDashboardStats,
  type EmployeeDashboardData,
  type EmployeeAttendanceInfo,
  type EmployeeLeaveInfo,
  type EmployeeTasksInfo,
  type EmployeeProjectsInfo,
  type EmployeeInfo,
} from '@/lib/api/dashboard';

interface UseEmployeeDashboardReturn {
  data: EmployeeDashboardData | null;
  employee: EmployeeInfo | undefined;
  attendance: EmployeeAttendanceInfo | undefined;
  leave: EmployeeLeaveInfo | undefined;
  tasks: EmployeeTasksInfo | undefined;
  projects: EmployeeProjectsInfo | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEmployeeDashboard(): UseEmployeeDashboardReturn {
  const [data, setData] = useState<EmployeeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getEmployeeDashboardStats();
      if (result) {
        setData(result);
      } else {
        setError('Failed to load your dashboard data');
      }
    } catch (err: any) {
      console.error('Failed to fetch employee dashboard:', err);
      setError(err.response?.data?.error?.message || 'Failed to load your dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    employee: data?.employee,
    attendance: data?.attendance,
    leave: data?.leave,
    tasks: data?.tasks,
    projects: data?.projects,
    loading,
    error,
    refetch: fetchData,
  };
}
