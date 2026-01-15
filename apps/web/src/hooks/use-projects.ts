import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, patch, del } from '@/lib/api/client';

// Project types
export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  clientName?: string;
  status: 'planning' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  endDate?: string;
  budget?: number;
  progress: number;
  managerId: string;
  manager?: { firstName: string; lastName: string };
  teamMembers?: { id: string; firstName: string; lastName: string }[];
  taskCount?: number;
  completedTasks?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFilters {
  search?: string;
  status?: string;
  priority?: string;
  managerId?: string;
  page?: number;
  limit?: number;
}

// Projects
export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => get<{ items: Project[]; total: number }>('/api/projects', filters),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => get<Project>(`/api/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Project>) => post<Project>('/api/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      put<Project>(`/api/projects/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Project members
export function useAddProjectMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, employeeId, role }: { projectId: string; employeeId: string; role: string }) =>
      post(`/api/projects/${projectId}/members`, { employeeId, role }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, memberId }: { projectId: string; memberId: string }) =>
      del(`/api/projects/${projectId}/members/${memberId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}

// Milestones
export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  completedAt?: string;
}

export function useProjectMilestones(projectId: string) {
  return useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: () => get<Milestone[]>(`/api/projects/${projectId}/milestones`),
    enabled: !!projectId,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Partial<Milestone> }) =>
      post<Milestone>(`/api/projects/${projectId}/milestones`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', variables.projectId] });
    },
  });
}
