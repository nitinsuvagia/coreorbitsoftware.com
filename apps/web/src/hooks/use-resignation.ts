import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch } from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

export interface Resignation {
  id: string;
  employee_id: string;
  status: ResignationStatus;

  // Activation
  activated_by: string;
  activated_at: string;
  activation_notes?: string;

  // Submission
  submitted_at?: string;
  resignation_reason?: string;
  personal_reason?: string;
  resignation_letter_url?: string;

  // Review & Approval
  reviewed_by?: string;
  reviewed_at?: string;
  hr_summary?: string;
  hr_notes?: string;
  last_working_date?: string;
  notice_period_days?: number;
  notice_period_start_date?: string;

  // Withdrawal/Cancellation
  withdrawn_at?: string;
  withdrawal_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;

  // Joined fields
  employee_name?: string;
  employee_code?: string;
  employee_email?: string;
  employee_avatar?: string;
  employee_status?: string;
  department_name?: string;
  designation_name?: string;
  activated_by_name?: string;
  reviewed_by_name?: string;

  created_at: string;
  updated_at: string;
}

export type ResignationStatus =
  | 'ACTIVATED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'WITHDRAWN'
  | 'CANCELLED';

export interface Offboarding {
  id: string;
  employee_id: string;
  resignation_id?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  started_by?: string;
  started_at?: string;
  completed_by?: string;
  completed_at?: string;
  completion_notes?: string;
  checklistItems: ChecklistItem[];

  // Joined fields
  employee_name?: string;
  employee_code?: string;
  employee_email?: string;
  employee_avatar?: string;
  employee_status?: string;
  department_name?: string;
  designation_name?: string;
  last_working_date?: string;
  resignation_reason?: string;
  hr_summary?: string;
  resignation_status?: string;
  started_by_name?: string;

  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  offboarding_id: string;
  category: string;
  title: string;
  description?: string;
  sort_order: number;
  status: 'PENDING' | 'COMPLETED' | 'NOT_APPLICABLE';
  completed_by?: string;
  completed_at?: string;
  completed_by_name?: string;
  notes?: string;
}

export interface ResignationStats {
  resignations: {
    activated_count: string;
    submitted_count: string;
    under_review_count: string;
    approved_count: string;
    active_count: string;
    withdrawn_count: string;
    cancelled_count: string;
    total_count: string;
    this_month_count: string;
  };
  offboardings: {
    in_progress_count: string;
    completed_count: string;
    completed_this_month: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ResignationFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// RESIGNATION HOOKS
// ============================================================================

export function useResignations(filters: ResignationFilters = {}) {
  return useQuery({
    queryKey: ['resignations', filters],
    queryFn: () => get<PaginatedResponse<Resignation>>('/api/v1/resignations', filters),
  });
}

export function useResignation(id: string) {
  return useQuery({
    queryKey: ['resignation', id],
    queryFn: () => get<Resignation>(`/api/v1/resignations/${id}`),
    enabled: !!id,
  });
}

export function useEmployeeResignation(employeeId: string) {
  return useQuery({
    queryKey: ['resignation', 'employee', employeeId],
    queryFn: () => get<Resignation | null>(`/api/v1/resignations/employee/${employeeId}`),
    enabled: !!employeeId,
  });
}

export function useResignationStats() {
  return useQuery({
    queryKey: ['resignation-stats'],
    queryFn: () => get<ResignationStats>('/api/v1/resignations/stats'),
  });
}

// Mutations

export function useActivateResignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeId: string; activationNotes?: string }) =>
      post<Resignation>('/api/v1/resignations/activate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignations'] });
      queryClient.invalidateQueries({ queryKey: ['resignation-stats'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useSubmitResignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: { resignationReason: string; personalReason?: string; resignationLetterUrl?: string };
    }) => post<Resignation>(`/api/v1/resignations/${id}/submit`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resignations'] });
      queryClient.invalidateQueries({ queryKey: ['resignation', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['resignation-stats'] });
    },
  });
}

export function useApproveResignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: { hrSummary: string; hrNotes?: string; lastWorkingDate: string; noticePeriodDays?: number };
    }) => post<Resignation>(`/api/v1/resignations/${id}/approve`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resignations'] });
      queryClient.invalidateQueries({ queryKey: ['resignation', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['resignation-stats'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useWithdrawResignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { withdrawalReason: string } }) =>
      post<Resignation>(`/api/v1/resignations/${id}/withdraw`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resignations'] });
      queryClient.invalidateQueries({ queryKey: ['resignation', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['resignation-stats'] });
    },
  });
}

export function useCancelResignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { cancellationReason: string } }) =>
      post<Resignation>(`/api/v1/resignations/${id}/cancel`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resignations'] });
      queryClient.invalidateQueries({ queryKey: ['resignation', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['resignation-stats'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

// ============================================================================
// OFFBOARDING HOOKS
// ============================================================================

export function useResignationOffboarding(resignationId: string) {
  return useQuery({
    queryKey: ['offboarding', 'resignation', resignationId],
    queryFn: () => get<Offboarding | null>(`/api/v1/resignations/${resignationId}/offboarding`),
    enabled: !!resignationId,
  });
}

export function useStartOffboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resignationId: string) =>
      post<Offboarding>(`/api/v1/resignations/${resignationId}/offboarding/start`),
    onSuccess: (_, resignationId) => {
      queryClient.invalidateQueries({ queryKey: ['offboarding', 'resignation', resignationId] });
      queryClient.invalidateQueries({ queryKey: ['resignation', resignationId] });
      queryClient.invalidateQueries({ queryKey: ['resignation-stats'] });
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: {
      itemId: string;
      data: { status: 'PENDING' | 'COMPLETED' | 'NOT_APPLICABLE'; notes?: string };
    }) => patch<ChecklistItem>(`/api/v1/resignations/offboarding/checklist/${itemId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offboarding'] });
    },
  });
}

export function useAddChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ offboardingId, data }: {
      offboardingId: string;
      data: { category: string; title: string; description?: string };
    }) => post<ChecklistItem>(`/api/v1/resignations/offboarding/${offboardingId}/checklist`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offboarding'] });
    },
  });
}

export function useCompleteOffboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ offboardingId, data }: {
      offboardingId: string;
      data: { completionNotes?: string };
    }) => post(`/api/v1/resignations/offboarding/${offboardingId}/complete`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offboarding'] });
      queryClient.invalidateQueries({ queryKey: ['resignations'] });
      queryClient.invalidateQueries({ queryKey: ['resignation-stats'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
