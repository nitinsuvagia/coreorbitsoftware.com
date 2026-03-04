'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { useOrgFormatters } from '@/hooks/use-org-settings';
import {
  CreditCard,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  HardDrive,
  Receipt,
  Loader2,
  ExternalLink,
  Eye,
} from 'lucide-react';
import {
  useSubscription,
  useInvoices,
  usePlans,
  useChangePlan,
  useCancelSubscription,
  useResumeSubscription,
  useActivateSubscription,
  useSyncSubscription,
  useForceSyncToStripe,
  useOrganizationStatus,
  useCreateCheckoutSession,
  useCreateCustomerPortal,
  useCompleteCheckout,
  usePlatformSettings,
  Invoice,
} from '@/hooks/use-billing';
import { useEmployees } from '@/hooks/use-employees';
import { toast } from 'sonner';
import { InvoiceViewer } from '@/components/billing/InvoiceViewer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Tier order for comparison (lower index = lower tier)
const TIER_ORDER = ['FREE', 'CUSTOM', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

function getTierIndex(tier?: string): number {
  if (!tier) return 0;
  const index = TIER_ORDER.indexOf(tier.toUpperCase());
  return index === -1 ? 0 : index;
}

function getFeaturesList(plan: any): string[] {
  const features: string[] = [];
  const maxUsers = plan.maxUsers ?? plan.features?.maxEmployees;
  const maxStorageGB = plan.maxStorageGB ?? (plan.features?.maxStorage ? Math.round(plan.features.maxStorage / (1024 * 1024 * 1024)) : undefined);
  
  if (maxUsers === -1) {
    features.push('Unlimited employees');
  } else if (maxUsers) {
    features.push(`Up to ${maxUsers} employees`);
  }
  if (maxStorageGB) {
    features.push(`${maxStorageGB} GB storage`);
  }
  if (plan.features?.advancedReports) features.push('Advanced reports');
  if (plan.features?.prioritySupport) features.push('Priority support');
  if (plan.features?.customDomain) features.push('Custom domain');
  if (plan.features?.ssoEnabled) features.push('SSO & SAML');
  return features;
}

function getPlanDescription(plan: any): string {
  const tier = plan.tier?.toUpperCase();
  switch (tier) {
    case 'FREE':
      return 'Get started for free';
    case 'STARTER':
      return 'For small teams getting started';
    case 'PROFESSIONAL':
      return 'For growing organizations';
    case 'ENTERPRISE':
      return 'For large enterprises';
    default:
      return plan.description || 'Custom plan';
  }
}

export default function BillingPage() {
  // URL params for handling Stripe redirects
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State for billing cycle toggle
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const checkoutProcessedRef = useRef(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // Fetch data from APIs
  const { data: subscription, isLoading: loadingSubscription, refetch: refetchSubscription } = useSubscription();
  const { data: invoices = [], isLoading: loadingInvoices, refetch: refetchInvoices } = useInvoices();
  const { data: apiPlans = [], isLoading: loadingPlans } = usePlans();
  // Only count ACTIVE employees for billing (exclude ex-employees, relieving, etc.)
  const { data: employeeData, isLoading: loadingEmployees } = useEmployees({ page: 1, limit: 1, status: 'ACTIVE' });
  const { data: organization, refetch: refetchOrganization } = useOrganizationStatus();
  const { data: platformSettings } = usePlatformSettings();
  
  // Organization-aware date formatter
  const { formatDateTime, formatDate } = useOrgFormatters();
  
  const changePlanMutation = useChangePlan();
  const cancelMutation = useCancelSubscription();
  const resumeMutation = useResumeSubscription();
  const activateMutation = useActivateSubscription();
  const syncMutation = useSyncSubscription();
  const forceSyncMutation = useForceSyncToStripe();
  const checkoutMutation = useCreateCheckoutSession();
  const portalMutation = useCreateCustomerPortal();
  const completeCheckoutMutation = useCompleteCheckout();
  
  // Handle Stripe checkout success/cancel redirects
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  const sessionId = searchParams.get('session_id');
  const portalReturn = searchParams.get('portal_return');
  
  // Sync subscription when returning from Stripe portal
  useEffect(() => {
    if (portalReturn === 'true') {
      syncMutation.mutate(undefined, {
        onSettled: () => {
          // Clean up URL
          router.replace('/billing', { scroll: false });
        }
      });
    }
  }, [portalReturn]);
  
  useEffect(() => {
    // Prevent processing multiple times (use ref for synchronous check)
    if (checkoutProcessedRef.current) return;
    
    if (success === 'true' && sessionId) {
      checkoutProcessedRef.current = true;
      // Complete the checkout on the server (in case webhook didn't fire)
      // Toast is shown by the mutation hook
      completeCheckoutMutation.mutate(sessionId, {
        onSettled: () => {
          // Refetch data after completing checkout
          setTimeout(() => {
            refetchSubscription();
            refetchInvoices();
            refetchOrganization();
          }, 500);
          // Clean up URL
          router.replace('/billing', { scroll: false });
        }
      });
    } else if (success === 'true' && !sessionId) {
      checkoutProcessedRef.current = true;
      toast.success('Payment successful! Your subscription has been updated.');
      refetchSubscription();
      refetchInvoices();
      refetchOrganization();
      router.replace('/billing', { scroll: false });
    } else if (canceled === 'true') {
      checkoutProcessedRef.current = true;
      toast.info('Payment was canceled. Your plan was not changed.');
      router.replace('/billing', { scroll: false });
    }
  }, [success, canceled, sessionId]);

  // Get subscription status (not tenant status) for billing page display
  // Priority: subscription.status from organization OR direct subscription query
  // Normalize TRIALING -> TRIAL for consistency
  const rawStatus = organization?.subscription?.status || subscription?.status || 'TRIAL';
  const tenantStatus = (rawStatus as string) === 'TRIALING' ? 'TRIAL' : rawStatus;
  const currentPlanId = organization?.subscription?.planId || subscription?.planId || '';

  // Normalize plans from API and sort by tier
  const plans = apiPlans.length > 0 ? apiPlans
    .map(p => ({
      ...p,
      maxUsers: p.maxUsers ?? p.features?.maxEmployees ?? 50,
      maxStorageGB: p.maxStorageGB ?? (p.features?.maxStorage ? Math.round(p.features.maxStorage / (1024 * 1024 * 1024)) : 25),
    }))
    .sort((a, b) => getTierIndex(a.tier) - getTierIndex(b.tier))
  : [];

  // Find current plan from the list
  const currentPlan = plans.find(p => 
    p.id === currentPlanId || 
    p.slug === currentPlanId || 
    p.name.toLowerCase() === currentPlanId.toLowerCase()
  ) || subscription?.plan;
  
  const currentTierIndex = currentPlan ? getTierIndex(currentPlan.tier) : 0;

  // Calculate usage data
  const employeeCount = employeeData?.total || 0;
  const planMaxEmployees = currentPlan?.maxUsers ?? currentPlan?.features?.maxEmployees ?? 50;
  const planMaxStorageGB = currentPlan?.maxStorageGB ?? (currentPlan?.features?.maxStorage ? Math.round(currentPlan.features.maxStorage / (1024 * 1024 * 1024)) : 25);

  const usageData = {
    employees: { 
      used: employeeCount, 
      limit: planMaxEmployees === -1 ? Infinity : planMaxEmployees 
    },
    storage: { 
      used: 0,
      limit: planMaxStorageGB 
    },
  };

  const isLoading = loadingSubscription || loadingPlans;

  // Check if user has an active subscription (for determining upgrade/downgrade flow)
  const hasActiveSubscription = subscription && 
    ['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(subscription.status) &&
    subscription.stripeSubscriptionId;

  // Handle plan selection - uses existing subscription update OR Stripe Checkout for new subscriptions
  const handleSelectPlan = async (plan: any) => {
    const planId = plan.slug || plan.id;
    const price = billingCycle === 'YEARLY' ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);
    const isFreeOrZeroPrice = plan.tier?.toUpperCase() === 'FREE' || price === 0;
    
    setProcessingPlanId(planId);
    
    try {
      // For free plans, always use internal change plan mutation
      if (isFreeOrZeroPrice) {
        await changePlanMutation.mutateAsync({ planId, billingCycle });
        setProcessingPlanId(null);
        return;
      }
      
      // If user has an active subscription with Stripe, update it directly (upgrade/downgrade)
      // This includes subscriptions scheduled to cancel - they'll be resumed
      if (hasActiveSubscription) {
        await changePlanMutation.mutateAsync({ planId, billingCycle });
        setProcessingPlanId(null);
        return;
      }
      
      // For new paid subscriptions (no active subscription), redirect to Stripe Checkout
      const baseUrl = window.location.origin;
      const session = await checkoutMutation.mutateAsync({
        planId,
        billingCycle,
        successUrl: `${baseUrl}/billing?success=true`,
        cancelUrl: `${baseUrl}/billing?canceled=true`,
      });
      
      // Redirect to Stripe Checkout
      if (session?.url) {
        window.location.href = session.url;
      }
    } catch (error: any) {
      setProcessingPlanId(null);
      // Toast is shown by the mutation hooks
    }
  };
  
  // Handle opening Stripe Customer Portal
  const handleManageBilling = async () => {
    try {
      // Add portal_return param so we sync when returning
      const baseUrl = window.location.origin + window.location.pathname;
      const returnUrl = `${baseUrl}?portal_return=true`;
      const result = await portalMutation.mutateAsync(returnUrl);
      
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error: any) {
      // Toast is shown by the mutation hook
    }
  };

  // Helper to get button text and variant based on plan comparison
  function getPlanButtonInfo(plan: any) {
    const planTierIndex = getTierIndex(plan.tier);
    const isCurrentPlan = plan.id === currentPlanId || plan.slug === currentPlanId || 
                          plan.name.toLowerCase() === currentPlanId?.toLowerCase();
    
    if (isCurrentPlan) {
      return { text: 'Current Plan', variant: 'outline' as const, disabled: true, icon: null };
    }
    
    if (planTierIndex < currentTierIndex) {
      return { text: 'Downgrade', variant: 'secondary' as const, disabled: false, icon: ArrowDownRight };
    }
    
    return { text: 'Upgrade', variant: 'default' as const, disabled: false, icon: ArrowUpRight };
  }

  // Grid columns based on number of plans
  const gridCols = plans.length <= 2 ? 'md:grid-cols-2' : 
                   plans.length === 3 ? 'md:grid-cols-3' : 
                   'md:grid-cols-4';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Billing</h2>
          <p className="text-muted-foreground">
            Manage your subscription and billing information
          </p>
        </div>
        {subscription?.stripeCustomerId && (
          <Button 
            variant="outline" 
            onClick={handleManageBilling}
            disabled={portalMutation.isPending}
          >
            {portalMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Manage Billing
          </Button>
        )}
      </div>

      <Tabs defaultValue="subscription" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  {isLoading ? (
                    <Skeleton className="h-4 w-48 mt-1.5" />
                  ) : (
                    <CardDescription>
                      {currentPlan ? (
                        `You are currently on the ${currentPlan.name} plan`
                      ) : (
                        'No active subscription - Currently in Trial mode'
                      )}
                    </CardDescription>
                  )}
                </div>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <Badge className={
                    subscription?.cancelAtPeriodEnd ? 'bg-orange-500' :
                    tenantStatus === 'ACTIVE' ? 'bg-green-500' :
                    tenantStatus === 'TRIAL' ? 'bg-blue-500' :
                    tenantStatus === 'CANCELLED' ? 'bg-red-500' :
                    'bg-gray-500'
                  }>
                    {subscription?.cancelAtPeriodEnd ? 'Cancelling' : tenantStatus === 'TRIAL' ? 'Trial' : tenantStatus}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-4 w-48 mt-2" />
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">
                      {currentPlan ? `$${currentPlan.monthlyPrice}` : '$0'}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {tenantStatus === 'TRIAL' ? (
                      organization?.trialEndsAt ? 
                        `Trial ends on ${formatDate(organization.trialEndsAt)}` :
                        'Trial mode - Select a plan below to continue'
                    ) : subscription?.cancelAtPeriodEnd && subscription?.currentPeriodEnd ? (
                      <span className="text-orange-600">
                        Subscription cancels on {formatDate(subscription.currentPeriodEnd)}
                      </span>
                    ) : subscription?.currentPeriodEnd ? (
                      `Next billing date: ${formatDate(subscription.currentPeriodEnd)}`
                    ) : (
                      'No active billing cycle'
                    )}
                  </p>
                </>
              )}
            </CardContent>
            {/* Trial users can activate immediately */}
            {tenantStatus === 'TRIAL' && subscription && (
              <CardFooter className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">
                  Your {currentPlan?.name || 'Starter'} plan (${currentPlan?.monthlyPrice || 19}/month) will be charged when the trial ends.
                </p>
                <Button 
                  variant="default"
                  disabled={activateMutation.isPending}
                  onClick={() => activateMutation.mutate()}
                >
                  {activateMutation.isPending ? 'Activating...' : 'Activate Plan Now'}
                </Button>
              </CardFooter>
            )}
            {/* Active subscriptions can cancel or resume */}
            {subscription && tenantStatus !== 'TRIAL' && (
              <CardFooter className="flex gap-2">
                {subscription.cancelAtPeriodEnd ? (
                  <Button 
                    variant="default" 
                    disabled={resumeMutation.isPending}
                    onClick={() => resumeMutation.mutate()}
                  >
                    {resumeMutation.isPending ? 'Resuming...' : 'Resume Subscription'}
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    disabled={cancelMutation.isPending}
                    onClick={() => setShowCancelDialog(true)}
                  >
                    Cancel Subscription
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>

          {/* Billing Cycle Toggle */}
          {(() => {
            // Calculate max discount percentage from actual plan prices
            const maxDiscount = plans.reduce((max, plan) => {
              if (plan.monthlyPrice > 0 && plan.yearlyPrice > 0) {
                const annualIfMonthly = plan.monthlyPrice * 12;
                const discount = Math.round(((annualIfMonthly - plan.yearlyPrice) / annualIfMonthly) * 100);
                return Math.max(max, discount);
              }
              return max;
            }, 0);
            
            return (
              <div className="flex items-center justify-center gap-4 py-4">
                <Label 
                  htmlFor="billing-cycle" 
                  className={`text-sm font-medium cursor-pointer ${billingCycle === 'MONTHLY' ? 'text-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setBillingCycle('MONTHLY')}
                >
                  Monthly
                </Label>
                <Switch
                  id="billing-cycle"
                  checked={billingCycle === 'YEARLY'}
                  onCheckedChange={(checked) => setBillingCycle(checked ? 'YEARLY' : 'MONTHLY')}
                />
                <div className="flex items-center gap-2">
                  <Label 
                    htmlFor="billing-cycle" 
                    className={`text-sm font-medium cursor-pointer ${billingCycle === 'YEARLY' ? 'text-foreground' : 'text-muted-foreground'}`}
                    onClick={() => setBillingCycle('YEARLY')}
                  >
                    Yearly
                  </Label>
                  {maxDiscount > 0 && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                      Save up to {maxDiscount}%
                    </Badge>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Available Plans */}
          <div className={`grid gap-4 ${gridCols}`}>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-32 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20" />
                    <div className="space-y-2 mt-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : plans.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No plans available. Please contact support.
                </CardContent>
              </Card>
            ) : (
              plans.map((plan) => {
                const buttonInfo = getPlanButtonInfo(plan);
                const isCurrentPlan = buttonInfo.text === 'Current Plan';
                const isProfessional = plan.tier?.toUpperCase() === 'PROFESSIONAL';
                
                return (
                  <Card
                    key={plan.id || plan.slug}
                    className={`${isCurrentPlan ? 'border-green-500 ring-2 ring-green-500/20' : ''} ${isProfessional && !isCurrentPlan ? 'border-primary shadow-lg' : ''}`}
                  >
                    {isProfessional && !isCurrentPlan && (
                      <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium rounded-t-lg">
                        Most Popular
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className="bg-green-500 text-white text-center py-1 text-sm font-medium rounded-t-lg">
                        Current Plan
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {plan.name}
                        {plan.tier && (
                          <Badge variant="outline" className="font-normal">
                            {plan.tier}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{getPlanDescription(plan)}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">
                          {billingCycle === 'YEARLY' ? (
                            plan.yearlyPrice === 0 ? 'Free' : `$${Math.round(plan.yearlyPrice / 12)}`
                          ) : (
                            plan.monthlyPrice === 0 ? 'Free' : `$${plan.monthlyPrice}`
                          )}
                        </span>
                        {(billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice) > 0 && (
                          <span className="text-muted-foreground">/month</span>
                        )}
                        {billingCycle === 'YEARLY' && plan.monthlyPrice > 0 && plan.yearlyPrice > 0 && (
                          (() => {
                            const discount = Math.round(((plan.monthlyPrice * 12 - plan.yearlyPrice) / (plan.monthlyPrice * 12)) * 100);
                            return discount > 0 ? (
                              <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">
                                -{discount}%
                              </Badge>
                            ) : null;
                          })()
                        )}
                      </div>
                      {billingCycle === 'YEARLY' && plan.yearlyPrice > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Billed ${plan.yearlyPrice}/year
                          {plan.monthlyPrice > 0 && plan.monthlyPrice * 12 > plan.yearlyPrice && (
                            <span className="text-green-600 ml-1">
                              (save ${(plan.monthlyPrice * 12) - plan.yearlyPrice}/year)
                            </span>
                          )}
                        </p>
                      )}
                      <ul className="space-y-2">
                        {getFeaturesList(plan).map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        variant={buttonInfo.variant}
                        disabled={buttonInfo.disabled || processingPlanId !== null}
                        onClick={() => handleSelectPlan(plan)}
                      >
                        {processingPlanId === (plan.slug || plan.id) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Redirecting to checkout...
                          </>
                        ) : (
                          <>
                            {buttonInfo.icon && <buttonInfo.icon className="h-4 w-4 mr-2" />}
                            {buttonInfo.text}
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                {loadingEmployees ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Employees</p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <h3 className="text-3xl font-bold">
                          {usageData.employees.used} / {usageData.employees.limit === Infinity ? '∞' : usageData.employees.limit}
                        </h3>
                      </div>
                      {usageData.employees.limit !== Infinity && (
                        <>
                          <Progress
                            value={(usageData.employees.used / usageData.employees.limit) * 100}
                            className="mt-2"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            {usageData.employees.limit - usageData.employees.used} employees remaining
                          </p>
                        </>
                      )}
                      {usageData.employees.limit === Infinity && (
                        <p className="text-xs text-muted-foreground mt-2">Unlimited on your plan</p>
                      )}
                    </div>
                    <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                {loadingSubscription ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Storage</p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <h3 className="text-3xl font-bold">
                          {usageData.storage.used.toFixed(1)} GB / {usageData.storage.limit} GB
                        </h3>
                      </div>
                      <Progress
                        value={usageData.storage.limit > 0 ? (usageData.storage.used / usageData.storage.limit) * 100 : 0}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {(usageData.storage.limit - usageData.storage.used).toFixed(1)} GB remaining
                      </p>
                    </div>
                    <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <HardDrive className="h-6 w-6" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>Your usage trends over the past 6 months</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ArrowUpRight className="h-12 w-12 mx-auto mb-2" />
                <p>Usage chart visualization coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>View your past invoices and payment details</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No invoices yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Invoice</th>
                      <th className="text-left p-3 font-medium">Date & Time</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Payment Method</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{invoice.invoiceNumber || invoice.id}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {formatDateTime(invoice.createdAt)}
                        </td>
                        <td className="p-3 font-medium">
                          {formatCurrency(invoice.total)}
                        </td>
                        <td className="p-3">
                          {invoice.cardLast4 ? (
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {invoice.cardBrand && <span className="capitalize">{invoice.cardBrand} </span>}
                                •••• {invoice.cardLast4}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge className={
                            invoice.status === 'PAID' ? 'bg-green-500' :
                            invoice.status === 'PENDING' ? 'bg-yellow-500' :
                            invoice.status === 'VOID' ? 'bg-gray-500' :
                            'bg-red-500'
                          }>
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Viewer Dialog */}
      <InvoiceViewer
        invoice={selectedInvoice}
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        organization={organization}
        platformName={platformSettings?.platformName || 'Office Management System'}
        platformEmail={platformSettings?.supportEmail || ''}
        platformWebsite={platformSettings?.primaryDomain || ''}
      />

      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? Your subscription will remain active until the end of the current billing period ({subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}), after which you will lose access to premium features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelMutation.isPending}
              onClick={() => {
                cancelMutation.mutate(false, {
                  onSuccess: () => {
                    setShowCancelDialog(false);
                  }
                });
              }}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
