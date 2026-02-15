'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { assessmentApi, ExtendedAnalytics } from '@/lib/api/assessments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
  Activity,
  Award,
  Target,
  Timer,
  FileQuestion,
  ClipboardList,
  Send,
  Download,
  RefreshCw,
  Brain,
} from 'lucide-react';

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AssessmentAnalyticsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState('30days');
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<ExtendedAnalytics | null>(null);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const data = await assessmentApi.getExtendedAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [dateRange]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await assessmentApi.getExtendedAnalytics();
      setAnalytics(data);
      toast.success('Analytics refreshed');
    } catch (error) {
      toast.error('Failed to refresh analytics');
    } finally {
      setIsLoading(false);
    }
  };

  // Skeleton Loading UI
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>

        {/* Quick Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Secondary Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8" />
                  <div>
                    <Skeleton className="h-6 w-12 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Default values if analytics is null
  const data = analytics || {
    tests: { total: 0, published: 0, draft: 0 },
    invitations: { total: 0, pending: 0, sent: 0, started: 0, completed: 0, expired: 0 },
    results: { total: 0, passed: 0, failed: 0, avgScore: 0, avgTimeTaken: 0, passRate: 0 },
    topTests: [],
    scoreDistribution: [],
    questions: { total: 0, bank: 0, inTests: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/hr/assessments')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessments
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Assessment Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights into your assessment performance
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="1year">Last 1 year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assessments</p>
                <p className="text-3xl font-bold">{data.results.total}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-sm text-muted-foreground">
                    {data.invitations.completed} completed
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-3xl font-bold">{Math.round(data.results.avgScore)}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-sm text-muted-foreground">
                    Across all tests
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-3xl font-bold">{Math.round(data.results.passRate)}%</p>
                <div className="flex items-center gap-1 mt-1">
                  {data.results.passRate >= 50 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm ${data.results.passRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.results.passed} passed
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Time Taken</p>
                <p className="text-3xl font-bold">
                  {data.results.avgTimeTaken >= 3600
                    ? `${Math.floor(data.results.avgTimeTaken / 3600)}h ${Math.floor((data.results.avgTimeTaken % 3600) / 60)}m`
                    : data.results.avgTimeTaken >= 60
                    ? `${Math.floor(data.results.avgTimeTaken / 60)}m ${Math.round(data.results.avgTimeTaken % 60)}s`
                    : `${Math.round(data.results.avgTimeTaken)}s`}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-sm text-muted-foreground">
                    Per assessment
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Timer className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-900">{data.tests.total}</p>
                <p className="text-sm text-blue-700">Total Tests ({data.tests.published} published)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Send className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-900">{data.invitations.pending}</p>
                <p className="text-sm text-yellow-700">Pending Invitations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-900">{data.invitations.started}</p>
                <p className="text-sm text-green-700">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileQuestion className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-900">{data.questions.bank}</p>
                <p className="text-sm text-purple-700">Questions in Bank</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Test Performance
          </TabsTrigger>
          <TabsTrigger value="scores" className="gap-2">
            <Target className="h-4 w-4" />
            Score Distribution
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Invitations Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Invitation Status
                </CardTitle>
                <CardDescription>Distribution of assessment invitations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Pending</span>
                      <span className="font-medium">{data.invitations.pending}</span>
                    </div>
                    <Progress value={data.invitations.total > 0 ? (data.invitations.pending / data.invitations.total) * 100 : 0} className="h-2 bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Sent</span>
                      <span className="font-medium">{data.invitations.sent}</span>
                    </div>
                    <Progress value={data.invitations.total > 0 ? (data.invitations.sent / data.invitations.total) * 100 : 0} className="h-2 bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Started</span>
                      <span className="font-medium">{data.invitations.started}</span>
                    </div>
                    <Progress value={data.invitations.total > 0 ? (data.invitations.started / data.invitations.total) * 100 : 0} className="h-2 bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600">Completed</span>
                      <span className="font-medium text-green-600">{data.invitations.completed}</span>
                    </div>
                    <Progress value={data.invitations.total > 0 ? (data.invitations.completed / data.invitations.total) * 100 : 0} className="h-2 bg-green-100" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-red-600">Expired</span>
                      <span className="font-medium text-red-600">{data.invitations.expired}</span>
                    </div>
                    <Progress value={data.invitations.total > 0 ? (data.invitations.expired / data.invitations.total) * 100 : 0} className="h-2 bg-red-100" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Invitations</span>
                    <span className="font-bold">{data.invitations.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Results Summary
                </CardTitle>
                <CardDescription>Pass/fail distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Visual Pass/Fail Bar */}
                  <div className="h-8 rounded-lg overflow-hidden flex">
                    <div 
                      className="bg-green-500 flex items-center justify-center text-white text-sm font-medium"
                      style={{ width: `${data.results.total > 0 ? (data.results.passed / data.results.total) * 100 : 50}%` }}
                    >
                      {data.results.passed} Passed
                    </div>
                    <div 
                      className="bg-red-500 flex items-center justify-center text-white text-sm font-medium"
                      style={{ width: `${data.results.total > 0 ? (data.results.failed / data.results.total) * 100 : 50}%` }}
                    >
                      {data.results.failed} Failed
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-700">Passed</span>
                      </div>
                      <p className="text-3xl font-bold text-green-700">{data.results.passed}</p>
                      <p className="text-sm text-green-600">{Math.round(data.results.passRate)}% pass rate</p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-700">Failed</span>
                      </div>
                      <p className="text-3xl font-bold text-red-700">{data.results.failed}</p>
                      <p className="text-sm text-red-600">{data.results.total > 0 ? Math.round((data.results.failed / data.results.total) * 100) : 0}% fail rate</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Test Performance Tab */}
        <TabsContent value="tests" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Performing Tests
              </CardTitle>
              <CardDescription>Tests with the most attempts</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topTests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No test data available yet</p>
                  <p className="text-sm">Complete some assessments to see performance data</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.topTests.map((test, index) => (
                    <div key={test.testId} className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{test.testName}</p>
                        <p className="text-sm text-muted-foreground">{test.attempts} attempts</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{Math.round(test.avgScore)}%</p>
                        <p className="text-sm text-muted-foreground">avg. score</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Score Distribution Tab */}
        <TabsContent value="scores" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Score Distribution
              </CardTitle>
              <CardDescription>How candidates are scoring across all tests</CardDescription>
            </CardHeader>
            <CardContent>
              {data.scoreDistribution.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No score data available yet</p>
                  <p className="text-sm">Complete some assessments to see score distribution</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.scoreDistribution.map((range) => (
                    <div key={range.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{range.label}</span>
                        <span className="text-muted-foreground">{range.count} candidates</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-8 bg-muted rounded overflow-hidden">
                          <div 
                            className={`h-full ${
                              range.max <= 40 ? 'bg-red-500' :
                              range.max <= 60 ? 'bg-yellow-500' :
                              range.max <= 80 ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}
                            style={{ 
                              width: `${data.results.total > 0 ? (range.count / data.results.total) * 100 : 0}%`,
                              minWidth: range.count > 0 ? '20px' : '0'
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {data.results.total > 0 ? Math.round((range.count / data.results.total) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
