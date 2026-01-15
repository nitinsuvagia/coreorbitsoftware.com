'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  Users, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Folder,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Target,
  Briefcase,
  FileText,
  UserCheck,
  UserX,
  Trophy,
  Activity,
  Percent,
  ClipboardList,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Home,
  MapPin,
  Timer,
  Star,
  Award,
  Bell,
  CheckSquare,
  XCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Types
interface OrganizationStats {
  totalEmployees: number;
  activeEmployees: number;
  onLeave: number;
  departments: number;
  activeProjects: number;
  completedProjects: number;
  totalRevenue: number;
  monthlyBudget: number;
  budgetUtilized: number;
  growthRate: number;
}

interface AttendanceMetrics {
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  todayRemote: number;
  attendanceRate: number;
  avgWorkHours: number;
  onTimePercentage: number;
}

interface FinancialMetrics {
  totalPayroll: number;
  pendingPayments: number;
  monthlyExpenses: number;
  revenueByDept: { name: string; revenue: number }[];
  budgetAlerts: number;
}

interface ProjectMetrics {
  onTrack: number;
  atRisk: number;
  delayed: number;
  resourceUtilization: number;
  avgCompletion: number;
  upcomingDeadlines: number;
}

interface TaskMetrics {
  totalTasks: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}

interface PerformanceMetrics {
  avgTeamScore: number;
  topPerformers: { name: string; score: number; avatar: string }[];
  improvementNeeded: number;
  departmentScores: { dept: string; score: number }[];
}

interface DashboardData {
  organization: OrganizationStats;
  attendance: AttendanceMetrics;
  financial: FinancialMetrics;
  projects: ProjectMetrics;
  tasks: TaskMetrics;
  performance: PerformanceMetrics;
  recentActivities: Activity[];
  alerts: Alert[];
}

interface Activity {
  id: string;
  type: string;
  user: string;
  action: string;
  timestamp: string;
  avatar?: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
}

// Reusable Components
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}

function MetricCard({ title, value, change, icon: Icon, color, subtitle }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    primary: 'bg-primary/10 text-primary',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-bold">{value}</h3>
              {change !== undefined && (
                <span className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(change)}%
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-4 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProgressCardProps {
  title: string;
  items: { label: string; value: number; max: number; color: string }[];
}

function ProgressCard({ title, items }: ProgressCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground">
                {item.value}/{item.max}
              </span>
            </div>
            <Progress 
              value={(item.value / item.max) * 100} 
              className="h-2"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface ChartCardProps {
  title: string;
  data: { label: string; value: number; color?: string }[];
  type: 'bar' | 'pie';
}

function ChartCard({ title, data, type }: ChartCardProps) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {type === 'bar' ? (
          <div className="space-y-4">
            {data.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate flex-1">{item.label}</span>
                  <span className="text-muted-foreground ml-2">{item.value}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: item.color || 'hsl(var(--primary))',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color || 'hsl(var(--primary))' }}
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TenantAdmin360Page() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  // Mock data - Replace with actual API calls
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock data
    setData({
      organization: {
        totalEmployees: 247,
        activeEmployees: 235,
        onLeave: 12,
        departments: 8,
        activeProjects: 24,
        completedProjects: 156,
        totalRevenue: 2450000,
        monthlyBudget: 450000,
        budgetUtilized: 62,
        growthRate: 12.5,
      },
      attendance: {
        todayPresent: 218,
        todayAbsent: 5,
        todayLate: 8,
        todayRemote: 14,
        attendanceRate: 92.8,
        avgWorkHours: 8.2,
        onTimePercentage: 88.5,
      },
      financial: {
        totalPayroll: 1850000,
        pendingPayments: 45000,
        monthlyExpenses: 380000,
        revenueByDept: [
          { name: 'Engineering', revenue: 850000 },
          { name: 'Sales', revenue: 620000 },
          { name: 'Marketing', revenue: 380000 },
          { name: 'Support', revenue: 290000 },
          { name: 'HR', revenue: 180000 },
        ],
        budgetAlerts: 3,
      },
      projects: {
        onTrack: 18,
        atRisk: 4,
        delayed: 2,
        resourceUtilization: 78,
        avgCompletion: 67,
        upcomingDeadlines: 7,
      },
      tasks: {
        totalTasks: 1847,
        completed: 1245,
        inProgress: 478,
        overdue: 124,
        completionRate: 67.4,
      },
      performance: {
        avgTeamScore: 8.2,
        topPerformers: [
          { name: 'Sarah Johnson', score: 9.5, avatar: '' },
          { name: 'Michael Chen', score: 9.3, avatar: '' },
          { name: 'Emily Davis', score: 9.1, avatar: '' },
          { name: 'David Miller', score: 8.9, avatar: '' },
          { name: 'Jessica Lee', score: 8.7, avatar: '' },
        ],
        improvementNeeded: 18,
        departmentScores: [
          { dept: 'Engineering', score: 8.5 },
          { dept: 'Sales', score: 8.8 },
          { dept: 'Marketing', score: 8.1 },
          { dept: 'Support', score: 8.3 },
          { dept: 'HR', score: 8.0 },
          { dept: 'Finance', score: 8.4 },
        ],
      },
      recentActivities: [
        { id: '1', type: 'project', user: 'John Doe', action: 'completed Project Alpha milestone', timestamp: '2 min ago' },
        { id: '2', type: 'employee', user: 'Jane Smith', action: 'joined Engineering team', timestamp: '15 min ago' },
        { id: '3', type: 'task', user: 'Mike Wilson', action: 'submitted Q1 report', timestamp: '1 hour ago' },
        { id: '4', type: 'leave', user: 'Sarah Brown', action: 'requested leave for 3 days', timestamp: '2 hours ago' },
        { id: '5', type: 'document', user: 'Tom Davis', action: 'uploaded compliance document', timestamp: '3 hours ago' },
      ],
      alerts: [
        { id: '1', type: 'warning', title: 'Budget Alert', message: 'Engineering dept at 85% budget utilization', timestamp: '10 min ago' },
        { id: '2', type: 'error', title: 'Project Delayed', message: 'Project Beta is 5 days behind schedule', timestamp: '1 hour ago' },
        { id: '3', type: 'info', title: 'New Hire', message: '3 employees joining next week', timestamp: '2 hours ago' },
        { id: '4', type: 'warning', title: 'Document Expiring', message: '12 documents expiring this month', timestamp: '4 hours ago' },
      ],
    });
    
    setLoading(false);
  };

  const handleDownloadPDF = async () => {
    if (!pageRef.current) return;
    
    setIsDownloading(true);
    try {
      // Hide buttons during capture
      const buttons = pageRef.current.querySelectorAll('button');
      buttons.forEach(btn => btn.style.visibility = 'hidden');

      const canvas = await html2canvas(pageRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Show buttons again
      buttons.forEach(btn => btn.style.visibility = 'visible');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      // Add pages if content is too long
      let heightLeft = imgHeight * ratio;
      let position = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight * ratio;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Organization_360_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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

        {/* Tabs Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-2xl" />
          
          {/* Tab Content Skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts Skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const org = data?.organization!;
  const attendance = data?.attendance!;
  const financial = data?.financial!;
  const projects = data?.projects!;
  const tasks = data?.tasks!;
  const performance = data?.performance!;

  return (
    <div className="space-y-6 pb-8" ref={pageRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Organization 360° Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive overview of your organization's performance across all sectors
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF} disabled={isDownloading}>
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
          <Button variant="outline" onClick={loadDashboardData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Employees"
          value={org.totalEmployees}
          change={org.growthRate}
          icon={Users}
          color="blue"
          subtitle={`${org.activeEmployees} active • ${org.onLeave} on leave`}
        />
        <MetricCard
          title="Active Projects"
          value={org.activeProjects}
          icon={Folder}
          color="purple"
          subtitle={`${org.completedProjects} completed this year`}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${(org.totalRevenue / 1000000).toFixed(2)}M`}
          change={15.3}
          icon={DollarSign}
          color="green"
          subtitle="This fiscal year"
        />
        <MetricCard
          title="Budget Utilized"
          value={`${org.budgetUtilized}%`}
          icon={Activity}
          color="orange"
          subtitle={`$${(org.monthlyBudget / 1000).toFixed(0)}K monthly budget`}
        />
      </div>

      {/* Attendance & Presence */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Attendance</p>
                <h3 className="text-3xl font-bold mt-2">{attendance.attendanceRate}%</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {attendance.todayPresent} present • {attendance.todayAbsent} absent
                </p>
              </div>
              <div className="p-4 rounded-full bg-green-500/10 text-green-600">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Remote Workers</p>
                <h3 className="text-3xl font-bold mt-2">{attendance.todayRemote}</h3>
                <p className="text-xs text-muted-foreground mt-1">Working from home today</p>
              </div>
              <div className="p-4 rounded-full bg-blue-500/10 text-blue-600">
                <Home className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Late Arrivals</p>
                <h3 className="text-3xl font-bold mt-2">{attendance.todayLate}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  On-time: {attendance.onTimePercentage}%
                </p>
              </div>
              <div className="p-4 rounded-full bg-orange-500/10 text-orange-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Work Hours</p>
                <h3 className="text-3xl font-bold mt-2">{attendance.avgWorkHours}</h3>
                <p className="text-xs text-muted-foreground mt-1">Hours per employee/day</p>
              </div>
              <div className="p-4 rounded-full bg-purple-500/10 text-purple-600">
                <Timer className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Department Distribution */}
            <ChartCard
              title="Employees by Department"
              type="bar"
              data={[
                { label: 'Engineering', value: 87, color: '#3b82f6' },
                { label: 'Sales', value: 54, color: '#10b981' },
                { label: 'Marketing', value: 32, color: '#f59e0b' },
                { label: 'Support', value: 28, color: '#8b5cf6' },
                { label: 'HR', value: 18, color: '#ec4899' },
                { label: 'Finance', value: 15, color: '#06b6d4' },
                { label: 'Operations', value: 13, color: '#84cc16' },
              ]}
            />

            {/* Task Completion */}
            <ProgressCard
              title="Task Completion Status"
              items={[
                { label: 'Completed', value: tasks.completed, max: tasks.totalTasks, color: '#10b981' },
                { label: 'In Progress', value: tasks.inProgress, max: tasks.totalTasks, color: '#3b82f6' },
                { label: 'Overdue', value: tasks.overdue, max: tasks.totalTasks, color: '#ef4444' },
              ]}
            />

            {/* Project Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Health Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">On Track</span>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-600/20">
                    {projects.onTrack}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">At Risk</span>
                  </div>
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-600/20">
                    {projects.atRisk}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Delayed</span>
                  </div>
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-600/20">
                    {projects.delayed}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Avg Completion</span>
                    <span className="text-muted-foreground">{projects.avgCompletion}%</span>
                  </div>
                  <Progress value={projects.avgCompletion} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue & Performance */}
          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard
              title="Revenue by Department (YTD)"
              type="bar"
              data={financial.revenueByDept.map((dept, idx) => ({
                label: dept.name,
                value: dept.revenue / 1000,
                color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx],
              }))}
            />

            <ChartCard
              title="Department Performance Scores"
              type="bar"
              data={performance.departmentScores.map((dept, idx) => ({
                label: dept.dept,
                value: dept.score,
                color: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'][idx],
              }))}
            />
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Resource Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{projects.resourceUtilization}%</span>
                    <Badge variant={projects.resourceUtilization > 80 ? 'destructive' : 'default'}>
                      {projects.resourceUtilization > 80 ? 'High' : 'Optimal'}
                    </Badge>
                  </div>
                  <Progress value={projects.resourceUtilization} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {projects.resourceUtilization > 75 ? 'Consider resource reallocation' : 'Resources well balanced'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-3xl font-bold">{projects.upcomingDeadlines}</div>
                  <p className="text-sm text-muted-foreground">Projects due in next 7 days</p>
                  <Button variant="outline" className="w-full" size="sm">
                    View Calendar
                    <ArrowUpRight className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Percent className="h-5 w-5 text-green-600" />
                  Overall Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{projects.avgCompletion}%</span>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <Progress value={projects.avgCompletion} className="h-2" />
                  <p className="text-xs text-muted-foreground">Average completion across all projects</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Active Projects Overview</CardTitle>
              <CardDescription>Detailed status of ongoing projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Product Redesign', status: 'on-track', completion: 78, team: 12, deadline: '15 days' },
                  { name: 'Mobile App v2.0', status: 'on-track', completion: 65, team: 8, deadline: '22 days' },
                  { name: 'API Integration', status: 'at-risk', completion: 45, team: 5, deadline: '8 days' },
                  { name: 'Marketing Campaign', status: 'on-track', completion: 82, team: 6, deadline: '12 days' },
                  { name: 'Data Migration', status: 'delayed', completion: 30, team: 4, deadline: '-3 days' },
                ].map((project, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{project.name}</h4>
                      <Badge variant={
                        project.status === 'on-track' ? 'default' : 
                        project.status === 'at-risk' ? 'secondary' : 
                        'destructive'
                      }>
                        {project.status === 'on-track' ? 'On Track' : 
                         project.status === 'at-risk' ? 'At Risk' : 
                         'Delayed'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Team</p>
                        <p className="font-medium">{project.team} members</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Deadline</p>
                        <p className="font-medium">{project.deadline}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Progress</p>
                        <p className="font-medium">{project.completion}%</p>
                      </div>
                    </div>
                    <Progress value={project.completion} className="h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Total Payroll"
              value={`$${(financial.totalPayroll / 1000000).toFixed(2)}M`}
              icon={DollarSign}
              color="green"
              subtitle="Monthly payroll costs"
            />
            <MetricCard
              title="Pending Payments"
              value={`$${(financial.pendingPayments / 1000).toFixed(0)}K`}
              icon={Clock}
              color="orange"
              subtitle="Awaiting processing"
            />
            <MetricCard
              title="Monthly Expenses"
              value={`$${(financial.monthlyExpenses / 1000).toFixed(0)}K`}
              icon={Activity}
              color="red"
              subtitle="Operational costs"
            />
            <MetricCard
              title="Budget Alerts"
              value={financial.budgetAlerts}
              icon={AlertCircle}
              color="yellow"
              subtitle="Require attention"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Budget Utilization by Department */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Utilization by Department</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { dept: 'Engineering', allocated: 180000, used: 153000, percent: 85 },
                  { dept: 'Sales', allocated: 120000, used: 84000, percent: 70 },
                  { dept: 'Marketing', allocated: 90000, used: 72000, percent: 80 },
                  { dept: 'Support', allocated: 60000, used: 39000, percent: 65 },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.dept}</span>
                      <span className="text-muted-foreground">
                        ${(item.used / 1000).toFixed(0)}K / ${(item.allocated / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={item.percent} className="h-2 flex-1" />
                      <span className={`text-xs font-medium ${item.percent > 80 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {item.percent}%
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: 'Salaries & Benefits', amount: 280000, color: '#3b82f6' },
                    { category: 'Office & Infrastructure', amount: 45000, color: '#10b981' },
                    { category: 'Software & Tools', amount: 28000, color: '#f59e0b' },
                    { category: 'Marketing & Sales', amount: 18000, color: '#8b5cf6' },
                    { category: 'Training & Development', amount: 9000, color: '#ec4899' },
                  ].map((expense, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: expense.color }} />
                        <span className="text-sm font-medium">{expense.category}</span>
                      </div>
                      <span className="text-sm text-muted-foreground font-medium">
                        ${(expense.amount / 1000).toFixed(0)}K
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses Trend</CardTitle>
              <CardDescription>Last 6 months comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { month: 'Aug 2025', revenue: 410000, expenses: 320000 },
                  { month: 'Sep 2025', revenue: 425000, expenses: 335000 },
                  { month: 'Oct 2025', revenue: 398000, expenses: 342000 },
                  { month: 'Nov 2025', revenue: 445000, expenses: 358000 },
                  { month: 'Dec 2025', revenue: 480000, expenses: 375000 },
                  { month: 'Jan 2026', revenue: 450000, expenses: 380000 },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{item.month}</span>
                      <span className="text-muted-foreground">
                        Net: ${((item.revenue - item.expenses) / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-green-600 mb-1">Revenue: ${(item.revenue / 1000).toFixed(0)}K</div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="h-2 rounded-full bg-green-500" style={{ width: '100%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-red-600 mb-1">Expenses: ${(item.expenses / 1000).toFixed(0)}K</div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="h-2 rounded-full bg-red-500" style={{ width: `${(item.expenses / item.revenue) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Average Team Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-4xl font-bold">{performance.avgTeamScore}</span>
                    <span className="text-2xl text-muted-foreground">/10</span>
                  </div>
                  <Progress value={performance.avgTeamScore * 10} className="h-2" />
                  <p className="text-xs text-muted-foreground">Across all departments</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-3xl font-bold">{performance.topPerformers.length}</div>
                  <p className="text-sm text-muted-foreground">Employees with 8.5+ rating</p>
                  <Button variant="outline" className="w-full" size="sm">
                    View All
                    <ArrowUpRight className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Need Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-3xl font-bold">{performance.improvementNeeded}</div>
                  <p className="text-sm text-muted-foreground">Employees below 7.0 rating</p>
                  <Button variant="outline" className="w-full" size="sm">
                    Review Plans
                    <ArrowUpRight className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers List */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Performers</CardTitle>
              <CardDescription>Highest rated employees this quarter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance.topPerformers.map((performer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        #{idx + 1}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={performer.avatar} />
                        <AvatarFallback>{performer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{performer.name}</p>
                        <p className="text-xs text-muted-foreground">Top Contributor</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-bold">{performer.score}</span>
                      </div>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-600/20">
                        Excellent
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Department Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Department Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {performance.departmentScores.map((dept, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{dept.dept}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{dept.score}/10</span>
                      <Badge variant={dept.score >= 8.5 ? 'default' : dept.score >= 7.5 ? 'secondary' : 'outline'}>
                        {dept.score >= 8.5 ? 'Excellent' : dept.score >= 7.5 ? 'Good' : 'Average'}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={dept.score * 10} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts & Activity Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Recent Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.alerts.map((alert) => (
                    <div key={alert.id} className="flex gap-3 p-3 border rounded-lg">
                      <div className={`p-2 rounded-lg h-fit ${
                        alert.type === 'error' ? 'bg-red-500/10 text-red-600' :
                        alert.type === 'warning' ? 'bg-orange-500/10 text-orange-600' :
                        alert.type === 'success' ? 'bg-green-500/10 text-green-600' :
                        'bg-blue-500/10 text-blue-600'
                      }`}>
                        {alert.type === 'error' ? <XCircle className="h-4 w-4" /> :
                         alert.type === 'warning' ? <AlertCircle className="h-4 w-4" /> :
                         alert.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                         <Bell className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">{alert.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.recentActivities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 p-3 border rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={activity.avatar} />
                        <AvatarFallback>{activity.user.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{activity.user}</span>{' '}
                          <span className="text-muted-foreground">{activity.action}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">18</h3>
                    </div>
                  </div>
                  <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <CheckSquare className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Documents Expiring</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">12</h3>
                    </div>
                  </div>
                  <div className="p-4 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">New Hire Onboarding</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">3</h3>
                    </div>
                  </div>
                  <div className="p-4 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                    <UserCheck className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Exit Interviews</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">1</h3>
                    </div>
                  </div>
                  <div className="p-4 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                    <UserX className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
