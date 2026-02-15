/**
 * Plan Service - Subscription plan management
 */

import { PrismaClient } from '.prisma/tenant-client';
import { config, PlanId } from '../config';
import { logger } from '../utils/logger';

export interface Plan {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: Record<string, any>;
  isActive: boolean;
}

export interface PlanLimits {
  maxEmployees: number;
  maxProjects: number;
  maxStorage: number;
  customDomain: boolean;
  ssoEnabled: boolean;
  advancedReports: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

/**
 * Get all available plans
 */
export async function getAvailablePlans(): Promise<Plan[]> {
  const plans: Plan[] = Object.entries(config.plans).map(([id, plan]) => ({
    id,
    name: plan.name,
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: plan.yearlyPrice,
    currency: config.billing.defaultCurrency,
    features: plan.features,
    isActive: true,
  }));
  
  return plans;
}

/**
 * Get plan by ID
 */
export function getPlanById(planId: PlanId): Plan | null {
  const plan = config.plans[planId];
  
  if (!plan) {
    return null;
  }
  
  return {
    id: planId,
    name: plan.name,
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: plan.yearlyPrice,
    currency: config.billing.defaultCurrency,
    features: plan.features,
    isActive: true,
  };
}

/**
 * Get plan limits
 */
export function getPlanLimits(planId: PlanId): PlanLimits | null {
  const plan = config.plans[planId];
  
  if (!plan) {
    return null;
  }
  
  return plan.features as PlanLimits;
}

/**
 * Check if a plan supports a feature
 */
export function planHasFeature(planId: PlanId, feature: keyof PlanLimits): boolean {
  const limits = getPlanLimits(planId);
  
  if (!limits) {
    return false;
  }
  
  const value = limits[feature];
  
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'number') {
    return value !== 0;
  }
  
  return false;
}

/**
 * Compare two plans
 */
export function comparePlans(planId1: PlanId, planId2: PlanId): 'upgrade' | 'downgrade' | 'same' {
  const plan1 = config.plans[planId1];
  const plan2 = config.plans[planId2];
  
  if (!plan1 || !plan2) {
    throw new Error('Invalid plan ID');
  }
  
  if (plan1.monthlyPrice < plan2.monthlyPrice) {
    return 'upgrade';
  } else if (plan1.monthlyPrice > plan2.monthlyPrice) {
    return 'downgrade';
  }
  
  return 'same';
}

/**
 * Calculate plan price
 */
export function calculatePlanPrice(
  planId: PlanId,
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
): number {
  const plan = config.plans[planId];
  
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }
  
  return billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
}

/**
 * Calculate savings with yearly billing
 */
export function calculateYearlySavings(planId: PlanId): {
  monthlyTotal: number;
  yearlyPrice: number;
  savings: number;
  savingsPercent: number;
} {
  const plan = config.plans[planId];
  
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }
  
  const monthlyTotal = plan.monthlyPrice * 12;
  const savings = monthlyTotal - plan.yearlyPrice;
  const savingsPercent = (savings / monthlyTotal) * 100;
  
  return {
    monthlyTotal,
    yearlyPrice: plan.yearlyPrice,
    savings,
    savingsPercent: Math.round(savingsPercent),
  };
}
