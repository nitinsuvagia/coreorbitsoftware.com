/**
 * Designation Service - CRUD operations for job titles and designations
 */

import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateDesignationInput {
  name: string;
  code: string;
  description?: string;
  level: number;
  isActive?: boolean;
}

export interface UpdateDesignationInput {
  name?: string;
  code?: string;
  description?: string;
  level?: number;
  isActive?: boolean;
}

export interface DesignationFilters {
  search?: string;
  isActive?: boolean;
  minLevel?: number;
  maxLevel?: number;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// DESIGNATION OPERATIONS
// ============================================================================

/**
 * Create a new designation
 */
export async function createDesignation(
  prisma: PrismaClient,
  input: CreateDesignationInput,
  userId: string
): Promise<any> {
  const id = uuidv4();
  
  // Check for duplicate code
  const existing = await prisma.designation.findFirst({
    where: { code: input.code },
  });
  
  if (existing) {
    throw new Error(`Designation with code '${input.code}' already exists`);
  }
  
  const designation = await prisma.designation.create({
    data: {
      id,
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
      level: input.level,
      isActive: input.isActive ?? true,
    },
    include: {
      _count: { select: { employees: true } },
    },
  });
  
  logger.info({ designationId: id, code: input.code }, 'Designation created');
  
  return designation;
}

/**
 * Get designation by ID
 */
export async function getDesignationById(
  prisma: PrismaClient,
  id: string
): Promise<any> {
  const designation = await prisma.designation.findUnique({
    where: { id },
    include: {
      _count: { select: { employees: true } },
    },
  });
  
  if (!designation) {
    throw new Error('Designation not found');
  }
  
  return designation;
}

/**
 * List designations with filtering
 */
export async function listDesignations(
  prisma: PrismaClient,
  filters: DesignationFilters
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
  
  if (filters.minLevel !== undefined) {
    where.level = { ...where.level, gte: filters.minLevel };
  }
  
  if (filters.maxLevel !== undefined) {
    where.level = { ...where.level, lte: filters.maxLevel };
  }
  
  const [data, total] = await Promise.all([
    prisma.designation.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { employees: true } },
      },
    }),
    prisma.designation.count({ where }),
  ]);
  
  return { data, total, page, pageSize };
}

/**
 * Update designation
 */
export async function updateDesignation(
  prisma: PrismaClient,
  id: string,
  input: UpdateDesignationInput,
  userId: string
): Promise<any> {
  const existing = await prisma.designation.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Designation not found');
  }
  
  // Check code uniqueness if changing
  if (input.code && input.code !== existing.code) {
    const duplicate = await prisma.designation.findFirst({
      where: { code: input.code, id: { not: id } },
    });
    if (duplicate) {
      throw new Error(`Designation with code '${input.code}' already exists`);
    }
  }
  
  const designation = await prisma.designation.update({
    where: { id },
    data: {
      ...input,
      code: input.code?.toUpperCase(),
      updatedAt: new Date(),
    },
    include: {
      _count: { select: { employees: true } },
    },
  });
  
  logger.info({ designationId: id }, 'Designation updated');
  
  return designation;
}

/**
 * Delete designation (soft delete)
 */
export async function deleteDesignation(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  const designation = await prisma.designation.findUnique({
    where: { id },
    include: { _count: { select: { employees: true } } },
  });
  
  if (!designation) {
    throw new Error('Designation not found');
  }
  
  if (designation._count.employees > 0) {
    throw new Error('Cannot delete designation with active employees');
  }
  
  await prisma.designation.update({
    where: { id },
    data: {
      isActive: false,
    },
  });
  
  logger.info({ designationId: id }, 'Designation deleted');
}

/**
 * Permanently delete designation (only if no transactional data exists)
 */
export async function permanentlyDeleteDesignation(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  const designation = await prisma.designation.findUnique({
    where: { id },
    include: { _count: { select: { employees: true } } },
  });
  
  if (!designation) {
    throw new Error('Designation not found');
  }
  
  if (designation._count.employees > 0) {
    throw new Error('Cannot permanently delete designation with employees. Reassign employees first.');
  }
  
  await prisma.designation.delete({
    where: { id },
  });
  
  logger.info({ designationId: id, userId }, 'Designation permanently deleted');
}

/**
 * Get designations by level (for reporting/org chart)
 */
export async function getDesignationsByLevel(
  prisma: PrismaClient
): Promise<Map<number, any[]>> {
  const designations = await prisma.designation.findMany({
    where: { isActive: true },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { employees: true } },
    },
  });
  
  const byLevel = new Map<number, any[]>();
  
  for (const designation of designations) {
    const level = designation.level;
    if (!byLevel.has(level)) {
      byLevel.set(level, []);
    }
    byLevel.get(level)!.push(designation);
  }
  
  return byLevel;
}
