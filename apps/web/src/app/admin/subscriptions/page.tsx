'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatDate, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';
import {
  Search,
  MoreHorizontal,
  CreditCard,
  DollarSign,
  Download,
  RefreshCw,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  PauseCircle,
  PlayCircle,
  Calendar,
  Building2,
  Loader2,
  Filter,
  Plus,
} from 'lucide-react';

interface Subscription {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantEmail: string;
  tenantStatus: string;
  tenantLogo?: string;
  planId: string;
  planName: string;
  planTier: string;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'PAUSED';
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  amount: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  canceledAt?: string;
  cancelAtPeriodEnd: boolean;
  maxUsers: number;
  maxStorage: number;
  stripeSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionStats {
  byStatus: Record<string, number>;
  byPlan: { planId: string; planName: string; planTier: string; count: number }[];
  mrr: number;
  arr: number;
  expiringTrials: number;
  total: number;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  tier: string;
  monthlyPrice: number;
  yearlyPrice: number;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="default" className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" /> Active</Badge>;
    case 'TRIALING':
      return <Badge className="bg-blue-500 gap-1"><Clock className="h-3 w-3" /> Trial</Badge>;
    case 'PAST_DUE':
      return <Badge className="bg-yellow-500 gap-1"><AlertTriangle className="h-3 w-3" /> Past Due</Badge>;
    case 'CANCELED':
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Canceled</Badge>;
    case 'PAUSED':
      return <Badge variant="secondary" className="gap-1"><PauseCircle className="h-3 w-3" /> Paused</Badge>;
    case 'UNPAID':
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Unpaid</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getPlanBadge = (tier: string) => {
  switch (tier) {
    case 'ENTERPRISE':
      return <Badge className="bg-purple-500">Enterprise</Badge>;
    case 'PROFESSIONAL':
      return <Badge className="bg-blue-500">Professional</Badge>;
    case 'STARTER':
      return <Badge variant="secondary">Starter</Badge>;
    case 'CUSTOM':
      return <Badge className="bg-amber-500">Custom</Badge>;
    default:
      return <Badge variant="outline">{tier}</Badge>;
  }
};

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [showExtendTrialDialog, setShowExtendTrialDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [newPlanId, setNewPlanId] = useState('');
  const [extendDays, setExtendDays] = useState('7');
  const [cancelImmediately, setCancelImmediately] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (planFilter !== 'all') params.set('planId', planFilter);
      
      const response = await api.get(`/api/v1/platform/subscriptions?${params}`);
      setSubscriptions(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      toast.error('Failed to load subscriptions');
    }
  }, [searchQuery, statusFilter, planFilter]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/v1/platform/subscriptions/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await api.get('/api/v1/platform/plans');
      setPlans(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSubscriptions(), fetchStats(), fetchPlans()]);
      setLoading(false);
    };
    loadData();
  }, [fetchSubscriptions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubscriptions();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, planFilter, fetchSubscriptions]);

  const handleCancelSubscription = async () => {
    if (!selectedSubscription) return;
    setActionLoading(true);
    try {
      await api.post(`/api/v1/platform/subscriptions/${selectedSubscription.id}/cancel`, {
        immediately: cancelImmediately,
      });
      toast.success(cancelImmediately ? 'Subscription canceled' : 'Subscription will cancel at period end');
      setShowCancelDialog(false);
      fetchSubscriptions();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (subscription: Subscription) => {
    try {
      await api.post(`/api/v1/platform/subscriptions/${subscription.id}/reactivate`);
      toast.success('Subscription reactivated');
      fetchSubscriptions();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reactivate subscription');
    }
  };

  const handleChangePlan = async () => {
    if (!selectedSubscription || !newPlanId) return;
    setActionLoading(true);
    try {
      await api.put(`/api/v1/platform/subscriptions/${selectedSubscription.id}`, {
        planId: newPlanId,
      });
      toast.success('Plan changed successfully');
      setShowChangePlanDialog(false);
      fetchSubscriptions();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!selectedSubscription) return;
    setActionLoading(true);
    try {
      await api.post(`/api/v1/platform/subscriptions/${selectedSubscription.id}/extend-trial`, {
        days: parseInt(extendDays),
      });
      toast.success(`Trial extended by ${extendDays} days`);
      setShowExtendTrialDialog(false);
      fetchSubscriptions();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to extend trial');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ['Tenant', 'Email', 'Plan', 'Status', 'Amount', 'Billing Cycle', 'Next Billing', 'Created'];
    const rows = subscriptions.map(sub => [
      sub.tenantName,
      sub.tenantEmail,
      sub.planName,
      sub.status,
      `${sub.currency} ${sub.amount}`,
      sub.billingCycle,
      formatDate(sub.currentPeriodEnd),
      formatDate(sub.createdAt),
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Stats Cards skeleton */}
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-20 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-14 w-14 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1 max-w-sm" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Table skeleton */}
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4"><Skeleton className="h-4 w-16" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-12" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-14" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-16" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-14" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-20" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-8" /></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i} className="border-b">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div>
                          <Skeleton className="h-4 w-28 mb-1" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-18 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-8 rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Subscriptions</h2>
          <p className="text-muted-foreground">
            Monitor and manage tenant subscriptions ({stats?.total || 0} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { fetchSubscriptions(); fetchStats(); }} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <h3 className="text-3xl font-bold mt-2">{formatCurrency(stats?.mrr || 0)}</h3>
                <p className="text-xs text-muted-foreground mt-1">ARR: {formatCurrency(stats?.arr || 0)}</p>
              </div>
              <div className="p-4 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <h3 className="text-3xl font-bold mt-2">{stats?.byStatus?.active || 0}</h3>
                <p className="text-xs text-muted-foreground mt-1">Total: {stats?.total || 0}</p>
              </div>
              <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Trials</p>
                <h3 className="text-3xl font-bold mt-2">{stats?.byStatus?.trialing || 0}</h3>
                <p className="text-xs text-muted-foreground mt-1">{stats?.expiringTrials || 0} expiring soon</p>
              </div>
              <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Past Due</p>
                <h3 className="text-3xl font-bold mt-2">{stats?.byStatus?.past_due || 0}</h3>
                <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
              </div>
              <div className="p-4 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subscriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {statusFilter === 'all' ? 'All Statuses' : statusFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>All Statuses</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('ACTIVE')}>Active</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('TRIALING')}>Trial</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('PAST_DUE')}>Past Due</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('CANCELED')}>Canceled</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {planFilter === 'all' ? 'All Plans' : plans.find(p => p.id === planFilter)?.name || 'Plan'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPlanFilter('all')}>All Plans</DropdownMenuItem>
            {plans.map((plan) => (
              <DropdownMenuItem key={plan.id} onClick={() => setPlanFilter(plan.id)}>
                {plan.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          {subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No subscriptions found</p>
              <p className="text-sm">Subscriptions will appear when tenants sign up.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Tenant</th>
                  <th className="text-left p-4 font-medium">Plan</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Amount</th>
                  <th className="text-left p-4 font-medium">Billing</th>
                  <th className="text-left p-4 font-medium">Next Billing</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-medium">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{sub.tenantName}</p>
                          <p className="text-sm text-muted-foreground">{sub.tenantEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{getPlanBadge(sub.planTier)}</td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1">
                        {getStatusBadge(sub.status)}
                        {sub.cancelAtPeriodEnd && (
                          <span className="text-xs text-muted-foreground">Cancels at period end</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">{formatCurrency(sub.amount)}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{sub.billingCycle}</Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(sub.currentPeriodEnd)}
                      </div>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { 
                            setSelectedSubscription(sub); 
                            setNewPlanId(sub.planId); 
                            setShowChangePlanDialog(true); 
                          }}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Change Plan
                          </DropdownMenuItem>
                          {sub.status === 'TRIALING' && (
                            <DropdownMenuItem onClick={() => { 
                              setSelectedSubscription(sub); 
                              setShowExtendTrialDialog(true); 
                            }}>
                              <Clock className="mr-2 h-4 w-4" />
                              Extend Trial
                            </DropdownMenuItem>
                          )}
                          {(sub.status === 'CANCELED' || sub.cancelAtPeriodEnd) && (
                            <DropdownMenuItem onClick={() => handleReactivate(sub)}>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                          {sub.status !== 'CANCELED' && !sub.cancelAtPeriodEnd && (
                            <DropdownMenuItem 
                              onClick={() => { 
                                setSelectedSubscription(sub); 
                                setCancelImmediately(false); 
                                setShowCancelDialog(true); 
                              }} 
                              className="text-destructive"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Cancel the subscription for {selectedSubscription?.tenantName}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="cancelImmediately" 
                checked={cancelImmediately} 
                onChange={(e) => setCancelImmediately(e.target.checked)} 
                className="h-4 w-4 rounded border-gray-300" 
              />
              <Label htmlFor="cancelImmediately">Cancel immediately (no refund)</Label>
            </div>
            {!cancelImmediately && selectedSubscription && (
              <p className="text-sm text-muted-foreground">
                Subscription will remain active until {formatDate(selectedSubscription.currentPeriodEnd)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>
              Change the subscription plan for {selectedSubscription?.tenantName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select New Plan</Label>
              {plans.length === 0 ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <Select value={newPlanId} onValueChange={setNewPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {formatCurrency(plan.monthlyPrice)}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            {plans.length === 0 ? (
              <>
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-28" />
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleChangePlan} 
                  disabled={actionLoading || !newPlanId || newPlanId === selectedSubscription?.planId}
                >
                  {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change Plan
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Trial Dialog */}
      <Dialog open={showExtendTrialDialog} onOpenChange={setShowExtendTrialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Trial</DialogTitle>
            <DialogDescription>
              Extend the trial period for {selectedSubscription?.tenantName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Additional Days</Label>
              <Select value={extendDays} onValueChange={setExtendDays}>
                <SelectTrigger>
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendTrialDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendTrial} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Extend Trial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
