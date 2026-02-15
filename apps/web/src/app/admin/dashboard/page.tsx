'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/auth-context';
import { api } from '@/lib/api/client';
import { 
  Building2, 
  Users, 
  CreditCard,
  DollarSign,
  Activity,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Clock,
  Target,
  BarChart3,
} from 'lucide-react';

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  pendingTenants: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  cancelledSubscriptions: number;
  totalMRR: number;
  totalARR: number;
  avgRevenuePerTenant: number;
  conversionRate: number;
  newTenantsThisMonth: number;
  tenantGrowthPercent: number;
}

interface RecentTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  createdAt: string;
}

interface PlanDistribution {
  planId: string;
  planName: string;
  count: number;
  monthlyRevenue: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentTenants: RecentTenant[];
  planDistribution: PlanDistribution[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  iconColor?: string;
  trend?: { value: number; isPositive: boolean };
  loading?: boolean;
}

const iconColorClasses: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  primary: 'bg-primary/10 text-primary',
};

function StatCard({ title, value, description, icon: Icon, iconColor = 'primary', trend, loading }: StatCardProps) {
  if (loading) {
    return (
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
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-bold">{value}</h3>
              {trend && (
                <span className={`flex items-center text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className={`p-4 rounded-full ${iconColorClasses[iconColor]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/v1/platform/tenants/stats/dashboard');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      const errorData = err.response?.data?.error;
      const errorMessage = typeof errorData === 'object' && errorData?.message 
        ? errorData.message 
        : (typeof errorData === 'string' ? errorData : 'Failed to load dashboard data');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const stats = data?.stats;
  const totalSubscriptions = (stats?.activeSubscriptions || 0) + (stats?.trialingSubscriptions || 0);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Platform Admin Dashboard
        </h2>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName}! Here's an overview of your platform.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-destructive">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tenants"
          value={stats?.totalTenants || 0}
          description={`${stats?.pendingTenants || 0} pending setup`}
          icon={Building2}
          iconColor="blue"
          trend={stats ? { value: stats.tenantGrowthPercent, isPositive: stats.tenantGrowthPercent >= 0 } : undefined}
          loading={loading}
        />
        <StatCard
          title="Active Tenants"
          value={stats?.activeTenants || 0}
          description="Paying customers"
          icon={Users}
          iconColor="green"
          loading={loading}
        />
        <StatCard
          title="Trial Tenants"
          value={stats?.trialTenants || 0}
          description={`${stats?.conversionRate || 0}% conversion rate`}
          icon={Clock}
          iconColor="orange"
          loading={loading}
        />
        <StatCard
          title="New This Month"
          value={stats?.newTenantsThisMonth || 0}
          description="Last 30 days"
          icon={UserPlus}
          iconColor="purple"
          trend={stats ? { value: stats.tenantGrowthPercent, isPositive: stats.tenantGrowthPercent >= 0 } : undefined}
          loading={loading}
        />
      </div>

      {/* Stats Grid - Row 2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.totalMRR || 0)}
          description="MRR (recurring)"
          icon={DollarSign}
          iconColor="green"
          loading={loading}
        />
        <StatCard
          title="Annual Revenue"
          value={formatCurrency(stats?.totalARR || 0)}
          description="ARR projection"
          icon={BarChart3}
          iconColor="blue"
          loading={loading}
        />
        <StatCard
          title="Active Subscriptions"
          value={totalSubscriptions}
          description={`${stats?.trialingSubscriptions || 0} in trial`}
          icon={CreditCard}
          iconColor="purple"
          loading={loading}
        />
        <StatCard
          title="Suspended"
          value={stats?.suspendedTenants || 0}
          description="Require attention"
          icon={AlertCircle}
          iconColor="red"
          loading={loading}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Tenants */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Tenants</CardTitle>
            <CardDescription>
              Newly registered organizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-14" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data?.recentTenants && data.recentTenants.length > 0 ? (
              <div className="space-y-4">
                {data.recentTenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-medium">
                        {tenant.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(tenant.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{tenant.plan}</Badge>
                      <Badge variant={
                        tenant.status === 'ACTIVE' ? 'success' : 
                        tenant.status === 'TRIAL' ? 'warning' : 
                        'secondary'
                      }>
                        {tenant.status.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No tenants registered yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Subscription Distribution */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Subscription Distribution</CardTitle>
            <CardDescription>
              Breakdown by plan type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-3 w-20 ml-auto" />
                  </div>
                ))}
              </div>
            ) : data?.planDistribution && data.planDistribution.length > 0 ? (
              <div className="space-y-4">
                {data.planDistribution.map((item, i) => {
                  const maxCount = Math.max(...data.planDistribution.map(p => p.count), 1);
                  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500'];
                  return (
                    <div key={item.planId} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.planName}</span>
                        <span className="text-muted-foreground">{item.count} tenants</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${colors[i % colors.length]}`}
                          style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        {formatCurrency(item.monthlyRevenue)}/mo
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No subscription data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Activity - Placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>System Activity</CardTitle>
          </div>
          <CardDescription>
            Recent platform events and activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            System activity tracking coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
