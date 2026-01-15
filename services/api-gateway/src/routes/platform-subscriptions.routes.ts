/**
 * Platform Subscriptions Routes - Manage all tenant subscriptions
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getMasterPrisma } from '@oms/database';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updateSubscriptionSchema = z.object({
  planId: z.string().uuid().optional(),
  status: z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED']).optional(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

// Get all subscriptions with tenant info
router.get('/', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    const { 
      status, 
      planId, 
      search,
      page = '1', 
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);
    
    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (planId) {
      where.planId = planId;
    }
    
    if (search) {
      where.tenant = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }
    
    const [subscriptions, total] = await Promise.all([
      masterPrisma.subscription.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              email: true,
              status: true,
              logo: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              slug: true,
              tier: true,
              monthlyPrice: true,
              yearlyPrice: true,
            },
          },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take,
      }),
      masterPrisma.subscription.count({ where }),
    ]);
    
    // Format data
    const formattedSubscriptions = subscriptions.map((sub: any) => ({
      id: sub.id,
      tenantId: sub.tenantId,
      tenantName: sub.tenant?.name,
      tenantSlug: sub.tenant?.slug,
      tenantEmail: sub.tenant?.email,
      tenantStatus: sub.tenant?.status,
      tenantLogo: sub.tenant?.logo,
      planId: sub.planId,
      planName: sub.plan?.name,
      planTier: sub.plan?.tier,
      status: sub.status,
      billingCycle: sub.billingCycle,
      amount: Number(sub.amount),
      currency: sub.currency,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialStart: sub.trialStart,
      trialEnd: sub.trialEnd,
      canceledAt: sub.canceledAt,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      maxUsers: sub.maxUsers,
      maxStorage: Number(sub.maxStorage),
      stripeSubscriptionId: sub.stripeSubscriptionId,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    }));
    
    res.json({
      success: true,
      data: formattedSubscriptions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get subscriptions');
    res.status(500).json({ success: false, error: 'Failed to get subscriptions' });
  }
});

// Get subscription stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    
    // Get status counts
    const statusCounts = await masterPrisma.subscription.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    
    // Get plan distribution
    const planDistribution = await masterPrisma.subscription.groupBy({
      by: ['planId'],
      _count: { planId: true },
      where: { status: 'ACTIVE' },
    });
    
    // Get plans for names
    const plans = await masterPrisma.subscriptionPlan.findMany({
      select: { id: true, name: true, tier: true },
    });
    const planMap = new Map(plans.map((p: any) => [p.id, p]));
    
    // Calculate MRR
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
    
    // Get trials expiring soon (within 7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const expiringTrials = await masterPrisma.subscription.count({
      where: {
        status: 'TRIALING',
        trialEnd: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
    });
    
    // Format response
    const stats = {
      byStatus: statusCounts.reduce((acc: any, item: any) => {
        acc[item.status.toLowerCase()] = item._count.status;
        return acc;
      }, {}),
      byPlan: planDistribution.map((item: any) => ({
        planId: item.planId,
        planName: planMap.get(item.planId)?.name || 'Unknown',
        planTier: planMap.get(item.planId)?.tier || 'Unknown',
        count: item._count.planId,
      })),
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      expiringTrials,
      total: statusCounts.reduce((sum: number, item: any) => sum + item._count.status, 0),
    };
    
    res.json({ success: true, data: stats });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get subscription stats');
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// Get single subscription
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    
    const subscription = await masterPrisma.subscription.findUnique({
      where: { id: req.params.id },
      include: {
        tenant: true,
        plan: true,
      },
    });
    
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    
    // Get payment history
    const payments = await masterPrisma.payment.findMany({
      where: { tenantId: subscription.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    
    // Get invoices
    const invoices = await masterPrisma.invoice.findMany({
      where: { tenantId: subscription.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    
    res.json({
      success: true,
      data: {
        ...subscription,
        amount: Number(subscription.amount),
        maxStorage: Number(subscription.maxStorage),
        payments: payments.map((p: any) => ({
          ...p,
          amount: Number(p.amount),
          refundedAmount: Number(p.refundedAmount),
        })),
        invoices: invoices.map((i: any) => ({
          ...i,
          subtotal: Number(i.subtotal),
          tax: Number(i.tax),
          discount: Number(i.discount),
          total: Number(i.total),
          amountPaid: Number(i.amountPaid),
          amountDue: Number(i.amountDue),
        })),
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get subscription');
    res.status(500).json({ success: false, error: 'Failed to get subscription' });
  }
});

// Update subscription
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const parsed = updateSubscriptionSchema.parse(req.body);
    const masterPrisma = getMasterPrisma();
    
    const existing = await masterPrisma.subscription.findUnique({
      where: { id: req.params.id },
      include: { plan: true },
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    
    const updateData: any = {};
    
    // Handle plan change
    if (parsed.planId && parsed.planId !== existing.planId) {
      const newPlan = await masterPrisma.subscriptionPlan.findUnique({
        where: { id: parsed.planId },
      });
      
      if (!newPlan) {
        return res.status(400).json({ success: false, error: 'Invalid plan' });
      }
      
      updateData.planId = parsed.planId;
      updateData.maxUsers = newPlan.maxUsers;
      updateData.maxStorage = newPlan.maxStorage;
      updateData.maxProjects = newPlan.maxProjects;
      updateData.maxClients = newPlan.maxClients;
      
      // Update amount based on billing cycle
      const cycle = parsed.billingCycle || existing.billingCycle;
      updateData.amount = cycle === 'YEARLY' ? newPlan.yearlyPrice : newPlan.monthlyPrice;
    }
    
    if (parsed.status) {
      updateData.status = parsed.status;
      
      if (parsed.status === 'CANCELED') {
        updateData.canceledAt = new Date();
      }
    }
    
    if (parsed.billingCycle) {
      updateData.billingCycle = parsed.billingCycle;
    }
    
    if (parsed.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = parsed.cancelAtPeriodEnd;
    }
    
    const subscription = await masterPrisma.subscription.update({
      where: { id: req.params.id },
      data: updateData,
      include: { tenant: true, plan: true },
    });
    
    logger.info({ 
      subscriptionId: subscription.id,
      changes: parsed,
      adminId: req.headers['x-user-id'] 
    }, 'Subscription updated');
    
    // Properly serialize BigInt values in response
    const plan = subscription.plan as any;
    const tenant = subscription.tenant as any;
    
    res.json({
      success: true,
      data: {
        ...subscription,
        amount: Number(subscription.amount),
        maxStorage: Number(subscription.maxStorage),
        plan: plan ? {
          ...plan,
          monthlyPrice: Number(plan.monthlyPrice),
          yearlyPrice: Number(plan.yearlyPrice),
          maxStorage: Number(plan.maxStorage),
        } : null,
        tenant: tenant ? {
          ...tenant,
          storageUsed: Number(tenant.storageUsed || 0),
        } : null,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ success: false, error: messages });
    }
    logger.error({ error }, 'Failed to update subscription');
    res.status(500).json({ success: false, error: 'Failed to update subscription' });
  }
});

// Cancel subscription
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { immediately = false, reason } = req.body;
    const masterPrisma = getMasterPrisma();
    
    const existing = await masterPrisma.subscription.findUnique({
      where: { id: req.params.id },
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    
    const updateData: any = {
      canceledAt: new Date(),
    };
    
    if (immediately) {
      updateData.status = 'CANCELED';
    } else {
      updateData.cancelAtPeriodEnd = true;
    }
    
    const subscription = await masterPrisma.subscription.update({
      where: { id: req.params.id },
      data: updateData,
    });
    
    logger.info({ 
      subscriptionId: subscription.id,
      immediately,
      reason,
      adminId: req.headers['x-user-id'] 
    }, 'Subscription canceled');
    
    res.json({
      success: true,
      message: immediately 
        ? 'Subscription canceled immediately' 
        : 'Subscription will cancel at end of billing period',
      data: {
        ...subscription,
        amount: Number(subscription.amount),
        maxStorage: Number(subscription.maxStorage),
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to cancel subscription');
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

// Reactivate subscription
router.post('/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    
    const existing = await masterPrisma.subscription.findUnique({
      where: { id: req.params.id },
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    
    if (existing.status !== 'CANCELED' && !existing.cancelAtPeriodEnd) {
      return res.status(400).json({ success: false, error: 'Subscription is not canceled' });
    }
    
    const subscription = await masterPrisma.subscription.update({
      where: { id: req.params.id },
      data: {
        status: 'ACTIVE',
        canceledAt: null,
        cancelAtPeriodEnd: false,
      },
    });
    
    logger.info({ 
      subscriptionId: subscription.id,
      adminId: req.headers['x-user-id'] 
    }, 'Subscription reactivated');
    
    res.json({
      success: true,
      message: 'Subscription reactivated',
      data: {
        ...subscription,
        amount: Number(subscription.amount),
        maxStorage: Number(subscription.maxStorage),
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to reactivate subscription');
    res.status(500).json({ success: false, error: 'Failed to reactivate subscription' });
  }
});

// Extend trial
router.post('/:id/extend-trial', async (req: Request, res: Response) => {
  try {
    const { days } = req.body;
    
    if (!days || days < 1 || days > 90) {
      return res.status(400).json({ success: false, error: 'Days must be between 1 and 90' });
    }
    
    const masterPrisma = getMasterPrisma();
    
    const existing = await masterPrisma.subscription.findUnique({
      where: { id: req.params.id },
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    
    const currentTrialEnd = existing.trialEnd || new Date();
    const newTrialEnd = new Date(currentTrialEnd.getTime() + days * 24 * 60 * 60 * 1000);
    
    const subscription = await masterPrisma.subscription.update({
      where: { id: req.params.id },
      data: {
        status: 'TRIALING',
        trialEnd: newTrialEnd,
        currentPeriodEnd: newTrialEnd,
      },
    });
    
    logger.info({ 
      subscriptionId: subscription.id,
      extendedDays: days,
      newTrialEnd,
      adminId: req.headers['x-user-id'] 
    }, 'Trial extended');
    
    res.json({
      success: true,
      message: `Trial extended by ${days} days`,
      data: {
        ...subscription,
        amount: Number(subscription.amount),
        maxStorage: Number(subscription.maxStorage),
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to extend trial');
    res.status(500).json({ success: false, error: 'Failed to extend trial' });
  }
});

export default router;
