/**
 * Holiday hooks for managing company holidays
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, api } from '@/lib/api/client';

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
      const result = await get<Holiday[]>('/api/v1/holidays', params);
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
      const result = await get<Holiday[]>(`/api/v1/holidays/upcoming?limit=${limit}`);
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
      const result = await get<HolidayStats>(`/api/v1/holidays/stats?year=${currentYear}`);
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
      const result = await get<Holiday>(`/api/v1/holidays/${id}`);
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
      post<{ data: Holiday; message: string }>('/api/v1/holidays', data),
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
      post<{ data: Holiday[]; message: string }>('/api/v1/holidays/bulk', { holidays }),
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
      put<{ data: Holiday; message: string }>(`/api/v1/holidays/${id}`, data),
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
    mutationFn: (id: string) => del<{ message: string }>(`/api/v1/holidays/${id}`),
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
      '/api/v1/holidays/working-days',
      params
    ),
    enabled: !!fromDate && !!toDate,
  });
}

// ============================================================================
// IMPORT TYPES & HOOKS
// ============================================================================

export interface HolidayImportPreview {
  total: number;
  valid: number;
  duplicates: number;
  invalid: number;
  preview: CreateHolidayInput[];
  duplicateDetails: { holiday: CreateHolidayInput; existingHoliday: string }[];
  invalidDetails: { row: number; data: any; message: string }[];
}

export interface HolidayImportResult {
  created: number;
  skipped: number;
  invalid: number;
  duplicates: { holiday: CreateHolidayInput; existingHoliday: string }[];
  invalidDetails: { row: number; data: any; message: string }[];
}

/**
 * Preview holiday import from Excel file
 */
export function usePreviewHolidayImport() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/api/v1/holidays/import/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data.data as HolidayImportPreview;
    },
  });
}

/**
 * Import holidays from Excel file
 */
export function useImportHolidays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, skipDuplicates }: { file: File; skipDuplicates?: boolean }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (skipDuplicates) {
        formData.append('skipDuplicates', 'true');
      }
      
      const response = await api.post('/api/v1/holidays/import/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data.data as HolidayImportResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}

/**
 * Download sample import template
 */
export async function downloadHolidayImportTemplate() {
  const response = await api.get('/api/v1/holidays/import/sample', {
    responseType: 'blob',
  });
  
  const blob = new Blob([response.data], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'holiday-import-template.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ============================================================================
// AI HOLIDAY GENERATION TYPES & HOOKS
// ============================================================================

export interface Country {
  code: string;
  name: string;
}

export interface AIGeneratedHoliday {
  name: string;
  date: string;
  type: 'public' | 'optional' | 'restricted';
  description?: string;
}

export interface AIHolidayStatusResponse {
  configured: boolean;
}

export interface AIHolidayCountriesResponse {
  countries: Country[];
}

export interface AIHolidayGenerateResponse {
  holidays: AIGeneratedHoliday[];
  country: string;
  year: number;
}

export interface AIHolidayImportResponse {
  created: number;
  skipped: number;
  total: number;
}

/**
 * Check if AI is configured (OpenAI integration)
 * Now uses centralized AI service
 */
export function useAIHolidayStatus() {
  return useQuery({
    queryKey: ['ai', 'status'],
    queryFn: async () => {
      const result = await get<{ aiEnabled: boolean; configured: boolean; message: string }>('/api/v1/ai/status');
      return { configured: result.configured || result.aiEnabled };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Get list of countries for AI holiday generation
 * Now uses centralized AI service
 */
export function useAIHolidayCountries() {
  return useQuery({
    queryKey: ['ai', 'holidays', 'countries'],
    queryFn: async () => {
      const result = await get<AIHolidayCountriesResponse>('/api/v1/ai/holidays/countries');
      return result;
    },
    staleTime: 60 * 60 * 1000, // Cache for 1 hour (countries don't change)
  });
}

/**
 * Generate holidays using AI for a specific country and year
 * Now uses centralized AI service
 */
export function useGenerateAIHolidays() {
  return useMutation({
    mutationFn: async ({ country, year, includeOptional }: { country: string; year: number; includeOptional?: boolean }) => {
      const result = await post<AIHolidayGenerateResponse>('/api/v1/ai/holidays/generate', {
        country,
        year,
        includeOptional: includeOptional ?? true,
      });
      return result;
    },
  });
}

/**
 * Import AI-generated holidays
 * Still uses attendance service to create holidays in the database
 */
export function useImportAIHolidays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holidays: AIGeneratedHoliday[]) => {
      const result = await post<AIHolidayImportResponse>('/api/v1/holidays/ai/import', {
        holidays,
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}

