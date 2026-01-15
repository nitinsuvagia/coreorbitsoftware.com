'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  CreditCard,
  Calendar,
  TrendingUp,
  Download,
  Zap,
  Check,
  AlertTriangle,
  Users,
  HardDrive,
  FolderKanban,
  Building2,
} from 'lucide-react';
import type { Organization, Invoice, BillingInfo, SubscriptionPlan } from '../types';

interface BillingTabProps {
  org: Organization;
  invoices: Invoice[];
  loadingInvoices: boolean;
  loadingBilling?: boolean;
  billingInfo: BillingInfo;
  onChangePlan: (planId: string, billingCycle?: 'MONTHLY' | 'YEARLY') => Promise<boolean>;
  onCancelSubscription: (immediate?: boolean) => Promise<boolean>;
  onUpdatePaymentMethod?: () => void;
}

// Helper to format features for display
function getFeaturesList(plan: SubscriptionPlan): string[] {
  const features: string[] = [];
  
  // Add limit-based features
  if (plan.maxUsers === -1) {
    features.push('Unlimited employees');
  } else {
    features.push(`Up to ${plan.maxUsers} employees`);
  }
  
  if (plan.maxProjects === -1) {
    features.push('Unlimited projects');
  } else if (plan.maxProjects) {
    features.push(`Up to ${plan.maxProjects} projects`);
  }
  
  if (plan.maxStorageGB) {
    if (plan.maxStorageGB >= 1000) {
      features.push(`${Math.round(plan.maxStorageGB / 1000)}TB storage`);
    } else {
      features.push(`${plan.maxStorageGB}GB storage`);
    }
  }
  
  // Add boolean features
  if (plan.features.advancedReports) features.push('Advanced reporting');
  if (plan.features.apiAccess) features.push('API access');
  if (plan.features.prioritySupport) features.push('Priority support');
  if (plan.features.customDomain) features.push('Custom domain');
  if (plan.features.ssoEnabled) features.push('SSO authentication');
  if (plan.features.whiteLabel) features.push('White label');
  
  return features;
}

// Helper to get tier badge color
function getTierBadgeColor(tier: string): string {
  switch (tier) {
    case 'STARTER': return 'bg-blue-500';
    case 'PROFESSIONAL': return 'bg-green-500';
    case 'ENTERPRISE': return 'bg-purple-500';
    case 'CUSTOM': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
}

export function BillingTab({
  org,
  invoices,
  loadingInvoices,
  loadingBilling,
  billingInfo,
  onChangePlan,
  onCancelSubscription,
  onUpdatePaymentMethod,
}: BillingTabProps) {
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get current subscription and plan info
  const subscription = billingInfo.subscription;
  const currentPlan = subscription?.plan;
  const availablePlans = billingInfo.availablePlans || [];
  const paymentMethod = billingInfo.paymentMethod;

  // Subscription status badge
  const getStatusBadge = () => {
    if (!subscription) {
      return <Badge variant="secondary">No Plan</Badge>;
    }
    switch (subscription.status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'TRIAL':
        return <Badge className="bg-blue-500">Trial</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'PAST_DUE':
        return <Badge className="bg-orange-500">Past Due</Badge>;
      case 'PAUSED':
        return <Badge variant="secondary">Paused</Badge>;
      default:
        return <Badge variant="secondary">{subscription.status}</Badge>;
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    try {
      const success = await onChangePlan(selectedPlan, selectedBillingCycle);
      if (success) {
        setChangePlanOpen(false);
      }
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    setIsProcessing(true);
    try {
      const success = await onCancelSubscription(false); // Cancel at period end
      if (success) {
        setCancelDialogOpen(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePaymentMethod = () => {
    if (onUpdatePaymentMethod) {
      onUpdatePaymentMethod();
    } else {
      setPaymentMethodDialogOpen(true);
    }
  };

  // Loading state
  if (loadingBilling) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-6 border rounded-lg bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">{currentPlan?.name || 'No Plan'}</h3>
                  {getStatusBadge()}
                  {currentPlan?.tier && (
                    <Badge variant="outline" className={getTierBadgeColor(currentPlan.tier)}>
                      {currentPlan.tier}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {subscription ? (
                    <>
                      ${subscription.billingCycle === 'YEARLY' 
                        ? `${currentPlan?.yearlyPrice || 0}/year`
                        : `${currentPlan?.monthlyPrice || 0}/month`
                      } • Billed {subscription.billingCycle?.toLowerCase() || 'monthly'}
                    </>
                  ) : (
                    'No active subscription'
                  )}
                </p>
                {subscription?.cancelAtPeriodEnd && (
                  <p className="text-sm text-orange-600 mt-1">
                    ⚠️ Subscription will be cancelled at period end
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setChangePlanOpen(true)}>
                {subscription ? 'Change Plan' : 'Select Plan'}
              </Button>
              {subscription && !subscription.cancelAtPeriodEnd && (
                <Button variant="outline" onClick={() => setCancelDialogOpen(true)}>
                  Cancel Subscription
                </Button>
              )}
            </div>
          </div>

          {/* Current Plan Limits */}
          {currentPlan && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Employees</p>
                  <p className="font-medium">
                    {currentPlan.maxUsers === -1 ? 'Unlimited' : `Up to ${currentPlan.maxUsers}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Storage</p>
                  <p className="font-medium">
                    {currentPlan.maxStorageGB >= 1000 
                      ? `${Math.round(currentPlan.maxStorageGB / 1000)}TB`
                      : `${currentPlan.maxStorageGB}GB`}
                  </p>
                </div>
              </div>
              {currentPlan.maxProjects !== undefined && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <FolderKanban className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Projects</p>
                    <p className="font-medium">
                      {currentPlan.maxProjects === -1 ? 'Unlimited' : `Up to ${currentPlan.maxProjects}`}
                    </p>
                  </div>
                </div>
              )}
              {currentPlan.maxClients !== undefined && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Clients</p>
                    <p className="font-medium">
                      {currentPlan.maxClients === -1 ? 'Unlimited' : `Up to ${currentPlan.maxClients}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Method</CardTitle>
            <Button variant="outline" size="sm" onClick={handleUpdatePaymentMethod}>
              {paymentMethod ? 'Update' : 'Add Payment Method'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethod ? (
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="h-10 w-16 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white font-bold text-xs uppercase">
                {paymentMethod.brand || 'Card'}
              </div>
              <div>
                <p className="font-medium">•••• •••• •••• {paymentMethod.last4}</p>
                {paymentMethod.expiryMonth && paymentMethod.expiryYear && (
                  <p className="text-sm text-muted-foreground">
                    Expires {String(paymentMethod.expiryMonth).padStart(2, '0')}/{paymentMethod.expiryYear}
                  </p>
                )}
              </div>
              {paymentMethod.isDefault && (
                <Badge variant="outline" className="ml-auto">Default</Badge>
              )}
            </div>
          ) : (
            <div className="p-4 border rounded-lg border-dashed text-center text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No payment method on file</p>
              <p className="text-sm">Add a payment method to continue your subscription</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Next Billing Date</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">
                    {billingInfo.nextBillingDate 
                      ? new Date(billingInfo.nextBillingDate).toLocaleDateString()
                      : 'N/A'}
                  </h3>
                </div>
                {subscription?.cancelAtPeriodEnd && (
                  <p className="text-xs text-orange-600 mt-1">Last billing date</p>
                )}
              </div>
              <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {subscription?.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'} Spend
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">
                    ${subscription?.billingCycle === 'YEARLY' 
                      ? currentPlan?.yearlyPrice || 0
                      : billingInfo.monthlyAmount}
                  </h3>
                </div>
                {subscription?.billingCycle === 'YEARLY' && currentPlan && (
                  <p className="text-xs text-green-600 mt-1">
                    Save ${(currentPlan.monthlyPrice * 12) - currentPlan.yearlyPrice}/year
                  </p>
                )}
              </div>
              <div className="p-4 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total Paid (YTD)</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">
                    ${invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0)}
                  </h3>
                </div>
              </div>
              <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoice History</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingInvoices ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.number}</TableCell>
                    <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>${invoice.amount}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={invoice.status === 'PAID' ? 'default' : invoice.status === 'PENDING' ? 'secondary' : 'destructive'}
                        className={invoice.status === 'PAID' ? 'bg-green-500' : ''}
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Your Plan</DialogTitle>
            <DialogDescription>
              Select a plan that best fits your organization's needs
            </DialogDescription>
          </DialogHeader>

          {/* Billing Cycle Toggle */}
          <div className="flex justify-center mb-4">
            <RadioGroup
              value={selectedBillingCycle}
              onValueChange={(value) => setSelectedBillingCycle(value as 'MONTHLY' | 'YEARLY')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="MONTHLY" id="monthly" />
                <Label htmlFor="monthly">Monthly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="YEARLY" id="yearly" />
                <Label htmlFor="yearly">
                  Yearly <Badge variant="secondary" className="ml-1">Save up to 20%</Badge>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {availablePlans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No plans available at the moment.</p>
              <p className="text-sm">Please contact support for assistance.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
              {availablePlans.map((plan) => {
                const isCurrent = currentPlan?.id === plan.id;
                const isSelected = selectedPlan === plan.id;
                const price = selectedBillingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
                const monthlyEquivalent = selectedBillingCycle === 'YEARLY' 
                  ? Math.round(plan.yearlyPrice / 12) 
                  : plan.monthlyPrice;
                const features = getFeaturesList(plan);
                
                return (
                  <div
                    key={plan.id}
                    className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-primary ring-2 ring-primary' 
                        : isCurrent 
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                          : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => !isCurrent && setSelectedPlan(plan.id)}
                  >
                    {isCurrent && (
                      <Badge className="absolute -top-2 right-2 bg-green-500">Current</Badge>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{plan.name}</h4>
                      <Badge variant="outline" className={getTierBadgeColor(plan.tier)}>
                        {plan.tier}
                      </Badge>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                    )}
                    <div className="mb-4">
                      <p className="text-3xl font-bold">
                        ${monthlyEquivalent}
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </p>
                      {selectedBillingCycle === 'YEARLY' && (
                        <p className="text-sm text-muted-foreground">
                          ${price}/year • Save ${(plan.monthlyPrice * 12) - plan.yearlyPrice}
                        </p>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {features.slice(0, 6).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                      {features.length > 6 && (
                        <li className="text-sm text-muted-foreground">
                          +{features.length - 6} more features
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleChangePlan} 
              disabled={!selectedPlan || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Change Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Cancel Subscription?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to cancel your <strong>{currentPlan?.name}</strong> subscription?</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your subscription will remain active until the end of the current billing period</li>
                <li>You will lose access to all {currentPlan?.tier || 'premium'} features after that date</li>
                <li>Your data will be preserved for 30 days after cancellation</li>
              </ul>
              {billingInfo.nextBillingDate && (
                <p className="font-medium">
                  Current billing period ends: {new Date(billingInfo.nextBillingDate).toLocaleDateString()}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelSubscription}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? 'Processing...' : 'Cancel Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Method Dialog (placeholder) */}
      <Dialog open={paymentMethodDialogOpen} onOpenChange={setPaymentMethodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Method</DialogTitle>
            <DialogDescription>
              Enter your new payment information. This will be securely processed through Stripe.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-8 border rounded-lg border-dashed text-center text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Stripe Payment Element</p>
              <p className="text-sm">
                Integration with Stripe Elements will be added here
              </p>
              <p className="text-xs mt-2">
                Configure STRIPE_PUBLISHABLE_KEY in your environment
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentMethodDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled>Save Payment Method</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
