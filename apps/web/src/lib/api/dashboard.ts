/**
 * Dashboard API - Today's Schedule and Todos
 */

import { api } from './client';

// ============================================================================
// TYPES - Today's Schedule
// ============================================================================

export type ScheduleItemType = 'meeting' | 'interview' | 'leave' | 'holiday' | 'task' | 'event';

export interface ScheduleItem {
  id: string;
  type: ScheduleItemType;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
  location?: string;
  meetingUrl?: string;
  status?: string;
  priority?: string;
  metadata?: Record<string, any>;
}

export interface ScheduleSummary {
  total: number;
  meetings: number;
  interviews: number;
  events: number;
  leaves: number;
  holidays: number;
}

export interface TodayScheduleResponse {
  date: string;
  items: ScheduleItem[];
  summary: ScheduleSummary;
}

// ============================================================================
// TYPES - Todos
// ============================================================================

export type TodoPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TodoStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Todo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority: TodoPriority;
  status: TodoStatus;
  isCompleted: boolean;
  completedAt?: string;
  category?: string;
  tags: string[];
  reminder?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority?: TodoPriority;
  category?: string;
  tags?: string[];
  reminder?: string;
}

export interface UpdateTodoInput extends Partial<CreateTodoInput> {
  status?: TodoStatus;
  isCompleted?: boolean;
  order?: number;
}

export interface TodoFilters {
  status?: TodoStatus;
  priority?: TodoPriority;
  category?: string;
  completed?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TodosSummary {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
}

export interface TodosResponse {
  todos: Todo[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  summary: TodosSummary;
}

// ============================================================================
// API FUNCTIONS - Today's Schedule
// ============================================================================

/**
 * Get today's schedule for the current user
 * Aggregates data from CalendarEvent, Interview, LeaveRequest, and Holidays
 */
export async function getTodaySchedule(): Promise<TodayScheduleResponse> {
  try {
    const response = await api.get<{ success: boolean; data: TodayScheduleResponse }>(
      '/api/v1/employees/today-schedule'
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch today schedule:', error);
    // Return empty schedule on error
    return {
      date: new Date().toISOString().split('T')[0],
      items: [],
      summary: {
        total: 0,
        meetings: 0,
        interviews: 0,
        events: 0,
        leaves: 0,
        holidays: 0,
      },
    };
  }
}

// ============================================================================
// API FUNCTIONS - Todos
// ============================================================================

/**
 * Get all todos for the current user with optional filters
 */
export async function getTodos(filters?: TodoFilters): Promise<TodosResponse> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.completed !== undefined) params.append('completed', String(filters.completed));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.pageSize) params.append('pageSize', String(filters.pageSize));

    const response = await api.get<{ success: boolean; data: TodosResponse }>(
      `/api/v1/employees/todos?${params.toString()}`
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch todos:', error);
    return {
      todos: [],
      pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 },
      summary: { total: 0, pending: 0, completed: 0, overdue: 0 },
    };
  }
}

/**
 * Create a new todo
 */
export async function createTodo(input: CreateTodoInput): Promise<Todo | null> {
  try {
    const response = await api.post<{ success: boolean; data: Todo }>(
      '/api/v1/employees/todos',
      input
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to create todo:', error);
    throw error;
  }
}

/**
 * Update an existing todo
 */
export async function updateTodo(id: string, input: UpdateTodoInput): Promise<Todo | null> {
  try {
    const response = await api.put<{ success: boolean; data: Todo }>(
      `/api/v1/employees/todos/${id}`,
      input
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to update todo:', error);
    throw error;
  }
}

/**
 * Delete a todo
 */
export async function deleteTodo(id: string): Promise<boolean> {
  try {
    await api.delete(`/api/v1/employees/todos/${id}`);
    return true;
  } catch (error) {
    console.error('Failed to delete todo:', error);
    throw error;
  }
}

/**
 * Toggle todo completion status
 */
export async function toggleTodo(id: string): Promise<Todo | null> {
  try {
    const response = await api.patch<{ success: boolean; data: Todo }>(
      `/api/v1/employees/todos/${id}/toggle`
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to toggle todo:', error);
    throw error;
  }
}

// ============================================================================
// TYPES - Recent Activities
// ============================================================================

export type ActivityType = 
  | 'HIRE'
  | 'EXIT'
  | 'PROMOTION'
  | 'TRAINING'
  | 'LEAVE'
  | 'PERFORMANCE'
  | 'DOCUMENT'
  | 'GRIEVANCE'
  | 'INTERVIEW'
  | 'CANDIDATE'
  | 'ONBOARDING'
  | 'OFFBOARDING'
  | 'COMPLIANCE'
  | 'ATTENDANCE';

export interface Activity {
  id: string;
  type: ActivityType;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  userId?: string;
  userName?: string;
  details?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ============================================================================
// TYPES - Alerts
// ============================================================================

export type AlertType = 'warning' | 'error' | 'info' | 'success';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  priority: number;
  link?: string;
  createdAt: string;
}

// ============================================================================
// API FUNCTIONS - Recent Activities
// ============================================================================

/**
 * Get recent activities for the dashboard
 */
export async function getRecentActivities(limit: number = 10): Promise<Activity[]> {
  try {
    const response = await api.get<{ success: boolean; data: Activity[] }>(
      `/api/v1/organization/dashboard/activities?limit=${limit}`
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch recent activities:', error);
    return [];
  }
}

// ============================================================================
// API FUNCTIONS - Alerts
// ============================================================================

/**
 * Get alerts for the dashboard
 */
export async function getDashboardAlerts(): Promise<Alert[]> {
  try {
    const response = await api.get<{ success: boolean; data: Alert[] }>(
      '/api/v1/organization/dashboard/alerts'
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch dashboard alerts:', error);
    return [];
  }
}
