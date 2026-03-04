/**
 * Badges API client
 */
import { get, post, put, del } from './client';

// ============================================================================
// TYPES
// ============================================================================

export type BadgeCategory =
  | 'PERFORMANCE'
  | 'ATTENDANCE'
  | 'TEAMWORK'
  | 'LEADERSHIP'
  | 'INNOVATION'
  | 'LEARNING'
  | 'MILESTONE'
  | 'SPECIAL';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  category: BadgeCategory;
  points: number;
  is_active: boolean;
  times_awarded: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeBadge {
  assignment_id: string;
  employee_id: string;
  given_by: string;
  given_by_name: string;
  reason: string | null;
  given_at: string;
  badge_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  category: BadgeCategory;
  points: number;
}

export interface BadgeStats {
  total_badges: number;
  total_assignments: number;
  employees_with_badges: number;
  unique_givers: number;
}

export interface LeaderboardEntry {
  employee_id: string;
  badge_count: number;
  total_points: number;
  badge_names: string[];
}

export interface CreateBadgeInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category: BadgeCategory;
  points?: number;
  isActive?: boolean;
}

export interface UpdateBadgeInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: BadgeCategory;
  points?: number;
  isActive?: boolean;
}

export interface AssignBadgeInput {
  employeeId: string;
  badgeId: string;
  reason?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const BASE = '/api/v1/badges';

/** List all badge definitions */
export async function listBadges(filters?: {
  search?: string;
  category?: BadgeCategory;
  isActive?: boolean;
}): Promise<BadgeDefinition[]> {
  return get<BadgeDefinition[]>(BASE, filters);
}

/** Get a single badge definition */
export async function getBadge(id: string): Promise<BadgeDefinition> {
  return get<BadgeDefinition>(`${BASE}/${id}`);
}

/** Create a badge definition */
export async function createBadge(input: CreateBadgeInput): Promise<BadgeDefinition> {
  return post<BadgeDefinition>(BASE, input);
}

/** Update a badge definition */
export async function updateBadge(id: string, input: UpdateBadgeInput): Promise<BadgeDefinition> {
  return put<BadgeDefinition>(`${BASE}/${id}`, input);
}

/** Delete a badge definition */
export async function deleteBadge(id: string): Promise<void> {
  return del<void>(`${BASE}/${id}`);
}

/** Get badge statistics */
export async function getBadgeStats(): Promise<BadgeStats> {
  return get<BadgeStats>(`${BASE}/stats`);
}

/** Get badge leaderboard */
export async function getBadgeLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
  return get<LeaderboardEntry[]>(`${BASE}/leaderboard`, limit ? { limit } : undefined);
}

/** Get badges for a specific employee */
export async function getEmployeeBadges(employeeId: string): Promise<EmployeeBadge[]> {
  return get<EmployeeBadge[]>(`${BASE}/employee/${employeeId}`);
}

/** Assign a badge to an employee */
export async function assignBadge(input: AssignBadgeInput): Promise<any> {
  return post<any>(`${BASE}/assign`, input);
}

/** Revoke (remove) a badge assignment */
export async function revokeBadge(assignmentId: string): Promise<void> {
  return del<void>(`${BASE}/assignments/${assignmentId}`);
}

/** Seed default badges */
export async function seedBadges(): Promise<{ created?: number; existingCount?: number }> {
  return post<{ created?: number; existingCount?: number }>(`${BASE}/seed`, {});
}
