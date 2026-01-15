import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, patch, del } from '@/lib/api/client';

// Task types
export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  project?: { name: string; code: string };
  parentTaskId?: string;
  assigneeId?: string;
  assignee?: { firstName: string; lastName: string };
  reporterId: string;
  reporter?: { firstName: string; lastName: string };
  status: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  search?: string;
  projectId?: string;
  assigneeId?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

// Tasks
export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => get<{ items: Task[]; total: number }>('/api/tasks', filters),
  });
}

export function useMyTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ['my-tasks', filters],
    queryFn: () => get<{ items: Task[]; total: number }>('/api/tasks/my', filters),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => get<Task>(`/api/tasks/${id}`),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Task>) => post<Task>('/api/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      put<Task>(`/api/tasks/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Task['status'] }) =>
      patch<Task>(`/api/tasks/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}

// Task comments
export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  author?: { firstName: string; lastName: string };
  content: string;
  createdAt: string;
  updatedAt: string;
}

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => get<TaskComment[]>(`/api/tasks/${taskId}/comments`),
    enabled: !!taskId,
  });
}

export function useCreateTaskComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      post<TaskComment>(`/api/tasks/${taskId}/comments`, { content }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
    },
  });
}

// Time entries
export interface TimeEntry {
  id: string;
  taskId: string;
  employeeId: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration: number;
  createdAt: string;
}

export function useTimeEntries(taskId: string) {
  return useQuery({
    queryKey: ['time-entries', taskId],
    queryFn: () => get<TimeEntry[]>(`/api/tasks/${taskId}/time-entries`),
    enabled: !!taskId,
  });
}

export function useLogTime() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<TimeEntry> }) =>
      post<TimeEntry>(`/api/tasks/${taskId}/time-entries`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
  });
}
