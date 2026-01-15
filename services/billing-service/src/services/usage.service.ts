/**
 * Usage Service - Track usage-based billing metrics
 */

import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { v4 as uuid } from 'uuid';
import Decimal from 'decimal.js';
import { getMasterPrisma } from '@oms/database';
import { getTenantPrisma } from '@oms/tenant-db-manager';
import { publishEvent } from '@oms/event-bus';
import { config, UsageMetricId } from '../config';
import { logger } from '../utils/logger';

export interface UsageRecord {
  id: string;
  tenantId: string;
  metricId: string;
  quantity: number;
  periodStart: Date;
  periodEnd: Date;
  unitPrice: number;
  amount: number;
  invoiced: boolean;
  createdAt: Date;
}

export interface UsageSummary {
  metricId: string;
  metricName: string;
  totalQuantity: number;
  freeQuota: number;
  billableQuantity: number;
  unitPrice: number;
  amount: number;
}

export interface TenantUsage {
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  metrics: UsageSummary[];
  totalAmount: number;
}

/**
 * Record usage
 */
export async function recordUsage(
  tenantId: string,
  metricId: UsageMetricId,
  quantity: number,
  timestamp?: Date
): Promise<void> {
  const masterPrisma = getMasterPrisma();
  const ts = timestamp || new Date();
  
  const metric = config.usageMetrics[metricId];
  if (!metric) {
    throw new Error(`Unknown metric: ${metricId}`);
  }
  
  // Get current billing period
  const period = getBillingPeriod(ts);
  
  // Check if we have an existing record for this period
  const existing = await masterPrisma.usageRecord.findFirst({
    where: {
      tenantId,
      metricId,
      periodStart: period.start,
      periodEnd: period.end,
    },
  });
  
  if (existing) {
    // Update existing record
    await masterPrisma.usageRecord.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + BigInt(quantity),
      },
    });
  } else {
    // Create new record
    await masterPrisma.usageRecord.create({
      data: {
        id: uuid(),
        tenantId,
        metricId,
        quantity: BigInt(quantity),
        periodStart: period.start,
        periodEnd: period.end,
        unitPrice: metric.unitPrice,
        amount: 0, // Will be calculated at invoice time
        invoiced: false,
      },
    });
  }
  
  logger.debug({
    tenantId,
    metricId,
    quantity,
  }, 'Usage recorded');
}

/**
 * Get current billing period
 */
function getBillingPeriod(date: Date): { start: Date; end: Date } {
  const dt = DateTime.fromJSDate(date);
  const start = dt.startOf('month').toJSDate();
  const end = dt.endOf('month').toJSDate();
  return { start, end };
}

/**
 * Get tenant usage for current period
 */
export async function getCurrentUsage(tenantId: string): Promise<TenantUsage> {
  const period = getBillingPeriod(new Date());
  return getUsageForPeriod(tenantId, period.start, period.end);
}

/**
 * Get tenant usage for a specific period
 */
export async function getUsageForPeriod(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<TenantUsage> {
  const masterPrisma = getMasterPrisma();
  
  const records = await masterPrisma.usageRecord.findMany({
    where: {
      tenantId,
      periodStart: { gte: periodStart },
      periodEnd: { lte: periodEnd },
    },
  });
  
  // Group by metric
  const metricTotals = new Map<string, number>();
  
  for (const record of records) {
    const current = metricTotals.get(record.metricId) || 0;
    metricTotals.set(record.metricId, current + Number(record.quantity));
  }
  
  // Build summaries
  const metrics: UsageSummary[] = [];
  let totalAmount = new Decimal(0);
  
  for (const [metricId, totalQuantity] of metricTotals) {
    const metricConfig = config.usageMetrics[metricId as UsageMetricId];
    if (!metricConfig) continue;
    
    const freeQuota = (metricConfig as any).freeQuota || 0;
    const billableQuantity = Math.max(0, totalQuantity - freeQuota);
    const amount = new Decimal(billableQuantity).times(metricConfig.unitPrice);
    
    metrics.push({
      metricId,
      metricName: metricConfig.name,
      totalQuantity,
      freeQuota,
      billableQuantity,
      unitPrice: metricConfig.unitPrice,
      amount: amount.toNumber(),
    });
    
    totalAmount = totalAmount.plus(amount);
  }
  
  return {
    tenantId,
    periodStart,
    periodEnd,
    metrics,
    totalAmount: totalAmount.toNumber(),
  };
}

/**
 * Calculate current employee count usage
 */
export async function updateEmployeeUsage(
  tenantId: string,
  tenantSlug: string
): Promise<void> {
  const tenantPrisma = getTenantPrisma();
  
  const employeeCount = await tenantPrisma.employee.count({
    where: { status: 'active' },
  });
  
  // Get plan limits
  const masterPrisma = getMasterPrisma();
  const subscription = await masterPrisma.subscription.findFirst({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'TRIALING'] },
    },
  });
  
  if (!subscription) return;
  
  const planConfig = config.plans[subscription.planId as keyof typeof config.plans];
  if (!planConfig) return;
  
  const maxEmployees = planConfig.features.maxEmployees;
  
  // Record overage if applicable
  if (maxEmployees > 0 && employeeCount > maxEmployees) {
    const overage = employeeCount - maxEmployees;
    
    // Record as monthly usage (replace previous record)
    const period = getBillingPeriod(new Date());
    
    await masterPrisma.usageRecord.upsert({
      where: {
        tenantId_metricId_periodStart_periodEnd: {
          tenantId,
          metricId: 'additional_employee',
          periodStart: period.start,
          periodEnd: period.end,
        },
      },
      create: {
        id: uuid(),
        tenantId,
        metricId: 'additional_employee',
        quantity: BigInt(overage),
        periodStart: period.start,
        periodEnd: period.end,
        unitPrice: config.usageMetrics.additionalEmployee.unitPrice,
        amount: overage * config.usageMetrics.additionalEmployee.unitPrice,
        invoiced: false,
      },
      update: {
        quantity: BigInt(overage),
        amount: overage * config.usageMetrics.additionalEmployee.unitPrice,
      },
    });
  }
}

/**
 * Calculate storage usage
 */
export async function updateStorageUsage(
  tenantId: string,
  storageBytes: number
): Promise<void> {
  const masterPrisma = getMasterPrisma();
  
  const subscription = await masterPrisma.subscription.findFirst({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'TRIALING'] },
    },
  });
  
  if (!subscription) return;
  
  const planConfig = config.plans[subscription.planId as keyof typeof config.plans];
  if (!planConfig) return;
  
  const maxStorage = planConfig.features.maxStorage;
  const storageGB = storageBytes / (1024 * 1024 * 1024);
  const maxStorageGB = maxStorage / (1024 * 1024 * 1024);
  
  // Record overage if applicable
  if (storageGB > maxStorageGB) {
    const overageGB = storageGB - maxStorageGB;
    const period = getBillingPeriod(new Date());
    
    await masterPrisma.usageRecord.upsert({
      where: {
        tenantId_metricId_periodStart_periodEnd: {
          tenantId,
          metricId: 'additional_storage',
          periodStart: period.start,
          periodEnd: period.end,
        },
      },
      create: {
        id: uuid(),
        tenantId,
        metricId: 'additional_storage',
        quantity: BigInt(Math.ceil(overageGB)),
        periodStart: period.start,
        periodEnd: period.end,
        unitPrice: config.usageMetrics.additionalStorage.unitPrice,
        amount: Math.ceil(overageGB) * config.usageMetrics.additionalStorage.unitPrice,
        invoiced: false,
      },
      update: {
        quantity: BigInt(Math.ceil(overageGB)),
        amount: Math.ceil(overageGB) * config.usageMetrics.additionalStorage.unitPrice,
      },
    });
  }
}

/**
 * Record API call
 */
export async function recordApiCall(tenantId: string): Promise<void> {
  await recordUsage(tenantId, 'apiCalls', 1);
}

/**
 * Get usage alerts
 */
export async function getUsageAlerts(
  tenantId: string
): Promise<{ metricId: string; usage: number; limit: number; percentage: number }[]> {
  const masterPrisma = getMasterPrisma();
  
  const subscription = await masterPrisma.subscription.findFirst({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'TRIALING'] },
    },
  });
  
  if (!subscription) return [];
  
  const planConfig = config.plans[subscription.planId as keyof typeof config.plans];
  if (!planConfig) return [];
  
  const usage = await getCurrentUsage(tenantId);
  const alerts: { metricId: string; usage: number; limit: number; percentage: number }[] = [];
  
  // Check each metric against limits
  const limits: Record<string, number> = {
    additional_employee: planConfig.features.maxEmployees,
    additional_storage: planConfig.features.maxStorage / (1024 * 1024 * 1024),
    api_calls: 10000, // Default free quota
  };
  
  for (const metric of usage.metrics) {
    const limit = limits[metric.metricId];
    if (limit && limit > 0) {
      const percentage = (metric.totalQuantity / limit) * 100;
      
      if (percentage >= 80) {
        alerts.push({
          metricId: metric.metricId,
          usage: metric.totalQuantity,
          limit,
          percentage: Math.min(100, Math.round(percentage)),
        });
      }
    }
  }
  
  return alerts;
}

/**
 * Mark usage records as invoiced
 */
export async function markUsageAsInvoiced(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date,
  invoiceId: string
): Promise<void> {
  const masterPrisma = getMasterPrisma();
  
  await masterPrisma.usageRecord.updateMany({
    where: {
      tenantId,
      periodStart: { gte: periodStart },
      periodEnd: { lte: periodEnd },
      invoiced: false,
    },
    data: {
      invoiced: true,
      metadata: {
        invoiceId,
        invoicedAt: new Date().toISOString(),
      },
    },
  });
  
  logger.info({
    tenantId,
    periodStart,
    periodEnd,
    invoiceId,
  }, 'Usage marked as invoiced');
}
