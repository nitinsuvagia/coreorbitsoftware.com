/**
 * Tenant Types - Multi-tenancy core types
 */

import { AuditableEntity } from '../common';

export type TenantStatus = 'pending' | 'active' | 'suspended' | 'inactive' | 'terminated';
export type SubscriptionTier = 'starter' | 'professional' | 'enterprise' | 'custom';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'failed' | 'refunded';

// Forward declarations to avoid circular imports - actual interfaces are in subscription.types.ts
export interface TenantSubscription {
  planId: string;
  tier: SubscriptionTier;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  paymentMethod?: PaymentMethod;
}

export interface TenantBilling {
  email: string;
  name: string;
  company?: string;
  address: BillingAddress;
  taxId?: string;
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PaymentMethod {
  type: 'card' | 'bank_transfer' | 'invoice';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface Tenant extends AuditableEntity {
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  status: TenantStatus;
  databaseName: string;
  databaseHost?: string;
  settings: TenantSettings;
  subscription: TenantSubscription;
  billing: TenantBilling;
  metadata?: Record<string, unknown>;
}

export interface TenantSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  language: string;
  fiscalYearStart: number;
  workingDays: number[];
  workingHours: WorkingHours;
  modules: EnabledModules;
  features: TenantFeatures;
  branding: TenantBranding;
  security: TenantSecuritySettings;
  notifications: NotificationPreferences;
}

export interface WorkingHours {
  start: string;
  end: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface EnabledModules {
  employee: boolean;
  attendance: boolean;
  project: boolean;
  task: boolean;
  client: boolean;
  asset: boolean;
  hrPayroll: boolean;
  meeting: boolean;
  recruitment: boolean;
  resource: boolean;
  file: boolean;
}

export interface TenantFeatures {
  ssoEnabled: boolean;
  mfaRequired: boolean;
  ipWhitelist: boolean;
  auditLog: boolean;
  customFields: boolean;
  advancedReporting: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  integrations: string[];
}

export interface TenantBranding {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  customCss?: string;
}

export interface TenantSecuritySettings {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  passwordExpiryDays: number;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  allowedIpRanges?: string[];
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  slackEnabled: boolean;
  digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
}
