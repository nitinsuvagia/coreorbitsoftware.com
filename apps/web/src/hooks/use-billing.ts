'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

// Types
export interface UsageMetric {
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
  periodStart: string;
  periodEnd: string;
  metrics: UsageMetric[];
  totalAmount: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug?: string;
  tier?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency?: string;
  maxUsers?: number; // Legacy field
  maxProjects?: number; // Legacy field
  maxStorageGB?: number; // Legacy field
  isActive?: boolean;
  features: {
    maxEmployees?: number;
    maxProjects?: number;
    maxStorage?: number; // in bytes
    customDomain: boolean;
    ssoEnabled: boolean;
    advancedReports: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    whiteLabel?: boolean;
  };
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  plan?: SubscriptionPlan;
  status: 'ACTIVE' | 'TRIAL' | 'CANCELLED' | 'PAST_DUE' | 'PAUSED';
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE';
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  cardBrand?: string;
  cardLast4?: string;
  lineItems?: InvoiceLineItem[];
  notes?: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

export interface PlanLimits {
  maxEmployees: number;
  maxProjects: number;
  maxStorage: number; // in bytes
  customDomain: boolean;
  ssoEnabled: boolean;
  advancedReports: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

// Fetch subscription
export function useSubscription() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: async () => {
      const response = await apiClient.get<Subscription>('/api/v1/billing/subscription');
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    retry: false,
  });
}

// Fetch usage data
export function useUsage() {
  return useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: async () => {
      const response = await apiClient.get<TenantUsage>('/api/v1/billing/usage');
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
  });
}

// Fetch invoices
export function useInvoices(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['billing', 'invoices', page, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Invoice[]; total: number }>(
        `/api/v1/billing/invoices?page=${page}&pageSize=${pageSize}`
      );
      if (response.success && response.data) {
        // Handle both array and paginated response
        const data = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
        return data as Invoice[];
      }
      return [];
    },
  });
}

// Fetch payment methods
export function usePaymentMethods() {
  return useQuery({
    queryKey: ['billing', 'payment-methods'],
    queryFn: async () => {
      const response = await apiClient.get<PaymentMethod[]>('/api/v1/billing/payment-methods');
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
  });
}

// Fetch available plans from pricing-plans (database)
export function usePlans() {
  return useQuery({
    queryKey: ['pricing-plans'],
    queryFn: async () => {
      const response = await apiClient.get<SubscriptionPlan[]>('/api/v1/pricing-plans');
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
  });
}

// Organization status type for billing purposes
export interface OrganizationStatus {
  id: string;
  name: string;
  slug: string;
  legalName?: string;
  status: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  trialEndsAt?: string;
  subscription?: {
    planId: string;
    status: 'ACTIVE' | 'TRIAL' | 'CANCELLED' | 'PAST_DUE' | 'PAUSED';
    currentPeriodEnd: string;
  };
}

// Fetch organization status for billing page
export function useOrganizationStatus() {
  return useQuery({
    queryKey: ['organization', 'status'],
    queryFn: async () => {
      const response = await apiClient.get<OrganizationStatus>('/api/v1/organization');
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
  });
}

// Change plan mutation - handles both creating new and updating existing subscriptions
export function useChangePlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: string; billingCycle?: 'MONTHLY' | 'YEARLY' }) => {
      // First try to update existing subscription
      const patchResponse = await apiClient.patch('/api/v1/billing/subscription', {
        planId,
        billingCycle: billingCycle || 'MONTHLY',
      });
      
      // If subscription exists, return the updated one
      if (patchResponse.success) {
        return patchResponse.data;
      }
      
      // If no subscription exists (404), create a new one
      const errorMessage = typeof patchResponse.error === 'string' 
        ? patchResponse.error 
        : patchResponse.error?.message;
        
      if (errorMessage === 'No active subscription') {
        const postResponse = await apiClient.post('/api/v1/billing/subscription', {
          planId,
          billingCycle: billingCycle || 'MONTHLY',
          startTrial: false, // Don't start trial when selecting a plan
        });
        
        if (!postResponse.success) {
          throw new Error(
            typeof postResponse.error === 'string' 
              ? postResponse.error 
              : postResponse.error?.message || 'Failed to create subscription'
          );
        }
        return postResponse.data;
      }
      
      // Other errors
      throw new Error(errorMessage || 'Failed to change plan');
    },
    onSuccess: () => {
      toast.success('Plan changed successfully');
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Cancel subscription mutation
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (immediate: boolean = false) => {
      const response = await apiClient.post('/api/v1/billing/subscription/cancel', { immediate });
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' 
            ? response.error 
            : response.error?.message || 'Failed to cancel subscription'
        );
      }
      return response.data;
    },
    onSuccess: (_, immediate: boolean) => {
      if (immediate) {
        toast.success('Subscription cancelled');
      } else {
        toast.success('Subscription will be cancelled at period end');
      }
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Activate subscription (end trial and charge immediately)
export function useActivateSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{ message: string; stripeStatus: string }>('/api/v1/billing/subscription/end-trial');
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' 
            ? response.error 
            : response.error?.message || 'Failed to activate subscription'
        );
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('Subscription activated! Your plan is now active.');
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Resume subscription mutation (for subscriptions marked to cancel at period end)
export function useResumeSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/v1/billing/subscription/resume');
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' 
            ? response.error 
            : response.error?.message || 'Failed to resume subscription'
        );
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('Subscription resumed successfully');
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Sync subscription with Stripe (after returning from portal)
export function useSyncSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/v1/billing/subscription/sync');
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' 
            ? response.error 
            : response.error?.message || 'Failed to sync subscription'
        );
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      queryClient.invalidateQueries({ queryKey: ['organization', 'status'] });
    },
    onError: (error: Error) => {
      // Silently fail - this is a background sync
      console.error('Subscription sync failed:', error.message);
    },
  });
}

// Force sync our DB subscription to Stripe (fixes price mismatches)
export function useForceSyncToStripe() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{ message: string }>('/api/v1/billing/subscription/force-sync-to-stripe');
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' 
            ? response.error 
            : response.error?.message || 'Failed to sync to Stripe'
        );
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      queryClient.invalidateQueries({ queryKey: ['organization', 'status'] });
    },
  });
}

// Create Stripe Checkout session for plan subscription
export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async ({ 
      planId, 
      billingCycle,
      successUrl,
      cancelUrl,
    }: { 
      planId: string; 
      billingCycle: 'MONTHLY' | 'YEARLY';
      successUrl: string;
      cancelUrl: string;
    }) => {
      const response = await apiClient.post<{ sessionId: string; url: string }>(
        '/api/v1/billing/checkout/session',
        { planId, billingCycle, successUrl, cancelUrl }
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to create checkout session'
        );
      }
      return response.data;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Create Stripe Customer Portal session for managing payment methods
export function useCreateCustomerPortal() {
  return useMutation({
    mutationFn: async (returnUrl: string) => {
      const response = await apiClient.post<{ url: string }>(
        '/api/v1/billing/portal/session',
        { returnUrl }
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to create portal session'
        );
      }
      return response.data;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Complete checkout session - to sync subscription after Stripe redirect (fallback if webhook didn't fire)
export function useCompleteCheckout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiClient.post<{ message: string; planName?: string }>(
        `/api/v1/billing/checkout/complete/${sessionId}`
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to complete checkout'
        );
      }
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.planName) {
        toast.success(`Successfully subscribed to ${data.planName} plan!`);
      } else {
        toast.success('Subscription activated successfully!');
      }
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error: Error) => {
      // Don't show error if already processed
      if (!error.message.includes('already processed')) {
        toast.error(error.message);
      }
    },
  });
}

// Helper to get plan limits from subscription
export function getPlanLimits(subscription: Subscription | null): PlanLimits | null {
  if (!subscription?.plan) return null;
  
  const plan = subscription.plan;
  return {
    maxEmployees: plan.maxUsers ?? 50,
    maxProjects: plan.maxProjects ?? 10,
    maxStorage: (plan.maxStorageGB ?? 10) * 1024 * 1024 * 1024, // Convert GB to bytes
    customDomain: plan.features.customDomain,
    ssoEnabled: plan.features.ssoEnabled,
    advancedReports: plan.features.advancedReports,
    apiAccess: plan.features.apiAccess,
    prioritySupport: plan.features.prioritySupport,
  };
}

// Platform settings interface
export interface PlatformSettings {
  platformName: string;
  primaryDomain: string;
  supportEmail: string;
  defaultTimezone: string;
  description: string;
}

// Hook to fetch platform general settings (for invoice branding)
export function usePlatformSettings() {
  return useQuery<PlatformSettings>({
    queryKey: ['platform-settings', 'general'],
    queryFn: async () => {
      const response = await apiClient.get<{ data?: PlatformSettings } | PlatformSettings>('/api/v1/platform/settings/general');
      if (response.error) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to fetch platform settings'
        );
      }
      // Handle both { data: settings } and direct settings response
      const rawData = response.data;
      const settings = rawData && typeof rawData === 'object' && 'data' in rawData && rawData.data
        ? rawData.data
        : rawData as PlatformSettings | undefined;
      return settings || {
        platformName: 'Office Management System',
        primaryDomain: '',
        supportEmail: '',
        defaultTimezone: 'UTC',
        description: '',
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
