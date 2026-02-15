/**
 * Department Service - CRUD operations for departments and teams
 */

import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateDepartmentInput {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  managerId?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  description?: string;
  parentId?: string | null;
  managerId?: string | null;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CreateTeamInput {
  name: string;
  code: string;
  description?: string;
  departmentId: string;
  leadId?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateTeamInput {
  name?: string;
  code?: string;
  description?: string;
  departmentId?: string;
  leadId?: string | null;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface DepartmentFilters {
  search?: string;
  isActive?: boolean;
  parentId?: string | null;
  page?: number;
  pageSize?: number;
}

export interface TeamFilters {
  search?: string;
  isActive?: boolean;
  departmentId?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// DEPARTMENT OPERATIONS
// ============================================================================

/**
 * Create a new department
 */
export async function createDepartment(
  prisma: PrismaClient,
  input: CreateDepartmentInput,
  userId: string
): Promise<any> {
  const id = uuidv4();
  
  // Check for duplicate code
  const existing = await prisma.department.findFirst({
    where: { code: input.code },
  });
  
  if (existing) {
    throw new Error(`Department with code '${input.code}' already exists`);
  }
  
  // Validate parent exists if provided
  if (input.parentId) {
    const parent = await prisma.department.findUnique({
      where: { id: input.parentId },
    });
    
    if (!parent) {
      throw new Error('Parent department not found');
    }
  }
  
  const department = await prisma.department.create({
    data: {
      id,
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
      parentId: input.parentId,
      managerId: input.managerId,
      isActive: input.isActive ?? true,
      metadata: input.metadata || {},
    },
    include: {
      parent: true,
      manager: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      _count: {
        select: { employees: true, children: true, teams: true },
      },
    },
  });
  
  logger.info({ departmentId: id, code: input.code }, 'Department created');
  
  return department;
}

/**
 * Get department by ID
 */
export async function getDepartmentById(
  prisma: PrismaClient,
  id: string
): Promise<any> {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      parent: true,
      children: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
      },
      manager: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      teams: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
      },
      _count: {
        select: { employees: true, children: true, teams: true },
      },
    },
  });
  
  if (!department) {
    throw new Error('Department not found');
  }
  
  return department;
}

/**
 * List departments with filtering
 */
export async function listDepartments(
  prisma: PrismaClient,
  filters: DepartmentFilters
): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const page = filters.page || 1;
  const pageSize = Math.min(filters.pageSize || 20, 1000);
  const skip = (page - 1) * pageSize;
  
  const where: any = {};
  
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { code: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  
  if (filters.parentId !== undefined) {
    where.parentId = filters.parentId;
  }
  
  const [data, total] = await Promise.all([
    prisma.department.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        manager: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: {
          select: { employees: true, children: true, teams: true },
        },
      },
    }),
    prisma.department.count({ where }),
  ]);
  
  return { data, total, page, pageSize };
}

/**
 * Update department
 */
export async function updateDepartment(
  prisma: PrismaClient,
  id: string,
  input: UpdateDepartmentInput,
  userId: string
): Promise<any> {
  // Check department exists
  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Department not found');
  }
  
  // Check code uniqueness if changing
  if (input.code && input.code !== existing.code) {
    const duplicate = await prisma.department.findFirst({
      where: { code: input.code, id: { not: id } },
    });
    if (duplicate) {
      throw new Error(`Department with code '${input.code}' already exists`);
    }
  }
  
  // Prevent circular parent reference
  if (input.parentId === id) {
    throw new Error('Department cannot be its own parent');
  }
  
  const department = await prisma.department.update({
    where: { id },
    data: {
      ...input,
      code: input.code?.toUpperCase(),
      updatedAt: new Date(),
    },
    include: {
      parent: true,
      manager: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      _count: {
        select: { employees: true, children: true, teams: true },
      },
    },
  });
  
  logger.info({ departmentId: id }, 'Department updated');
  
  return department;
}

/**
 * Delete department (soft delete)
 */
export async function deleteDepartment(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      _count: { select: { employees: true, children: true } },
    },
  });
  
  if (!department) {
    throw new Error('Department not found');
  }
  
  if (department._count.employees > 0) {
    throw new Error('Cannot delete department with active employees');
  }
  
  if (department._count.children > 0) {
    throw new Error('Cannot delete department with sub-departments');
  }
  
  await prisma.department.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });
  
  logger.info({ departmentId: id }, 'Department deleted');
}

/**
 * Permanently delete department (only if no transactional data exists)
 */
export async function permanentlyDeleteDepartment(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      _count: { select: { employees: true, children: true, teams: true } },
    },
  });
  
  if (!department) {
    throw new Error('Department not found');
  }
  
  if (department._count.employees > 0) {
    throw new Error('Cannot permanently delete department with employees. Reassign employees first.');
  }
  
  if (department._count.children > 0) {
    throw new Error('Cannot permanently delete department with sub-departments');
  }
  
  if (department._count.teams > 0) {
    throw new Error('Cannot permanently delete department with teams');
  }
  
  await prisma.department.delete({
    where: { id },
  });
  
  logger.info({ departmentId: id, userId }, 'Department permanently deleted');
}

/**
 * Get department hierarchy (org chart)
 */
export async function getDepartmentHierarchy(
  prisma: PrismaClient
): Promise<any[]> {
  // Get all departments
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      manager: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      _count: { select: { employees: true } },
    },
  });
  
  // Build tree structure
  const map = new Map<string, any>();
  const roots: any[] = [];
  
  for (const dept of departments) {
    map.set(dept.id, { ...dept, children: [] });
  }
  
  for (const dept of departments) {
    const node = map.get(dept.id);
    if (dept.parentId && map.has(dept.parentId)) {
      map.get(dept.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }
  
  return roots;
}

// ============================================================================
// TEAM OPERATIONS
// ============================================================================

/**
 * Create a new team
 */
export async function createTeam(
  prisma: PrismaClient,
  input: CreateTeamInput,
  userId: string
): Promise<any> {
  const id = uuidv4();
  
  // Validate department exists
  const department = await prisma.department.findUnique({
    where: { id: input.departmentId },
  });
  
  if (!department) {
    throw new Error('Department not found');
  }
  
  // Check for duplicate code within department
  const existing = await prisma.team.findFirst({
    where: { code: input.code, departmentId: input.departmentId },
  });
  
  if (existing) {
    throw new Error(`Team with code '${input.code}' already exists in this department`);
  }
  
  const team = await prisma.team.create({
    data: {
      id,
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
      departmentId: input.departmentId,
      leadId: input.leadId,
      isActive: input.isActive ?? true,
      metadata: input.metadata || {},
      createdBy: userId,
      updatedBy: userId,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      lead: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      _count: { select: { members: true } },
    },
  });
  
  logger.info({ teamId: id, code: input.code }, 'Team created');
  
  return team;
}

/**
 * Get team by ID
 */
export async function getTeamById(
  prisma: PrismaClient,
  id: string
): Promise<any> {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, code: true } },
      lead: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      members: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      _count: { select: { members: true } },
    },
  });
  
  if (!team) {
    throw new Error('Team not found');
  }
  
  return team;
}

/**
 * List teams with filtering
 */
export async function listTeams(
  prisma: PrismaClient,
  filters: TeamFilters
): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const page = filters.page || 1;
  const pageSize = Math.min(filters.pageSize || 20, 1000);
  const skip = (page - 1) * pageSize;
  
  const where: any = {};
  
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { code: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  
  if (filters.departmentId) {
    where.departmentId = filters.departmentId;
  }
  
  const [data, total] = await Promise.all([
    prisma.team.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
      include: {
        department: { select: { id: true, name: true, code: true } },
        lead: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: { select: { members: true } },
      },
    }),
    prisma.team.count({ where }),
  ]);
  
  return { data, total, page, pageSize };
}

/**
 * Update team
 */
export async function updateTeam(
  prisma: PrismaClient,
  id: string,
  input: UpdateTeamInput,
  userId: string
): Promise<any> {
  const existing = await prisma.team.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Team not found');
  }
  
  const team = await prisma.team.update({
    where: { id },
    data: {
      ...input,
      code: input.code?.toUpperCase(),
      updatedBy: userId,
      updatedAt: new Date(),
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      lead: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      _count: { select: { members: true } },
    },
  });
  
  logger.info({ teamId: id }, 'Team updated');
  
  return team;
}

/**
 * Delete team (soft delete)
 */
export async function deleteTeam(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  const team = await prisma.team.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });
  
  if (!team) {
    throw new Error('Team not found');
  }
  
  if (team._count.members > 0) {
    throw new Error('Cannot delete team with active members');
  }
  
  await prisma.team.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
      updatedBy: userId,
    },
  });
  
  logger.info({ teamId: id }, 'Team deleted');
}
