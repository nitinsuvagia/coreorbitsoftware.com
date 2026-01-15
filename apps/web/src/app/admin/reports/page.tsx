'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface OverviewStats {
  totalRevenue: number;
  revenueGrowth: number;
  totalTenants: number;
  tenantGrowth: number;
  totalUsers: number;
  userGrowth: number;
  avgRevenuePerTenant: number;
  arr: number;
}

interface RevenueByPlan {
  planId: string;
  plan: string;
  tier: string;
  revenue: number;
  count: number;
  percentage: number;
}

interface MonthlyMetric {
  month: string;
  year: number;
  revenue: number;
  tenants: number;
  newTenants: number;
  churn: number;
}

interface TopTenant {
  id: string;
  name: string;
  slug: string;
  revenue: number;
  employees: number;
  plan: string;
  billingCycle: string;
  createdAt: string;
}

interface TenantStats {
  newTenantsThisMonth: number;
  activeTrials: number;
  trialConversionRate: number;
  byStatus: Record<string, number>;
}

interface ChurnStats {
  churnRate: number;
  lastMonthChurnRate: number;
  churnedThisMonth: number;
  churnedLastMonth: number;
  revenueLost: number;
}

interface UsageStats {
  totalStorage: string;
  usedStorage: string;
  activeSessions: number;
  apiCalls: number;
}

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueByPlan[]>([]);
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyMetric[]>([]);
  const [topTenants, setTopTenants] = useState<TopTenant[]>([]);
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null);
  const [churnStats, setChurnStats] = useState<ChurnStats | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);

  const fetchAllData = useCallback(async (showToast = false) => {
    try {
      const [
        overviewRes,
        revenueByPlanRes,
        monthlyRes,
        topTenantsRes,
        tenantStatsRes,
        churnRes,
        usageRes,
      ] = await Promise.all([
        apiClient.get<OverviewStats>('/api/v1/platform/reports/overview'),
        apiClient.get<RevenueByPlan[]>('/api/v1/platform/reports/revenue/by-plan'),
        apiClient.get<MonthlyMetric[]>('/api/v1/platform/reports/monthly?months=6'),
        apiClient.get<TopTenant[]>('/api/v1/platform/reports/top-tenants?limit=5'),
        apiClient.get<TenantStats>('/api/v1/platform/reports/tenants/stats'),
        apiClient.get<ChurnStats>('/api/v1/platform/reports/churn'),
        apiClient.get<UsageStats>('/api/v1/platform/reports/usage'),
      ]);

      if (overviewRes.success && overviewRes.data) setOverviewStats(overviewRes.data);
      if (revenueByPlanRes.success) setRevenueByPlan(revenueByPlanRes.data || []);
      if (monthlyRes.success) setMonthlyMetrics(monthlyRes.data || []);
      if (topTenantsRes.success) setTopTenants(topTenantsRes.data || []);
      if (tenantStatsRes.success && tenantStatsRes.data) setTenantStats(tenantStatsRes.data);
      if (churnRes.success && churnRes.data) setChurnStats(churnRes.data);
      if (usageRes.success && usageRes.data) setUsageStats(usageRes.data);

      if (showToast) toast.success('Reports refreshed');
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports data');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAllData();
      setLoading(false);
    };
    loadData();
  }, [fetchAllData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData(true);
    setRefreshing(false);
  };

  const handleExport = () => {
    const data = {
      overview: overviewStats,
      revenueByPlan,
      monthlyMetrics,
      topTenants,
      tenantStats,
      churnStats,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  // Skeleton component for stats cards
  const StatsCardSkeleton = () => (
    <Card>
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
  );

  // Skeleton component for charts
  const ChartSkeleton = () => (
    <div className="h-[200px] flex items-end justify-between gap-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="w-full rounded-t" style={{ height: `${Math.random() * 100 + 50}px` }} />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );

  // Skeleton for revenue tab content
  const RevenueTabSkeleton = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <ChartSkeleton />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48 mb-1" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Skeleton for tenants tab content
  const TenantsTabSkeleton = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => <StatsCardSkeleton key={i} />)}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40 mb-1" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36 mb-1" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    </div>
  );

  // Skeleton for usage tab content
  const UsageTabSkeleton = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => <StatsCardSkeleton key={i} />)}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24 mb-1" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <Skeleton className="h-12 w-12 mx-auto mb-2 rounded" />
            <Skeleton className="h-4 w-40 mx-auto" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Skeleton for churn tab content
  const ChurnTabSkeleton = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => <StatsCardSkeleton key={i} />)}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36 mb-1" />
          <Skeleton className="h-4 w-44" />
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28 mb-1" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <Skeleton className="h-12 w-12 mx-auto mb-2 rounded" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <StatsCardSkeleton key={i} />)}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-80" />
          <RevenueTabSkeleton />
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...monthlyMetrics.map(m => m.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Platform Reports</h2>
          <p className="text-muted-foreground">Analytics and insights for the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <h3 className="text-3xl font-bold mt-2">{formatCurrency(overviewStats?.totalRevenue || 0)}</h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {overviewStats && overviewStats.revenueGrowth >= 0 ? (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">+{overviewStats.revenueGrowth}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                      <span className="text-red-500">{overviewStats?.revenueGrowth}%</span>
                    </>
                  )} from last month
                </p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
                <h3 className="text-3xl font-bold mt-2">{overviewStats?.totalTenants || 0}</h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{overviewStats?.tenantGrowth || 0}</span> this month
                </p>
              </div>
              <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Building2 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <h3 className="text-3xl font-bold mt-2">{(overviewStats?.totalUsers || 0).toLocaleString()}</h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{Math.round(overviewStats?.userGrowth || 0)}%</span> from last month
                </p>
              </div>
              <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Avg. Revenue/Tenant</p>
                <h3 className="text-3xl font-bold mt-2">{formatCurrency(overviewStats?.avgRevenuePerTenant || 0)}</h3>
                <p className="text-xs text-muted-foreground mt-1">Per month</p>
              </div>
              <div className="p-4 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Activity className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="churn">Churn</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Plan</CardTitle>
                <CardDescription>Distribution of revenue across plans</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {revenueByPlan.length > 0 ? revenueByPlan.map((item) => (
                  <div key={item.planId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {item.plan}
                        <Badge variant="outline" className="text-xs">{item.count} tenants</Badge>
                      </span>
                      <span className="font-medium">{formatCurrency(item.revenue)} ({item.percentage}%)</span>
                    </div>
                    <Progress value={item.percentage} />
                  </div>
                )) : <p className="text-muted-foreground text-center py-4">No revenue data yet</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
                <CardDescription>Revenue over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyMetrics.length > 0 ? (
                  <div className="h-[200px] flex items-end justify-between gap-2">
                    {monthlyMetrics.map((m) => (
                      <div key={`${m.month}-${m.year}`} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-xs font-medium text-muted-foreground">{formatCurrency(m.revenue)}</div>
                        <div className="w-full bg-primary rounded-t transition-all" style={{ height: `${(m.revenue / maxRevenue) * 150}px`, minHeight: '4px' }} />
                        <span className="text-xs text-muted-foreground">{m.month}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground">No monthly data available</div>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Revenue Generating Tenants</CardTitle>
              <CardDescription>Highest paying tenants this month</CardDescription>
            </CardHeader>
            <CardContent>
              {topTenants.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Tenant</th>
                      <th className="text-left p-3 font-medium">Monthly Revenue</th>
                      <th className="text-left p-3 font-medium">Max Users</th>
                      <th className="text-left p-3 font-medium">Billing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTenants.map((tenant) => (
                      <tr key={tenant.id} className="border-b">
                        <td className="p-3 font-medium">{tenant.name}</td>
                        <td className="p-3">{formatCurrency(tenant.revenue)}</td>
                        <td className="p-3">{tenant.employees === -1 ? 'Unlimited' : tenant.employees}</td>
                        <td className="p-3"><Badge variant="outline">{tenant.billingCycle}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-muted-foreground text-center py-8">No tenant data yet</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">New Tenants</p>
                    <h3 className="text-3xl font-bold mt-2">{tenantStats?.newTenantsThisMonth || 0}</h3>
                    <p className="text-xs text-muted-foreground mt-1">This month</p>
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
                    <p className="text-sm font-medium text-muted-foreground">Active Trials</p>
                    <h3 className="text-3xl font-bold mt-2">{tenantStats?.activeTrials || 0}</h3>
                    <p className="text-xs text-muted-foreground mt-1">In progress</p>
                  </div>
                  <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Trial Conversion</p>
                    <h3 className="text-3xl font-bold mt-2">{tenantStats?.trialConversionRate || 0}%</h3>
                    <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                  </div>
                  <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <PieChart className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tenant Status Distribution</CardTitle>
              <CardDescription>Current tenant status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {tenantStats?.byStatus ? (
                <div className="space-y-4">
                  {Object.entries(tenantStats.byStatus).map(([status, count]) => {
                    const total = Object.values(tenantStats.byStatus).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{status}</span>
                          <span className="font-medium">{count} ({percentage}%)</span>
                        </div>
                        <Progress value={percentage} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <LineChart className="h-12 w-12 mx-auto mb-2" />
                    <p>No tenant status data</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tenant Growth Trend</CardTitle>
              <CardDescription>Number of tenants over time</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyMetrics.length > 0 ? (
                <div className="h-[200px] flex items-end justify-between gap-2">
                  {monthlyMetrics.map((m) => {
                    const maxTenants = Math.max(...monthlyMetrics.map(x => x.tenants), 1);
                    return (
                      <div key={`tenant-${m.month}-${m.year}`} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-xs font-medium text-muted-foreground">{m.tenants}</div>
                        <div className="w-full bg-blue-500 rounded-t transition-all" style={{ height: `${(m.tenants / maxTenants) * 150}px`, minHeight: '4px' }} />
                        <span className="text-xs text-muted-foreground">{m.month}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <LineChart className="h-12 w-12 mx-auto mb-2" />
                    <p>No trend data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Storage Allocated</p>
                    <h3 className="text-3xl font-bold mt-2">{usageStats?.totalStorage || '0 B'}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Across all tenants</p>
                  </div>
                  <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Estimated Storage Used</p>
                    <h3 className="text-3xl font-bold mt-2">{usageStats?.usedStorage || '0 B'}</h3>
                    <p className="text-xs text-muted-foreground mt-1">~60% utilization estimate</p>
                  </div>
                  <div className="p-4 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                    <h3 className="text-3xl font-bold mt-2">{usageStats?.activeSessions || 0}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Admin logins (last 24h)</p>
                  </div>
                  <div className="p-4 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>API Usage</CardTitle>
              <CardDescription>API call tracking requires additional setup</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p>API usage tracking coming soon</p>
                <p className="text-sm mt-2">Configure request logging to enable this feature</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="churn" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Churn Rate</p>
                    <h3 className="text-3xl font-bold mt-2">{churnStats?.churnRate || 0}%</h3>
                    <p className={`text-xs mt-1 ${churnStats && churnStats.churnRate < churnStats.lastMonthChurnRate ? 'text-green-500' : 'text-red-500'}`}>
                      {churnStats?.churnRate !== churnStats?.lastMonthChurnRate && (
                        churnStats && churnStats.churnRate < churnStats.lastMonthChurnRate
                          ? `Down from ${churnStats.lastMonthChurnRate}% last month`
                          : `Up from ${churnStats?.lastMonthChurnRate}% last month`
                      )}
                    </p>
                  </div>
                  <div className={`p-4 rounded-full ${churnStats && churnStats.churnRate < churnStats.lastMonthChurnRate ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                    {churnStats && churnStats.churnRate < churnStats.lastMonthChurnRate ? (
                      <TrendingDown className="h-6 w-6" />
                    ) : (
                      <TrendingUp className="h-6 w-6" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Churned Tenants</p>
                    <h3 className="text-3xl font-bold mt-2">{churnStats?.churnedThisMonth || 0}</h3>
                    <p className="text-xs text-muted-foreground mt-1">This month</p>
                  </div>
                  <div className="p-4 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Building2 className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Revenue Lost</p>
                    <h3 className="text-3xl font-bold mt-2">{formatCurrency(churnStats?.revenueLost || 0)}</h3>
                    <p className="text-xs text-muted-foreground mt-1">This month</p>
                  </div>
                  <div className="p-4 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Churn Trend</CardTitle>
              <CardDescription>Churned subscriptions over time</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyMetrics.length > 0 ? (
                <div className="h-[200px] flex items-end justify-between gap-2">
                  {monthlyMetrics.map((m) => {
                    const maxChurn = Math.max(...monthlyMetrics.map(x => x.churn), 1);
                    return (
                      <div key={`churn-${m.month}-${m.year}`} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-xs font-medium text-muted-foreground">{m.churn}</div>
                        <div className="w-full bg-red-500 rounded-t transition-all" style={{ height: `${(m.churn / maxChurn) * 150}px`, minHeight: m.churn > 0 ? '8px' : '4px' }} />
                        <span className="text-xs text-muted-foreground">{m.month}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">No churn data available</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Churn Analysis</CardTitle>
              <CardDescription>Understanding why tenants cancel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <PieChart className="h-12 w-12 mx-auto mb-2" />
                <p>Churn reason tracking coming soon</p>
                <p className="text-sm mt-2">Enable cancellation surveys to track churn reasons</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
