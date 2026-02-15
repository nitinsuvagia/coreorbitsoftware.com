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
import { api } from '@/lib/api/client';
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

interface DepartmentSalary {
  name: string;
  annualSalary: number;
  monthlySalary: number;
}

interface FinancialMetrics {
  totalPayroll: number;
  totalAnnualPayroll?: number;
  pendingPayments: number;
  monthlyExpenses: number;
  departmentSalaries?: DepartmentSalary[];
  budgetAlerts: number;
}

interface ActiveProject {
  id: string;
  name: string;
  status: 'on-track' | 'at-risk' | 'delayed';
  completion: number;
  teamSize: number;
  daysRemaining: number;
}

interface ProjectMetrics {
  onTrack: number;
  atRisk: number;
  delayed: number;
  resourceUtilization: number;
  avgCompletion: number;
  upcomingDeadlines: number;
  activeProjectsList?: ActiveProject[];
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
  topPerformers: { name: string; score: number; department: string }[];
  improvementNeeded: number;
  departmentScores: { dept: string; score: number }[];
}

interface DepartmentEmployeeCount {
  name: string;
  count: number;
}

interface DashboardData {
  organization: OrganizationStats;
  attendance: AttendanceMetrics;
  financial: FinancialMetrics;
  projects: ProjectMetrics;
  tasks: TaskMetrics;
  performance: PerformanceMetrics;
  employeesByDepartment: DepartmentEmployeeCount[];
  recentActivities: Activity[];
  alerts: Alert[];
  quickStats?: QuickStats;
  settings?: DashboardSettings;
}

interface DashboardSettings {
  currency: string;
}

interface QuickStats {
  pendingApprovals: number;
  documentsExpiring: number;
  newHireOnboarding: number;
  exitInterviews: number;
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
  maxValue?: number; // Optional: if provided, bars scale relative to this value
}

function ChartCard({ title, data, type, maxValue: propMaxValue }: ChartCardProps) {
  const maxValue = propMaxValue || Math.max(...data.map(d => d.value));

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
  const [error, setError] = useState<string | null>(null);

  // Currency formatter based on organization settings
  const formatCurrency = (amount: number, compact: boolean = false) => {
    const currency = data?.settings?.currency || 'INR';
    const currencySymbols: Record<string, string> = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
      AED: 'د.إ',
      SAR: '﷼',
      JPY: '¥',
      CNY: '¥',
      AUD: 'A$',
      CAD: 'C$',
    };
    const symbol = currencySymbols[currency] || currency + ' ';
    
    if (compact) {
      if (amount >= 10000000) { // 1 Crore for INR or 10M for others
        return `${symbol}${(amount / (currency === 'INR' ? 10000000 : 1000000)).toFixed(2)}${currency === 'INR' ? 'Cr' : 'M'}`;
      } else if (amount >= 100000) { // 1 Lakh for INR or 100K for others  
        return `${symbol}${(amount / (currency === 'INR' ? 100000 : 1000)).toFixed(currency === 'INR' ? 2 : 0)}${currency === 'INR' ? 'L' : 'K'}`;
      } else if (amount >= 1000) {
        return `${symbol}${(amount / 1000).toFixed(0)}K`;
      }
    }
    return `${symbol}${amount.toLocaleString()}`;
  };

  // Fetch real data from API
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/v1/organization/dashboard/admin-360');
      if (response.data.success) {
        setData(response.data.data);
      } else {
        console.error('[Admin-360] API returned error:', response.data.error);
        setError(response.data.error?.message || 'Failed to load dashboard data');
      }
    } catch (err: any) {
      console.error('[Admin-360] API call failed:', err.response?.data || err.message);
      setError(err.response?.data?.error?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const setMockDataFallback = () => {
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
        departmentSalaries: [
          { name: 'Engineering', annualSalary: 850000, monthlySalary: 70833 },
          { name: 'Sales', annualSalary: 620000, monthlySalary: 51667 },
          { name: 'Marketing', annualSalary: 380000, monthlySalary: 31667 },
          { name: 'Support', annualSalary: 290000, monthlySalary: 24167 },
          { name: 'HR', annualSalary: 180000, monthlySalary: 15000 },
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
          { name: 'Sarah Johnson', score: 9.5, department: 'Engineering' },
          { name: 'Michael Chen', score: 9.3, department: 'Sales' },
          { name: 'Emily Davis', score: 9.1, department: 'Marketing' },
          { name: 'David Miller', score: 8.9, department: 'Support' },
          { name: 'Jessica Lee', score: 8.7, department: 'HR' },
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

  // Show error state if no data
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-xl font-semibold">Failed to Load Dashboard</h2>
        <p className="text-muted-foreground">{error || 'Unable to fetch dashboard data'}</p>
        <Button onClick={loadDashboardData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  const org = data.organization;
  const attendance = data.attendance;
  const financial = data.financial;
  const projects = data.projects;
  const tasks = data.tasks;
  const performance = data.performance;

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
          value={formatCurrency(org.totalRevenue, true)}
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
          subtitle={`${formatCurrency(org.monthlyBudget, true)} monthly budget`}
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
              maxValue={org.totalEmployees || org.activeEmployees}
              data={(data.employeesByDepartment || []).slice(0, 7).map((dept, index) => {
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                return {
                  label: dept.name,
                  value: dept.count,
                  color: colors[index % colors.length],
                };
              })}
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
              title="Salaries by Department (Annual)"
              type="bar"
              data={(financial.departmentSalaries || []).map((dept, idx) => ({
                label: dept.name,
                value: dept.annualSalary / 1000,
                color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 5],
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
              {(projects.activeProjectsList && projects.activeProjectsList.length > 0) ? (
                <div className="space-y-3">
                  {projects.activeProjectsList.map((project, idx) => (
                    <div key={project.id || idx} className="border rounded-lg p-4 space-y-3">
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
                          <p className="font-medium">{project.teamSize} members</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Deadline</p>
                          <p className="font-medium">
                            {project.daysRemaining >= 0 
                              ? `${project.daysRemaining} days` 
                              : `${Math.abs(project.daysRemaining)} days overdue`}
                          </p>
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
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Folder className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h4 className="font-semibold text-lg">No Active Projects</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    Projects will appear here once created in the system.
                  </p>
                  <Button variant="outline" className="mt-4" size="sm">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Create Project
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Monthly Payroll"
              value={financial.totalPayroll > 0 
                ? formatCurrency(financial.totalPayroll, true)
                : formatCurrency(0)}
              icon={DollarSign}
              color="green"
              subtitle="Monthly salary costs"
            />
            <MetricCard
              title="Annual Payroll"
              value={financial.totalAnnualPayroll 
                ? formatCurrency(financial.totalAnnualPayroll, true)
                : formatCurrency(0)}
              icon={Briefcase}
              color="blue"
              subtitle="Yearly salary budget"
            />
            <MetricCard
              title="Pending Payments"
              value={financial.pendingPayments > 0 
                ? formatCurrency(financial.pendingPayments, true)
                : formatCurrency(0)}
              icon={Clock}
              color="orange"
              subtitle="Awaiting processing"
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
            {/* Salary by Department */}
            <Card>
              <CardHeader>
                <CardTitle>Payroll by Department</CardTitle>
                <CardDescription>Monthly salary distribution across departments</CardDescription>
              </CardHeader>
              <CardContent>
                {(financial.departmentSalaries && financial.departmentSalaries.length > 0) ? (
                  <div className="space-y-4">
                    {financial.departmentSalaries.slice(0, 6).map((dept, idx) => {
                      const maxSalary = Math.max(...(financial.departmentSalaries || []).map(d => d.monthlySalary));
                      const percent = maxSalary > 0 ? (dept.monthlySalary / maxSalary) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{dept.name}</span>
                            <span className="text-muted-foreground">
                              {formatCurrency(dept.monthlySalary, true)}/mo
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={percent} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-20 text-right">
                              {formatCurrency(dept.annualSalary, true)}/yr
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No salary data available</p>
                    <p className="text-xs text-muted-foreground mt-1">Add employee salaries to see payroll breakdown</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>Overview of payroll and workforce costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">Total Monthly Payroll</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(financial.totalPayroll, true)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium">Total Annual Payroll</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">
                      {formatCurrency(financial.totalAnnualPayroll || 0, true)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-sm font-medium">Departments with Payroll</span>
                    </div>
                    <span className="text-sm font-bold text-purple-600">
                      {financial.departmentSalaries?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span className="text-sm font-medium">Avg Salary per Employee</span>
                    </div>
                    <span className="text-sm font-bold text-orange-600">
                      ${org.activeEmployees > 0 
                        ? ((financial.totalAnnualPayroll || 0) / org.activeEmployees / 1000).toFixed(0) 
                        : 0}K/yr
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Card about missing data */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-muted p-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-semibold">Additional Financial Data</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Budget utilization, expense tracking, and revenue trends require additional setup. 
                    Currently showing payroll data based on employee salary records.
                  </p>
                </div>
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
              {performance.topPerformers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No performance reviews available yet</p>
                  <p className="text-xs mt-1">Performance data will appear after reviews are completed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {performance.topPerformers.map((performer, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          #{idx + 1}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{performer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{performer.name}</p>
                          <p className="text-xs text-muted-foreground">{performer.department}</p>
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
              )}
            </CardContent>
          </Card>

          {/* Department Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Department Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {performance.departmentScores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No department scores available</p>
                </div>
              ) : (
                performance.departmentScores.map((dept, idx) => (
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
                ))
              )}
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
                      <h3 className="text-3xl font-bold">{data?.quickStats?.pendingApprovals || 0}</h3>
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
                      <h3 className="text-3xl font-bold">{data?.quickStats?.documentsExpiring || 0}</h3>
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
                      <h3 className="text-3xl font-bold">{data?.quickStats?.newHireOnboarding || 0}</h3>
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
                      <h3 className="text-3xl font-bold">{data?.quickStats?.exitInterviews || 0}</h3>
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
