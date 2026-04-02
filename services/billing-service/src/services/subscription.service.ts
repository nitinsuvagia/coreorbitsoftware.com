/**
 * Subscription Service - Manage tenant subscriptions
 */

import { PrismaClient } from '.prisma/tenant-client';
import { DateTime } from 'luxon';
import { v4 as uuid } from 'uuid';
import { getMasterPrisma } from '@oms/database';
import { publishEvent } from '@oms/event-bus';
import { config } from '../config';
import { logger } from '../utils/logger';
import * as stripeService from './stripe.service';

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'PAUSED';
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionInput {
  tenantId: string;
  planId: string; // Can be plan ID or slug from database
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  paymentMethodId?: string;
  couponCode?: string;
  startTrial?: boolean;
}

export interface UpdateSubscriptionInput {
  planId?: string; // Can be plan ID or slug from database
  billingCycle?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  cancelAtPeriodEnd?: boolean;
}

// Helper to convert Prisma Subscription to our Subscription interface
function mapSubscription(s: any): Subscription {
  return {
    id: s.id,
    tenantId: s.tenantId,
    planId: s.planId,
    status: s.status,
    billingCycle: s.billingCycle as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
    currentPeriodStart: s.currentPeriodStart,
    currentPeriodEnd: s.currentPeriodEnd,
    trialEnd: s.trialEnd || undefined,
    canceledAt: s.canceledAt || undefined,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    stripeSubscriptionId: s.stripeSubscriptionId || undefined,
    stripeCustomerId: s.stripeCustomerId || undefined,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

/**
 * Create a new subscription for a tenant
 */
export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<Subscription> {
  const masterPrisma = getMasterPrisma();
  
  // Check if tenant already has an active subscription
  const existing = await masterPrisma.subscription.findFirst({
    where: {
      tenantId: input.tenantId,
      status: { in: ['TRIALING', 'ACTIVE'] },
    },
  });
  
  if (existing) {
    throw new Error('Tenant already has an active subscription');
  }
  
  // Look up plan from database (by ID or slug)
  const dbPlan = await masterPrisma.subscriptionPlan.findFirst({
    where: {
      OR: [
        { id: input.planId },
        { slug: input.planId },
      ],
      isActive: true,
    },
  });
  
  if (!dbPlan) {
    throw new Error(`Invalid plan: ${input.planId}`);
  }
  
  const now = DateTime.now();
  const trialDays = input.startTrial ? config.billing.trialDays : 0;
  
  // Get plan pricing and limits
  const monthlyPrice = Number(dbPlan.monthlyPrice);
  const yearlyPrice = Number(dbPlan.yearlyPrice);
  const maxUsers = dbPlan.maxUsers || 10;
  const maxStorage = dbPlan.maxStorage || BigInt(10737418240); // 10GB default
  const maxProjects = dbPlan.maxProjects || null;
  
  let subscription: Subscription;
  
  if (input.paymentMethodId) {
    // Create Stripe subscription
    const stripeResult = await stripeService.createSubscription({
      tenantId: input.tenantId,
      planId: dbPlan.slug, // Use plan slug for Stripe
      billingCycle: input.billingCycle,
      paymentMethodId: input.paymentMethodId,
      trialDays,
      couponCode: input.couponCode,
    });
    
    const created = await masterPrisma.subscription.create({
      data: {
        id: uuid(),
        tenantId: input.tenantId,
        planId: dbPlan.id,
        status: trialDays > 0 ? 'TRIALING' : 'ACTIVE',
        billingCycle: input.billingCycle,
        amount: input.billingCycle === 'YEARLY' ? yearlyPrice : monthlyPrice,
        maxUsers: maxUsers,
        maxStorage: maxStorage,
        maxProjects: maxProjects,
        currentPeriodStart: stripeResult.currentPeriodStart,
        currentPeriodEnd: stripeResult.currentPeriodEnd,
        trialEnd: trialDays > 0 ? now.plus({ days: trialDays }).toJSDate() : null,
        stripeSubscriptionId: stripeResult.subscriptionId,
        stripeCustomerId: stripeResult.customerId,
      },
    });
    subscription = mapSubscription(created);
  } else {
    // Create subscription without payment (trial or free tier)
    // For free plans, set status to ACTIVE immediately; otherwise TRIALING
    const isFree = monthlyPrice === 0 && yearlyPrice === 0;
    const periodEnd = now.plus(
      input.billingCycle === 'YEARLY' ? { years: 1 } : { months: 1 }
    );
    
    const created = await masterPrisma.subscription.create({
      data: {
        id: uuid(),
        tenantId: input.tenantId,
        planId: dbPlan.id,
        status: isFree ? 'ACTIVE' : 'TRIALING',
        billingCycle: input.billingCycle,
        amount: input.billingCycle === 'YEARLY' ? yearlyPrice : monthlyPrice,
        maxUsers: maxUsers,
        maxStorage: maxStorage,
        maxProjects: maxProjects,
        currentPeriodStart: now.toJSDate(),
        currentPeriodEnd: periodEnd.toJSDate(),
        trialEnd: isFree ? null : now.plus({ days: config.billing.trialDays }).toJSDate(),
      },
    });
    subscription = mapSubscription(created);
  }
  
  // Publish event
  await publishEvent('subscription.created', {
    subscriptionId: subscription.id,
    tenantId: input.tenantId,
    planId: dbPlan.id,
    status: subscription.status,
  });
  
  logger.info({
    subscriptionId: subscription.id,
    tenantId: input.tenantId,
    planId: dbPlan.id,
  }, 'Subscription created');
  
  return subscription;
}

/**
 * Get subscription by ID
 */
export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  const masterPrisma = getMasterPrisma();
  const subscription = await masterPrisma.subscription.findUnique({ where: { id } });
  return subscription ? mapSubscription(subscription) : null;
}

/**
 * Get tenant's active subscription
 */
export async function getTenantSubscription(tenantId: string): Promise<Subscription | null> {
  const masterPrisma = getMasterPrisma();
  
  const subscription = await masterPrisma.subscription.findFirst({
    where: {
      tenantId,
      status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE'] },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  return subscription ? mapSubscription(subscription) : null;
}

/**
 * Calculate prorated billing when changing plans or billing cycles
 * 
 * NO REFUNDS - We only adjust the next billing date:
 * - Upgrade (cheap → expensive): Next billing comes SOONER
 * - Downgrade (expensive → cheap): Next billing is EXTENDED
 * 
 * Formula:
 *   creditAmount = daysRemaining × oldDailyRate
 *   daysCoveredByCredit = creditAmount / newDailyRate
 *   newBillingDate = today + daysCoveredByCredit
 */
interface ProrationResult {
  creditAmount: number;           // Credit from unused time on old plan (in dollars)
  daysCoveredByCredit: number;    // How many days the credit covers on new plan
  newPeriodEnd: Date;             // New billing period end date (today + daysCoveredByCredit)
  daysRemaining: number;          // Days remaining in current period (before change)
  dailyRateOld: number;           // Daily rate on old plan
  dailyRateNew: number;           // Daily rate on new plan
  isUpgrade: boolean;             // True if upgrading (more expensive)
}

function calculateProration(
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  oldAmount: number,
  newAmount: number,
  oldBillingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
  newBillingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
): ProrationResult {
  const now = DateTime.now();
  const periodStart = DateTime.fromJSDate(currentPeriodStart);
  const periodEnd = DateTime.fromJSDate(currentPeriodEnd);
  
  // Calculate the ORIGINAL period end based on period start + billing cycle
  // This prevents the "farming" exploit - cap is always based on the original cycle, not changed values
  const getMonthsInCycle = (cycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY') => {
    switch (cycle) {
      case 'YEARLY': return 12;
      case 'QUARTERLY': return 3;
      case 'MONTHLY': default: return 1;
    }
  };
  const originalPeriodEnd = periodStart.plus({ months: getMonthsInCycle(oldBillingCycle) });
  
  // Calculate total days in the current period and days used/remaining
  const totalDaysInPeriod = Math.max(1, periodEnd.diff(periodStart, 'days').days);
  const daysUsed = Math.max(0, now.diff(periodStart, 'days').days);
  const daysRemaining = Math.max(0, totalDaysInPeriod - daysUsed);
  
  // Calculate daily rates based on billing cycle
  const getDaysInCycle = (cycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY') => {
    switch (cycle) {
      case 'YEARLY': return 365;
      case 'QUARTERLY': return 91;
      case 'MONTHLY': default: return 30;
    }
  };
  
  const dailyRateOld = oldAmount / getDaysInCycle(oldBillingCycle);
  const dailyRateNew = newAmount / getDaysInCycle(newBillingCycle);
  
  // Calculate credit from unused days on old plan
  const creditAmount = dailyRateOld * daysRemaining;
  
  // Calculate how many days the credit covers on the new plan
  // If new plan is free ($0), give them until original period end
  let daysCoveredByCredit: number;
  if (dailyRateNew === 0 || newAmount === 0) {
    // Free plan - keep current period end
    daysCoveredByCredit = daysRemaining;
  } else {
    daysCoveredByCredit = creditAmount / dailyRateNew;
  }
  
  // Calculate potential new billing date
  let newPeriodEnd = now.plus({ days: Math.ceil(daysCoveredByCredit) });
  
  // Determine if this is an upgrade or downgrade
  const isUpgrade = dailyRateNew > dailyRateOld;
  
  // CRITICAL: Cap the new billing date to NEVER exceed the ORIGINAL period end
  // This prevents the "farming" exploit where repeated up/down cycles extend billing
  // The cap is based on periodStart + billing cycle, NOT the changed periodEnd
  // - Upgrade: billing date moves closer (no cap needed)
  // - Downgrade: billing date extends but NEVER beyond original period
  if (newPeriodEnd > originalPeriodEnd) {
    logger.info({
      calculatedEnd: newPeriodEnd.toISO(),
      cappedTo: originalPeriodEnd.toISO(),
      currentPeriodEnd: periodEnd.toISO(),
    }, 'Billing date capped at ORIGINAL period end (prevents farming exploit)');
    newPeriodEnd = originalPeriodEnd as typeof newPeriodEnd;
  }
  
  logger.info({
    oldAmount,
    newAmount,
    oldBillingCycle,
    newBillingCycle,
    daysRemaining,
    dailyRateOld: Math.round(dailyRateOld * 1000) / 1000,
    dailyRateNew: Math.round(dailyRateNew * 1000) / 1000,
    creditAmount: Math.round(creditAmount * 100) / 100,
    daysCoveredByCredit: Math.round(daysCoveredByCredit * 100) / 100,
    newPeriodEnd: newPeriodEnd.toISO(),
    isUpgrade,
  }, 'Proration calculated');
  
  return {
    creditAmount: Math.round(creditAmount * 100) / 100,
    daysCoveredByCredit: Math.round(daysCoveredByCredit * 100) / 100,
    newPeriodEnd: newPeriodEnd.toJSDate(),
    daysRemaining: Math.round(daysRemaining),
    dailyRateOld: Math.round(dailyRateOld * 1000) / 1000,
    dailyRateNew: Math.round(dailyRateNew * 1000) / 1000,
    isUpgrade,
  };
}

/**
 * Update subscription
 */
export async function updateSubscription(
  id: string,
  input: UpdateSubscriptionInput
): Promise<Subscription> {
  const masterPrisma = getMasterPrisma();
  
  const subscription = await masterPrisma.subscription.findUnique({
    where: { id },
  });
  
  if (!subscription) {
    throw new Error('Subscription not found');
  }
  
  const updateData: any = {};
  let proration: ProrationResult | null = null;
  
  // Get current plan details for proration calculation
  const currentPlan = await masterPrisma.subscriptionPlan.findFirst({
    where: {
      OR: [
        { id: subscription.planId },
        { slug: subscription.planId },
      ],
    },
  });
  
  const oldBillingCycle = subscription.billingCycle as 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  const newBillingCycle = input.billingCycle || oldBillingCycle;
  const oldAmount = Number(subscription.amount);
  
  // Plan change
  if (input.planId && input.planId !== subscription.planId) {
    // Look up plan from database (by ID or slug)
    const newPlan = await masterPrisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          { id: input.planId },
          { slug: input.planId },
        ],
        isActive: true,
      },
    });
    if (!newPlan) {
      throw new Error(`Invalid plan: ${input.planId}`);
    }
    
    // Calculate new amount based on billing cycle
    const newAmount = newBillingCycle === 'YEARLY' ? Number(newPlan.yearlyPrice) : Number(newPlan.monthlyPrice);
    
    // Calculate proration
    proration = calculateProration(
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
      oldAmount,
      newAmount,
      oldBillingCycle,
      newBillingCycle
    );
    
    if (subscription.stripeSubscriptionId) {
      // If downgrading to FREE (price = 0), cancel the Stripe subscription
      if (newAmount === 0) {
        await stripeService.cancelSubscription(subscription.stripeSubscriptionId);
        updateData.stripeSubscriptionId = null;
      } else {
        // If subscription was scheduled to cancel, resume it first
        if (subscription.cancelAtPeriodEnd) {
          await stripeService.setCancelAtPeriodEnd(subscription.stripeSubscriptionId, false);
        }
        // Update Stripe subscription with new plan, price, AND billing date
        // Pass the calculated proration date so Stripe bills on the adjusted date
        const stripeResult = await stripeService.updateSubscription(
          subscription.stripeSubscriptionId,
          newPlan.slug,
          newBillingCycle,
          newAmount, // Pass actual DB amount to ensure Stripe uses correct price
          proration.newPeriodEnd // Pass calculated billing date to sync with Stripe
        );
        
        // If trial_end was set, immediately end trial to show 'active' status in Stripe
        // The billing date is preserved (next charge happens on trial_end date)
        if (stripeResult.needsTrialEnd) {
          logger.info({ subscriptionId: subscription.stripeSubscriptionId }, 
            'Ending trial immediately to show active status in Stripe');
          // Don't actually end trial - we WANT the trial_end date to be preserved
          // Stripe will charge on that date. The status shows "trialing" but that's
          // actually the billing date, not a free trial.
        }
      }
    }
    
    updateData.planId = newPlan.id;
    updateData.amount = newAmount;
    updateData.maxUsers = newPlan.maxUsers;
    updateData.maxStorage = newPlan.maxStorage;
    updateData.maxProjects = newPlan.maxProjects;
    
    // ALWAYS use our calculated proration date - this implements the "adjust billing date" logic
    // Upgrade: credit covers fewer days → billing date sooner
    // Downgrade: credit covers more days → billing date later
    updateData.currentPeriodStart = new Date();
    updateData.currentPeriodEnd = proration.newPeriodEnd;
    
    logger.info({
      subscriptionId: id,
      oldAmount,
      newAmount,
      isUpgrade: proration.isUpgrade,
      creditAmount: proration.creditAmount,
      daysCoveredByCredit: proration.daysCoveredByCredit,
      newPeriodEnd: proration.newPeriodEnd,
    }, 'Proration applied - billing date adjusted in DB and Stripe');
    
    // Clear cancelAtPeriodEnd when changing plans (user wants to continue with new plan)
    if (subscription.cancelAtPeriodEnd && newAmount > 0) {
      updateData.cancelAtPeriodEnd = false;
    }
    
    // If billing cycle is also changing, update billing cycle
    if (input.billingCycle && input.billingCycle !== oldBillingCycle) {
      updateData.billingCycle = input.billingCycle;
    }
    
    await publishEvent('subscription.plan_changed', {
      subscriptionId: id,
      tenantId: subscription.tenantId,
      oldPlanId: subscription.planId,
      newPlanId: newPlan.id,
      isUpgrade: proration.isUpgrade,
      proration: {
        creditAmount: proration.creditAmount,
        daysCoveredByCredit: proration.daysCoveredByCredit,
        daysRemaining: proration.daysRemaining,
        newPeriodEnd: proration.newPeriodEnd,
      },
    });
    
    logger.info({
      subscriptionId: id,
      oldPlan: subscription.planId,
      newPlan: newPlan.id,
      proration,
    }, 'Subscription plan changed with proration');
  } else if (input.billingCycle && input.billingCycle !== oldBillingCycle) {
    // Only billing cycle change (no plan change)
    if (currentPlan) {
      const newAmount = input.billingCycle === 'YEARLY' 
        ? Number(currentPlan.yearlyPrice) 
        : Number(currentPlan.monthlyPrice);
      
      // Calculate proration for cycle change
      proration = calculateProration(
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
        oldAmount,
        newAmount,
        oldBillingCycle,
        input.billingCycle
      );
      
      // Update Stripe subscription with new billing cycle AND billing date
      if (subscription.stripeSubscriptionId) {
        await stripeService.updateSubscription(
          subscription.stripeSubscriptionId,
          currentPlan.slug,
          input.billingCycle,
          newAmount, // Pass actual DB amount
          proration.newPeriodEnd // Pass calculated billing date to sync with Stripe
        );
      }
      
      updateData.billingCycle = input.billingCycle;
      updateData.amount = newAmount;
      // ALWAYS use our calculated proration date
      updateData.currentPeriodStart = new Date();
      updateData.currentPeriodEnd = proration.newPeriodEnd;
      
      logger.info({
        subscriptionId: id,
        oldCycle: oldBillingCycle,
        newCycle: input.billingCycle,
        proration,
      }, 'Subscription billing cycle changed with proration');
    }
  }
  
  // Cancel at period end
  if (input.cancelAtPeriodEnd !== undefined) {
    updateData.cancelAtPeriodEnd = input.cancelAtPeriodEnd;
    
    if (subscription.stripeSubscriptionId) {
      await stripeService.setCancelAtPeriodEnd(
        subscription.stripeSubscriptionId,
        input.cancelAtPeriodEnd
      );
    }
    
    if (input.cancelAtPeriodEnd) {
      await publishEvent('subscription.cancellation_scheduled', {
        subscriptionId: id,
        tenantId: subscription.tenantId,
        cancelAt: subscription.currentPeriodEnd,
      });
    }
  }
  
  updateData.updatedAt = new Date();
  
  const updated = await masterPrisma.subscription.update({
    where: { id },
    data: updateData,
  });
  
  return mapSubscription(updated);
}

/**
 * Cancel subscription immediately
 */
export async function cancelSubscription(id: string): Promise<Subscription> {
  const masterPrisma = getMasterPrisma();
  
  const subscription = await masterPrisma.subscription.findUnique({
    where: { id },
  });
  
  if (!subscription) {
    throw new Error('Subscription not found');
  }
  
  if (subscription.stripeSubscriptionId) {
    await stripeService.cancelSubscription(subscription.stripeSubscriptionId);
  }
  
  const canceled = await masterPrisma.subscription.update({
    where: { id },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
      updatedAt: new Date(),
    },
  });
  
  await publishEvent('subscription.canceled', {
    subscriptionId: id,
    tenantId: subscription.tenantId,
  });
  
  logger.info({
    subscriptionId: id,
    tenantId: subscription.tenantId,
  }, 'Subscription canceled');
  
  return mapSubscription(canceled);
}

/**
 * Resume canceled subscription
 */
export async function resumeSubscription(id: string): Promise<Subscription> {
  const masterPrisma = getMasterPrisma();
  
  const subscription = await masterPrisma.subscription.findUnique({
    where: { id },
  });
  
  if (!subscription) {
    throw new Error('Subscription not found');
  }
  
  if (!subscription.cancelAtPeriodEnd) {
    throw new Error('Subscription is not scheduled for cancellation');
  }
  
  if (subscription.stripeSubscriptionId) {
    await stripeService.setCancelAtPeriodEnd(subscription.stripeSubscriptionId, false);
  }
  
  const resumed = await masterPrisma.subscription.update({
    where: { id },
    data: {
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    },
  });
  
  return mapSubscription(resumed);
}

/**
 * Renew subscription (called after successful payment)
 */
export async function renewSubscription(id: string): Promise<Subscription> {
  const masterPrisma = getMasterPrisma();
  
  const subscription = await masterPrisma.subscription.findUnique({
    where: { id },
  });
  
  if (!subscription) {
    throw new Error('Subscription not found');
  }
  
  const now = DateTime.now();
  const newPeriodEnd = now.plus(
    (subscription.billingCycle as 'MONTHLY' | 'QUARTERLY' | 'YEARLY') === 'YEARLY' ? { years: 1 } : { months: 1 }
  );
  
  const renewed = await masterPrisma.subscription.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: now.toJSDate(),
      currentPeriodEnd: newPeriodEnd.toJSDate(),
      updatedAt: new Date(),
    },
  });
  
  await publishEvent('subscription.renewed', {
    subscriptionId: id,
    tenantId: subscription.tenantId,
    currentPeriodEnd: newPeriodEnd.toJSDate(),
  });
  
  return mapSubscription(renewed);
}

/**
 * Handle subscription expiration
 */
export async function handleExpiredSubscriptions(): Promise<number> {
  const masterPrisma = getMasterPrisma();
  
  const now = new Date();
  
  // Find subscriptions that have passed their end date and are still active
  const expired = await masterPrisma.subscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'PAST_DUE'] },
      currentPeriodEnd: { lt: now },
      cancelAtPeriodEnd: true,
    },
  });
  
  for (const subscription of expired) {
    await masterPrisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'UNPAID',
        updatedAt: now,
      },
    });
    
    await publishEvent('subscription.expired', {
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
    });
    
    logger.info({
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
    }, 'Subscription expired');
  }
  
  return expired.length;
}

/**
 * Handle trial ending
 */
export async function handleTrialsEnding(): Promise<number> {
  const masterPrisma = getMasterPrisma();
  
  const now = new Date();
  
  // Find trials that have ended
  const endedTrials = await masterPrisma.subscription.findMany({
    where: {
      status: 'TRIALING',
      trialEnd: { lt: now },
    },
  });
  
  for (const subscription of endedTrials) {
    // If they have a payment method, convert to active
    // Otherwise, expire the subscription
    const hasPaymentMethod = subscription.stripeCustomerId != null;
    
    await masterPrisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: hasPaymentMethod ? 'ACTIVE' : 'UNPAID',
        updatedAt: now,
      },
    });

    // Update tenant status when trial converts to active
    if (hasPaymentMethod) {
      await masterPrisma.tenant.update({
        where: { id: subscription.tenantId },
        data: { status: 'ACTIVE', updatedAt: now },
      });
      logger.info({ tenantId: subscription.tenantId }, 'Tenant status updated to ACTIVE after trial ended');
    }
    
    await publishEvent('subscription.trial_ended', {
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
      convertedToActive: hasPaymentMethod,
    });
    
    logger.info({
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
      convertedToActive: hasPaymentMethod,
    }, 'Trial ended');
  }
  
  return endedTrials.length;
}
