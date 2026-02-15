/**
 * Subscription Service - Manage tenant subscriptions
 */

import { PrismaClient } from '.prisma/tenant-client';
import { DateTime } from 'luxon';
import { v4 as uuid } from 'uuid';
import { getMasterPrisma } from '@oms/database';
import { publishEvent } from '@oms/event-bus';
import { config, PlanId } from '../config';
import { logger } from '../utils/logger';
import * as planService from './plan.service';
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
  planId: PlanId;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  paymentMethodId?: string;
  couponCode?: string;
  startTrial?: boolean;
}

export interface UpdateSubscriptionInput {
  planId?: PlanId;
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
  
  const plan = planService.getPlanById(input.planId);
  if (!plan) {
    throw new Error(`Invalid plan: ${input.planId}`);
  }
  
  const now = DateTime.now();
  const trialDays = input.startTrial ? config.billing.trialDays : 0;
  
  let subscription: Subscription;
  
  if (input.paymentMethodId) {
    // Create Stripe subscription
    const stripeResult = await stripeService.createSubscription({
      tenantId: input.tenantId,
      planId: input.planId,
      billingCycle: input.billingCycle,
      paymentMethodId: input.paymentMethodId,
      trialDays,
      couponCode: input.couponCode,
    });
    
    const created = await masterPrisma.subscription.create({
      data: {
        id: uuid(),
        tenantId: input.tenantId,
        planId: input.planId,
        status: trialDays > 0 ? 'TRIALING' : 'ACTIVE',
        billingCycle: input.billingCycle,
        amount: input.billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice,
        maxUsers: (plan.features as any).maxEmployees || 10,
        maxStorage: BigInt((plan.features as any).maxStorage || 10737418240), // 10GB default
        maxProjects: (plan.features as any).maxProjects || null,
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
    const periodEnd = now.plus(
      input.billingCycle === 'YEARLY' ? { years: 1 } : { months: 1 }
    );
    
    const created = await masterPrisma.subscription.create({
      data: {
        id: uuid(),
        tenantId: input.tenantId,
        planId: input.planId,
        status: 'TRIALING',
        billingCycle: input.billingCycle,
        amount: input.billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice,
        maxUsers: (plan.features as any).maxEmployees || 10,
        maxStorage: BigInt((plan.features as any).maxStorage || 10737418240), // 10GB default
        maxProjects: (plan.features as any).maxProjects || null,
        currentPeriodStart: now.toJSDate(),
        currentPeriodEnd: periodEnd.toJSDate(),
        trialEnd: now.plus({ days: config.billing.trialDays }).toJSDate(),
      },
    });
    subscription = mapSubscription(created);
  }
  
  // Publish event
  await publishEvent('subscription.created', {
    subscriptionId: subscription.id,
    tenantId: input.tenantId,
    planId: input.planId,
    status: subscription.status,
  });
  
  logger.info({
    subscriptionId: subscription.id,
    tenantId: input.tenantId,
    planId: input.planId,
  }, 'Subscription created');
  
  return mapSubscription(subscription);
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
  
  // Plan change
  if (input.planId && input.planId !== subscription.planId) {
    const newPlan = planService.getPlanById(input.planId);
    if (!newPlan) {
      throw new Error(`Invalid plan: ${input.planId}`);
    }
    
    if (subscription.stripeSubscriptionId) {
      await stripeService.updateSubscription(
        subscription.stripeSubscriptionId,
        input.planId,
        input.billingCycle || (subscription.billingCycle as 'MONTHLY' | 'QUARTERLY' | 'YEARLY')
      );
    }
    
    updateData.planId = input.planId;
    
    await publishEvent('subscription.plan_changed', {
      subscriptionId: id,
      tenantId: subscription.tenantId,
      oldPlanId: subscription.planId,
      newPlanId: input.planId,
    });
  }
  
  // Billing cycle change
  if (input.billingCycle && input.billingCycle !== subscription.billingCycle) {
    updateData.billingCycle = input.billingCycle;
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
