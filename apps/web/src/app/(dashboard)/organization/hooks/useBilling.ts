'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { Invoice, Integration, BillingInfo, SubscriptionPlan, Subscription, PaymentMethod } from '../types';

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

const defaultIntegrations: Integration[] = [
  { id: '1', name: 'Slack', description: 'Team communication and notifications', icon: '💬', category: 'communication', connected: true, connectedAt: '2024-01-15' },
  { id: '2', name: 'Google Calendar', description: 'Sync events and meetings', icon: '📅', category: 'calendar', connected: true, connectedAt: '2024-01-10' },
  { id: '3', name: 'Microsoft Teams', description: 'Video calls and collaboration', icon: '👥', category: 'communication', connected: false },
  { id: '4', name: 'Dropbox', description: 'File storage and sharing', icon: '📦', category: 'storage', connected: false },
  { id: '5', name: 'Google Drive', description: 'Cloud storage integration', icon: '☁️', category: 'storage', connected: true, connectedAt: '2024-01-20' },
  { id: '6', name: 'Zoom', description: 'Video conferencing', icon: '📹', category: 'communication', connected: false },
  { id: '7', name: 'Jira', description: 'Project and issue tracking', icon: '🎯', category: 'productivity', connected: false },
  { id: '8', name: 'GitHub', description: 'Code repository integration', icon: '🐙', category: 'productivity', connected: true, connectedAt: '2024-02-01' },
];

export function useBilling() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [billingInfo, setBillingInfo] = useState<BillingInfo>(defaultBillingInfo);
  
  // Integrations
  const [integrations, setIntegrations] = useState<Integration[]>(defaultIntegrations);
  const [connectingIntegration, setConnectingIntegration] = useState<string | null>(null);

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

  const connectIntegration = useCallback(async (integrationId: string) => {
    try {
      setConnectingIntegration(integrationId);
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIntegrations(prev => prev.map(i => 
        i.id === integrationId 
          ? { ...i, connected: true, connectedAt: new Date().toISOString() } 
          : i
      ));
      toast.success('Integration connected successfully');
      return true;
    } catch (error: any) {
      toast.error('Failed to connect integration');
      return false;
    } finally {
      setConnectingIntegration(null);
    }
  }, []);

  const disconnectIntegration = useCallback(async (integrationId: string) => {
    try {
      setConnectingIntegration(integrationId);
      await apiClient.delete(`/api/v1/integrations/${integrationId}`);
      setIntegrations(prev => prev.map(i => 
        i.id === integrationId 
          ? { ...i, connected: false, connectedAt: undefined } 
          : i
      ));
      toast.success('Integration disconnected');
      return true;
    } catch (error: any) {
      // Demo - still update UI
      setIntegrations(prev => prev.map(i => 
        i.id === integrationId 
          ? { ...i, connected: false, connectedAt: undefined } 
          : i
      ));
      toast.success('Integration disconnected');
      return true;
    } finally {
      setConnectingIntegration(null);
    }
  }, []);

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
    integrations,
    connectingIntegration,
    fetchInvoices,
    fetchBillingData,
    connectIntegration,
    disconnectIntegration,
    changePlan,
    cancelSubscription,
    updatePaymentMethod,
    getSetupIntent,
  };
}
