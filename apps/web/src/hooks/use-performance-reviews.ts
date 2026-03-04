/**
 * React Query hooks for Performance Reviews
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPerformanceReviews,
  getPerformanceReview,
  getPerformanceReviewStats,
  getEmployeePerformanceSummary,
  getEmployeeReviews,
  createPerformanceReview,
  updatePerformanceReview,
  deletePerformanceReview,
  acknowledgeReview,
  getPendingReviewsCount,
  type ReviewListParams,
  type CreateReviewInput,
  type UpdateReviewInput,
} from '@/lib/api/performance-reviews';
import { toast } from 'sonner';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function usePerformanceReviews(params?: ReviewListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['performance-reviews', params],
    queryFn: () => listPerformanceReviews(params),
    enabled: options?.enabled ?? true,
  });
}

export function usePerformanceReview(id: string) {
  return useQuery({
    queryKey: ['performance-review', id],
    queryFn: () => getPerformanceReview(id),
    enabled: !!id,
  });
}

export function usePerformanceReviewStats(enabled = true) {
  return useQuery({
    queryKey: ['performance-review-stats'],
    queryFn: getPerformanceReviewStats,
    enabled,
  });
}

export function useEmployeePerformanceSummary(employeeId: string) {
  return useQuery({
    queryKey: ['employee-performance-summary', employeeId],
    queryFn: () => getEmployeePerformanceSummary(employeeId),
    enabled: !!employeeId,
  });
}

export function useEmployeeReviews(employeeId: string) {
  return useQuery({
    queryKey: ['employee-reviews', employeeId],
    queryFn: () => getEmployeeReviews(employeeId),
    enabled: !!employeeId,
  });
}

export function usePendingReviewsCount() {
  return useQuery({
    queryKey: ['pending-reviews-count'],
    queryFn: getPendingReviewsCount,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreatePerformanceReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => createPerformanceReview(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['employee-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['employee-performance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['performance-review-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reviews-count'] });
      toast.success(data.message || 'Review created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create review');
    },
  });
}

export function useUpdatePerformanceReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateReviewInput }) => updatePerformanceReview(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['performance-review'] });
      queryClient.invalidateQueries({ queryKey: ['employee-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['employee-performance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['performance-review-stats'] });
      toast.success(data.message || 'Review updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update review');
    },
  });
}

export function useDeletePerformanceReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePerformanceReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['employee-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['employee-performance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['performance-review-stats'] });
      toast.success('Review deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete review');
    },
  });
}

export function useAcknowledgeReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acknowledgeReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['performance-review'] });
      queryClient.invalidateQueries({ queryKey: ['employee-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['performance-review-stats'] });
      toast.success('Review acknowledged');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to acknowledge review');
    },
  });
}
