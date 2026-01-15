/**
 * Platform Reports Routes - Analytics and reporting for platform admins
 */

import { Router, Request, Response } from 'express';
import { getMasterPrisma, getTenantDbManager } from '@oms/database';
import { logger } from '../utils/logger';

const router = Router();

// Helper function to get total users across all tenant databases with timeout
async function getTotalUsersAcrossTenants(): Promise<{ totalUsers: number; totalEmployees: number }> {
  try {
    const masterPrisma = getMasterPrisma();
    const dbManager = getTenantDbManager();
    
    // Get all active tenants
    const tenants = await masterPrisma.tenant.findMany({
      where: { 
        deletedAt: null,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      select: { slug: true },
    });
    
    if (tenants.length === 0) {
      const platformAdmins = await masterPrisma.platformAdmin.count({
        where: { deletedAt: null },
      });
      return { totalUsers: platformAdmins, totalEmployees: 0 };
    }
    
    let totalUsers = 0;
    let totalEmployees = 0;
    
    // Query each tenant database with timeout
    const timeoutMs = 3000; // 3 second timeout per tenant
    
    for (const tenant of tenants) {
      try {
        const client = await Promise.race([
          dbManager.getClientBySlug(tenant.slug),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
        ]) as any;
        
        const [userCount, employeeCount] = await Promise.race([
          Promise.all([
            client.user.count({ where: { deletedAt: null } }),
            client.employee.count({ where: { deletedAt: null } }),
          ]),
          new Promise<[number, number]>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
        ]);
        
        totalUsers += userCount;
        totalEmployees += employeeCount;
      } catch (error) {
        logger.warn({ slug: tenant.slug, error: String(error) }, 'Failed to get user count for tenant');
        // Continue with other tenants
      }
    }
    
    // Add platform admins to total users
    const platformAdmins = await masterPrisma.platformAdmin.count({
      where: { deletedAt: null },
    });
    
    return { 
      totalUsers: totalUsers + platformAdmins, 
      totalEmployees 
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get total users across tenants');
    // Return fallback values
    return { totalUsers: 0, totalEmployees: 0 };
  }
}

// ============================================================================
// DASHBOARD OVERVIEW STATS
// ============================================================================

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    
    // Date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Get current month revenue (MRR)
    const activeSubscriptions = await masterPrisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      select: { amount: true, billingCycle: true },
    });
    
    const mrr = activeSubscriptions.reduce((sum: number, sub: any) => {
      const amount = Number(sub.amount);
      switch (sub.billingCycle) {
        case 'YEARLY': return sum + (amount / 12);
        case 'QUARTERLY': return sum + (amount / 3);
        default: return sum + amount;
      }
    }, 0);
    
    // Get last month revenue for comparison
    const lastMonthPayments = await masterPrisma.payment.aggregate({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        status: 'SUCCEEDED',
      },
      _sum: { amount: true },
    });
    const lastMonthRevenue = Number(lastMonthPayments._sum?.amount || 0);
    
    // Current month payments
    const currentMonthPayments = await masterPrisma.payment.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
        status: 'SUCCEEDED',
      },
      _sum: { amount: true },
    });
    const currentMonthRevenue = Number(currentMonthPayments._sum?.amount || 0);
    
    // Revenue growth
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((mrr - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;
    
    // Total tenants
    const totalTenants = await masterPrisma.tenant.count({
      where: { deletedAt: null },
    });
    
    // Tenants this month
    const tenantsThisMonth = await masterPrisma.tenant.count({
      where: {
        createdAt: { gte: startOfMonth },
        deletedAt: null,
      },
    });
    
    // Tenants last month
    const tenantsLastMonth = await masterPrisma.tenant.count({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        deletedAt: null,
      },
    });
    
    // Get REAL total users across all tenant databases
    const { totalUsers, totalEmployees } = await getTotalUsersAcrossTenants();
    
    // Avg revenue per tenant
    const avgRevenuePerTenant = totalTenants > 0 ? mrr / totalTenants : 0;
    
    res.json({
      success: true,
      data: {
        totalRevenue: Math.round(mrr * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        totalTenants,
        tenantGrowth: tenantsThisMonth,
        totalUsers,
        totalEmployees,
        userGrowth: tenantsThisMonth > tenantsLastMonth ? 
          ((tenantsThisMonth - tenantsLastMonth) / Math.max(tenantsLastMonth, 1)) * 100 : 0,
        avgRevenuePerTenant: Math.round(avgRevenuePerTenant * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get overview stats');
    res.status(500).json({ success: false, error: 'Failed to get overview stats' });
  }
});

// ============================================================================
// REVENUE BY PLAN
// ============================================================================

router.get('/revenue/by-plan', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    
    // Get revenue by plan
    const subscriptionsByPlan = await masterPrisma.subscription.groupBy({
      by: ['planId'],
      where: { status: 'ACTIVE' },
      _sum: { amount: true },
      _count: { id: true },
    });
    
    // Get plan details
    const plans = await masterPrisma.subscriptionPlan.findMany({
      select: { id: true, name: true, tier: true },
    });
    const planMap = new Map(plans.map((p: any) => [p.id, p]));
    
    // Calculate total revenue
    const totalRevenue = subscriptionsByPlan.reduce(
      (sum, item) => sum + Number(item._sum?.amount || 0), 
      0
    );
    
    // Format response
    const revenueByPlan = subscriptionsByPlan.map((item) => {
      const revenue = Number(item._sum?.amount || 0);
      return {
        planId: item.planId,
        plan: planMap.get(item.planId)?.name || 'Unknown',
        tier: planMap.get(item.planId)?.tier || 'Unknown',
        revenue,
        count: item._count.id,
        percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 1000) / 10 : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);
    
    res.json({ success: true, data: revenueByPlan });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get revenue by plan');
    res.status(500).json({ success: false, error: 'Failed to get revenue by plan' });
  }
});

// ============================================================================
// MONTHLY METRICS (Last 6 months)
// ============================================================================

router.get('/monthly', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    const months = parseInt(req.query.months as string) || 6;
    
    const results = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      // Revenue for the month
      const payments = await masterPrisma.payment.aggregate({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: 'SUCCEEDED',
        },
        _sum: { amount: true },
      });
      
      // Tenants at end of month
      const tenantCount = await masterPrisma.tenant.count({
        where: {
          createdAt: { lte: monthEnd },
          deletedAt: null,
        },
      });
      
      // New tenants that month
      const newTenants = await masterPrisma.tenant.count({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
      });
      
      // Churned (subscriptions canceled that month)
      const churned = await masterPrisma.subscription.count({
        where: {
          canceledAt: { gte: monthStart, lte: monthEnd },
        },
      });
      
      results.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        year: monthStart.getFullYear(),
        revenue: Number(payments._sum?.amount || 0),
        tenants: tenantCount,
        newTenants,
        churn: churned,
      });
    }
    
    res.json({ success: true, data: results });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get monthly metrics');
    res.status(500).json({ success: false, error: 'Failed to get monthly metrics' });
  }
});

// ============================================================================
// TOP TENANTS BY REVENUE
// ============================================================================

router.get('/top-tenants', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get active subscriptions with tenant info
    const subscriptions = await masterPrisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, createdAt: true },
        },
      },
      orderBy: { amount: 'desc' },
      take: limit,
    });
    
    // Get employee counts per tenant (estimated from maxUsers)
    const topTenants = subscriptions.map((sub) => {
      // Calculate monthly amount
      let monthlyAmount = Number(sub.amount);
      if (sub.billingCycle === 'YEARLY') monthlyAmount /= 12;
      if (sub.billingCycle === 'QUARTERLY') monthlyAmount /= 3;
      
      return {
        id: sub.tenant?.id,
        name: sub.tenant?.name || 'Unknown',
        slug: sub.tenant?.slug,
        revenue: Math.round(monthlyAmount * 100) / 100,
        employees: sub.maxUsers || 0,
        plan: sub.planId,
        billingCycle: sub.billingCycle,
        createdAt: sub.tenant?.createdAt,
      };
    });
    
    res.json({ success: true, data: topTenants });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get top tenants');
    res.status(500).json({ success: false, error: 'Failed to get top tenants' });
  }
});

// ============================================================================
// TENANT STATS (New, Trials, Conversion)
// ============================================================================

router.get('/tenants/stats', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // New tenants this month
    const newTenantsThisMonth = await masterPrisma.tenant.count({
      where: {
        createdAt: { gte: startOfMonth },
        deletedAt: null,
      },
    });
    
    // Active trials
    const activeTrials = await masterPrisma.subscription.count({
      where: { status: 'TRIALING' },
    });
    
    // Trial conversion rate (last 30 days)
    // Count trials that started 30+ days ago
    const trialsStartedBefore = await masterPrisma.subscription.count({
      where: {
        trialStart: { lte: thirtyDaysAgo },
      },
    });
    
    // Count those that converted to ACTIVE
    const convertedTrials = await masterPrisma.subscription.count({
      where: {
        trialStart: { lte: thirtyDaysAgo },
        status: 'ACTIVE',
      },
    });
    
    const conversionRate = trialsStartedBefore > 0 
      ? Math.round((convertedTrials / trialsStartedBefore) * 100) 
      : 0;
    
    // Tenants by status
    const tenantsByStatus = await masterPrisma.tenant.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    });
    
    res.json({
      success: true,
      data: {
        newTenantsThisMonth,
        activeTrials,
        trialConversionRate: conversionRate,
        byStatus: tenantsByStatus.reduce((acc: any, item: any) => {
          acc[item.status.toLowerCase()] = item._count.id;
          return acc;
        }, {}),
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get tenant stats');
    res.status(500).json({ success: false, error: 'Failed to get tenant stats' });
  }
});

// ============================================================================
// CHURN STATS
// ============================================================================

router.get('/churn', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Churned this month
    const churnedThisMonth = await masterPrisma.subscription.count({
      where: {
        canceledAt: { gte: startOfMonth },
      },
    });
    
    // Churned last month
    const churnedLastMonth = await masterPrisma.subscription.count({
      where: {
        canceledAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    });
    
    // Total active at start of month
    const activeAtStartOfMonth = await masterPrisma.subscription.count({
      where: {
        status: 'ACTIVE',
        createdAt: { lt: startOfMonth },
      },
    });
    
    // Churn rate
    const churnRate = activeAtStartOfMonth > 0 
      ? Math.round((churnedThisMonth / activeAtStartOfMonth) * 1000) / 10 
      : 0;
    
    const lastMonthChurnRate = activeAtStartOfMonth > 0 
      ? Math.round((churnedLastMonth / activeAtStartOfMonth) * 1000) / 10 
      : 0;
    
    // Revenue lost from churned subscriptions this month
    const churnedSubscriptions = await masterPrisma.subscription.findMany({
      where: {
        canceledAt: { gte: startOfMonth },
      },
      select: { amount: true, billingCycle: true },
    });
    
    const revenueLost = churnedSubscriptions.reduce((sum, sub) => {
      let monthly = Number(sub.amount);
      if (sub.billingCycle === 'YEARLY') monthly /= 12;
      if (sub.billingCycle === 'QUARTERLY') monthly /= 3;
      return sum + monthly;
    }, 0);
    
    res.json({
      success: true,
      data: {
        churnRate,
        lastMonthChurnRate,
        churnedThisMonth,
        churnedLastMonth,
        revenueLost: Math.round(revenueLost * 100) / 100,
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get churn stats');
    res.status(500).json({ success: false, error: 'Failed to get churn stats' });
  }
});

// ============================================================================
// USAGE STATS - Real data from tenant databases
// ============================================================================

router.get('/usage', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    const dbManager = getTenantDbManager();
    
    // Total storage across all tenants
    const subscriptions = await masterPrisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      select: { maxStorage: true },
    });
    
    const totalAllocatedStorage = subscriptions.reduce(
      (sum, s) => sum + Number(s.maxStorage || 0), 
      0
    );
    
    // Get all active tenants to count active sessions
    const tenants = await masterPrisma.tenant.findMany({
      where: { 
        deletedAt: null,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      select: { slug: true },
    });
    
    // Count active sessions from tenant databases (users logged in last 24 hours)
    let totalActiveSessions = 0;
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const batchSize = 10;
    for (let i = 0; i < tenants.length; i += batchSize) {
      const batch = tenants.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (tenant) => {
          try {
            const client = await dbManager.getClientBySlug(tenant.slug);
            const activeUsers = await (client as any).user.count({
              where: {
                deletedAt: null,
                lastLoginAt: { gte: last24Hours },
              },
            });
            return activeUsers;
          } catch (error) {
            return 0;
          }
        })
      );
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          totalActiveSessions += result.value;
        }
      }
    }
    
    // Also add platform admin sessions
    const platformAdminSessions = await masterPrisma.platformAdmin.count({
      where: {
        status: 'ACTIVE',
        lastLoginAt: { gte: last24Hours },
      },
    });
    
    totalActiveSessions += platformAdminSessions;
    
    // For used storage, we'd need actual file tracking. For now estimate based on employees
    const { totalEmployees } = await getTotalUsersAcrossTenants();
    // Estimate 50MB per employee as a reasonable baseline
    const estimatedUsedStorage = totalEmployees * 50 * 1024 * 1024;
    
    res.json({
      success: true,
      data: {
        totalStorage: formatBytes(totalAllocatedStorage),
        usedStorage: formatBytes(Math.min(estimatedUsedStorage, totalAllocatedStorage)),
        activeSessions: totalActiveSessions,
        // API calls would need actual tracking implementation
        apiCalls: 0,
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get usage stats');
    res.status(500).json({ success: false, error: 'Failed to get usage stats' });
  }
});

// Helper function
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;
