'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { Invoice, BillingInfo, SubscriptionPlan, Subscription, PaymentMethod } from '../types';

// Default billing info when no subscription exists
const defaultBillingInfo: BillingInfo = {
  subscription: null,
  availablePlans: [],
  paymentMethod: null,
  nextBillingDate: null,
  monthlyAmount: 0,
  cardLast4: '',
  cardBrand: '',
};

export function useBilling() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [billingInfo, setBillingInfo] = useState<BillingInfo>(defaultBillingInfo);

  // Fetch available subscription plans from Platform Admin
  const fetchPlans = useCallback(async (): Promise<SubscriptionPlan[]> => {
    try {
      const response = await apiClient.get<SubscriptionPlan[]>('/api/v1/pricing-plans');
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error: any) {
      console.error('Failed to fetch plans:', error);
      return [];
    }
  }, []);

  // Fetch current subscription details
  const fetchSubscription = useCallback(async (): Promise<Subscription | null> => {
    try {
      const response = await apiClient.get<Subscription>('/api/v1/billing/subscription');
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error: any) {
      console.error('Failed to fetch subscription:', error);
      return null;
    }
  }, []);

  // Fetch payment methods
  const fetchPaymentMethods = useCallback(async (): Promise<PaymentMethod[]> => {
    try {
      const response = await apiClient.get<PaymentMethod[]>('/api/v1/billing/payment-methods');
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error: any) {
      console.error('Failed to fetch payment methods:', error);
      return [];
    }
  }, []);

  // Fetch all billing data
  const fetchBillingData = useCallback(async () => {
    try {
      setLoadingBilling(true);
      
      // Fetch plans, subscription, and payment methods in parallel
      const [plans, subscription, paymentMethods] = await Promise.all([
        fetchPlans(),
        fetchSubscription(),
        fetchPaymentMethods(),
      ]);

      // Find default payment method
      const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault) || paymentMethods[0] || null;

      // Calculate billing amount based on subscription
      let monthlyAmount = 0;
      let nextBillingDate: string | null = null;
      
      if (subscription) {
        nextBillingDate = subscription.currentPeriodEnd;
        
        if (subscription.plan) {
          // Calculate monthly equivalent
          switch (subscription.billingCycle) {
            case 'YEARLY':
              monthlyAmount = Math.round(subscription.plan.yearlyPrice / 12);
              break;
            case 'QUARTERLY':
              monthlyAmount = Math.round((subscription.plan.monthlyPrice * 3) / 3);
              break;
            default:
              monthlyAmount = subscription.plan.monthlyPrice;
          }
        }
      }

      setBillingInfo({
        subscription,
        availablePlans: plans,
        paymentMethod: defaultPaymentMethod,
        nextBillingDate,
        monthlyAmount,
        // Legacy compatibility
        cardLast4: defaultPaymentMethod?.last4 || '',
        cardBrand: defaultPaymentMethod?.brand || '',
      });
    } catch (error: any) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoadingBilling(false);
    }
  }, [fetchPlans, fetchSubscription, fetchPaymentMethods]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoadingInvoices(true);
      const response = await apiClient.get<{ data: Invoice[] }>('/api/v1/billing/invoices');
      if (response.success && response.data) {
        // Handle both array and paginated response
        const invoiceData = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
        setInvoices(invoiceData);
      }
    } catch (error: any) {
      console.error('Failed to fetch invoices:', error);
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  // Initialize billing data on mount
  useEffect(() => {
    fetchBillingData();
    fetchInvoices();
  }, [fetchBillingData, fetchInvoices]);

  const changePlan = useCallback(async (newPlanId: string, billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY') => {
    try {
      const response = await apiClient.patch('/api/v1/billing/subscription', {
        planId: newPlanId,
        billingCycle,
      });
      
      if (response.success) {
        toast.success('Plan changed successfully');
        // Refresh billing data
        await fetchBillingData();
        return true;
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || 'Failed to change plan';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to change plan');
      return false;
    }
  }, [fetchBillingData]);

  const cancelSubscription = useCallback(async (immediate: boolean = false) => {
    try {
      const response = await apiClient.post('/api/v1/billing/subscription/cancel', { immediate });
      
      if (response.success) {
        if (immediate) {
          toast.success('Subscription cancelled');
        } else {
          toast.success('Subscription will be cancelled at period end');
        }
        // Refresh billing data
        await fetchBillingData();
        return true;
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || 'Failed to cancel subscription';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel subscription');
      return false;
    }
  }, [fetchBillingData]);

  const updatePaymentMethod = useCallback(async (paymentMethodId: string, setAsDefault: boolean = true) => {
    try {
      const response = await apiClient.post('/api/v1/billing/payment-methods', {
        paymentMethodId,
        setAsDefault,
      });
      
      if (response.success) {
        toast.success('Payment method updated');
        // Refresh billing data
        await fetchBillingData();
        return true;
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || 'Failed to update payment method';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update payment method');
      return false;
    }
  }, [fetchBillingData]);

  // Get setup intent for Stripe card element
  const getSetupIntent = useCallback(async () => {
    try {
      const response = await apiClient.post<{ clientSecret: string }>('/api/v1/billing/payment-methods/setup-intent');
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error: any) {
      console.error('Failed to get setup intent:', error);
      return null;
    }
  }, []);

  return {
    invoices,
    loadingInvoices,
    loadingBilling,
    billingInfo,
    fetchInvoices,
    fetchBillingData,
    changePlan,
    cancelSubscription,
    updatePaymentMethod,
    getSetupIntent,
  };
}
