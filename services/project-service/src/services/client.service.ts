/**
 * Client Service - Client management with contacts and contracts
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { config } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateClientInput {
  name: string;
  code?: string;
  email: string;
  phone?: string;
  website?: string;
  industry?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  taxId?: string;
  notes?: string;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  taxId?: string;
  notes?: string;
  status?: 'active' | 'inactive' | 'prospect';
}

export interface CreateClientContactInput {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  designation?: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface CreateClientContractInput {
  clientId: string;
  name: string;
  contractNumber?: string;
  type: 'fixed_price' | 'time_and_material' | 'retainer' | 'milestone';
  startDate: string;
  endDate?: string;
  valueCents: number;
  currency?: string;
  hourlyRateCents?: number;
  monthlyRetainerCents?: number;
  terms?: string;
  attachmentUrl?: string;
}

export interface ClientFilters {
  status?: 'active' | 'inactive' | 'prospect';
  industry?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generateClientCode(prisma: PrismaClient): Promise<string> {
  const prefix = config.client.codePrefix;
  
  // Get the last client code
  const lastClient = await prisma.client.findFirst({
    where: {
      code: { startsWith: prefix },
    },
    orderBy: { createdAt: 'desc' },
    select: { code: true },
  });
  
  let nextNumber = 1;
  if (lastClient?.code) {
    const numPart = lastClient.code.replace(prefix, '');
    nextNumber = parseInt(numPart, 10) + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

// ============================================================================
// CLIENT OPERATIONS
// ============================================================================

/**
 * Create a new client
 */
export async function createClient(
  prisma: PrismaClient,
  input: CreateClientInput,
  userId: string
): Promise<any> {
  const id = uuidv4();
  
  // Generate code if not provided and auto-generate is enabled
  let code = input.code;
  if (!code && config.client.autoGenerateCodes) {
    code = await generateClientCode(prisma);
  }
  
  // Check for duplicate email
  const existing = await prisma.client.findFirst({
    where: { email: input.email },
  });
  
  if (existing) {
    throw new Error(`Client with email '${input.email}' already exists`);
  }
  
  const client = await prisma.client.create({
    data: {
      id,
      name: input.name,
      code,
      email: input.email,
      phone: input.phone,
      website: input.website,
      industry: input.industry,
      address: input.address ? JSON.stringify(input.address) : null,
      billingAddress: input.billingAddress ? JSON.stringify(input.billingAddress) : null,
      taxId: input.taxId,
      notes: input.notes,
      status: 'active',
      createdBy: userId,
      updatedBy: userId,
    },
  });
  
  logger.info({ clientId: id, name: input.name, code }, 'Client created');
  
  return {
    ...client,
    address: client.address ? JSON.parse(client.address as string) : null,
    billingAddress: client.billingAddress ? JSON.parse(client.billingAddress as string) : null,
  };
}

/**
 * Get client by ID
 */
export async function getClientById(
  prisma: PrismaClient,
  id: string
): Promise<any | null> {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contacts: {
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
      contracts: {
        orderBy: { startDate: 'desc' },
      },
      projects: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  
  if (!client) return null;
  
  return {
    ...client,
    address: client.address ? JSON.parse(client.address as string) : null,
    billingAddress: client.billingAddress ? JSON.parse(client.billingAddress as string) : null,
  };
}

/**
 * Update a client
 */
export async function updateClient(
  prisma: PrismaClient,
  id: string,
  input: UpdateClientInput,
  userId: string
): Promise<any> {
  const data: any = {
    updatedBy: userId,
    updatedAt: new Date(),
  };
  
  if (input.name) data.name = input.name;
  if (input.email) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.website !== undefined) data.website = input.website;
  if (input.industry !== undefined) data.industry = input.industry;
  if (input.address) data.address = JSON.stringify(input.address);
  if (input.billingAddress) data.billingAddress = JSON.stringify(input.billingAddress);
  if (input.taxId !== undefined) data.taxId = input.taxId;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.status) data.status = input.status;
  
  const client = await prisma.client.update({
    where: { id },
    data,
  });
  
  logger.info({ clientId: id }, 'Client updated');
  
  return {
    ...client,
    address: client.address ? JSON.parse(client.address as string) : null,
    billingAddress: client.billingAddress ? JSON.parse(client.billingAddress as string) : null,
  };
}

/**
 * List clients with filters
 */
export async function listClients(
  prisma: PrismaClient,
  filters: ClientFilters
): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const page = filters.page || 1;
  const pageSize = Math.min(filters.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  
  const where: any = {};
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.industry) {
    where.industry = filters.industry;
  }
  
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { code: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  
  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { projects: true, contacts: true },
        },
      },
    }),
    prisma.client.count({ where }),
  ]);
  
  const data = clients.map(client => ({
    ...client,
    address: client.address ? JSON.parse(client.address as string) : null,
    billingAddress: client.billingAddress ? JSON.parse(client.billingAddress as string) : null,
    projectCount: client._count.projects,
    contactCount: client._count.contacts,
  }));
  
  return { data, total, page, pageSize };
}

/**
 * Delete a client (soft delete by setting status to inactive)
 */
export async function deactivateClient(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<any> {
  // Check for active projects
  const activeProjects = await prisma.project.count({
    where: {
      clientId: id,
      status: { in: ['active', 'in_progress'] },
    },
  });
  
  if (activeProjects > 0) {
    throw new Error(`Cannot deactivate client with ${activeProjects} active project(s)`);
  }
  
  const client = await prisma.client.update({
    where: { id },
    data: {
      status: 'inactive',
      updatedBy: userId,
      updatedAt: new Date(),
    },
  });
  
  logger.info({ clientId: id }, 'Client deactivated');
  
  return client;
}

// ============================================================================
// CLIENT CONTACT OPERATIONS
// ============================================================================

/**
 * Add a contact to a client
 */
export async function addClientContact(
  prisma: PrismaClient,
  input: CreateClientContactInput,
  userId: string
): Promise<any> {
  const id = uuidv4();
  
  // If this is primary, unset other primary contacts
  if (input.isPrimary) {
    await prisma.clientContact.updateMany({
      where: { clientId: input.clientId, isPrimary: true },
      data: { isPrimary: false },
    });
  }
  
  const contact = await prisma.clientContact.create({
    data: {
      id,
      clientId: input.clientId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      designation: input.designation,
      isPrimary: input.isPrimary ?? false,
      notes: input.notes,
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
    },
  });
  
  logger.info({ contactId: id, clientId: input.clientId }, 'Client contact added');
  
  return contact;
}

/**
 * Update a client contact
 */
export async function updateClientContact(
  prisma: PrismaClient,
  id: string,
  input: Partial<CreateClientContactInput>,
  userId: string
): Promise<any> {
  // If setting as primary, unset other primary contacts
  if (input.isPrimary) {
    const contact = await prisma.clientContact.findUnique({ where: { id } });
    if (contact) {
      await prisma.clientContact.updateMany({
        where: { clientId: contact.clientId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }
  }
  
  const updated = await prisma.clientContact.update({
    where: { id },
    data: {
      ...input,
      updatedBy: userId,
      updatedAt: new Date(),
    },
  });
  
  logger.info({ contactId: id }, 'Client contact updated');
  
  return updated;
}

/**
 * Remove a client contact
 */
export async function removeClientContact(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  await prisma.clientContact.update({
    where: { id },
    data: {
      isActive: false,
      updatedBy: userId,
      updatedAt: new Date(),
    },
  });
  
  logger.info({ contactId: id }, 'Client contact removed');
}

// ============================================================================
// CLIENT CONTRACT OPERATIONS
// ============================================================================

/**
 * Create a client contract
 */
export async function createClientContract(
  prisma: PrismaClient,
  input: CreateClientContractInput,
  userId: string
): Promise<any> {
  const id = uuidv4();
  
  // Generate contract number if not provided
  let contractNumber = input.contractNumber;
  if (!contractNumber) {
    const count = await prisma.clientContract.count({
      where: { clientId: input.clientId },
    });
    contractNumber = `CNT-${input.clientId.slice(0, 8).toUpperCase()}-${(count + 1).toString().padStart(3, '0')}`;
  }
  
  const contract = await prisma.clientContract.create({
    data: {
      id,
      clientId: input.clientId,
      name: input.name,
      contractNumber,
      type: input.type,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      valueCents: input.valueCents,
      currency: input.currency || config.billing.defaultCurrency,
      hourlyRateCents: input.hourlyRateCents,
      monthlyRetainerCents: input.monthlyRetainerCents,
      terms: input.terms,
      attachmentUrl: input.attachmentUrl,
      status: 'active',
      createdBy: userId,
      updatedBy: userId,
    },
  });
  
  logger.info({ contractId: id, clientId: input.clientId }, 'Client contract created');
  
  return contract;
}

/**
 * Get client contracts
 */
export async function getClientContracts(
  prisma: PrismaClient,
  clientId: string
): Promise<any[]> {
  return prisma.clientContract.findMany({
    where: { clientId },
    orderBy: { startDate: 'desc' },
  });
}

/**
 * Update a client contract
 */
export async function updateClientContract(
  prisma: PrismaClient,
  id: string,
  input: Partial<CreateClientContractInput> & { status?: string },
  userId: string
): Promise<any> {
  const data: any = {
    updatedBy: userId,
    updatedAt: new Date(),
  };
  
  if (input.name) data.name = input.name;
  if (input.type) data.type = input.type;
  if (input.startDate) data.startDate = new Date(input.startDate);
  if (input.endDate) data.endDate = new Date(input.endDate);
  if (input.valueCents !== undefined) data.valueCents = input.valueCents;
  if (input.currency) data.currency = input.currency;
  if (input.hourlyRateCents !== undefined) data.hourlyRateCents = input.hourlyRateCents;
  if (input.monthlyRetainerCents !== undefined) data.monthlyRetainerCents = input.monthlyRetainerCents;
  if (input.terms !== undefined) data.terms = input.terms;
  if (input.attachmentUrl !== undefined) data.attachmentUrl = input.attachmentUrl;
  if (input.status) data.status = input.status;
  
  const contract = await prisma.clientContract.update({
    where: { id },
    data,
  });
  
  logger.info({ contractId: id }, 'Client contract updated');
  
  return contract;
}

/**
 * Get client statistics
 */
export async function getClientStats(
  prisma: PrismaClient,
  clientId: string
): Promise<{
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalContractValueCents: number;
  totalBilledHours: number;
}> {
  const [projectStats, contracts, timeEntries] = await Promise.all([
    prisma.project.groupBy({
      by: ['status'],
      where: { clientId },
      _count: true,
    }),
    prisma.clientContract.findMany({
      where: { clientId, status: 'active' },
      select: { valueCents: true },
    }),
    prisma.timeEntry.aggregate({
      where: {
        project: { clientId },
        status: 'approved',
        isBillable: true,
      },
      _sum: { durationMinutes: true },
    }),
  ]);
  
  const statusCounts: Record<string, number> = projectStats.reduce((acc, curr) => {
    acc[curr.status] = curr._count;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalProjects: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    activeProjects: (statusCounts['active'] || 0) + (statusCounts['in_progress'] || 0),
    completedProjects: statusCounts['completed'] || 0,
    totalContractValueCents: contracts.reduce((sum, c) => sum + c.valueCents, 0),
    totalBilledHours: Math.round((timeEntries._sum.durationMinutes || 0) / 60 * 100) / 100,
  };
}
