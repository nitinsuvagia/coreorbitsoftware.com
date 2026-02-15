'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarColor } from '@/lib/format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Star,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { interviewApi, InterviewAnalytics } from '@/lib/api/interviews';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  iconBgColor: string;
}

function StatCard({ title, value, change, icon, iconBgColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {change !== undefined && change !== 0 && (
              <div className={`flex items-center gap-1 mt-1 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span>{Math.abs(change)}% vs last period</span>
              </div>
            )}
          </div>
          <div className={`h-12 w-12 rounded-full ${iconBgColor} flex items-center justify-center`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PROGRESS BAR CHART
// ============================================================================

const chartColors = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
];

interface ProgressBarChartProps {
  data: { label: string; value: number; total?: number; color?: string }[];
  maxValue?: number;
  showPercentage?: boolean;
}

function ProgressBarChart({ data, maxValue, showPercentage = false }: ProgressBarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>No data available</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const barColor = item.color || chartColors[index % chartColors.length];
        const percentage = (item.value / max) * 100;
        
        return (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-sm ${barColor}`} />
                {item.label}
              </span>
              <span className="font-medium">
                {item.total ? `${item.value}/${item.total}` : item.value}
                {showPercentage && '%'}
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Get hire rate color based on percentage
function getHireRateColor(rate: number): string {
  if (rate >= 40) return 'bg-green-500';
  if (rate >= 30) return 'bg-emerald-500';
  if (rate >= 20) return 'bg-amber-500';
  if (rate >= 10) return 'bg-orange-500';
  return 'bg-red-500';
}

// ============================================================================
// DATE RANGE HELPERS
// ============================================================================

function getDateRange(period: string): { dateFrom: string; dateTo: string } {
  const now = new Date();
  
  switch (period) {
    case 'this-week':
      return {
        dateFrom: startOfWeek(now).toISOString(),
        dateTo: endOfWeek(now).toISOString(),
      };
    case 'this-month':
      return {
        dateFrom: startOfMonth(now).toISOString(),
        dateTo: endOfMonth(now).toISOString(),
      };
    case 'last-month':
      const lastMonth = subMonths(now, 1);
      return {
        dateFrom: startOfMonth(lastMonth).toISOString(),
        dateTo: endOfMonth(lastMonth).toISOString(),
      };
    case 'this-quarter':
      return {
        dateFrom: startOfQuarter(now).toISOString(),
        dateTo: endOfQuarter(now).toISOString(),
      };
    case 'this-year':
      return {
        dateFrom: startOfYear(now).toISOString(),
        dateTo: endOfYear(now).toISOString(),
      };
    case 'all-time':
    default:
      return {
        dateFrom: '',
        dateTo: '',
      };
  }
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function AnalyticsSkeleton() {
  return (
    <div className="container py-6 space-y-6">
      <Skeleton className="h-10 w-40" />
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40 mb-1" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-36 mb-1" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="flex items-center gap-4 py-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36 mb-1" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-28 mb-1" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="text-center">
                <Skeleton className="h-8 w-8 mx-auto mb-2 rounded-full" />
                <Skeleton className="h-10 w-12 mx-auto mb-1" />
                <Skeleton className="h-4 w-28 mx-auto" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function InterviewAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all-time');
  const [analytics, setAnalytics] = useState<InterviewAnalytics | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const dateRange = getDateRange(period);
      const data = await interviewApi.getAnalytics(
        dateRange.dateFrom ? dateRange : undefined
      );
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  if (loading || !analytics) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/hr/interviews')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Interviews
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Interview Analytics
          </h1>
          <p className="text-muted-foreground">
            Track interview metrics, pass rates, and hiring performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats - 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Scheduled"
          value={analytics.overview.totalScheduled}
          change={analytics.trends.scheduledChange}
          icon={<Calendar className="h-6 w-6 text-blue-600" />}
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          title="Completed"
          value={analytics.overview.totalCompleted}
          change={analytics.trends.completedChange}
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          iconBgColor="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          title="Cancelled / No Show"
          value={`${analytics.overview.totalCancelled} / ${analytics.overview.totalNoShow}`}
          change={analytics.trends.cancelledChange}
          icon={<XCircle className="h-6 w-6 text-red-600" />}
          iconBgColor="bg-red-100 dark:bg-red-900/30"
        />
        <StatCard
          title="Pass Rate"
          value={`${analytics.overview.passRate}%`}
          change={analytics.trends.passRateChange}
          icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
        />
      </div>

      {/* Charts Row - Interviews by Stage & Pass Rate by Round */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interviews by Stage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interviews by Stage</CardTitle>
            <CardDescription>Distribution of interviews across different rounds</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressBarChart
              data={analytics.interviewsByType.map(item => ({
                label: item.type,
                value: item.count,
              }))}
            />
          </CardContent>
        </Card>

        {/* Pass Rate by Round */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pass Rate by Round</CardTitle>
            <CardDescription>Candidate success rate at each interview stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressBarChart
              data={analytics.passRateByRound.map(item => ({
                label: item.round,
                value: item.passRate,
                total: 100,
              }))}
              maxValue={100}
              showPercentage
            />
          </CardContent>
        </Card>
      </div>

      {/* Tables Row - Top Interviewers & Hires by Department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Interviewers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top Interviewers
            </CardTitle>
            <CardDescription>Most active interviewers this period</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topInterviewers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mb-2" />
                <p>No interviewer data available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Interviewer</TableHead>
                    <TableHead className="text-center">Interviews</TableHead>
                    <TableHead className="text-center">Avg Rating</TableHead>
                    <TableHead className="text-center">Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topInterviewers.map((interviewer) => (
                    <TableRow key={interviewer.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={interviewer.avatar} />
                            <AvatarFallback className={`${getAvatarColor(interviewer.name).className} font-semibold`}>
                              {interviewer.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{interviewer.name}</div>
                            <div className="text-xs text-muted-foreground">{interviewer.designation}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{interviewer.interviews}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          {interviewer.avgRating || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{interviewer.feedbackTime}h</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Hires by Department */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Hires by Department
            </CardTitle>
            <CardDescription>Hiring success rate across departments</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.hiresByDepartment.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Briefcase className="h-8 w-8 mb-2" />
                <p>No hiring data available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Hires</TableHead>
                    <TableHead className="text-center">Interviews</TableHead>
                    <TableHead className="text-center">Hire Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.hiresByDepartment.map((dept) => (
                    <TableRow key={dept.department}>
                      <TableCell className="font-medium">{dept.department}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default" className="bg-green-500">
                          {dept.hires}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{dept.interviews}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${getHireRateColor(dept.rate)}`}
                              style={{ width: `${Math.min(dept.rate, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${
                            dept.rate >= 30 ? 'text-green-600 dark:text-green-400' : 
                            dept.rate >= 20 ? 'text-amber-600 dark:text-amber-400' : 
                            'text-red-600 dark:text-red-400'
                          }`}>{dept.rate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest interview updates and decisions</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mb-2" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={`${getAvatarColor(activity.candidate).className} font-semibold`}>
                        {activity.candidate.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{activity.candidate}</div>
                      <div className="text-sm text-muted-foreground">{activity.action}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {activity.result && (
                      <Badge
                        variant="secondary"
                        className={
                          activity.result === 'Strong Hire' || activity.result === 'Hire'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : activity.result === 'No Show' || activity.result === 'Cancelled'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : activity.result === 'Maybe'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : activity.result === 'No Hire' || activity.result === 'Strong No Hire'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : ''
                        }
                      >
                        {activity.result}
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics - Days to Hire, Interviews Today, Scheduled This Week */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <div className="text-3xl font-bold">
                {analytics.overview.avgTimeToHire !== null ? analytics.overview.avgTimeToHire : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">Days to Hire (Avg)</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <div className="text-3xl font-bold">{analytics.overview.upcomingToday}</div>
              <div className="text-sm text-muted-foreground">Interviews Today</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto text-purple-500 mb-2" />
              <div className="text-3xl font-bold">{analytics.overview.upcomingWeek}</div>
              <div className="text-sm text-muted-foreground">Scheduled This Week</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
