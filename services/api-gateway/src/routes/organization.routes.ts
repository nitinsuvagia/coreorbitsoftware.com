/**
 * Organization Routes - Tenant-facing API for organization settings
 * 
 * These routes are accessible by tenant users to view/update their organization.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getMasterPrisma } from '@oms/database';
import { getTenantPrismaBySlug } from '../utils/database';
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

// Schema for day working hours - all fields optional except isWorkingDay
const dayWorkingHoursSchema = z.object({
  isWorkingDay: z.boolean(),
  isHalfDay: z.boolean().optional().default(false),
  startTime: z.string().optional().default(''),
  endTime: z.string().optional().default(''),
});

// Schema for weekly working hours - all days optional to allow partial updates
const weeklyWorkingHoursSchema = z.object({
  sunday: dayWorkingHoursSchema.optional(),
  monday: dayWorkingHoursSchema.optional(),
  tuesday: dayWorkingHoursSchema.optional(),
  wednesday: dayWorkingHoursSchema.optional(),
  thursday: dayWorkingHoursSchema.optional(),
  friday: dayWorkingHoursSchema.optional(),
  saturday: dayWorkingHoursSchema.optional(),
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
  weeklyWorkingHours: weeklyWorkingHoursSchema.optional(),
  excludeHolidaysFromLeave: z.boolean().optional(),
  excludeWeekendsFromLeave: z.boolean().optional(),
  enabledHolidayTypes: z.object({
    public: z.boolean(),
    optional: z.boolean(),
    restricted: z.boolean(),
  }).optional(),
  optionalHolidayQuota: z.number().min(1).max(10).optional(),
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
        reportLogo: (tenant as any).reportLogo || null,
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
    
    // Get tenant database for real stats
    let stats = {
      totalEmployees: 0,
      activeEmployees: 0,
      presentToday: 0,
      attendanceRate: 0,
      activeProjects: 0,
      projectsDueThisWeek: 0,
      pendingTasks: 0,
      highPriorityTasks: 0,
      completedTasks: 0,
      pendingLeaveRequests: 0,
    };
    
    try {
      const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
      
      // Get today's date boundaries
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Get this week's boundaries (Monday to Sunday)
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(today.getDate() - daysToMonday);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      
      // Query employee stats
      const [totalEmployees, activeEmployees] = await Promise.all([
        tenantPrisma.employee.count(),
        tenantPrisma.employee.count({ where: { status: 'ACTIVE' } }),
      ]);
      
      // Query today's attendance
      const [presentToday, totalActiveForAttendance] = await Promise.all([
        tenantPrisma.attendance.count({
          where: {
            date: {
              gte: today,
              lt: tomorrow,
            },
            status: { in: ['present', 'PRESENT'] },
          },
        }),
        activeEmployees, // Already fetched
      ]);
      
      // Calculate attendance rate
      const attendanceRate = totalActiveForAttendance > 0 
        ? Math.round((presentToday / totalActiveForAttendance) * 100) 
        : 0;
      
      // Query pending leave requests
      const pendingLeaveRequests = await tenantPrisma.leaveRequest.count({
        where: { status: { in: ['pending', 'PENDING'] } },
      });
      
      // Query project stats (if table exists)
      let activeProjects = 0;
      let projectsDueThisWeek = 0;
      try {
        [activeProjects, projectsDueThisWeek] = await Promise.all([
          (tenantPrisma as any).project?.count?.({
            where: { status: { in: ['active', 'ACTIVE', 'in_progress', 'IN_PROGRESS'] } },
          }) || 0,
          (tenantPrisma as any).project?.count?.({
            where: {
              endDate: {
                gte: startOfWeek,
                lt: endOfWeek,
              },
              status: { notIn: ['completed', 'COMPLETED', 'cancelled', 'CANCELLED'] },
            },
          }) || 0,
        ]);
      } catch (e) {
        // Project table might not exist, use 0
        logger.debug('Project table not available for stats');
      }
      
      // Query user todo stats (from user_todos table)
      let pendingTasks = 0;
      let highPriorityTasks = 0;
      let completedTasks = 0;
      try {
        [pendingTasks, highPriorityTasks, completedTasks] = await Promise.all([
          (tenantPrisma as any).userTodo?.count?.({
            where: { isCompleted: false },
          }) || 0,
          (tenantPrisma as any).userTodo?.count?.({
            where: {
              priority: { in: ['HIGH', 'URGENT'] },
              isCompleted: false,
            },
          }) || 0,
          (tenantPrisma as any).userTodo?.count?.({
            where: { isCompleted: true },
          }) || 0,
        ]);
      } catch (e) {
        // UserTodo table might not exist, use 0
        logger.debug('UserTodo table not available for stats');
      }
      
      stats = {
        totalEmployees,
        activeEmployees,
        presentToday,
        attendanceRate,
        activeProjects,
        projectsDueThisWeek,
        pendingTasks,
        highPriorityTasks,
        completedTasks,
        pendingLeaveRequests,
      };
      
    } catch (dbError) {
      logger.warn({ error: (dbError as Error).message }, 'Failed to query tenant database for stats, using defaults');
    }
    
    // Return dashboard data
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
        stats,
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
// GET DASHBOARD RECENT ACTIVITIES
// ============================================================================

router.get('/dashboard/activities', async (req: TenantRequest, res: Response, next: NextFunction) => {
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
    
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    
    try {
      const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
      
      const activities = await tenantPrisma.activity.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          type: true,
          action: true,
          entityType: true,
          entityId: true,
          entityName: true,
          userId: true,
          userName: true,
          details: true,
          metadata: true,
          createdAt: true,
        },
      });
      
      res.json({
        success: true,
        data: activities,
      });
      
    } catch (dbError) {
      logger.warn({ error: (dbError as Error).message }, 'Failed to query activities');
      res.json({
        success: true,
        data: [],
      });
    }
    
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get dashboard activities');
    next(error);
  }
});

// ============================================================================
// GET DASHBOARD ALERTS
// ============================================================================

router.get('/dashboard/alerts', async (req: TenantRequest, res: Response, next: NextFunction) => {
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
    
    const masterPrisma = getMasterPrisma();
    const alerts: Array<{
      id: string;
      type: 'warning' | 'error' | 'info' | 'success';
      title: string;
      message: string;
      priority: number;
      link?: string;
      createdAt: Date;
    }> = [];
    
    // Get tenant info for subscription alerts
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: {
        subscription: { include: { plan: true } },
      },
    });
    
    if (tenant) {
      // Trial expiring alert
      if (tenant.status === 'TRIAL' && tenant.trialEndsAt) {
        const daysRemaining = Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 7 && daysRemaining > 0) {
          alerts.push({
            id: 'trial-expiring',
            type: 'warning',
            title: 'Trial Expiring Soon',
            message: `Your trial ends in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Upgrade to continue using all features.`,
            priority: 1,
            link: '/settings/billing',
            createdAt: new Date(),
          });
        } else if (daysRemaining <= 0) {
          alerts.push({
            id: 'trial-expired',
            type: 'error',
            title: 'Trial Expired',
            message: 'Your trial has expired. Please upgrade to continue.',
            priority: 0,
            link: '/settings/billing',
            createdAt: new Date(),
          });
        }
      }
    }
    
    try {
      const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
      
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Pending leave requests alert
      const pendingLeaveRequests = await tenantPrisma.leaveRequest.count({
        where: { status: { in: ['pending', 'PENDING'] } },
      });
      
      if (pendingLeaveRequests > 0) {
        alerts.push({
          id: 'pending-leaves',
          type: 'info',
          title: 'Pending Leave Requests',
          message: `${pendingLeaveRequests} leave request${pendingLeaveRequests > 1 ? 's' : ''} awaiting approval`,
          priority: 2,
          link: '/hr/leave-requests',
          createdAt: new Date(),
        });
      }
      
      // Employees on probation ending soon (within 7 days)
      const probationEndingSoon = await tenantPrisma.employee.count({
        where: {
          status: 'ACTIVE',
          probationEndDate: {
            gte: today,
            lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      });
      
      if (probationEndingSoon > 0) {
        alerts.push({
          id: 'probation-ending',
          type: 'info',
          title: 'Probation Ending Soon',
          message: `${probationEndingSoon} employee${probationEndingSoon > 1 ? 's have' : ' has'} probation ending this week`,
          priority: 3,
          link: '/employees',
          createdAt: new Date(),
        });
      }
      
      // Upcoming birthdays (within 7 days)
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // For birthday checks, we need to check month and day
      const upcomingBirthdays = await tenantPrisma.employee.count({
        where: {
          status: 'ACTIVE',
          dateOfBirth: { not: null },
          // This is a simplified check - in production you'd use raw SQL or a more complex query
          AND: [
            {
              dateOfBirth: {
                not: null,
              },
            },
          ],
        },
      });
      
      // Check projects due soon (if table exists)
      try {
        const projectsDueSoon = await (tenantPrisma as any).project?.count?.({
          where: {
            endDate: {
              gte: today,
              lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
            },
            status: { notIn: ['completed', 'COMPLETED', 'cancelled', 'CANCELLED'] },
          },
        }) || 0;
        
        if (projectsDueSoon > 0) {
          alerts.push({
            id: 'projects-due-soon',
            type: 'warning',
            title: 'Projects Due Soon',
            message: `${projectsDueSoon} project${projectsDueSoon > 1 ? 's' : ''} due within the next 7 days`,
            priority: 2,
            link: '/projects',
            createdAt: new Date(),
          });
        }
      } catch (e) {
        // Project table might not exist
      }
      
      // Check high priority tasks (if table exists)
      try {
        const highPriorityTasks = await (tenantPrisma as any).task?.count?.({
          where: {
            priority: { in: ['high', 'HIGH', 'urgent', 'URGENT'] },
            status: { notIn: ['done', 'DONE', 'cancelled', 'CANCELLED'] },
          },
        }) || 0;
        
        if (highPriorityTasks > 0) {
          alerts.push({
            id: 'high-priority-tasks',
            type: 'warning',
            title: 'High Priority Tasks',
            message: `${highPriorityTasks} high priority task${highPriorityTasks > 1 ? 's' : ''} need attention`,
            priority: 2,
            link: '/tasks',
            createdAt: new Date(),
          });
        }
      } catch (e) {
        // Task table might not exist
      }
      
    } catch (dbError) {
      logger.warn({ error: (dbError as Error).message }, 'Failed to query tenant database for alerts');
    }
    
    // Sort alerts by priority
    alerts.sort((a, b) => a.priority - b.priority);
    
    res.json({
      success: true,
      data: alerts,
    });
    
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get dashboard alerts');
    next(error);
  }
});

// ============================================================================
// GET ADMIN 360 DASHBOARD - Comprehensive tenant admin dashboard stats
// ============================================================================

router.get('/dashboard/admin-360', async (req: TenantRequest, res: Response, next: NextFunction) => {
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
    
    const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
    
    // Get tenant settings for currency
    const masterPrisma = getMasterPrisma();
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true },
    });
    const currency = tenant?.settings?.currency || 'INR';
    
    // Get today's date boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get this week's boundaries
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysToMonday);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    // ========== ORGANIZATION STATS ==========
    const [
      totalEmployees,
      activeEmployees,
      onLeaveToday,
      totalDepartments,
    ] = await Promise.all([
      tenantPrisma.employee.count(),
      tenantPrisma.employee.count({ where: { status: 'ACTIVE' } }),
      tenantPrisma.leaveRequest.count({
        where: {
          status: { in: ['approved', 'APPROVED'] },
          fromDate: { lte: today },
          toDate: { gte: today },
        },
      }),
      tenantPrisma.department.count({ where: { isActive: true } }),
    ]);
    
    // ========== ATTENDANCE METRICS ==========
    const [
      todayAttendance,
      avgWorkMinutes,
    ] = await Promise.all([
      tenantPrisma.attendance.findMany({
        where: {
          date: { gte: today, lt: tomorrow },
        },
        select: {
          status: true,
          isLate: true,
          isRemote: true,
          workMinutes: true,
        },
      }),
      tenantPrisma.attendance.aggregate({
        where: {
          date: { gte: startOfWeek, lt: tomorrow },
          status: { in: ['present', 'PRESENT'] },
          workMinutes: { gt: 0 },
        },
        _avg: { workMinutes: true },
      }),
    ]);
    
    const todayPresent = todayAttendance.filter(a => 
      a.status === 'present' || a.status === 'PRESENT'
    ).length;
    const todayAbsent = activeEmployees - todayPresent - onLeaveToday;
    const todayLate = todayAttendance.filter(a => a.isLate).length;
    const todayRemote = todayAttendance.filter(a => a.isRemote).length;
    const attendanceRate = activeEmployees > 0 
      ? Math.round((todayPresent / activeEmployees) * 100 * 10) / 10
      : 0;
    const avgWorkHours = avgWorkMinutes._avg.workMinutes 
      ? Math.round((avgWorkMinutes._avg.workMinutes / 60) * 10) / 10 
      : 0;
    const onTimePercentage = todayPresent > 0 
      ? Math.round(((todayPresent - todayLate) / todayPresent) * 100 * 10) / 10 
      : 0;
    
    // ========== TASK METRICS ==========
    const [totalTasks, completedTasks, inProgressTasks, overdueTasks] = await Promise.all([
      tenantPrisma.userTodo.count(),
      tenantPrisma.userTodo.count({ where: { isCompleted: true } }),
      tenantPrisma.userTodo.count({ where: { isCompleted: false } }),
      tenantPrisma.userTodo.count({
        where: {
          isCompleted: false,
          dueDate: { lt: today },
        },
      }),
    ]);
    
    const taskCompletionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100 * 10) / 10 
      : 0;
    
    // ========== PROJECT METRICS ==========
    let projectMetrics = {
      onTrack: 0,
      atRisk: 0,
      delayed: 0,
      resourceUtilization: 0,
      avgCompletion: 0,
      upcomingDeadlines: 0,
    };
    // Projects table may not exist in all setups, keep defaults if query fails
    
    // ========== DEPARTMENT METRICS (including employee count) ==========
    const departments = await tenantPrisma.department.findMany({
      where: { isActive: true },
      select: { 
        id: true, 
        name: true,
        _count: {
          select: {
            employees: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      },
    });
    
    const employeesByDepartment = departments.map(dept => ({
      name: dept.name,
      count: dept._count.employees,
    })).sort((a, b) => b.count - a.count);
    
    // ========== PERFORMANCE METRICS ==========
    // Get all completed performance reviews
    let avgTeamScore = 0;
    let topPerformers: Array<{ name: string; score: number; department: string }> = [];
    let improvementNeeded = 0;
    let departmentScores: Array<{ dept: string; score: number }> = [];
    
    try {
      const performanceReviews = await tenantPrisma.performanceReview.findMany({
        where: { status: 'COMPLETED' },
        select: {
          performanceScore: true,
          employeeId: true,
          employee: {
            select: {
              firstName: true,
              lastName: true,
              department: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });
      
      if (performanceReviews.length > 0) {
        // Calculate average team score
        const totalScore = performanceReviews.reduce((sum, r) => 
          sum + (r.performanceScore ? Number(r.performanceScore) : 0), 0);
        avgTeamScore = Number((totalScore / performanceReviews.length).toFixed(1));
        
        // Get top performers (score >= 8.5)
        topPerformers = performanceReviews
          .filter(r => r.performanceScore && Number(r.performanceScore) >= 8.5)
          .map(r => ({
            name: `${r.employee.firstName} ${r.employee.lastName}`,
            score: Number(r.performanceScore),
            department: r.employee.department?.name || 'Unknown'
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        
        // Count employees needing improvement (score < 7.0)
        improvementNeeded = performanceReviews.filter(r => 
          r.performanceScore && Number(r.performanceScore) < 7.0
        ).length;
        
        // Calculate department scores
        const deptScoreMap: { [key: string]: { total: number; count: number } } = {};
        performanceReviews.forEach(r => {
          const deptName = r.employee.department?.name || 'Unknown';
          if (!deptScoreMap[deptName]) {
            deptScoreMap[deptName] = { total: 0, count: 0 };
          }
          deptScoreMap[deptName].total += r.performanceScore ? Number(r.performanceScore) : 0;
          deptScoreMap[deptName].count += 1;
        });
        
        departmentScores = Object.entries(deptScoreMap).map(([dept, data]) => ({
          dept,
          score: Number((data.total / data.count).toFixed(1))
        })).sort((a, b) => b.score - a.score);
      }
    } catch (e) {
      // Performance reviews table might not exist, use defaults
      departmentScores = departments.map(dept => ({
        dept: dept.name,
        score: 0,
      }));
    }
    
    // Fill in missing departments with 0 score
    const deptNames = departmentScores.map(d => d.dept);
    departments.forEach(dept => {
      if (!deptNames.includes(dept.name)) {
        departmentScores.push({ dept: dept.name, score: 0 });
      }
    });
    
    // ========== FINANCIAL METRICS ==========
    // Get salary data per department
    const employeesWithSalary = await tenantPrisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: {
        baseSalary: true,
        department: {
          select: { id: true, name: true }
        }
      }
    });
    
    // Calculate total annual payroll
    const totalAnnualPayroll = employeesWithSalary.reduce((sum, emp) => {
      return sum + (emp.baseSalary ? Number(emp.baseSalary) : 0);
    }, 0);
    const monthlyPayroll = Math.round(totalAnnualPayroll / 12);
    
    // Calculate salary by department
    const salaryByDepartment: { [key: string]: number } = {};
    employeesWithSalary.forEach(emp => {
      if (emp.department) {
        const deptName = emp.department.name;
        if (!salaryByDepartment[deptName]) {
          salaryByDepartment[deptName] = 0;
        }
        salaryByDepartment[deptName] += emp.baseSalary ? Number(emp.baseSalary) : 0;
      }
    });
    
    // Convert to array sorted by salary (descending)
    const departmentSalaries = Object.entries(salaryByDepartment)
      .map(([name, annualSalary]) => ({
        name,
        annualSalary,
        monthlySalary: Math.round(annualSalary / 12),
      }))
      .sort((a, b) => b.annualSalary - a.annualSalary);
    
    // ========== RECENT ACTIVITIES ==========
    let recentActivities: Array<{
      id: string;
      type: string;
      user: string;
      action: string;
      timestamp: string;
    }> = [];
    
    try {
      const activities = await tenantPrisma.activity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          action: true,
          userName: true,
          entityName: true,
          createdAt: true,
        },
      });
      
      recentActivities = activities.map(a => ({
        id: a.id,
        type: a.type || 'general',
        user: a.userName || 'System',
        action: a.action || `Updated ${a.entityName || 'item'}`,
        timestamp: formatTimeAgo(a.createdAt),
      }));
    } catch (e) {
      // Activity table might not exist
    }
    
    // ========== ALERTS ==========
    const alerts: Array<{
      id: string;
      type: 'warning' | 'error' | 'info' | 'success';
      title: string;
      message: string;
      timestamp: string;
    }> = [];
    
    // Check for pending leave requests
    const pendingLeaves = await tenantPrisma.leaveRequest.count({
      where: { status: { in: ['pending', 'PENDING'] } },
    });
    if (pendingLeaves > 0) {
      alerts.push({
        id: 'pending-leaves',
        type: 'info',
        title: 'Pending Leave Requests',
        message: `${pendingLeaves} leave request${pendingLeaves > 1 ? 's' : ''} awaiting approval`,
        timestamp: 'Now',
      });
    }
    
    // Check for overdue tasks
    if (overdueTasks > 0) {
      alerts.push({
        id: 'overdue-tasks',
        type: 'warning',
        title: 'Overdue Tasks',
        message: `${overdueTasks} task${overdueTasks > 1 ? 's are' : ' is'} past due date`,
        timestamp: 'Now',
      });
    }
    
    // Check for low attendance
    if (attendanceRate < 80 && activeEmployees > 5) {
      alerts.push({
        id: 'low-attendance',
        type: 'warning',
        title: 'Low Attendance',
        message: `Today's attendance rate is ${attendanceRate}%`,
        timestamp: 'Now',
      });
    }
    
    // ========== QUICK STATS FOR ALERTS TAB ==========
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Documents expiring in next 30 days
    let documentsExpiring = 0;
    try {
      documentsExpiring = await tenantPrisma.employeeDocument.count({
        where: {
          expiryDate: {
            lte: thirtyDaysFromNow,
            gte: new Date(),
          }
        }
      });
    } catch (e) {
      // EmployeeDocument table might not exist or no expiryDate field
    }
    
    // New hires in last 30 days
    const newHires = await tenantPrisma.employee.count({
      where: {
        joinDate: {
          gte: thirtyDaysAgo,
        },
        status: 'ACTIVE',
      },
    });
    
    // Employees in exit process (NOTICE_PERIOD or RESIGNED status)
    let exitInterviews = 0;
    try {
      exitInterviews = await tenantPrisma.employee.count({
        where: {
          status: {
            in: ['NOTICE_PERIOD', 'RESIGNED', 'notice_period', 'resigned'],
          },
        },
      });
    } catch (e) {
      // Status values might differ
    }
    
    const quickStats = {
      pendingApprovals: pendingLeaves, // Pending leave requests
      documentsExpiring,
      newHireOnboarding: newHires,
      exitInterviews,
    };
    
    res.json({
      success: true,
      data: {
        organization: {
          totalEmployees,
          activeEmployees,
          onLeave: onLeaveToday,
          departments: totalDepartments,
          activeProjects: 0, // Would need projects table
          completedProjects: 0,
          totalRevenue: 0, // Would need billing/invoices table
          monthlyBudget: 0,
          budgetUtilized: 0,
          growthRate: 0,
        },
        attendance: {
          todayPresent,
          todayAbsent: Math.max(0, todayAbsent),
          todayLate,
          todayRemote,
          attendanceRate,
          avgWorkHours,
          onTimePercentage,
        },
        financial: {
          totalPayroll: monthlyPayroll,
          totalAnnualPayroll,
          pendingPayments: 0, // Would need invoices/payments table
          monthlyExpenses: monthlyPayroll, // At minimum, payroll is an expense
          departmentSalaries, // Real salary breakdown by department
          // Note: Budget utilization and expense breakdown would need additional tables
          budgetAlerts: 0,
        },
        projects: {
          ...projectMetrics,
          // Active project list - empty since Project table doesn't exist yet
          activeProjectsList: [],
        },
        tasks: {
          totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          overdue: overdueTasks,
          completionRate: taskCompletionRate,
        },
        performance: {
          avgTeamScore,
          topPerformers,
          improvementNeeded,
          departmentScores,
        },
        employeesByDepartment,
        recentActivities,
        alerts,
        quickStats,
        settings: {
          currency,
        },
      },
    });
    
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get admin-360 dashboard');
    next(error);
  }
});

// Helper function for time formatting
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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
    const settings = (tenant.settings || {}) as Record<string, any>;
    
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
          weeklyWorkingHours: settings.weeklyWorkingHours || null,
          excludeHolidaysFromLeave: settings.excludeHolidaysFromLeave ?? true,
          excludeWeekendsFromLeave: settings.excludeWeekendsFromLeave ?? true,
          enabledHolidayTypes: settings.enabledHolidayTypes || { public: true, optional: true, restricted: true },
          optionalHolidayQuota: settings.optionalHolidayQuota ?? 2,
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
        weeklyWorkingHours: data.weeklyWorkingHours || undefined,
        excludeHolidaysFromLeave: data.excludeHolidaysFromLeave ?? true,
        excludeWeekendsFromLeave: data.excludeWeekendsFromLeave ?? true,
        enabledHolidayTypes: data.enabledHolidayTypes || undefined,
        optionalHolidayQuota: data.optionalHolidayQuota ?? 2,
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
        weeklyWorkingHours: data.weeklyWorkingHours || undefined,
        excludeHolidaysFromLeave: data.excludeHolidaysFromLeave ?? true,
        excludeWeekendsFromLeave: data.excludeWeekendsFromLeave ?? true,
        enabledHolidayTypes: data.enabledHolidayTypes || { public: true, optional: true, restricted: true },
        optionalHolidayQuota: data.optionalHolidayQuota ?? 2,
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
          weeklyWorkingHours: updatedSettings.weeklyWorkingHours,
          excludeHolidaysFromLeave: updatedSettings.excludeHolidaysFromLeave,
          excludeWeekendsFromLeave: updatedSettings.excludeWeekendsFromLeave,
          enabledHolidayTypes: updatedSettings.enabledHolidayTypes || { public: true, optional: true, restricted: true },
          optionalHolidayQuota: updatedSettings.optionalHolidayQuota ?? 2,
        },
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to update organization settings');
    next(error);
  }
});

// ============================================================================
// EMAIL SETTINGS
// ============================================================================

const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.number().min(1).max(65535),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpEncryption: z.enum(['none', 'tls', 'ssl']),
  smtpFromEmail: z.string().email('Invalid email address'),
  smtpFromName: z.string().min(1, 'From name is required'),
});

// GET email settings
router.get('/email-settings', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const prisma = getMasterPrisma();
    
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      });
    }
    
    const settings = tenant.settings as any;
    
    res.json({
      success: true,
      data: {
        smtpHost: settings?.smtpHost || '',
        smtpPort: settings?.smtpPort || 587,
        smtpUsername: settings?.smtpUsername || '',
        smtpPassword: settings?.smtpPassword ? '********' : '', // Mask password
        smtpEncryption: settings?.smtpEncryption || 'tls',
        smtpFromEmail: settings?.smtpFromEmail || '',
        smtpFromName: settings?.smtpFromName || '',
        emailConfigured: settings?.emailConfigured || false,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get email settings');
    next(error);
  }
});

// PUT email settings
router.put('/email-settings', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const parsed = emailSettingsSchema.safeParse(req.body);
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
      include: { settings: true },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      });
    }
    
    // Check if password is masked (unchanged) - if so, keep existing password
    const existingSettings = tenant.settings as any;
    const passwordToSave = data.smtpPassword === '********' 
      ? existingSettings?.smtpPassword 
      : data.smtpPassword;
    
    // Upsert email settings
    const updatedSettings = await prisma.tenantSettings.upsert({
      where: { tenantId: tenant.id },
      update: {
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpUsername: data.smtpUsername || null,
        smtpPassword: passwordToSave || null,
        smtpEncryption: data.smtpEncryption,
        smtpFromEmail: data.smtpFromEmail,
        smtpFromName: data.smtpFromName,
        emailConfigured: true,
      },
      create: {
        tenantId: tenant.id,
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpUsername: data.smtpUsername || null,
        smtpPassword: passwordToSave || null,
        smtpEncryption: data.smtpEncryption,
        smtpFromEmail: data.smtpFromEmail,
        smtpFromName: data.smtpFromName,
        emailConfigured: true,
      },
    });
    
    res.json({
      success: true,
      data: {
        smtpHost: (updatedSettings as any).smtpHost || '',
        smtpPort: (updatedSettings as any).smtpPort || 587,
        smtpUsername: (updatedSettings as any).smtpUsername || '',
        smtpPassword: (updatedSettings as any).smtpPassword ? '********' : '',
        smtpEncryption: (updatedSettings as any).smtpEncryption || 'tls',
        smtpFromEmail: (updatedSettings as any).smtpFromEmail || '',
        smtpFromName: (updatedSettings as any).smtpFromName || '',
        emailConfigured: true,
      },
      message: 'Email settings saved successfully',
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to update email settings');
    next(error);
  }
});

// POST test email
router.post('/email-settings/test', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const { testEmail } = req.body;
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid test email address is required' },
      });
    }
    
    const prisma = getMasterPrisma();
    
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      });
    }
    
    const settings = tenant.settings as any;
    
    if (!settings?.emailConfigured || !settings?.smtpHost) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_NOT_CONFIGURED', message: 'Email settings are not configured. Please save email settings first.' },
      });
    }
    
    // Create nodemailer transporter with tenant's SMTP settings
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpEncryption === 'ssl',
      auth: settings.smtpUsername ? {
        user: settings.smtpUsername,
        pass: settings.smtpPassword,
      } : undefined,
      tls: settings.smtpEncryption === 'tls' ? { rejectUnauthorized: false } : undefined,
    } as any);
    
    try {
      await transporter.sendMail({
        from: `"${settings.smtpFromName}" <${settings.smtpFromEmail}>`,
        to: testEmail,
        subject: 'Test Email from Office Management System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Email Configuration Test</h2>
            <p>This is a test email from your Office Management System.</p>
            <p>If you received this email, your SMTP settings are configured correctly.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #888; font-size: 12px;">
              Sent from ${tenant.name} - Office Management System
            </p>
          </div>
        `,
      });
      
      res.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
      });
    } catch (sendError: any) {
      logger.error({ error: sendError.message }, 'Failed to send test email');
      res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: `Failed to send test email: ${sendError.message}`,
        },
      });
    }
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to test email settings');
    next(error);
  }
});

// ============================================================================
// EMPLOYEE CODE SETTINGS
// ============================================================================

const employeeCodeSettingsSchema = z.object({
  autoGenerate: z.boolean(),
  prefix: z.string().min(1, 'Prefix is required').max(10, 'Prefix max 10 characters'),
  yearSeqDigits: z.number().min(3).max(7),
  totalSeqDigits: z.number().min(3).max(7),
  separator: z.enum(['-', '_', '']),
});

// GET employee code settings
router.get('/employee-code-settings', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const prisma = getMasterPrisma();
    
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      });
    }
    
    const settings = tenant.settings as any;
    
    res.json({
      success: true,
      data: {
        autoGenerate: settings?.employeeCodeAutoGenerate ?? true,
        prefix: settings?.employeeCodePrefix || 'EMP',
        yearSeqDigits: settings?.employeeCodeYearSeqDigits ?? 5,
        totalSeqDigits: settings?.employeeCodeTotalSeqDigits ?? 5,
        separator: settings?.employeeCodeSeparator || '-',
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get employee code settings');
    next(error);
  }
});

// PUT employee code settings
router.put('/employee-code-settings', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const parsed = employeeCodeSettingsSchema.safeParse(req.body);
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
    
    // Get tenant with settings
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      });
    }
    
    // Update or create employee code settings
    let updatedSettings;
    if (tenant.settings) {
      // Update existing settings
      updatedSettings = await prisma.tenantSettings.update({
        where: { tenantId: tenant.id },
        data: {
          employeeCodeAutoGenerate: data.autoGenerate,
          employeeCodePrefix: data.prefix.toUpperCase(),
          employeeCodeYearSeqDigits: data.yearSeqDigits,
          employeeCodeTotalSeqDigits: data.totalSeqDigits,
          employeeCodeSeparator: data.separator,
        },
      });
    } else {
      // Create new settings with defaults
      updatedSettings = await prisma.tenantSettings.create({
        data: {
          tenant: { connect: { id: tenant.id } },
          employeeCodeAutoGenerate: data.autoGenerate,
          employeeCodePrefix: data.prefix.toUpperCase(),
          employeeCodeYearSeqDigits: data.yearSeqDigits,
          employeeCodeTotalSeqDigits: data.totalSeqDigits,
          employeeCodeSeparator: data.separator,
        },
      });
    }
    
    res.json({
      success: true,
      data: {
        autoGenerate: (updatedSettings as any).employeeCodeAutoGenerate,
        prefix: (updatedSettings as any).employeeCodePrefix,
        yearSeqDigits: (updatedSettings as any).employeeCodeYearSeqDigits,
        totalSeqDigits: (updatedSettings as any).employeeCodeTotalSeqDigits,
        separator: (updatedSettings as any).employeeCodeSeparator,
      },
      message: 'Employee code settings saved successfully',
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to update employee code settings');
    next(error);
  }
});

// GET employee code preview (generates next code based on current settings)
router.get('/employee-code-preview', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const prisma = getMasterPrisma();
    
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      });
    }
    
    const settings = tenant.settings as any;
    const prefix = settings?.employeeCodePrefix || 'EMP';
    const separator = settings?.employeeCodeSeparator || '-';
    const yearSeqDigits = settings?.employeeCodeYearSeqDigits ?? 5;
    const totalSeqDigits = settings?.employeeCodeTotalSeqDigits ?? 5;
    
    // Get tenant database to count employees
    const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
    
    const currentYear = new Date().getFullYear();
    
    // Count employees created this year (for year sequence)
    const employeesThisYear = await tenantPrisma.employee.count({
      where: {
        createdAt: {
          gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
          lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
        },
      },
    });
    
    // Count total employees (for total sequence)
    const totalEmployees = await tenantPrisma.employee.count();
    
    // Generate preview code
    const yearSeq = String(employeesThisYear + 1).padStart(yearSeqDigits, '0');
    const totalSeq = String(totalEmployees + 1).padStart(totalSeqDigits, '0');
    const previewCode = `${prefix}${separator}${currentYear}${separator}${yearSeq}${separator}${totalSeq}`;
    
    res.json({
      success: true,
      data: {
        previewCode,
        breakdown: {
          prefix,
          year: currentYear,
          yearSequence: employeesThisYear + 1,
          totalSequence: totalEmployees + 1,
        },
        settings: {
          autoGenerate: settings?.employeeCodeAutoGenerate ?? true,
          prefix,
          yearSeqDigits,
          totalSeqDigits,
          separator,
        },
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get employee code preview');
    next(error);
  }
});

// POST send email (for assessment reports, etc.)
const sendEmailSchema = z.object({
  to: z.string().email('Valid email address is required'),
  subject: z.string().min(1, 'Subject is required'),
  html: z.string().min(1, 'Email content is required'),
  message: z.string().optional(),
});

router.post('/send-email', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const data = sendEmailSchema.parse(req.body);
    
    const prisma = getMasterPrisma();
    
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      });
    }
    
    const settings = tenant.settings as any;
    
    // Check if tenant has configured email settings
    if (!settings?.emailConfigured || !settings?.smtpHost) {
      // Fall back to default SMTP settings (MailHog for dev)
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '1025'),
        secure: false,
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        } : undefined,
      } as any);
      
      try {
        await transporter.sendMail({
          from: `"${process.env.SMTP_FROM_NAME || 'Office Management System'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@oms.local'}>`,
          to: data.to,
          subject: data.subject,
          html: data.html,
        });
        
        return res.json({
          success: true,
          message: `Email sent successfully to ${data.to}`,
        });
      } catch (sendError: any) {
        logger.error({ error: sendError.message }, 'Failed to send email with default SMTP');
        return res.status(400).json({
          success: false,
          error: {
            code: 'EMAIL_SEND_FAILED',
            message: `Failed to send email: ${sendError.message}`,
          },
        });
      }
    }
    
    // Use tenant's SMTP settings
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpEncryption === 'ssl',
      auth: settings.smtpUsername ? {
        user: settings.smtpUsername,
        pass: settings.smtpPassword,
      } : undefined,
      tls: settings.smtpEncryption === 'tls' ? { rejectUnauthorized: false } : undefined,
    } as any);
    
    try {
      await transporter.sendMail({
        from: `"${settings.smtpFromName}" <${settings.smtpFromEmail}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
      });
      
      res.json({
        success: true,
        message: `Email sent successfully to ${data.to}`,
      });
    } catch (sendError: any) {
      logger.error({ error: sendError.message }, 'Failed to send email');
      res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: `Failed to send email: ${sendError.message}`,
        },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors.map(e => e.message).join(', '),
        },
      });
    }
    logger.error({ error: (error as Error).message }, 'Failed to send email');
    next(error);
  }
});

// ============================================================================
// TEAMS (Groups) MANAGEMENT - Uses Tenant Database
// ============================================================================

const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  color: z.string().optional(),
  leaderId: z.string().optional(),
});

const updateTeamSchema = createTeamSchema.partial();

const addTeamMembersSchema = z.object({
  employeeIds: z.array(z.string()).min(1),
  teamRole: z.enum(['LEAD', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

const updateTeamMemberSchema = z.object({
  teamRole: z.enum(['LEAD', 'MEMBER', 'VIEWER']),
});

// Helper to generate unique team code
function generateTeamCode(name: string): string {
  const base = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
  const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${base}-${suffix}`;
}

// GET all teams for organization
router.get('/teams', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    // Get tenant name from master for default team creation
    const masterPrisma = getMasterPrisma();
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, name: true },
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      });
    }
    
    // Use tenant database for teams
    const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
    
    // Check if default team exists, create if not
    let teams = await tenantPrisma.team.findMany({
      include: {
        leader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });
    
    // Create default team if none exists
    if (teams.length === 0 || !teams.some(t => t.isDefault)) {
      const defaultTeam = await tenantPrisma.team.create({
        data: {
          name: tenant.name,
          code: generateTeamCode(tenant.name),
          description: 'Default organization team - all employees are automatically added',
          isDefault: true,
          color: 'blue',
        },
        include: {
          leader: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          _count: { select: { members: true } },
        },
      });
      teams = [defaultTeam, ...teams.filter(t => !t.isDefault)];
    }
    
    res.json({
      success: true,
      data: teams,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get teams');
    next(error);
  }
});

// CREATE new team
router.post('/teams', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const parsed = createTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.errors },
      });
    }
    
    const data = parsed.data;
    const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
    
    const team = await tenantPrisma.team.create({
      data: {
        name: data.name,
        code: generateTeamCode(data.name),
        description: data.description,
        color: data.color || 'blue',
        leaderId: data.leaderId || null,
        isDefault: false,
      },
      include: {
        leader: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        _count: { select: { members: true } },
      },
    });
    
    res.status(201).json({
      success: true,
      data: team,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to create team');
    next(error);
  }
});

// UPDATE team
router.put('/teams/:teamId', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const parsed = updateTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.errors },
      });
    }
    
    const data = parsed.data;
    const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
    
    // Check team exists
    const existingTeam = await tenantPrisma.team.findUnique({
      where: { id: teamId },
    });
    
    if (!existingTeam) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Team not found' },
      });
    }
    
    const team = await tenantPrisma.team.update({
      where: { id: teamId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color && { color: data.color }),
        ...(data.leaderId !== undefined && { leaderId: data.leaderId || null }),
      },
      include: {
        leader: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        _count: { select: { members: true } },
      },
    });
    
    res.json({
      success: true,
      data: team,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to update team');
    next(error);
  }
});

// DELETE team
router.delete('/teams/:teamId', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
    
    const existingTeam = await tenantPrisma.team.findUnique({
      where: { id: teamId },
    });
    
    if (!existingTeam) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Team not found' },
      });
    }
    
    if (existingTeam.isDefault) {
      return res.status(400).json({
        success: false,
        error: { code: 'CANNOT_DELETE_DEFAULT', message: 'Cannot delete the default team' },
      });
    }
    
    // Delete team (cascade will handle members)
    await tenantPrisma.team.delete({ where: { id: teamId } });
    
    res.json({
      success: true,
      data: { message: 'Team deleted successfully' },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to delete team');
    next(error);
  }
});

// GET team members
router.get('/teams/:teamId/members', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
    
    // Check team exists
    const team = await tenantPrisma.team.findUnique({
      where: { id: teamId },
    });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Team not found' },
      });
    }
    
    const members = await tenantPrisma.teamMember.findMany({
      where: { teamId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            designation: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { teamRole: 'asc' },
        { joinedAt: 'asc' },
      ],
    });
    
    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get team members');
    next(error);
  }
});

// GET available employees (not in team)
router.get('/teams/:teamId/available-employees', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
    
    // Get employees already in team
    const existingMemberIds = await tenantPrisma.teamMember.findMany({
      where: { teamId },
      select: { employeeId: true },
    });
    const memberIds = existingMemberIds.map((m: { employeeId: string }) => m.employeeId);
    
    // Get employees not in team
    const employees = await tenantPrisma.employee.findMany({
      where: {
        id: { notIn: memberIds.length > 0 ? memberIds : ['no-match'] },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        employeeCode: true,
        designation: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: { employeeCode: 'asc' },
    });
    
    res.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get available employees');
    next(error);
  }
});

// ADD members to team
router.post('/teams/:teamId/members', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const parsed = addTeamMembersSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.errors },
      });
    }
    
    const { employeeIds, teamRole } = parsed.data;
    const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
    
    // Check team exists
    const team = await tenantPrisma.team.findUnique({
      where: { id: teamId },
    });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Team not found' },
      });
    }
    
    // Create team members using upsert
    const createdMembers = await tenantPrisma.$transaction(
      employeeIds.map((employeeId: string) =>
        tenantPrisma.teamMember.upsert({
          where: {
            teamId_employeeId: { teamId, employeeId },
          },
          update: { teamRole },
          create: {
            teamId,
            employeeId,
            teamRole,
          },
        })
      )
    );
    
    res.status(201).json({
      success: true,
      data: { addedCount: createdMembers.length },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to add team members');
    next(error);
  }
});

// UPDATE team member role
router.put('/teams/:teamId/members/:memberId', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { teamId, memberId } = req.params;
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const parsed = updateTeamMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.errors },
      });
    }
    
    const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
    
    const member = await tenantPrisma.teamMember.findFirst({
      where: { id: memberId, teamId },
    });
    
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Team member not found' },
      });
    }
    
    const updated = await tenantPrisma.teamMember.update({
      where: { id: memberId },
      data: { teamRole: parsed.data.teamRole },
    });
    
    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to update team member');
    next(error);
  }
});

// REMOVE member from team
router.delete('/teams/:teamId/members/:memberId', async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { teamId, memberId } = req.params;
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }
    
    const tenantPrisma = await getTenantPrismaBySlug(tenantSlug);
    
    const member = await tenantPrisma.teamMember.findFirst({
      where: { id: memberId, teamId },
    });
    
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Team member not found' },
      });
    }
    
    await tenantPrisma.teamMember.delete({ where: { id: memberId } });
    
    res.json({
      success: true,
      data: { message: 'Member removed from team' },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to remove team member');
    next(error);
  }
});

// ============================================================================
// INTEGRATIONS - Proxy to employee-service
// ============================================================================

const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';

// GET all integrations
router.get('/integrations', async (req: TenantRequest, res: Response) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    const response = await fetch(`${EMPLOYEE_SERVICE_URL}/api/v1/organization/integrations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': tenantSlug || '',
      },
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get integrations');
    res.status(500).json({ success: false, error: { message: 'Failed to get integrations' } });
  }
});

// POST save OpenAI settings
router.post('/integrations/openai', async (req: TenantRequest, res: Response) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    const response = await fetch(`${EMPLOYEE_SERVICE_URL}/api/v1/organization/integrations/openai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': tenantSlug || '',
      },
      body: JSON.stringify(req.body),
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to save OpenAI settings');
    res.status(500).json({ success: false, error: { message: 'Failed to save OpenAI settings' } });
  }
});

// POST test OpenAI connection
router.post('/integrations/openai/test', async (req: TenantRequest, res: Response) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    logger.info({ tenantSlug }, 'Testing OpenAI connection');
    
    const response = await fetch(`${EMPLOYEE_SERVICE_URL}/api/v1/organization/integrations/openai/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': tenantSlug || '',
      },
      body: JSON.stringify(req.body),
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to test OpenAI connection');
    res.status(500).json({ success: false, error: { message: 'Failed to test OpenAI connection' } });
  }
});

// POST disable OpenAI integration
router.post('/integrations/openai/disable', async (req: TenantRequest, res: Response) => {
  try {
    const tenantSlug = req.tenantContext?.tenantSlug || req.domainResolution?.tenantSlug;
    
    const response = await fetch(`${EMPLOYEE_SERVICE_URL}/api/v1/organization/integrations/openai/disable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': tenantSlug || '',
      },
      body: JSON.stringify(req.body),
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to disable OpenAI');
    res.status(500).json({ success: false, error: { message: 'Failed to disable OpenAI' } });
  }
});

export default router;
