/**
 * Project Service - Project management with phases, milestones, and team assignments
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { parseISO, differenceInDays, addDays } from 'date-fns';
import { getEventBus, SQS_QUEUES } from '@oms/event-bus';
import { logger } from '../utils/logger';
import { config } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateProjectInput {
  name: string;
  code?: string;
  description?: string;
  clientId: string;
  managerId: string;
  type: 'fixed_price' | 'time_and_material' | 'internal' | 'retainer';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  endDate?: string;
  estimatedHours?: number;
  budgetCents?: number;
  hourlyRateCents?: number;
  isBillable?: boolean;
  tags?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  managerId?: string;
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
  budgetCents?: number;
  hourlyRateCents?: number;
  isBillable?: boolean;
  tags?: string[];
  completedAt?: string;
}

export interface CreatePhaseInput {
  projectId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  order: number;
}

export interface CreateMilestoneInput {
  projectId: string;
  phaseId?: string;
  name: string;
  description?: string;
  dueDate: string;
  isBillable?: boolean;
  amountCents?: number;
}

export interface AddTeamMemberInput {
  projectId: string;
  employeeId: string;
  role: string;
  hourlyRateCents?: number;
  allocatedHours?: number;
  startDate?: string;
  endDate?: string;
}

export interface ProjectFilters {
  clientId?: string;
  managerId?: string;
  status?: string;
  type?: string;
  priority?: string;
  isBillable?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generateProjectCode(prisma: PrismaClient): Promise<string> {
  const prefix = config.project.codePrefix;
  const year = new Date().getFullYear().toString().slice(-2);
  
  const lastProject = await prisma.project.findFirst({
    where: {
      code: { startsWith: `${prefix}${year}` },
    },
    orderBy: { createdAt: 'desc' },
    select: { code: true },
  });
  
  let nextNumber = 1;
  if (lastProject?.code) {
    const numPart = lastProject.code.slice(-4);
    nextNumber = parseInt(numPart, 10) + 1;
  }
  
  return `${prefix}${year}${nextNumber.toString().padStart(4, '0')}`;
}

function calculateProjectHealth(
  daysRemaining: number,
  totalDays: number,
  hoursUsed: number,
  estimatedHours: number,
  budgetUsedCents: number,
  budgetCents: number
): 'on_track' | 'at_risk' | 'delayed' {
  const timeProgress = totalDays > 0 ? (totalDays - daysRemaining) / totalDays : 0;
  const hoursProgress = estimatedHours > 0 ? hoursUsed / estimatedHours : 0;
  const budgetProgress = budgetCents > 0 ? budgetUsedCents / budgetCents : 0;
  
  // If we're using more resources than time elapsed, project is at risk
  if (hoursProgress > timeProgress * 1.2 || budgetProgress > timeProgress * 1.2) {
    return 'at_risk';
  }
  
  // If we're past the deadline or severely over budget/hours
  if (daysRemaining < 0 || hoursProgress > 1 || budgetProgress > 1) {
    return 'delayed';
  }
  
  return 'on_track';
}

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

/**
 * Create a new project
 */
export async function createProject(
  prisma: PrismaClient,
  input: CreateProjectInput,
  userId: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('project-service');
  const id = uuidv4();
  
  // Generate code if not provided
  let code = input.code;
  if (!code && config.project.autoGenerateCodes) {
    code = await generateProjectCode(prisma);
  }
  
  // Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
    select: { id: true, name: true },
  });
  
  if (!client) {
    throw new Error('Client not found');
  }
  
  const project = await prisma.project.create({
    data: {
      id,
      name: input.name,
      code,
      description: input.description,
      clientId: input.clientId,
      managerId: input.managerId,
      type: input.type,
      status: config.project.defaultStatus,
      priority: input.priority,
      startDate: parseISO(input.startDate),
      endDate: input.endDate ? parseISO(input.endDate) : null,
      estimatedHours: input.estimatedHours,
      budgetCents: input.budgetCents,
      hourlyRateCents: input.hourlyRateCents || config.billing.defaultHourlyRateCents,
      isBillable: input.isBillable ?? config.billing.defaultBillable,
      tags: input.tags || [],
      createdBy: userId,
      updatedBy: userId,
    },
    include: {
      client: { select: { id: true, name: true, code: true } },
      manager: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  
  // Add manager as team member
  await prisma.projectTeamMember.create({
    data: {
      id: uuidv4(),
      projectId: id,
      employeeId: input.managerId,
      role: 'Project Manager',
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
    },
  });
  
  // Emit event
  await eventBus.sendToQueue(
    SQS_QUEUES.PROJECT_CREATED,
    'project.created',
    {
      projectId: id,
      projectCode: code,
      projectName: input.name,
      clientId: input.clientId,
      clientName: client.name,
      managerId: input.managerId,
      type: input.type,
    },
    tenantContext
  );
  
  logger.info({ projectId: id, code, clientId: input.clientId }, 'Project created');
  
  return project;
}

/**
 * Get project by ID
 */
export async function getProjectById(
  prisma: PrismaClient,
  id: string
): Promise<any | null> {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, code: true, email: true } },
      manager: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      phases: {
        orderBy: { order: 'asc' },
        include: {
          milestones: { orderBy: { dueDate: 'asc' } },
        },
      },
      milestones: {
        where: { phaseId: null },
        orderBy: { dueDate: 'asc' },
      },
      teamMembers: {
        where: { isActive: true },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              user: { select: { firstName: true, lastName: true } },
              designation: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  
  if (!project) return null;
  
  // Calculate project stats
  const timeEntries = await prisma.timeEntry.aggregate({
    where: { projectId: id, status: 'approved' },
    _sum: { durationMinutes: true },
  });
  
  const hoursUsed = (timeEntries._sum.durationMinutes || 0) / 60;
  const budgetUsedCents = Math.round(hoursUsed * (project.hourlyRateCents || 0));
  
  const now = new Date();
  const daysRemaining = project.endDate 
    ? differenceInDays(project.endDate, now)
    : null;
  const totalDays = project.endDate
    ? differenceInDays(project.endDate, project.startDate)
    : null;
  
  const health = (daysRemaining !== null && totalDays !== null)
    ? calculateProjectHealth(
        daysRemaining,
        totalDays,
        hoursUsed,
        project.estimatedHours || 0,
        budgetUsedCents,
        project.budgetCents || 0
      )
    : 'on_track';
  
  return {
    ...project,
    stats: {
      hoursUsed: Math.round(hoursUsed * 100) / 100,
      hoursRemaining: project.estimatedHours 
        ? Math.max(0, project.estimatedHours - hoursUsed)
        : null,
      budgetUsedCents,
      budgetRemainingCents: project.budgetCents
        ? Math.max(0, project.budgetCents - budgetUsedCents)
        : null,
      daysRemaining,
      totalDays,
      health,
      teamSize: project.teamMembers.length,
      milestonesTotal: project.milestones.length + 
        project.phases.reduce((sum, p) => sum + p.milestones.length, 0),
      milestonesCompleted: project.milestones.filter(m => m.status === 'completed').length +
        project.phases.reduce((sum, p) => 
          sum + p.milestones.filter(m => m.status === 'completed').length, 0),
    },
  };
}

/**
 * Update a project
 */
export async function updateProject(
  prisma: PrismaClient,
  id: string,
  input: UpdateProjectInput,
  userId: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('project-service');
  
  const data: any = {
    updatedBy: userId,
    updatedAt: new Date(),
  };
  
  if (input.name) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.managerId) data.managerId = input.managerId;
  if (input.status) data.status = input.status;
  if (input.priority) data.priority = input.priority;
  if (input.startDate) data.startDate = parseISO(input.startDate);
  if (input.endDate) data.endDate = parseISO(input.endDate);
  if (input.estimatedHours !== undefined) data.estimatedHours = input.estimatedHours;
  if (input.budgetCents !== undefined) data.budgetCents = input.budgetCents;
  if (input.hourlyRateCents !== undefined) data.hourlyRateCents = input.hourlyRateCents;
  if (input.isBillable !== undefined) data.isBillable = input.isBillable;
  if (input.tags) data.tags = input.tags;
  if (input.completedAt) data.completedAt = parseISO(input.completedAt);
  
  // Auto-set completedAt when status changes to completed
  if (input.status === 'completed' && !input.completedAt) {
    data.completedAt = new Date();
  }
  
  const project = await prisma.project.update({
    where: { id },
    data,
    include: {
      client: { select: { id: true, name: true } },
    },
  });
  
  // Emit event if status changed
  if (input.status) {
    await eventBus.sendToQueue(
      SQS_QUEUES.PROJECT_UPDATED,
      'project.status_changed',
      {
        projectId: id,
        projectCode: project.code,
        projectName: project.name,
        newStatus: input.status,
      },
      tenantContext
    );
  }
  
  logger.info({ projectId: id, status: input.status }, 'Project updated');
  
  return project;
}

/**
 * List projects with filters
 */
export async function listProjects(
  prisma: PrismaClient,
  filters: ProjectFilters
): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const page = filters.page || 1;
  const pageSize = Math.min(filters.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  
  const where: any = {};
  
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.managerId) where.managerId = filters.managerId;
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;
  if (filters.priority) where.priority = filters.priority;
  if (filters.isBillable !== undefined) where.isBillable = filters.isBillable;
  
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { code: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        client: { select: { id: true, name: true, code: true } },
        manager: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        _count: {
          select: { teamMembers: true, timeEntries: true },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);
  
  return {
    data: projects.map(p => ({
      ...p,
      teamSize: p._count.teamMembers,
      timeEntryCount: p._count.timeEntries,
    })),
    total,
    page,
    pageSize,
  };
}

// ============================================================================
// PHASE OPERATIONS
// ============================================================================

/**
 * Create a project phase
 */
export async function createPhase(
  prisma: PrismaClient,
  input: CreatePhaseInput,
  userId: string
): Promise<any> {
  const id = uuidv4();
  
  const phase = await prisma.projectPhase.create({
    data: {
      id,
      projectId: input.projectId,
      name: input.name,
      description: input.description,
      startDate: parseISO(input.startDate),
      endDate: parseISO(input.endDate),
      order: input.order,
      status: 'pending',
      createdBy: userId,
      updatedBy: userId,
    },
  });
  
  logger.info({ phaseId: id, projectId: input.projectId }, 'Project phase created');
  
  return phase;
}

/**
 * Update a phase
 */
export async function updatePhase(
  prisma: PrismaClient,
  id: string,
  input: Partial<CreatePhaseInput> & { status?: string },
  userId: string
): Promise<any> {
  const data: any = {
    updatedBy: userId,
    updatedAt: new Date(),
  };
  
  if (input.name) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.startDate) data.startDate = parseISO(input.startDate);
  if (input.endDate) data.endDate = parseISO(input.endDate);
  if (input.order !== undefined) data.order = input.order;
  if (input.status) data.status = input.status;
  
  const phase = await prisma.projectPhase.update({
    where: { id },
    data,
  });
  
  logger.info({ phaseId: id }, 'Project phase updated');
  
  return phase;
}

/**
 * Delete a phase
 */
export async function deletePhase(
  prisma: PrismaClient,
  id: string
): Promise<void> {
  // Move milestones to project level
  await prisma.milestone.updateMany({
    where: { phaseId: id },
    data: { phaseId: null },
  });
  
  await prisma.projectPhase.delete({
    where: { id },
  });
  
  logger.info({ phaseId: id }, 'Project phase deleted');
}

// ============================================================================
// MILESTONE OPERATIONS
// ============================================================================

/**
 * Create a milestone
 */
export async function createMilestone(
  prisma: PrismaClient,
  input: CreateMilestoneInput,
  userId: string
): Promise<any> {
  const id = uuidv4();
  
  const milestone = await prisma.milestone.create({
    data: {
      id,
      projectId: input.projectId,
      phaseId: input.phaseId,
      name: input.name,
      description: input.description,
      dueDate: parseISO(input.dueDate),
      isBillable: input.isBillable ?? false,
      amountCents: input.amountCents,
      status: 'pending',
      createdBy: userId,
      updatedBy: userId,
    },
  });
  
  logger.info({ milestoneId: id, projectId: input.projectId }, 'Milestone created');
  
  return milestone;
}

/**
 * Update a milestone
 */
export async function updateMilestone(
  prisma: PrismaClient,
  id: string,
  input: Partial<CreateMilestoneInput> & { status?: string; completedAt?: string },
  userId: string
): Promise<any> {
  const data: any = {
    updatedBy: userId,
    updatedAt: new Date(),
  };
  
  if (input.name) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.dueDate) data.dueDate = parseISO(input.dueDate);
  if (input.isBillable !== undefined) data.isBillable = input.isBillable;
  if (input.amountCents !== undefined) data.amountCents = input.amountCents;
  if (input.status) {
    data.status = input.status;
    if (input.status === 'completed') {
      data.completedAt = input.completedAt ? parseISO(input.completedAt) : new Date();
    }
  }
  
  const milestone = await prisma.milestone.update({
    where: { id },
    data,
  });
  
  logger.info({ milestoneId: id }, 'Milestone updated');
  
  return milestone;
}

// ============================================================================
// TEAM MEMBER OPERATIONS
// ============================================================================

/**
 * Add team member to project
 */
export async function addTeamMember(
  prisma: PrismaClient,
  input: AddTeamMemberInput,
  userId: string
): Promise<any> {
  const id = uuidv4();
  
  // Check if already a member
  const existing = await prisma.projectTeamMember.findFirst({
    where: {
      projectId: input.projectId,
      employeeId: input.employeeId,
      isActive: true,
    },
  });
  
  if (existing) {
    throw new Error('Employee is already a team member');
  }
  
  // Check team size limit
  const currentSize = await prisma.projectTeamMember.count({
    where: { projectId: input.projectId, isActive: true },
  });
  
  if (currentSize >= config.project.maxTeamSize) {
    throw new Error(`Maximum team size of ${config.project.maxTeamSize} reached`);
  }
  
  const member = await prisma.projectTeamMember.create({
    data: {
      id,
      projectId: input.projectId,
      employeeId: input.employeeId,
      role: input.role,
      hourlyRateCents: input.hourlyRateCents,
      allocatedHours: input.allocatedHours,
      startDate: input.startDate ? parseISO(input.startDate) : new Date(),
      endDate: input.endDate ? parseISO(input.endDate) : null,
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          user: { select: { firstName: true, lastName: true } },
          designation: { select: { name: true } },
        },
      },
    },
  });
  
  logger.info({ 
    projectId: input.projectId, 
    employeeId: input.employeeId 
  }, 'Team member added');
  
  return member;
}

/**
 * Update team member
 */
export async function updateTeamMember(
  prisma: PrismaClient,
  id: string,
  input: Partial<AddTeamMemberInput>,
  userId: string
): Promise<any> {
  const data: any = {
    updatedBy: userId,
    updatedAt: new Date(),
  };
  
  if (input.role) data.role = input.role;
  if (input.hourlyRateCents !== undefined) data.hourlyRateCents = input.hourlyRateCents;
  if (input.allocatedHours !== undefined) data.allocatedHours = input.allocatedHours;
  if (input.endDate) data.endDate = parseISO(input.endDate);
  
  const member = await prisma.projectTeamMember.update({
    where: { id },
    data,
    include: {
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  
  logger.info({ memberId: id }, 'Team member updated');
  
  return member;
}

/**
 * Remove team member from project
 */
export async function removeTeamMember(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  await prisma.projectTeamMember.update({
    where: { id },
    data: {
      isActive: false,
      endDate: new Date(),
      updatedBy: userId,
      updatedAt: new Date(),
    },
  });
  
  logger.info({ memberId: id }, 'Team member removed');
}

/**
 * Get projects for an employee
 */
export async function getEmployeeProjects(
  prisma: PrismaClient,
  employeeId: string
): Promise<any[]> {
  const memberships = await prisma.projectTeamMember.findMany({
    where: { employeeId, isActive: true },
    include: {
      project: {
        include: {
          client: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { project: { name: 'asc' } },
  });
  
  return memberships.map(m => ({
    ...m.project,
    role: m.role,
    allocatedHours: m.allocatedHours,
  }));
}
