/**
 * Tenant Management Routes - Platform Admin API
 * 
 * These routes are only accessible by platform admins on the main domain.
 * They handle tenant CRUD operations and database provisioning.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getMasterPrisma } from '@oms/database';
import { getTenantDbManager } from '@oms/tenant-db-manager';
import { logger } from '../utils/logger';

const router = Router();

const fetchTenantCounts = async (slug: string) => {
  try {
    const dbManager = getTenantDbManager();
    const client = await dbManager.getClientBySlug(slug);
    const [userCount, employeeCount] = await Promise.all([
      (client as any).user.count({ where: { deletedAt: null } }),
      (client as any).employee.count({ where: { deletedAt: null } }),
    ]);
    return { userCount, employeeCount };
  } catch (error) {
    logger.warn({ error, slug }, 'Tenant counts unavailable');
    return { userCount: 0, employeeCount: 0 };
  }
};

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
  email: z.string().email(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  legalName: z.string().optional(),
  logo: z.string().nullable().optional(),
  reportLogo: z.string().nullable().optional(),
  // Admin user details
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  // Address
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  // Plan
  planId: z.string().uuid().optional(),
  trialDays: z.number().min(0).max(90).default(14),
});

const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  legalName: z.string().optional(),
  logo: z.string().nullable().optional(),
  reportLogo: z.string().nullable().optional(),
  status: z.enum(['PENDING', 'TRIAL', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'TERMINATED']).optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
});

// ============================================================================
// LIST TENANTS
// ============================================================================

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getMasterPrisma();
    
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    
    const where: any = {
      deletedAt: null,
    };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    const counts = await Promise.all(
      tenants.map((tenant: any) => fetchTenantCounts(tenant.slug))
    );

    res.json({
      success: true,
      data: tenants.map((t: any, index: number) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        email: t.email,
        logo: t.logo,
        status: t.status,
        plan: t.subscription?.plan?.name || 'No Plan',
        userCount: counts[index]?.userCount ?? 0,
        createdAt: t.createdAt,
        trialEndsAt: t.trialEndsAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error({ error }, 'List tenants error');
    next(error);
  }
});

// ============================================================================
// GET TENANT BY ID
// ============================================================================

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getMasterPrisma();
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        settings: true,
        subscription: {
          include: {
            plan: true,
          },
        },
        subdomains: true,
      },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
      });
    }

    let userCount = 0;
    let employeeCount = 0;
    let adminUser: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      status: string;
      lastLoginAt: Date | null;
      createdAt: Date;
    } | null = null;

    try {
      const dbManager = getTenantDbManager();
      const client = await dbManager.getClientBySlug(tenant.slug);
      const [userCountResult, employeeCountResult, adminCandidate, fallbackAdmin] =
        await Promise.all([
          (client as any).user.count({ where: { deletedAt: null } }),
          (client as any).employee.count({ where: { deletedAt: null } }),
          (client as any).user.findFirst({
            where: {
              deletedAt: null,
              roles: { some: { role: { slug: 'tenant_admin' } } },
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              status: true,
              lastLoginAt: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          }),
          (client as any).user.findFirst({
            where: { deletedAt: null },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              status: true,
              lastLoginAt: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          }),
        ]);
      userCount = userCountResult;
      employeeCount = employeeCountResult;
      adminUser = adminCandidate || fallbackAdmin;
    } catch (error) {
      logger.warn({ error, tenantId: tenant.id }, 'Tenant detail counts unavailable');
    }

    res.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        phone: tenant.phone,
        website: tenant.website,
        logo: tenant.logo,
        reportLogo: (tenant as any).reportLogo,
        legalName: tenant.legalName,
        taxId: (tenant as any).taxId || null,
        status: tenant.status,
        addressLine1: tenant.addressLine1,
        addressLine2: tenant.addressLine2,
        city: tenant.city,
        state: tenant.state,
        country: tenant.country,
        postalCode: tenant.postalCode,
        timezone: (tenant as any).timezone || 'UTC',
        dateFormat: (tenant as any).dateFormat || 'MM/DD/YYYY',
        currency: (tenant as any).currency || 'USD',
        storageUsed: 0, // Will be calculated from actual usage
        trialEndsAt: tenant.trialEndsAt,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        settings: tenant.settings,
        subdomains: tenant.subdomains,
        subscription: tenant.subscription ? {
          id: tenant.subscription.id,
          status: tenant.subscription.status,
          billingCycle: tenant.subscription.billingCycle,
          amount: Number(tenant.subscription.amount),
          currency: tenant.subscription.currency,
          maxUsers: tenant.subscription.maxUsers,
          maxStorage: Number(tenant.subscription.maxStorage),
          maxProjects: tenant.subscription.maxProjects,
          maxClients: tenant.subscription.maxClients,
          currentPeriodStart: tenant.subscription.currentPeriodStart,
          currentPeriodEnd: tenant.subscription.currentPeriodEnd,
          trialStart: tenant.subscription.trialStart,
          trialEnd: tenant.subscription.trialEnd,
          canceledAt: tenant.subscription.canceledAt,
          cancelAtPeriodEnd: tenant.subscription.cancelAtPeriodEnd,
          plan: tenant.subscription.plan ? {
            id: tenant.subscription.plan.id,
            name: tenant.subscription.plan.name,
            slug: tenant.subscription.plan.slug,
            tier: tenant.subscription.plan.tier,
            monthlyPrice: Number(tenant.subscription.plan.monthlyPrice),
            yearlyPrice: Number(tenant.subscription.plan.yearlyPrice),
            maxUsers: tenant.subscription.plan.maxUsers,
            maxStorage: Number(tenant.subscription.plan.maxStorage),
            maxProjects: tenant.subscription.plan.maxProjects,
            maxClients: tenant.subscription.plan.maxClients,
            features: tenant.subscription.plan.features,
          } : null,
        } : null,
        userCount,
        employeeCount,
        adminUser,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get tenant error');
    next(error);
  }
});

// ============================================================================
// CREATE TENANT
// ============================================================================

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
          details: parsed.error.errors,
        },
      });
    }
    
    const data = parsed.data;
    const prisma = getMasterPrisma();
    
    // Check if slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: data.slug },
    });
    
    if (existingTenant) {
      return res.status(400).json({
        success: false,
        error: { code: 'SLUG_EXISTS', message: 'A tenant with this slug already exists' },
      });
    }
    
    const tenantId = uuidv4();
    const databaseName = `oms_tenant_${data.slug}`;
    
    // Create tenant in master database
    const tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: data.name,
        slug: data.slug,
        legalName: data.legalName,
        logo: data.logo,
        reportLogo: data.reportLogo,
        email: data.email,
        phone: data.phone,
        website: data.website || null,
        databaseName,
        status: data.trialDays > 0 ? 'TRIAL' : 'ACTIVE',
        trialEndsAt: data.trialDays > 0 
          ? new Date(Date.now() + data.trialDays * 24 * 60 * 60 * 1000) 
          : null,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
      },
    });
    
    // Create tenant database
    logger.info({ tenantId, slug: data.slug }, 'Creating tenant database');
    
    try {
      // Create the database
      await prisma.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      
      // Run migrations on tenant database
      const dbManager = getTenantDbManager();
      await dbManager.migrateTenantDatabase(data.slug);
      
      // Seed tenant with admin user
      const hashedPassword = await bcrypt.hash(data.adminPassword, 10);
      await dbManager.seedTenantDatabase(data.slug, {
        adminEmail: data.adminEmail,
        adminPasswordHash: hashedPassword,
        adminFirstName: data.adminFirstName,
        adminLastName: data.adminLastName,
      });
      
      // Update tenant status to indicate provisioning complete
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { activatedAt: new Date() },
      });
      
      logger.info({ tenantId, slug: data.slug }, 'Tenant provisioned successfully');
      
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      const errorStack = dbError instanceof Error ? dbError.stack : undefined;
      logger.error({ 
        error: errorMessage, 
        stack: errorStack,
        tenantId 
      }, 'Failed to provision tenant database');
      
      // Mark tenant as failed
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { 
          status: 'PENDING',
          metadata: { provisioningError: errorMessage },
        },
      });
      
      return res.status(500).json({
        success: false,
        error: { 
          code: 'PROVISIONING_FAILED', 
          message: `Tenant created but database provisioning failed: ${errorMessage}`,
        },
      });
    }
    
    res.status(201).json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        adminEmail: data.adminEmail,
        loginUrl: `http://${data.slug}.localhost:3000/login`,
      },
      message: 'Tenant created successfully',
    });
    
  } catch (error) {
    logger.error({ error }, 'Create tenant error');
    next(error);
  }
});

// ============================================================================
// UPDATE TENANT
// ============================================================================

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
    }
    
    const prisma = getMasterPrisma();
    
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        suspendedAt: parsed.data.status === 'SUSPENDED' ? new Date() : undefined,
        terminatedAt: parsed.data.status === 'TERMINATED' ? new Date() : undefined,
      },
    });
    
    res.json({ success: true, data: tenant });
  } catch (error) {
    logger.error({ error }, 'Update tenant error');
    next(error);
  }
});

// ============================================================================
// DELETE TENANT (Soft delete with subscription cancellation)
// ============================================================================

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getMasterPrisma();
    const { hardDelete } = req.query; // If true, also drop database
    
    // Get tenant details first
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: { id: true, slug: true, databaseName: true },
    });
    
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }
    
    // Use transaction to update tenant and cancel subscriptions
    await prisma.$transaction(async (tx) => {
      // Update tenant status
      await tx.tenant.update({
        where: { id: req.params.id },
        data: {
          deletedAt: new Date(),
          status: 'TERMINATED',
          terminatedAt: new Date(),
        },
      });
      
      // Cancel all subscriptions for this tenant
      await tx.subscription.updateMany({
        where: { tenantId: req.params.id },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
        },
      });
    });
    
    logger.info({ tenantId: req.params.id, tenantSlug: tenant.slug }, 'Tenant soft deleted and subscriptions canceled');
    
    // If hard delete requested, also drop the database
    if (hardDelete === 'true') {
      try {
        const dbName = tenant.databaseName || `oms_tenant_${tenant.slug}`;
        
        // Import pg for raw database operations
        const { Pool } = require('pg');
        const pool = new Pool({
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT || '5432'),
          user: process.env.DATABASE_USER || 'postgres',
          password: process.env.DATABASE_PASSWORD || 'password',
          database: 'postgres', // Connect to default database to drop tenant db
        });
        
        // Terminate all connections to the tenant database
        await pool.query(`
          SELECT pg_terminate_backend(pid) 
          FROM pg_stat_activity 
          WHERE datname = $1 AND pid <> pg_backend_pid()
        `, [dbName]);
        
        // Drop the database
        await pool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
        await pool.end();
        
        // Hard delete tenant record from master
        await prisma.tenant.delete({
          where: { id: req.params.id },
        });
        
        logger.info({ tenantId: req.params.id, dbName }, 'Tenant database dropped and record permanently deleted');
        
        res.json({ 
          success: true, 
          message: 'Tenant permanently deleted with database dropped',
          hardDeleted: true,
        });
      } catch (dbError) {
        logger.error({ error: dbError, tenantId: req.params.id }, 'Failed to drop tenant database');
        res.json({ 
          success: true, 
          message: 'Tenant soft deleted, but failed to drop database',
          hardDeleted: false,
          dbError: (dbError as Error).message,
        });
      }
    } else {
      res.json({ success: true, message: 'Tenant deleted successfully (soft delete)', hardDeleted: false });
    }
  } catch (error) {
    logger.error({ error }, 'Delete tenant error');
    next(error);
  }
});

// ============================================================================
// HARD DELETE TENANT (Permanently remove tenant and database)
// ============================================================================

router.delete('/:id/permanent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getMasterPrisma();
    
    // Get tenant details
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: { id: true, slug: true, databaseName: true, status: true },
    });
    
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }
    
    // Only allow permanent delete if already terminated
    if (tenant.status !== 'TERMINATED') {
      return res.status(400).json({ 
        success: false, 
        error: 'Tenant must be terminated (soft deleted) before permanent deletion',
      });
    }
    
    const dbName = tenant.databaseName || `oms_tenant_${tenant.slug}`;
    
    try {
      // Import pg for raw database operations
      const { Pool } = require('pg');
      const pool = new Pool({
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'password',
        database: 'postgres',
      });
      
      // Terminate all connections
      await pool.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [dbName]);
      
      // Drop the database
      await pool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
      await pool.end();
      
      logger.info({ tenantId: tenant.id, dbName }, 'Tenant database dropped');
    } catch (dbError) {
      logger.warn({ error: dbError, dbName }, 'Failed to drop database (may not exist)');
    }
    
    // Delete tenant record (cascades to subscriptions, etc.)
    await prisma.tenant.delete({
      where: { id: req.params.id },
    });
    
    logger.info({ tenantId: req.params.id, tenantSlug: tenant.slug }, 'Tenant permanently deleted');
    
    res.json({ 
      success: true, 
      message: 'Tenant and database permanently deleted',
    });
  } catch (error) {
    logger.error({ error }, 'Permanent delete tenant error');
    next(error);
  }
});

// ============================================================================
// TENANT STATS
// ============================================================================

router.get('/stats/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getMasterPrisma();
    
    const [total, active, trial, suspended] = await Promise.all([
      prisma.tenant.count({ where: { deletedAt: null } }),
      prisma.tenant.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.tenant.count({ where: { status: 'TRIAL', deletedAt: null } }),
      prisma.tenant.count({ where: { status: 'SUSPENDED', deletedAt: null } }),
    ]);
    
    res.json({
      success: true,
      data: { total, active, trial, suspended },
    });
  } catch (error) {
    logger.error({ error }, 'Tenant stats error');
    next(error);
  }
});

// ============================================================================
// PLATFORM DASHBOARD STATS
// ============================================================================

router.get('/stats/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getMasterPrisma();
    
    // Get tenant counts
    const [totalTenants, activeTenants, trialTenants, suspendedTenants, pendingTenants] = await Promise.all([
      prisma.tenant.count({ where: { deletedAt: null } }),
      prisma.tenant.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.tenant.count({ where: { status: 'TRIAL', deletedAt: null } }),
      prisma.tenant.count({ where: { status: 'SUSPENDED', deletedAt: null } }),
      prisma.tenant.count({ where: { status: 'PENDING', deletedAt: null } }),
    ]);
    
    // Get subscription stats
    const [activeSubscriptions, trialingSubscriptions, cancelledSubscriptions, subscriptionsByPlan] = await Promise.all([
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: 'TRIALING' } }),
      prisma.subscription.count({ where: { status: 'CANCELED' } }),
      prisma.subscription.groupBy({
        by: ['planId'],
        _count: { id: true },
        _sum: { amount: true },
        where: { status: { in: ['ACTIVE', 'TRIALING'] } },
      }),
    ]);
    
    // Get revenue data (monthly recurring revenue from active subscriptions)
    const monthlyRevenue = await prisma.subscription.aggregate({
      where: { 
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
      },
      _sum: { amount: true },
    });
    
    const yearlyRevenue = await prisma.subscription.aggregate({
      where: { 
        status: 'ACTIVE',
        billingCycle: 'YEARLY',
      },
      _sum: { amount: true },
    });
    
    // Calculate MRR (Monthly Recurring Revenue)
    const monthlyMRR = Number(monthlyRevenue._sum.amount || 0);
    const yearlyMRR = Number(yearlyRevenue._sum.amount || 0) / 12;
    const totalMRR = monthlyMRR + yearlyMRR;
    
    // Get recent tenants (last 5)
    const recentTenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
    
    // Get plan distribution with revenue
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
    });
    
    const planDistribution = await Promise.all(
      plans.map(async (plan) => {
        const count = await prisma.subscription.count({
          where: { planId: plan.id, status: { in: ['ACTIVE', 'TRIALING'] } },
        });
        const revenue = await prisma.subscription.aggregate({
          where: { planId: plan.id, status: 'ACTIVE' },
          _sum: { amount: true },
        });
        return {
          planId: plan.id,
          planName: plan.name,
          count,
          monthlyRevenue: Number(revenue._sum.amount || 0),
        };
      })
    );
    
    // Get tenants created in last 30 days for trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const [tenantsLast30Days, tenantsPrevious30Days] = await Promise.all([
      prisma.tenant.count({
        where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
      }),
      prisma.tenant.count({
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, deletedAt: null },
      }),
    ]);
    
    const tenantGrowthPercent = tenantsPrevious30Days > 0
      ? Math.round(((tenantsLast30Days - tenantsPrevious30Days) / tenantsPrevious30Days) * 100)
      : tenantsLast30Days > 0 ? 100 : 0;
    
    // Calculate ARR (Annual Recurring Revenue)
    const totalARR = totalMRR * 12;
    
    // Calculate average revenue per tenant
    const avgRevenuePerTenant = activeTenants > 0 ? Math.round(totalMRR / activeTenants) : 0;
    
    // Calculate trial conversion rate (simplified - active / (active + cancelled))
    const totalCycledSubscriptions = activeSubscriptions + cancelledSubscriptions;
    const conversionRate = totalCycledSubscriptions > 0 
      ? Math.round((activeSubscriptions / totalCycledSubscriptions) * 100)
      : 0;
    
    res.json({
      success: true,
      data: {
        stats: {
          totalTenants,
          activeTenants,
          trialTenants,
          suspendedTenants,
          pendingTenants,
          activeSubscriptions,
          trialingSubscriptions,
          cancelledSubscriptions,
          totalMRR,
          totalARR,
          avgRevenuePerTenant,
          conversionRate,
          newTenantsThisMonth: tenantsLast30Days,
          tenantGrowthPercent,
        },
        recentTenants: recentTenants.map(t => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.status,
          plan: t.subscription?.plan?.name || 'No Plan',
          createdAt: t.createdAt,
        })),
        planDistribution,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Dashboard stats error');
    next(error);
  }
});

export default router;
