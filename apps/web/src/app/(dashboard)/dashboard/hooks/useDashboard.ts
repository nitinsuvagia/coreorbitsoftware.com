'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import type { DashboardData, DashboardStats, TenantInfo, DashboardLimits } from '../types';

interface UseDashboardReturn {
  data: DashboardData | null;
  stats: DashboardStats | undefined;
  tenant: TenantInfo | undefined;
  limits: DashboardLimits | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/v1/organization/dashboard');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    data,
    stats: data?.stats,
    tenant: data?.tenant,
    limits: data?.limits,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}
