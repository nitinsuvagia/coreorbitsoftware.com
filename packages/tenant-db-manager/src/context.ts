/**
 * Tenant Context
 * 
 * Provides AsyncLocalStorage-based tenant context for request handling.
 * This allows accessing the current tenant anywhere in the request lifecycle
 * without passing it through every function.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { PrismaClient } from '@prisma/client';
import { getTenantDbManager, TenantLookupResult } from './manager';

// ============================================================================
// TENANT CONTEXT TYPE
// ============================================================================

export interface TenantContext {
  // Tenant info
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: string;
  
  // Database
  databaseName: string;
  prisma: PrismaClient;
  
  // Request info
  requestId?: string;
  userId?: string;
  userRoles?: string[];
  
  // Timestamps
  createdAt: Date;
}

// ============================================================================
// ASYNC LOCAL STORAGE
// ============================================================================

const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Get current tenant context
 * Throws if not in a tenant context
 */
export function getTenantContext(): TenantContext {
  const context = tenantStorage.getStore();
  if (!context) {
    throw new Error('Not in tenant context. Ensure request passes through tenant middleware.');
  }
  return context;
}

/**
 * Get current tenant context or null if not available
 */
export function getTenantContextOrNull(): TenantContext | null {
  return tenantStorage.getStore() || null;
}

/**
 * Get current tenant's Prisma client
 */
export function getTenantPrisma(): PrismaClient {
  return getTenantContext().prisma;
}

/**
 * Get current tenant ID
 */
export function getCurrentTenantId(): string {
  return getTenantContext().tenantId;
}

/**
 * Get current tenant slug
 */
export function getCurrentTenantSlug(): string {
  return getTenantContext().tenantSlug;
}

// ============================================================================
// CONTEXT RUNNERS
// ============================================================================

/**
 * Run a function within a tenant context
 */
export async function runWithTenantContext<T>(
  tenantSlug: string,
  fn: () => Promise<T> | T,
  options?: {
    requestId?: string;
    userId?: string;
    userRoles?: string[];
  }
): Promise<T> {
  const manager = getTenantDbManager();
  
  // Get tenant info and client
  const tenantInfo = await manager.getTenantBySlug(tenantSlug);
  const prisma = await manager.getClientBySlug(tenantSlug);
  
  // Create context
  const context: TenantContext = {
    tenantId: tenantInfo.id,
    tenantSlug: tenantInfo.slug,
    tenantName: tenantInfo.name,
    tenantStatus: tenantInfo.status,
    databaseName: tenantInfo.databaseName,
    prisma,
    requestId: options?.requestId,
    userId: options?.userId,
    userRoles: options?.userRoles,
    createdAt: new Date(),
  };
  
  // Run function with context
  return tenantStorage.run(context, fn);
}

/**
 * Run a function with tenant context from tenant ID
 */
export async function runWithTenantContextById<T>(
  tenantId: string,
  fn: () => Promise<T> | T,
  options?: {
    requestId?: string;
    userId?: string;
    userRoles?: string[];
  }
): Promise<T> {
  const manager = getTenantDbManager();
  
  // Get tenant info and client
  const tenantInfo = await manager.getTenantById(tenantId);
  const prisma = await manager.getClientById(tenantId);
  
  // Create context
  const context: TenantContext = {
    tenantId: tenantInfo.id,
    tenantSlug: tenantInfo.slug,
    tenantName: tenantInfo.name,
    tenantStatus: tenantInfo.status,
    databaseName: tenantInfo.databaseName,
    prisma,
    requestId: options?.requestId,
    userId: options?.userId,
    userRoles: options?.userRoles,
    createdAt: new Date(),
  };
  
  // Run function with context
  return tenantStorage.run(context, fn);
}

/**
 * Run a function with an existing tenant context (for nested operations)
 */
export function runWithExistingContext<T>(
  context: TenantContext,
  fn: () => Promise<T> | T
): Promise<T> | T {
  return tenantStorage.run(context, fn);
}

// ============================================================================
// MIDDLEWARE HELPER
// ============================================================================

/**
 * Create tenant context from lookup result and prisma client
 * Used by middleware
 */
export function createTenantContext(
  tenantInfo: TenantLookupResult,
  prisma: PrismaClient,
  options?: {
    requestId?: string;
    userId?: string;
    userRoles?: string[];
  }
): TenantContext {
  return {
    tenantId: tenantInfo.id,
    tenantSlug: tenantInfo.slug,
    tenantName: tenantInfo.name,
    tenantStatus: tenantInfo.status,
    databaseName: tenantInfo.databaseName,
    prisma,
    requestId: options?.requestId,
    userId: options?.userId,
    userRoles: options?.userRoles,
    createdAt: new Date(),
  };
}

/**
 * Run with pre-created context (for middleware)
 */
export function runInTenantContext<T>(
  context: TenantContext,
  fn: () => Promise<T> | T
): Promise<T> | T {
  return tenantStorage.run(context, fn);
}

export default {
  getTenantContext,
  getTenantContextOrNull,
  getTenantPrisma,
  getCurrentTenantId,
  getCurrentTenantSlug,
  runWithTenantContext,
  runWithTenantContextById,
  createTenantContext,
  runInTenantContext,
};
