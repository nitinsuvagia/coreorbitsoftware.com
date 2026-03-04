'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEmployeeSkills,
  addEmployeeSkill,
  addEmployeeSkillsBulk,
  updateEmployeeSkill,
  deleteEmployeeSkill,
  type EmployeeSkill,
  type CreateSkillInput,
  type UpdateSkillInput,
} from '@/lib/api/skills';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const skillKeys = {
  all: ['skills'] as const,
  lists: () => [...skillKeys.all, 'list'] as const,
  list: (employeeId: string) => [...skillKeys.lists(), employeeId] as const,
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch skills for an employee
 */
export function useEmployeeSkills(employeeId: string | undefined) {
  return useQuery({
    queryKey: skillKeys.list(employeeId || ''),
    queryFn: () => getEmployeeSkills(employeeId!),
    enabled: !!employeeId,
  });
}

/**
 * Add a single skill
 */
export function useAddSkill(employeeId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: CreateSkillInput) => addEmployeeSkill(employeeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.list(employeeId) });
    },
  });
}

/**
 * Add multiple skills at once
 */
export function useAddSkillsBulk(employeeId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (skills: CreateSkillInput[]) => addEmployeeSkillsBulk(employeeId, skills),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.list(employeeId) });
    },
  });
}

/**
 * Update an existing skill
 */
export function useUpdateSkill(employeeId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ skillId, input }: { skillId: string; input: UpdateSkillInput }) => 
      updateEmployeeSkill(employeeId, skillId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.list(employeeId) });
    },
  });
}

/**
 * Delete a skill
 */
export function useDeleteSkill(employeeId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (skillId: string) => deleteEmployeeSkill(employeeId, skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.list(employeeId) });
    },
  });
}

// Re-export types for convenience
export type { EmployeeSkill, CreateSkillInput, UpdateSkillInput };
export { SKILL_CATEGORIES, SKILL_SUGGESTIONS, type SkillLevel } from '@/lib/api/skills';
