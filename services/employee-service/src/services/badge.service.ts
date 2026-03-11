/**
 * Badge Service - CRUD operations for badges and badge assignments
 */

import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

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

export interface BadgeFilters {
  search?: string;
  category?: BadgeCategory;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface EmployeeBadgeFilters {
  employeeId?: string;
  badgeId?: string;
  givenBy?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// BADGE DEFINITION CRUD
// ============================================================================

/**
 * Create a new badge definition
 */
export async function createBadge(
  prisma: PrismaClient,
  input: CreateBadgeInput,
  userId: string
): Promise<any> {
  const id = uuidv4();

  const badge = await (prisma as any).$queryRaw`
    INSERT INTO badges (id, name, description, icon, color, category, points, is_active, created_by, created_at, updated_at)
    VALUES (
      ${id},
      ${input.name},
      ${input.description || null},
      ${input.icon || 'Award'},
      ${input.color || 'bg-blue-500'},
      ${input.category}::"BadgeCategory",
      ${input.points || 10},
      ${input.isActive !== false},
      ${userId},
      NOW(),
      NOW()
    )
    RETURNING *
  `;

  logger.info({ badgeId: id, name: input.name }, 'Badge created');
  return Array.isArray(badge) ? badge[0] : badge;
}

/**
 * Update a badge definition
 */
export async function updateBadge(
  prisma: PrismaClient,
  id: string,
  input: UpdateBadgeInput
): Promise<any> {
  // Build dynamic SET clause
  const setClauses: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) { setClauses.push('name'); values.push(input.name); }
  if (input.description !== undefined) { setClauses.push('description'); values.push(input.description); }
  if (input.icon !== undefined) { setClauses.push('icon'); values.push(input.icon); }
  if (input.color !== undefined) { setClauses.push('color'); values.push(input.color); }
  if (input.points !== undefined) { setClauses.push('points'); values.push(input.points); }
  if (input.isActive !== undefined) { setClauses.push('is_active'); values.push(input.isActive); }

  if (setClauses.length === 0 && !input.category) {
    // Nothing to update, just return existing
    const existing = await getBadgeById(prisma, id);
    return existing;
  }

  // Use raw query for dynamic update
  let query = 'UPDATE badges SET updated_at = NOW()';
  
  if (input.name !== undefined) query += `, name = '${input.name.replace(/'/g, "''")}'`;
  if (input.description !== undefined) query += `, description = '${(input.description || '').replace(/'/g, "''")}'`;
  if (input.icon !== undefined) query += `, icon = '${input.icon.replace(/'/g, "''")}'`;
  if (input.color !== undefined) query += `, color = '${input.color.replace(/'/g, "''")}'`;
  if (input.category !== undefined) query += `, category = '${input.category}'::"BadgeCategory"`;
  if (input.points !== undefined) query += `, points = ${Number(input.points)}`;
  if (input.isActive !== undefined) query += `, is_active = ${input.isActive}`;

  query += ` WHERE id = '${id}' RETURNING *`;

  const result = await (prisma as any).$queryRawUnsafe(query);
  
  logger.info({ badgeId: id }, 'Badge updated');
  return Array.isArray(result) ? result[0] : result;
}

/**
 * Get a badge by ID
 */
export async function getBadgeById(
  prisma: PrismaClient,
  id: string
): Promise<any> {
  const result = await (prisma as any).$queryRaw`
    SELECT b.*, 
      (SELECT COUNT(*) FROM employee_badges eb WHERE eb.badge_id = b.id)::int as times_awarded
    FROM badges b
    WHERE b.id = ${id}
  `;
  return Array.isArray(result) ? result[0] : result;
}

/**
 * List all badge definitions with optional filters
 */
export async function listBadges(
  prisma: PrismaClient,
  filters: BadgeFilters = {}
): Promise<{ data: any[]; total: number }> {
  const { search, category, isActive, page = 1, pageSize = 50 } = filters;
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE 1=1';
  if (search) {
    whereClause += ` AND (b.name ILIKE '%${search.replace(/'/g, "''")}%' OR b.description ILIKE '%${search.replace(/'/g, "''")}%')`;
  }
  if (category) {
    whereClause += ` AND b.category = '${category}'::"BadgeCategory"`;
  }
  if (isActive !== undefined) {
    whereClause += ` AND b.is_active = ${isActive}`;
  }

  const countQuery = `SELECT COUNT(*)::int as count FROM badges b ${whereClause}`;
  const countResult = await (prisma as any).$queryRawUnsafe(countQuery);
  const total = countResult[0]?.count || 0;

  const dataQuery = `
    SELECT b.*, 
      (SELECT COUNT(*) FROM employee_badges eb WHERE eb.badge_id = b.id)::int as times_awarded
    FROM badges b
    ${whereClause}
    ORDER BY b.category, b.name
    LIMIT ${pageSize} OFFSET ${offset}
  `;
  const data = await (prisma as any).$queryRawUnsafe(dataQuery);

  return { data: Array.isArray(data) ? data : [], total };
}

/**
 * Delete a badge definition
 */
export async function deleteBadge(
  prisma: PrismaClient,
  id: string
): Promise<void> {
  await (prisma as any).$queryRaw`DELETE FROM badges WHERE id = ${id}`;
  logger.info({ badgeId: id }, 'Badge deleted');
}

// ============================================================================
// BADGE ASSIGNMENT OPERATIONS
// ============================================================================

/**
 * Assign a badge to an employee
 */
export async function assignBadge(
  prisma: PrismaClient,
  input: AssignBadgeInput,
  givenByUserId: string,
  givenByName: string
): Promise<any> {
  const id = uuidv4();

  // Verify badge exists and is active
  const badge = await getBadgeById(prisma, input.badgeId);
  if (!badge) {
    throw new Error('Badge not found');
  }
  if (!badge.is_active) {
    throw new Error('Badge is not active');
  }

  const result = await (prisma as any).$queryRaw`
    INSERT INTO employee_badges (id, employee_id, badge_id, given_by, given_by_name, reason, given_at, created_at)
    VALUES (
      ${id},
      ${input.employeeId},
      ${input.badgeId},
      ${givenByUserId},
      ${givenByName},
      ${input.reason || null},
      NOW(),
      NOW()
    )
    RETURNING *
  `;

  const assignment = Array.isArray(result) ? result[0] : result;

  logger.info({
    assignmentId: id,
    employeeId: input.employeeId,
    badgeId: input.badgeId,
    givenBy: givenByUserId,
  }, 'Badge assigned to employee');

  return {
    ...assignment,
    badge,
  };
}

/**
 * Remove a badge from an employee
 */
export async function revokeBadge(
  prisma: PrismaClient,
  assignmentId: string
): Promise<void> {
  await (prisma as any).$queryRaw`
    DELETE FROM employee_badges WHERE id = ${assignmentId}
  `;
  logger.info({ assignmentId }, 'Badge revoked from employee');
}

/**
 * Get all badges for an employee with badge details
 */
export async function getEmployeeBadges(
  prisma: PrismaClient,
  employeeId: string
): Promise<any[]> {
  const result = await (prisma as any).$queryRaw`
    SELECT 
      eb.id as assignment_id,
      eb.employee_id,
      eb.given_by,
      eb.given_by_name,
      eb.reason,
      eb.given_at,
      b.id as badge_id,
      b.name,
      b.description,
      b.icon,
      b.color,
      b.category,
      b.points
    FROM employee_badges eb
    JOIN badges b ON b.id = eb.badge_id
    WHERE eb.employee_id = ${employeeId}
    ORDER BY eb.given_at DESC
  `;
  return Array.isArray(result) ? result : [];
}

/**
 * Get badge leaderboard - employees ranked by total badge points
 */
export async function getBadgeLeaderboard(
  prisma: PrismaClient,
  limit: number = 10
): Promise<any[]> {
  const result = await (prisma as any).$queryRaw`
    SELECT 
      eb.employee_id,
      COUNT(eb.id)::int as badge_count,
      COALESCE(SUM(b.points), 0)::int as total_points,
      ARRAY_AGG(DISTINCT b.name) as badge_names
    FROM employee_badges eb
    JOIN badges b ON b.id = eb.badge_id
    GROUP BY eb.employee_id
    ORDER BY total_points DESC, badge_count DESC
    LIMIT ${limit}
  `;
  return Array.isArray(result) ? result : [];
}

/**
 * Get badge statistics
 */
export async function getBadgeStats(
  prisma: PrismaClient
): Promise<any> {
  const result = await (prisma as any).$queryRaw`
    SELECT 
      (SELECT COUNT(*)::int FROM badges WHERE is_active = true) as total_badges,
      (SELECT COUNT(*)::int FROM employee_badges) as total_assignments,
      (SELECT COUNT(DISTINCT employee_id)::int FROM employee_badges) as employees_with_badges,
      (SELECT COUNT(DISTINCT given_by)::int FROM employee_badges) as unique_givers
  `;
  return Array.isArray(result) ? result[0] : result;
}
