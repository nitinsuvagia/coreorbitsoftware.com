/**
 * Employee Service - Employee lifecycle management
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { getEventBus, SQS_QUEUES, SNS_TOPICS } from '@oms/event-bus';
import { logger } from '../utils/logger';
import { config } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardEmployeeInput {
  // User info (creates new user)
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  
  // Employee details
  employeeCode?: string;
  departmentId: string;
  designationId: string;
  teamId?: string;
  reportingToId?: string;
  
  // Employment details
  joiningDate: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  workLocation: 'office' | 'remote' | 'hybrid';
  
  // Compensation (optional)
  salary?: number;
  currency?: string;
  
  // Personal info
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  
  // Emergency contact
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  
  // Role assignment
  roleId: string;
  
  metadata?: Record<string, unknown>;
}

export interface UpdateEmployeeInput {
  departmentId?: string;
  designationId?: string;
  teamId?: string | null;
  reportingToId?: string | null;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'intern';
  workLocation?: 'office' | 'remote' | 'hybrid';
  salary?: number;
  currency?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  metadata?: Record<string, unknown>;
}

export interface OffboardEmployeeInput {
  lastWorkingDate: string;
  reason: 'resignation' | 'termination' | 'retirement' | 'contract_end' | 'other';
  notes?: string;
  conductExitInterview?: boolean;
}

export interface EmployeeFilters {
  search?: string;
  departmentId?: string;
  designationId?: string;
  teamId?: string;
  employmentType?: string;
  workLocation?: string;
  status?: 'active' | 'inactive' | 'on_leave' | 'offboarded';
  reportingToId?: string;
  joiningDateFrom?: string;
  joiningDateTo?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique employee code
 */
async function generateEmployeeCode(prisma: PrismaClient): Promise<string> {
  const { prefix, length } = config.employeeCode;
  
  // Get the latest employee code
  const latest = await prisma.employee.findFirst({
    where: {
      employeeCode: { startsWith: prefix },
    },
    orderBy: { employeeCode: 'desc' },
    select: { employeeCode: true },
  });
  
  let nextNumber = 1;
  
  if (latest?.employeeCode) {
    const numPart = latest.employeeCode.replace(prefix, '');
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }
  
  return `${prefix}${String(nextNumber).padStart(length, '0')}`;
}

// ============================================================================
// EMPLOYEE OPERATIONS
// ============================================================================

/**
 * Onboard a new employee
 */
export async function onboardEmployee(
  prisma: PrismaClient,
  input: OnboardEmployeeInput,
  performedBy: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('employee-service');
  
  // Validate department
  const department = await prisma.department.findUnique({
    where: { id: input.departmentId },
  });
  if (!department || !department.isActive) {
    throw new Error('Department not found or inactive');
  }
  
  // Validate designation
  const designation = await prisma.designation.findUnique({
    where: { id: input.designationId },
  });
  if (!designation || !designation.isActive) {
    throw new Error('Designation not found or inactive');
  }
  
  // Validate team if provided
  if (input.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: input.teamId },
    });
    if (!team || !team.isActive) {
      throw new Error('Team not found or inactive');
    }
  }
  
  // Validate reporting manager if provided
  if (input.reportingToId) {
    const manager = await prisma.employee.findUnique({
      where: { id: input.reportingToId },
    });
    if (!manager || manager.status !== 'active') {
      throw new Error('Reporting manager not found or inactive');
    }
  }
  
  // Validate role
  const role = await prisma.role.findUnique({
    where: { id: input.roleId },
  });
  if (!role || !role.isActive) {
    throw new Error('Role not found or inactive');
  }
  
  // Check email uniqueness
  const existingUser = await prisma.user.findFirst({
    where: { email: input.email },
  });
  if (existingUser) {
    throw new Error('Email already in use');
  }
  
  // Generate employee code if needed
  const employeeCode = input.employeeCode || 
    (config.employeeCode.autoGenerate ? await generateEmployeeCode(prisma) : null);
  
  if (!employeeCode) {
    throw new Error('Employee code is required');
  }
  
  // Check employee code uniqueness
  const existingEmployee = await prisma.employee.findFirst({
    where: { employeeCode },
  });
  if (existingEmployee) {
    throw new Error(`Employee code '${employeeCode}' already exists`);
  }
  
  // Create user and employee in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const userId = uuidv4();
    const user = await tx.user.create({
      data: {
        id: userId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        roleId: input.roleId,
        status: 'active',
        createdBy: performedBy,
        updatedBy: performedBy,
      },
    });
    
    // Create employee
    const employeeId = uuidv4();
    const employee = await tx.employee.create({
      data: {
        id: employeeId,
        userId: user.id,
        employeeCode,
        departmentId: input.departmentId,
        designationId: input.designationId,
        teamId: input.teamId,
        reportingToId: input.reportingToId,
        joiningDate: new Date(input.joiningDate),
        employmentType: input.employmentType,
        workLocation: input.workLocation,
        salary: input.salary,
        currency: input.currency || 'USD',
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        gender: input.gender,
        address: input.address || {},
        emergencyContact: input.emergencyContact || {},
        status: 'active',
        metadata: input.metadata || {},
        createdBy: performedBy,
        updatedBy: performedBy,
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        department: { select: { id: true, name: true, code: true } },
        designation: { select: { id: true, name: true, code: true, level: true } },
        team: { select: { id: true, name: true, code: true } },
        reportingTo: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    
    return { user, employee };
  });
  
  // Emit event
  await eventBus.publishToTopic(
    SNS_TOPICS.EMPLOYEE_EVENTS,
    'employee.onboarded',
    {
      employeeId: result.employee.id,
      userId: result.user.id,
      employeeCode,
      departmentId: input.departmentId,
      departmentName: department.name,
      designationId: input.designationId,
      designationName: designation.name,
      joiningDate: input.joiningDate,
      reportingToId: input.reportingToId,
    },
    tenantContext
  );
  
  logger.info({ 
    employeeId: result.employee.id, 
    employeeCode,
    email: input.email,
  }, 'Employee onboarded');
  
  return result.employee;
}

/**
 * Get employee by ID
 */
export async function getEmployeeById(
  prisma: PrismaClient,
  id: string
): Promise<any> {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      user: {
        select: { 
          id: true, 
          email: true, 
          firstName: true, 
          lastName: true, 
          phone: true,
          avatar: true,
          status: true,
        },
      },
      department: { select: { id: true, name: true, code: true } },
      designation: { select: { id: true, name: true, code: true, level: true } },
      team: { select: { id: true, name: true, code: true } },
      reportingTo: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          designation: { select: { name: true } },
        },
      },
      directReports: {
        where: { status: 'active' },
        include: {
          user: { select: { firstName: true, lastName: true } },
          designation: { select: { name: true } },
        },
      },
    },
  });
  
  if (!employee) {
    throw new Error('Employee not found');
  }
  
  return employee;
}

/**
 * Get employee by user ID
 */
export async function getEmployeeByUserId(
  prisma: PrismaClient,
  userId: string
): Promise<any> {
  const employee = await prisma.employee.findFirst({
    where: { userId },
    include: {
      user: {
        select: { 
          id: true, 
          email: true, 
          firstName: true, 
          lastName: true, 
          phone: true,
        },
      },
      department: { select: { id: true, name: true, code: true } },
      designation: { select: { id: true, name: true, code: true, level: true } },
      team: { select: { id: true, name: true, code: true } },
      reportingTo: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  
  if (!employee) {
    throw new Error('Employee not found');
  }
  
  return employee;
}

/**
 * List employees with filtering
 */
export async function listEmployees(
  prisma: PrismaClient,
  filters: EmployeeFilters
): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const page = filters.page || 1;
  const pageSize = Math.min(filters.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  
  const where: any = {};
  
  if (filters.search) {
    where.OR = [
      { employeeCode: { contains: filters.search, mode: 'insensitive' } },
      { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
      { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      { user: { email: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }
  
  if (filters.departmentId) {
    where.departmentId = filters.departmentId;
  }
  
  if (filters.designationId) {
    where.designationId = filters.designationId;
  }
  
  if (filters.teamId) {
    where.teamId = filters.teamId;
  }
  
  if (filters.employmentType) {
    where.employmentType = filters.employmentType;
  }
  
  if (filters.workLocation) {
    where.workLocation = filters.workLocation;
  }
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.reportingToId) {
    where.reportingToId = filters.reportingToId;
  }
  
  if (filters.joiningDateFrom || filters.joiningDateTo) {
    where.joiningDate = {};
    if (filters.joiningDateFrom) {
      where.joiningDate.gte = new Date(filters.joiningDateFrom);
    }
    if (filters.joiningDateTo) {
      where.joiningDate.lte = new Date(filters.joiningDateTo);
    }
  }
  
  const [data, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }],
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, avatar: true },
        },
        department: { select: { id: true, name: true, code: true } },
        designation: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
      },
    }),
    prisma.employee.count({ where }),
  ]);
  
  return { data, total, page, pageSize };
}

/**
 * Update employee
 */
export async function updateEmployee(
  prisma: PrismaClient,
  id: string,
  input: UpdateEmployeeInput,
  performedBy: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('employee-service');
  
  const existing = await prisma.employee.findUnique({
    where: { id },
    include: { 
      department: true, 
      designation: true,
    },
  });
  
  if (!existing) {
    throw new Error('Employee not found');
  }
  
  // Track changes for event
  const changes: Record<string, { old: any; new: any }> = {};
  
  // Validate and track department change
  if (input.departmentId && input.departmentId !== existing.departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: input.departmentId },
    });
    if (!department || !department.isActive) {
      throw new Error('Department not found or inactive');
    }
    changes.departmentId = {
      old: existing.departmentId,
      new: input.departmentId,
    };
  }
  
  // Validate designation change
  if (input.designationId && input.designationId !== existing.designationId) {
    const designation = await prisma.designation.findUnique({
      where: { id: input.designationId },
    });
    if (!designation || !designation.isActive) {
      throw new Error('Designation not found or inactive');
    }
    changes.designationId = {
      old: existing.designationId,
      new: input.designationId,
    };
  }
  
  // Validate reporting manager change
  if (input.reportingToId !== undefined && input.reportingToId !== existing.reportingToId) {
    if (input.reportingToId === id) {
      throw new Error('Employee cannot report to themselves');
    }
    if (input.reportingToId) {
      const manager = await prisma.employee.findUnique({
        where: { id: input.reportingToId },
      });
      if (!manager || manager.status !== 'active') {
        throw new Error('Reporting manager not found or inactive');
      }
    }
    changes.reportingToId = {
      old: existing.reportingToId,
      new: input.reportingToId,
    };
  }
  
  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...input,
      updatedBy: performedBy,
      updatedAt: new Date(),
    },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      department: { select: { id: true, name: true, code: true } },
      designation: { select: { id: true, name: true, code: true, level: true } },
      team: { select: { id: true, name: true, code: true } },
      reportingTo: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  
  // Emit department change event if applicable
  if (changes.departmentId) {
    await eventBus.sendToQueue(
      SQS_QUEUES.EMPLOYEE_DEPARTMENT_CHANGED,
      'employee.department_changed',
      {
        employeeId: id,
        previousDepartmentId: changes.departmentId.old,
        newDepartmentId: changes.departmentId.new,
        changedBy: performedBy,
      },
      tenantContext
    );
  }
  
  logger.info({ employeeId: id, changes: Object.keys(changes) }, 'Employee updated');
  
  return employee;
}

/**
 * Offboard an employee
 */
export async function offboardEmployee(
  prisma: PrismaClient,
  id: string,
  input: OffboardEmployeeInput,
  performedBy: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('employee-service');
  
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      directReports: { where: { status: 'active' } },
    },
  });
  
  if (!employee) {
    throw new Error('Employee not found');
  }
  
  if (employee.status === 'offboarded') {
    throw new Error('Employee already offboarded');
  }
  
  // Check for direct reports
  if (employee.directReports.length > 0) {
    throw new Error(
      `Cannot offboard employee with ${employee.directReports.length} direct reports. ` +
      'Please reassign them first.'
    );
  }
  
  // Update employee and user in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update employee
    const updatedEmployee = await tx.employee.update({
      where: { id },
      data: {
        status: 'offboarded',
        lastWorkingDate: new Date(input.lastWorkingDate),
        offboardingReason: input.reason,
        offboardingNotes: input.notes,
        offboardedAt: new Date(),
        offboardedBy: performedBy,
        updatedBy: performedBy,
        updatedAt: new Date(),
      },
    });
    
    // Deactivate user account
    await tx.user.update({
      where: { id: employee.userId },
      data: {
        status: 'inactive',
        updatedBy: performedBy,
        updatedAt: new Date(),
      },
    });
    
    return updatedEmployee;
  });
  
  // Emit event
  await eventBus.publishToTopic(
    SNS_TOPICS.EMPLOYEE_EVENTS,
    'employee.offboarded',
    {
      employeeId: id,
      userId: employee.userId,
      lastWorkingDate: input.lastWorkingDate,
      reason: input.reason,
      offboardedBy: performedBy,
    },
    tenantContext
  );
  
  logger.info({ 
    employeeId: id, 
    reason: input.reason,
    lastWorkingDate: input.lastWorkingDate,
  }, 'Employee offboarded');
  
  return result;
}

/**
 * Get direct reports for an employee
 */
export async function getDirectReports(
  prisma: PrismaClient,
  employeeId: string
): Promise<any[]> {
  return prisma.employee.findMany({
    where: {
      reportingToId: employeeId,
      status: 'active',
    },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true, avatar: true },
      },
      designation: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
    orderBy: { user: { firstName: 'asc' } },
  });
}

/**
 * Get reporting chain (managers up to CEO)
 */
export async function getReportingChain(
  prisma: PrismaClient,
  employeeId: string
): Promise<any[]> {
  const chain: any[] = [];
  let currentId: string | null = employeeId;
  const visited = new Set<string>();
  
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    
    const employee = await prisma.employee.findUnique({
      where: { id: currentId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        designation: { select: { name: true, level: true } },
        department: { select: { name: true } },
      },
    });
    
    if (!employee) break;
    
    if (currentId !== employeeId) {
      chain.push(employee);
    }
    
    currentId = employee.reportingToId;
  }
  
  return chain;
}

/**
 * Get employee statistics
 */
export async function getEmployeeStats(
  prisma: PrismaClient
): Promise<{
  total: number;
  active: number;
  onLeave: number;
  byDepartment: Record<string, number>;
  byEmploymentType: Record<string, number>;
  byWorkLocation: Record<string, number>;
  recentJoiners: number;
}> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [
    total,
    active,
    onLeave,
    byDepartment,
    byEmploymentType,
    byWorkLocation,
    recentJoiners,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: 'active' } }),
    prisma.employee.count({ where: { status: 'on_leave' } }),
    prisma.employee.groupBy({
      by: ['departmentId'],
      where: { status: 'active' },
      _count: true,
    }),
    prisma.employee.groupBy({
      by: ['employmentType'],
      where: { status: 'active' },
      _count: true,
    }),
    prisma.employee.groupBy({
      by: ['workLocation'],
      where: { status: 'active' },
      _count: true,
    }),
    prisma.employee.count({
      where: {
        joiningDate: { gte: thirtyDaysAgo },
        status: 'active',
      },
    }),
  ]);
  
  return {
    total,
    active,
    onLeave,
    byDepartment: Object.fromEntries(
      byDepartment.map(d => [d.departmentId, d._count])
    ),
    byEmploymentType: Object.fromEntries(
      byEmploymentType.map(e => [e.employmentType, e._count])
    ),
    byWorkLocation: Object.fromEntries(
      byWorkLocation.map(w => [w.workLocation, w._count])
    ),
    recentJoiners,
  };
}
