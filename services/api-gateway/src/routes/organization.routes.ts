/**
 * Organization Routes - Tenant-facing API for organization settings
 * 
 * These routes are accessible by tenant users to view/update their organization.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getMasterPrisma } from '@oms/database';
import { logger } from '../utils/logger';

const router = Router();

// Extended request with tenant context
interface TenantRequest extends Request {
  tenantContext?: {
    tenantId: string;
    tenantSlug: string;
    databaseUrl: string;
  };
  domainResolution?: {
    tenantSlug?: string;
  };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  legalName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  logo: z.string().optional(),
  reportLogo: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateSettingsSchema = z.object({
  timezone: z.string().min(1),
  dateFormat: z.string().min(1),
  timeFormat: z.enum(['12h', '24h']),
  currency: z.string().min(1),
  language: z.string().optional(),
  fiscalYearStart: z.number().min(1).max(12).optional(),
  workingDays: z.array(z.number()).optional(),
  workStartTime: z.string().optional(),
  workEndTime: z.string().optional(),
});

// ============================================================================
// GET CURRENT ORGANIZATION
// ============================================================================

router.get('/', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_REQUIRED',
          message: 'Tenant context is required',
        },
      });
    }
    
    const prisma = getMasterPrisma();
    
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        legalName: true,
        logo: true,
        status: true,
        email: true,
        phone: true,
        website: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        trialEndsAt: true,
        activatedAt: true,
        createdAt: true,
        metadata: true,
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Organization not found',
        },
      });
    }
    
    res.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        legalName: tenant.legalName,
        logo: tenant.logo,
        status: tenant.status,
        email: tenant.email,
        phone: tenant.phone,
        website: tenant.website,
        address: {
          line1: tenant.addressLine1,
          line2: tenant.addressLine2,
          city: tenant.city,
          state: tenant.state,
          country: tenant.country,
          postalCode: tenant.postalCode,
        },
        // Basic plan info for display
        plan: tenant.subscription?.plan ? {
          id: tenant.subscription.plan.id,
          name: tenant.subscription.plan.name,
          slug: tenant.subscription.plan.slug,
          tier: tenant.subscription.plan.tier,
          description: tenant.subscription.plan.description,
          monthlyPrice: Number(tenant.subscription.plan.monthlyPrice),
          yearlyPrice: Number(tenant.subscription.plan.yearlyPrice),
          currency: tenant.subscription.plan.currency,
          maxUsers: tenant.subscription.plan.maxUsers,
          maxStorage: Number(tenant.subscription.plan.maxStorage),
          maxStorageGB: Math.round(Number(tenant.subscription.plan.maxStorage) / (1024 * 1024 * 1024)),
          maxProjects: tenant.subscription.plan.maxProjects,
          maxClients: tenant.subscription.plan.maxClients,
          features: tenant.subscription.plan.features,
        } : null,
        // Full subscription info for billing
        subscription: tenant.subscription ? {
          id: tenant.subscription.id,
          planId: tenant.subscription.planId,
          status: tenant.subscription.status,
          billingCycle: tenant.subscription.billingCycle,
          currentPeriodStart: tenant.subscription.currentPeriodStart,
          currentPeriodEnd: tenant.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: tenant.subscription.cancelAtPeriodEnd,
          maxUsers: tenant.subscription.maxUsers,
          maxStorage: Number(tenant.subscription.maxStorage),
          maxProjects: tenant.subscription.maxProjects,
          maxClients: tenant.subscription.maxClients,
          stripeSubscriptionId: tenant.subscription.stripeSubscriptionId,
          stripeCustomerId: tenant.subscription.stripeCustomerId,
        } : null,
        trialEndsAt: tenant.trialEndsAt,
        activatedAt: tenant.activatedAt,
        createdAt: tenant.createdAt,
        metadata: tenant.metadata,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get organization');
    next(error);
  }
});

// ============================================================================
// UPDATE CURRENT ORGANIZATION
// ============================================================================

router.put('/', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_REQUIRED',
          message: 'Tenant context is required',
        },
      });
    }
    
    const parsed = updateOrganizationSchema.safeParse(req.body);
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
    
    const prisma = getMasterPrisma();
    
    // Get existing tenant
    const existing = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Organization not found',
        },
      });
    }
    
    // Update tenant
    const updated = await prisma.tenant.update({
      where: { slug: tenantSlug },
      data: {
        name: parsed.data.name,
        legalName: parsed.data.legalName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        website: parsed.data.website,
        addressLine1: parsed.data.addressLine1,
        addressLine2: parsed.data.addressLine2,
        city: parsed.data.city,
        state: parsed.data.state,
        country: parsed.data.country,
        postalCode: parsed.data.postalCode,
        logo: parsed.data.logo,
        reportLogo: parsed.data.reportLogo,
        metadata: parsed.data.metadata as any,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        legalName: true,
        logo: true,
        reportLogo: true,
        status: true,
        email: true,
        phone: true,
        website: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        updatedAt: true,
      },
    });
    
    logger.info({ tenantSlug, updatedFields: Object.keys(parsed.data) }, 'Organization updated');
    
    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        legalName: updated.legalName,
        logo: updated.logo,
        reportLogo: updated.reportLogo,
        status: updated.status,
        email: updated.email,
        phone: updated.phone,
        website: updated.website,
        address: {
          line1: updated.addressLine1,
          line2: updated.addressLine2,
          city: updated.city,
          state: updated.state,
          country: updated.country,
          postalCode: updated.postalCode,
        },
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to update organization');
    next(error);
  }
});

// ============================================================================
// GET ORGANIZATION STATS
// ============================================================================

router.get('/stats', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_REQUIRED',
          message: 'Tenant context is required',
        },
      });
    }
    
    // TODO: Query tenant database for actual stats
    // For now return placeholder stats
    res.json({
      success: true,
      data: {
        employeeCount: 0,
        departmentCount: 0,
        designationCount: 0,
        activeEmployees: 0,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get organization stats');
    next(error);
  }
});

// ============================================================================
// GET DASHBOARD STATS
// ============================================================================

router.get('/dashboard', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantContext?.tenantId;
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_REQUIRED',
          message: 'Tenant context is required',
        },
      });
    }
    
    const masterPrisma = getMasterPrisma();
    
    // Get tenant info with subscription
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: {
        subscription: {
          include: { plan: true },
        },
        settings: true,
      },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' },
      });
    }
    
    // TODO: When tenant database is available, query actual counts
    // For now, we'll return data based on the tenant's subscription limits
    // and placeholder values that would come from the tenant database
    
    const maxUsers = tenant.subscription?.maxUsers || 10;
    const maxProjects = tenant.subscription?.maxProjects || 5;
    const maxStorage = tenant.subscription?.maxStorage || BigInt(10737418240); // 10GB
    
    // Calculate days remaining in trial/subscription
    let daysRemaining = null;
    if (tenant.status === 'TRIAL' && tenant.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(tenant.trialEndsAt);
      daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    } else if (tenant.subscription?.currentPeriodEnd) {
      const now = new Date();
      const periodEnd = new Date(tenant.subscription.currentPeriodEnd);
      daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }
    
    // Return dashboard data
    // Note: In production, employee/project/task counts would come from tenant database
    res.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          plan: tenant.subscription?.plan?.name || 'Free',
          daysRemaining,
        },
        stats: {
          // These would be actual counts from tenant database
          totalEmployees: 0,
          activeEmployees: 0,
          presentToday: 0,
          attendanceRate: 0,
          activeProjects: 0,
          projectsDueThisWeek: 0,
          pendingTasks: 0,
          highPriorityTasks: 0,
          pendingLeaveRequests: 0,
        },
        limits: {
          maxUsers,
          maxProjects,
          maxStorageBytes: maxStorage.toString(),
          maxStorageGB: Math.round(Number(maxStorage) / (1024 * 1024 * 1024)),
        },
        modules: tenant.settings ? {
          employee: tenant.settings.moduleEmployee,
          attendance: tenant.settings.moduleAttendance,
          project: tenant.settings.moduleProject,
          task: tenant.settings.moduleTask,
          client: tenant.settings.moduleClient,
          asset: tenant.settings.moduleAsset,
          hrPayroll: tenant.settings.moduleHrPayroll,
          meeting: tenant.settings.moduleMeeting,
          recruitment: tenant.settings.moduleRecruitment,
          resource: tenant.settings.moduleResource,
          file: tenant.settings.moduleFile,
        } : null,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get dashboard stats');
    next(error);
  }
});

// ============================================================================
// GET ORGANIZATION MEMBERS (Admin users)
// ============================================================================

router.get('/members', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_REQUIRED',
          message: 'Tenant context is required',
        },
      });
    }
    
    const prisma = getMasterPrisma();
    
    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Organization not found',
        },
      });
    }
    
    // Note: Organization members (admin users) are stored in the tenant database,
    // not in the master database. For now, return the tenant owner info as a member.
    // A proper implementation would proxy to the employee service or use tenant-db-manager.
    const members = [{
      id: tenant.id,
      firstName: tenant.name.split(' ')[0] || 'Admin',
      lastName: tenant.name.split(' ').slice(1).join(' ') || '',
      email: tenant.email,
      avatar: null,
      role: 'TENANT_OWNER',
      status: 'ACTIVE',
      joinedAt: tenant.createdAt.toISOString(),
    }];
    
    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get organization members');
    next(error);
  }
});

// ============================================================================
// GET ORGANIZATION SETTINGS (Regional/Locale settings)
// ============================================================================

router.get('/settings', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_REQUIRED',
          message: 'Tenant context is required',
        },
      });
    }
    
    const prisma = getMasterPrisma();
    
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: {
        settings: true,
      },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Organization not found',
        },
      });
    }
    
    // Return settings or defaults
    const settings = tenant.settings || {};
    
    res.json({
      success: true,
      data: {
        settings: {
          timezone: settings.timezone || 'UTC',
          dateFormat: settings.dateFormat || 'DD/MM/YYYY',
          timeFormat: settings.timeFormat === 'TWELVE_HOUR' ? '12h' : '24h',
          currency: settings.currency || 'INR',
          language: settings.language || 'en',
          fiscalYearStart: settings.fiscalYearStart || 1,
          workingDays: settings.workingDays || [1, 2, 3, 4, 5],
          workStartTime: settings.workStartTime || '09:00',
          workEndTime: settings.workEndTime || '18:00',
        },
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get organization settings');
    next(error);
  }
});

// ============================================================================
// UPDATE ORGANIZATION SETTINGS (Regional/Locale settings)
// ============================================================================

router.put('/settings', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_REQUIRED',
          message: 'Tenant context is required',
        },
      });
    }
    
    const parsed = updateSettingsSchema.safeParse(req.body);
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
    
    const prisma = getMasterPrisma();
    const data = parsed.data;
    
    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Organization not found',
        },
      });
    }
    
    // Map timeFormat to database enum
    const timeFormatDb = data.timeFormat === '12h' ? 'TWELVE_HOUR' : 'TWENTY_FOUR_HOUR';
    
    // Upsert settings
    const updatedSettings = await prisma.tenantSettings.upsert({
      where: { tenantId: tenant.id },
      update: {
        timezone: data.timezone,
        dateFormat: data.dateFormat,
        timeFormat: timeFormatDb,
        currency: data.currency,
        language: data.language || 'en',
        fiscalYearStart: data.fiscalYearStart || 1,
        workingDays: data.workingDays || [1, 2, 3, 4, 5],
        workStartTime: data.workStartTime || '09:00',
        workEndTime: data.workEndTime || '18:00',
      },
      create: {
        tenantId: tenant.id,
        timezone: data.timezone,
        dateFormat: data.dateFormat,
        timeFormat: timeFormatDb,
        currency: data.currency,
        language: data.language || 'en',
        fiscalYearStart: data.fiscalYearStart || 1,
        workingDays: data.workingDays || [1, 2, 3, 4, 5],
        workStartTime: data.workStartTime || '09:00',
        workEndTime: data.workEndTime || '18:00',
      },
    });
    
    res.json({
      success: true,
      data: {
        settings: {
          timezone: updatedSettings.timezone,
          dateFormat: updatedSettings.dateFormat,
          timeFormat: updatedSettings.timeFormat === 'TWELVE_HOUR' ? '12h' : '24h',
          currency: updatedSettings.currency,
          language: updatedSettings.language,
          fiscalYearStart: updatedSettings.fiscalYearStart,
          workingDays: updatedSettings.workingDays,
          workStartTime: updatedSettings.workStartTime,
          workEndTime: updatedSettings.workEndTime,
        },
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to update organization settings');
    next(error);
  }
});

export default router;
