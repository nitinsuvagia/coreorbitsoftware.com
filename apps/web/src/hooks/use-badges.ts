/**
 * Badge hooks for React Query
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listBadges,
  getBadge,
  createBadge,
  updateBadge,
  deleteBadge,
  getBadgeStats,
  getBadgeLeaderboard,
  getEmployeeBadges,
  assignBadge,
  revokeBadge,
  type BadgeCategory,
  type CreateBadgeInput,
  type UpdateBadgeInput,
  type AssignBadgeInput,
} from '@/lib/api/badges';
import { toast } from 'sonner';

// ============================================================================
// QUERY KEYS
// ============================================================================

const badgeKeys = {
  all: ['badges'] as const,
  lists: () => [...badgeKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...badgeKeys.lists(), filters] as const,
  detail: (id: string) => [...badgeKeys.all, 'detail', id] as const,
  stats: () => [...badgeKeys.all, 'stats'] as const,
  leaderboard: () => [...badgeKeys.all, 'leaderboard'] as const,
  employee: (employeeId: string) => [...badgeKeys.all, 'employee', employeeId] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/** List all badge definitions */
export function useBadges(filters?: { search?: string; category?: BadgeCategory; isActive?: boolean }) {
  return useQuery({
    queryKey: badgeKeys.list(filters),
    queryFn: () => listBadges(filters),
    staleTime: 2 * 60 * 1000,
  });
}

/** Get a single badge */
export function useBadge(id: string) {
  return useQuery({
    queryKey: badgeKeys.detail(id),
    queryFn: () => getBadge(id),
    enabled: !!id,
  });
}

/** Get badge stats */
export function useBadgeStats() {
  return useQuery({
    queryKey: badgeKeys.stats(),
    queryFn: getBadgeStats,
    staleTime: 5 * 60 * 1000,
  });
}

/** Get badge leaderboard */
export function useBadgeLeaderboard(limit?: number) {
  return useQuery({
    queryKey: badgeKeys.leaderboard(),
    queryFn: () => getBadgeLeaderboard(limit),
    staleTime: 5 * 60 * 1000,
  });
}

/** Get badges for an employee */
export function useEmployeeBadges(employeeId: string) {
  return useQuery({
    queryKey: badgeKeys.employee(employeeId),
    queryFn: () => getEmployeeBadges(employeeId),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/** Create a new badge definition */
export function useCreateBadge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBadgeInput) => createBadge(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: badgeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: badgeKeys.stats() });
      toast.success('Badge created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create badge');
    },
  });
}

/** Update a badge definition */
export function useUpdateBadge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBadgeInput }) => updateBadge(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: badgeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: badgeKeys.detail(variables.id) });
      toast.success('Badge updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update badge');
    },
  });
}

/** Delete a badge definition */
export function useDeleteBadge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBadge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: badgeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: badgeKeys.stats() });
      toast.success('Badge deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete badge');
    },
  });
}

/** Assign a badge to an employee */
export function useAssignBadge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignBadgeInput) => assignBadge(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: badgeKeys.employee(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: badgeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: badgeKeys.stats() });
      queryClient.invalidateQueries({ queryKey: badgeKeys.leaderboard() });
      toast.success('Badge awarded successfully! 🏆');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign badge');
    },
  });
}

/** Revoke a badge from an employee */
export function useRevokeBadge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, employeeId }: { assignmentId: string; employeeId: string }) =>
      revokeBadge(assignmentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: badgeKeys.employee(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: badgeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: badgeKeys.stats() });
      queryClient.invalidateQueries({ queryKey: badgeKeys.leaderboard() });
      toast.success('Badge revoked');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to revoke badge');
    },
  });
}
