'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  FolderKanban,
  CheckSquare,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  OverviewMetrics,
  TrendData,
  WorkHoursAnalytics,
  ReportPeriod,
  ExportFormat,
  getOverviewMetrics,
  getAttendanceTrends,
  getProjectProgressTrends,
  getTaskStatusDistribution,
  getEmployeeDistribution,
  getWorkHoursAnalytics,
  exportEmployees,
  exportAttendance,
  exportProjects,
  exportTasks,
  exportLeaves,
  clearAnalyticsCache,
} from '@/lib/api/reports';

// Report types configuration
const reportTypes = [
  { id: 'employees', name: 'Employees Report', icon: Users, description: 'Export employee data and details' },
  { id: 'attendance', name: 'Attendance Report', icon: Clock, description: 'Daily attendance records' },
  { id: 'projects', name: 'Projects Report', icon: FolderKanban, description: 'Project status and progress' },
  { id: 'tasks', name: 'Tasks Report', icon: CheckSquare, description: 'Task assignments and completion' },
  { id: 'leaves', name: 'Leaves Report', icon: Calendar, description: 'Leave requests and balances' },
];

// Period to date range mapping
function getPeriodLabel(period: ReportPeriod): string {
  switch (period) {
    case 'day': return 'Today';
    case 'week': return 'This Week';
    case 'month': return 'This Month';
    case 'quarter': return 'This Quarter';
    case 'year': return 'This Year';
    default: return 'This Month';
  }
}

// Simple bar chart component
function SimpleBarChart({ data, maxBars = 7, emptyIcon: EmptyIcon = BarChart3, emptyMessage = 'No data available' }: { data: TrendData; maxBars?: number; emptyIcon?: any; emptyMessage?: string }) {
  if (!data?.labels?.length || !data?.datasets?.[0]?.data?.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
        <EmptyIcon className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">{emptyMessage}</p>
        <p className="text-xs mt-1 opacity-70">Data will appear here when available</p>
      </div>
    );
  }

  const labels = data.labels.slice(-maxBars);
  const values = data.datasets[0].data.slice(-maxBars);
  const maxValue = Math.max(...values, 1);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-end gap-2 px-2">
        {values.map((value, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">{value}</span>
            <div
              className="w-full bg-primary/80 rounded-t transition-all duration-500"
              style={{ height: `${Math.max((value / maxValue) * 100, 5)}%`, minHeight: '4px' }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 px-2 mt-2 border-t pt-2">
        {labels.map((label, index) => (
          <div key={index} className="flex-1 text-center">
            <span className="text-[10px] text-muted-foreground truncate block">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple pie/doughnut chart component
function SimplePieChart({ data, emptyIcon: EmptyIcon = CheckSquare, emptyMessage = 'No data available' }: { data: TrendData; emptyIcon?: any; emptyMessage?: string }) {
  if (!data?.labels?.length || !data?.datasets?.[0]?.data?.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
        <EmptyIcon className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">{emptyMessage}</p>
        <p className="text-xs mt-1 opacity-70">Data will appear here when available</p>
      </div>
    );
  }

  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500'
  ];
  const total = data.datasets[0].data.reduce((sum, val) => sum + val, 0);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-32 h-32">
          {/* Simplified pie representation */}
          <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {data.labels.map((label, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
              <span className="truncate">{label}</span>
            </div>
            <span className="font-medium">{data.datasets[0].data[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stats card component
function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconBgClass,
  iconColorClass,
  loading,
}: {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon: any;
  iconBgClass: string;
  iconColorClass: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
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
              {change !== undefined && (
                <span className={`flex items-center text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {change >= 0 ? '+' : ''}{change}%
                </span>
              )}
            </div>
            {changeLabel && (
              <p className="text-xs text-muted-foreground mt-1">{changeLabel}</p>
            )}
          </div>
          <div className={`p-4 rounded-full ${iconBgClass} ${iconColorClass}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Data states
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [attendanceTrends, setAttendanceTrends] = useState<TrendData | null>(null);
  const [taskStatus, setTaskStatus] = useState<TrendData | null>(null);
  const [projectProgress, setProjectProgress] = useState<TrendData | null>(null);
  const [employeeDistribution, setEmployeeDistribution] = useState<TrendData | null>(null);
  const [workHours, setWorkHours] = useState<WorkHoursAnalytics | null>(null);

  // Fetch all data
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const [
        metricsData,
        attendanceData,
        taskStatusData,
        projectData,
        employeeData,
        workHoursData,
      ] = await Promise.all([
        getOverviewMetrics().catch(() => null),
        getAttendanceTrends(period).catch(() => null),
        getTaskStatusDistribution().catch(() => null),
        getProjectProgressTrends(period).catch(() => null),
        getEmployeeDistribution().catch(() => null),
        getWorkHoursAnalytics(period).catch(() => null),
      ]);
      
      setMetrics(metricsData);
      setAttendanceTrends(attendanceData);
      setTaskStatus(taskStatusData);
      setProjectProgress(projectData);
      setEmployeeDistribution(employeeData);
      setWorkHours(workHoursData);
    } catch (error) {
      console.error('Failed to fetch reports data:', error);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await clearAnalyticsCache();
      await fetchData(false);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle export
  async function handleExport(reportType: string, format: ExportFormat) {
    setIsExporting(reportType);
    try {
      const options = { format };
      let result;
      
      switch (reportType) {
        case 'employees':
          result = await exportEmployees(options);
          break;
        case 'attendance':
          result = await exportAttendance(options);
          break;
        case 'projects':
          result = await exportProjects(options);
          break;
        case 'tasks':
          result = await exportTasks(options);
          break;
        case 'leaves':
          result = await exportLeaves(options);
          break;
        default:
          throw new Error('Unknown report type');
      }
      
      // Open download URL
      if (result?.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
        toast.success(`${reportType} report exported as ${format.toUpperCase()}`);
      } else {
        toast.success(`${reportType} report is being generated`);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error?.response?.data?.error || 'Failed to export report');
    } finally {
      setIsExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            View analytics and export reports for your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                {getPeriodLabel(period)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPeriod('day')}>Today</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeriod('week')}>This Week</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeriod('month')}>This Month</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeriod('quarter')}>This Quarter</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeriod('year')}>This Year</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="outline" 
            size="icon" 
            title="Refresh Data"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="export">Export Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Employees"
              value={metrics?.employees.total || 0}
              change={metrics?.employees.newThisMonth ? Math.round((metrics.employees.newThisMonth / Math.max(metrics.employees.total - metrics.employees.newThisMonth, 1)) * 100) : undefined}
              changeLabel={metrics?.employees.newThisMonth ? `${metrics.employees.newThisMonth} new this month` : undefined}
              icon={Users}
              iconBgClass="bg-blue-500/10"
              iconColorClass="text-blue-600 dark:text-blue-400"
              loading={loading}
            />
            <StatsCard
              title="Avg Attendance"
              value={metrics ? `${metrics.attendance.onTimePercentage}%` : '0%'}
              changeLabel={metrics ? `${metrics.attendance.presentToday} present today` : undefined}
              icon={Clock}
              iconBgClass="bg-green-500/10"
              iconColorClass="text-green-600 dark:text-green-400"
              loading={loading}
            />
            <StatsCard
              title="Active Projects"
              value={metrics?.projects.active || 0}
              changeLabel={metrics?.projects.overdue ? `${metrics.projects.overdue} overdue` : `${metrics?.projects.completed || 0} completed`}
              icon={FolderKanban}
              iconBgClass="bg-purple-500/10"
              iconColorClass="text-purple-600 dark:text-purple-400"
              loading={loading}
            />
            <StatsCard
              title="Tasks Completed"
              value={metrics?.tasks.completed || 0}
              change={metrics?.tasks.completionRate}
              changeLabel={`${metrics?.tasks.inProgress || 0} in progress`}
              icon={CheckSquare}
              iconBgClass="bg-orange-500/10"
              iconColorClass="text-orange-600 dark:text-orange-400"
              loading={loading}
            />
          </div>

          {/* Charts Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Trends</CardTitle>
                <CardDescription>Daily attendance over {getPeriodLabel(period).toLowerCase()}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : attendanceTrends ? (
                  <SimpleBarChart 
                    data={attendanceTrends} 
                    emptyIcon={Clock}
                    emptyMessage="No attendance data yet"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                    <Clock className="h-12 w-12 mb-3 opacity-40" />
                    <p className="text-sm font-medium">No attendance data yet</p>
                    <p className="text-xs mt-1 opacity-70">Attendance records will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Task Status Distribution</CardTitle>
                <CardDescription>Current status of all tasks</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : taskStatus ? (
                  <SimplePieChart 
                    data={taskStatus}
                    emptyIcon={CheckSquare}
                    emptyMessage="No tasks created yet"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                    <CheckSquare className="h-12 w-12 mb-3 opacity-40" />
                    <p className="text-sm font-medium">No tasks created yet</p>
                    <p className="text-xs mt-1 opacity-70">Task distribution will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reportTypes.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <report.icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                  </div>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={isExporting === report.id}
                      onClick={() => handleExport(report.id, 'excel')}
                    >
                      {isExporting === report.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                      )}
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={isExporting === report.id}
                      onClick={() => handleExport(report.id, 'pdf')}
                    >
                      {isExporting === report.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="mr-2 h-4 w-4" />
                      )}
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
                <CardDescription>Project completion over {getPeriodLabel(period).toLowerCase()}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : projectProgress ? (
                  <SimpleBarChart 
                    data={projectProgress} 
                    maxBars={10}
                    emptyIcon={FolderKanban}
                    emptyMessage="No project data yet"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                    <FolderKanban className="h-12 w-12 mb-3 opacity-40" />
                    <p className="text-sm font-medium">No projects created yet</p>
                    <p className="text-xs mt-1 opacity-70">Project progress will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>By work hours this {period}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-6 w-6 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                        <Skeleton className="h-5 w-12" />
                      </div>
                    ))}
                  </div>
                ) : workHours?.topPerformers?.length ? (
                  <div className="space-y-4">
                    {workHours.topPerformers.slice(0, 5).map((performer, i) => (
                      <div key={performer.employeeId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground w-6 text-center">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium">{performer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {performer.hours.toFixed(1)} hours
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          #{i + 1}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No work hours data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Employee Distribution */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Employees by Department</CardTitle>
                <CardDescription>Distribution across departments</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : employeeDistribution ? (
                  <SimplePieChart 
                    data={employeeDistribution}
                    emptyIcon={Users}
                    emptyMessage="No employees yet"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                    <Users className="h-12 w-12 mb-3 opacity-40" />
                    <p className="text-sm font-medium">No department data yet</p>
                    <p className="text-xs mt-1 opacity-70">Employee distribution will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Work Hours Summary</CardTitle>
                <CardDescription>Overall work statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-8 w-24" />
                      </div>
                    ))}
                  </div>
                ) : workHours ? (
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-3xl font-bold">{workHours.totalHours.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Hours/Day</p>
                      <p className="text-3xl font-bold">{workHours.avgHoursPerDay}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Hours/Employee</p>
                      <p className="text-3xl font-bold">{workHours.avgHoursPerEmployee}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No work hours data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
