/**
 * Subscription Types - Plans and billing
 */

import { BaseEntity } from '../common';
import { 
  BillingCycle, 
  PaymentStatus, 
  SubscriptionTier,
  TenantSubscription,
  TenantBilling,
  BillingAddress,
  PaymentMethod
} from './tenant.types';

// Re-export the types from tenant.types.ts
export type { TenantSubscription, TenantBilling, BillingAddress, PaymentMethod };

export interface SubscriptionPlan extends BaseEntity {
  name: string;
  tier: SubscriptionTier;
  description: string;
  features: string[];
  pricing: PlanPricing[];
  limits: PlanLimits;
  isActive: boolean;
}

export interface PlanPricing {
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  discount?: number;
}

export interface PlanLimits {
  maxUsers: number;
  maxProjects: number;
  maxStorage: number;
  maxApiCalls: number;
  dataRetentionDays: number;
}

export interface Invoice extends BaseEntity {
  tenantId: string;
  invoiceNumber: string;
  periodStart: Date;
  periodEnd: Date;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status: PaymentStatus;
  dueDate: Date;
  paidDate?: Date;
  items: InvoiceItem[];
  notes?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}
