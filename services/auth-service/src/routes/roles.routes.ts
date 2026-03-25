/**
 * Roles Management Routes
 * CRUD operations for organization roles
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantDbManager } from '@oms/tenant-db-manager';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional().default(false),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().optional(),
});

// ============================================================================
// HELPERS
// ============================================================================

async function getTenantPrisma(req: Request) {
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  if (!tenantSlug) {
    throw new Error('Tenant slug is required');
  }
  const dbManager = getTenantDbManager();
  return dbManager.getClientBySlug(tenantSlug);
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Default roles to seed if none exist
const DEFAULT_ROLES = [
  { name: 'Owner', slug: 'owner', description: 'Organization owner with full access', isSystem: true },
  { name: 'Admin', slug: 'admin', description: 'Administrator with broad management permissions', isSystem: true },
  { name: 'HR', slug: 'hr', description: 'Human Resources role for employee management', isSystem: false },
  { name: 'Finance', slug: 'finance', description: 'Finance role for billing and payroll', isSystem: false },
  { name: 'Project Manager', slug: 'project-manager', description: 'Manages projects and teams', isSystem: false },
  { name: 'Team Leader', slug: 'team-leader', description: 'Leads a team of employees', isSystem: false },
  { name: 'Employee', slug: 'employee', description: 'Regular employee role', isSystem: true, isDefault: true },
  { name: 'Contract Employee', slug: 'contract-employee', description: 'Contractor with limited access', isSystem: false },
  { name: 'Office Boy', slug: 'office-boy', description: 'Support staff role', isSystem: false },
  { name: 'Intern', slug: 'intern', description: 'Intern or trainee with basic access', isSystem: false },
];

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /roles - List all roles
 */
router.get('/roles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = await getTenantPrisma(req);
    
    const roles = await prisma.role.findMany({
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    res.json({
      success: true,
      data: roles.map((role: any) => ({
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystem: role.isSystem,
        isDefault: role.isDefault,
        usersCount: role._count?.users || 0,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      })),
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to fetch roles');
    next(error);
  }
});

/**
 * GET /roles/permissions - Get all available permissions grouped by resource
 * NOTE: This route MUST be defined before /roles/:id to avoid matching 'permissions' as an ID
 */
router.get('/roles/permissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = await getTenantPrisma(req);
    
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });

    // Group permissions by resource
    const grouped: Record<string, { id: string; action: string; description: string | null }[]> = {};
    for (const p of permissions) {
      if (!grouped[p.resource]) {
        grouped[p.resource] = [];
      }
      grouped[p.resource].push({
        id: p.id,
        action: p.action,
        description: p.description,
      });
    }

    res.json({
      success: true,
      data: {
        permissions,
        grouped,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to fetch permissions');
    next(error);
  }
});

/**
 * GET /roles/:id - Get a single role
 */
router.get('/roles/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = await getTenantPrisma(req);
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' },
      });
    }

    res.json({
      success: true,
      data: {
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystem: role.isSystem,
        isDefault: role.isDefault,
        usersCount: role._count?.users || 0,
        permissions: role.permissions.map((rp: any) => ({
          id: rp.permission.id,
          resource: rp.permission.resource,
          action: rp.permission.action,
          description: rp.permission.description,
          scope: rp.scope,
        })),
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to fetch role');
    next(error);
  }
});

/**
 * POST /roles - Create a new role
 */
router.post('/roles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = await getTenantPrisma(req);
    
    const parsed = createRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid request data',
          details: parsed.error.errors,
        },
      });
    }

    const { name, description, isDefault } = parsed.data;
    const slug = generateSlug(name);

    // Check if role with same name or slug exists
    const existing = await prisma.role.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug },
        ],
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'ROLE_EXISTS', message: 'A role with this name already exists' },
      });
    }

    // If this role is set as default, unset other defaults
    if (isDefault) {
      await prisma.role.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const role = await prisma.role.create({
      data: {
        name,
        slug,
        description: description || null,
        isSystem: false,
        isDefault: isDefault || false,
      },
    });

    logger.info({ roleId: role.id, roleName: name }, 'Role created');

    res.status(201).json({
      success: true,
      data: role,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to create role');
    next(error);
  }
});

/**
 * PUT /roles/:id - Update a role
 */
router.put('/roles/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = await getTenantPrisma(req);
    const { id } = req.params;

    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid request data',
          details: parsed.error.errors,
        },
      });
    }

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' },
      });
    }

    // System roles can only have their description updated
    if (existing.isSystem && (parsed.data.name || parsed.data.isDefault !== undefined)) {
      return res.status(403).json({
        success: false,
        error: { code: 'SYSTEM_ROLE', message: 'System roles cannot be modified' },
      });
    }

    const updateData: any = {};
    
    if (parsed.data.name) {
      const slug = generateSlug(parsed.data.name);
      
      // Check if another role has this name/slug
      const duplicate = await prisma.role.findFirst({
        where: {
          id: { not: id },
          OR: [
            { name: { equals: parsed.data.name, mode: 'insensitive' } },
            { slug },
          ],
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          error: { code: 'ROLE_EXISTS', message: 'A role with this name already exists' },
        });
      }

      updateData.name = parsed.data.name;
      updateData.slug = slug;
    }

    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description;
    }

    if (parsed.data.isDefault !== undefined) {
      // If setting as default, unset others
      if (parsed.data.isDefault) {
        await prisma.role.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      updateData.isDefault = parsed.data.isDefault;
    }

    const role = await prisma.role.update({
      where: { id },
      data: updateData,
    });

    logger.info({ roleId: id }, 'Role updated');

    res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to update role');
    next(error);
  }
});

/**
 * DELETE /roles/:id - Delete a role
 */
router.delete('/roles/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = await getTenantPrisma(req);
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' },
      });
    }

    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        error: { code: 'SYSTEM_ROLE', message: 'System roles cannot be deleted' },
      });
    }

    if (role._count.users > 0) {
      return res.status(409).json({
        success: false,
        error: { 
          code: 'ROLE_IN_USE', 
          message: `Cannot delete role. ${role._count.users} user(s) are assigned to this role.`,
        },
      });
    }

    await prisma.role.delete({ where: { id } });

    logger.info({ roleId: id, roleName: role.name }, 'Role deleted');

    res.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to delete role');
    next(error);
  }
});

/**
 * POST /roles/seed - Seed default roles (for initial setup)
 */
router.post('/roles/seed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = await getTenantPrisma(req);
    
    // Check if roles already exist
    const existingCount = await prisma.role.count();
    if (existingCount > 0) {
      return res.json({
        success: true,
        message: 'Roles already exist, skipping seed',
        data: { existingCount },
      });
    }

    // Create default roles
    const created = await prisma.role.createMany({
      data: DEFAULT_ROLES.map(role => ({
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystem: role.isSystem,
        isDefault: role.isDefault || false,
      })),
    });

    logger.info({ count: created.count }, 'Default roles seeded');

    res.status(201).json({
      success: true,
      message: 'Default roles created successfully',
      data: { created: created.count },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to seed roles');
    next(error);
  }
});

// ============================================================================
// ROLE PERMISSIONS ROUTES
// ============================================================================

/**
 * GET /roles/:id/permissions - Get permissions for a specific role
 */
router.get('/roles/:id/permissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = await getTenantPrisma(req);
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' },
      });
    }

    // Return list of permission IDs that this role has
    const permissionIds = role.permissions.map((rp: any) => rp.permissionId);
    const permissionsWithDetails = role.permissions.map((rp: any) => ({
      id: rp.permission.id,
      resource: rp.permission.resource,
      action: rp.permission.action,
      description: rp.permission.description,
      scope: rp.scope,
    }));

    res.json({
      success: true,
      data: {
        roleId: role.id,
        roleName: role.name,
        isSystem: role.isSystem,
        permissionIds,
        permissions: permissionsWithDetails,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to fetch role permissions');
    next(error);
  }
});

/**
 * PUT /roles/:id/permissions - Update permissions for a role
 * Body: { permissionIds: string[] }
 */
router.put('/roles/:id/permissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = await getTenantPrisma(req);
    const { id } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'permissionIds must be an array' },
      });
    }

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return res.status(404).json({
        success: false,
        error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' },
      });
    }

    // Validate that all permission IDs exist
    const validPermissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });
    const validIds = new Set(validPermissions.map(p => p.id));
    const invalidIds = permissionIds.filter((pid: string) => !validIds.has(pid));
    
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'INVALID_PERMISSIONS', 
          message: `Invalid permission IDs: ${invalidIds.join(', ')}` 
        },
      });
    }

    // Use a transaction to update permissions
    await prisma.$transaction(async (tx: any) => {
      // Remove all existing permissions for this role
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Add new permissions
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId: string) => ({
            roleId: id,
            permissionId,
          })),
        });
      }
    });

    logger.info({ roleId: id, permissionCount: permissionIds.length }, 'Role permissions updated');

    res.json({
      success: true,
      message: 'Role permissions updated successfully',
      data: {
        roleId: id,
        permissionCount: permissionIds.length,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to update role permissions');
    next(error);
  }
});

export default router;
