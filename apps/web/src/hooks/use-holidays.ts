/**
 * Holiday hooks for managing company holidays
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'public' | 'optional' | 'restricted';
  description?: string;
  isRecurring: boolean;
  appliesToAll: boolean;
  departmentIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateHolidayInput {
  name: string;
  date: string;
  type: 'public' | 'optional' | 'restricted';
  description?: string;
  isRecurring?: boolean;
  appliesToAll?: boolean;
  departmentIds?: string[];
}

export interface UpdateHolidayInput {
  name?: string;
  date?: string;
  type?: 'public' | 'optional' | 'restricted';
  description?: string;
  isRecurring?: boolean;
  appliesToAll?: boolean;
  departmentIds?: string[];
}

export interface HolidayFilters {
  year?: number;
  type?: 'public' | 'optional' | 'restricted';
  departmentId?: string;
  month?: number;
}

export interface HolidayStats {
  totalHolidays: number;
  publicHolidays: number;
  optionalHolidays: number;
  restrictedHolidays: number;
  upcomingCount: number;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get all holidays with optional filters
 */
export function useHolidays(filters: HolidayFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.year) params.year = filters.year.toString();
  if (filters.type) params.type = filters.type;
  if (filters.departmentId) params.departmentId = filters.departmentId;
  if (filters.month) params.month = filters.month.toString();

  return useQuery({
    queryKey: ['holidays', filters],
    queryFn: async () => {
      const result = await get<Holiday[]>('/api/v1/attendance/holidays', params);
      // The get function returns response.data.data, so result is the Holiday[] array
      // Wrap it in { data: ... } for consistency with the component
      return { data: result };
    },
  });
}

/**
 * Get upcoming holidays
 */
export function useUpcomingHolidays(limit: number = 5) {
  return useQuery({
    queryKey: ['holidays', 'upcoming', limit],
    queryFn: async () => {
      const result = await get<Holiday[]>(`/api/v1/attendance/holidays/upcoming?limit=${limit}`);
      return { data: result };
    },
  });
}

/**
 * Get holiday stats for a year
 */
export function useHolidayStats(year?: number) {
  const currentYear = year || new Date().getFullYear();
  return useQuery({
    queryKey: ['holidays', 'stats', currentYear],
    queryFn: async () => {
      const result = await get<HolidayStats>(`/api/v1/attendance/holidays/stats?year=${currentYear}`);
      return { data: result };
    },
  });
}

/**
 * Get a single holiday
 */
export function useHoliday(id: string) {
  return useQuery({
    queryKey: ['holidays', id],
    queryFn: async () => {
      const result = await get<Holiday>(`/api/v1/attendance/holidays/${id}`);
      return { data: result };
    },
    enabled: !!id,
  });
}

/**
 * Create a holiday
 */
export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHolidayInput) =>
      post<{ data: Holiday; message: string }>('/api/v1/attendance/holidays', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}

/**
 * Bulk create holidays
 */
export function useBulkCreateHolidays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (holidays: CreateHolidayInput[]) =>
      post<{ data: Holiday[]; message: string }>('/api/v1/attendance/holidays/bulk', { holidays }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}

/**
 * Update a holiday
 */
export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHolidayInput }) =>
      put<{ data: Holiday; message: string }>(`/api/v1/attendance/holidays/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}

/**
 * Delete a holiday
 */
export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => del<{ message: string }>(`/api/v1/attendance/holidays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}

/**
 * Get working days in a date range (excludes holidays and weekends)
 */
export function useWorkingDays(fromDate: string, toDate: string, departmentId?: string) {
  const params: Record<string, string> = { fromDate, toDate };
  if (departmentId) params.departmentId = departmentId;

  return useQuery({
    queryKey: ['holidays', 'working-days', fromDate, toDate, departmentId],
    queryFn: () => get<{ data: { workingDays: number; totalDays: number; holidays: number; weekends: number } }>(
      '/api/v1/attendance/holidays/working-days',
      params
    ),
    enabled: !!fromDate && !!toDate,
  });
}
