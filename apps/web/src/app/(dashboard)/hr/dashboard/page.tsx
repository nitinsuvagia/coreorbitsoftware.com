'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserPlus,
  UserMinus,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Calendar,
  Clock,
  Award,
  Target,
  BookOpen,
  AlertCircle,
  CheckCircle,
  DollarSign,
  FileText,
  UserCheck,
  UserX,
  Activity,
  Download,
  RefreshCw,
  ChevronRight,
  GraduationCap,
  Heart,
  ThumbsUp,
  Building2,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface HRDashboardData {
  overview: {
    totalEmployees: number;
    totalEmployeesTrend: number;
    activeEmployees: number;
    activeEmployeesTrend: number;
    newHiresThisMonth: number;
    newHiresTrend: number;
    avgTenure: number;
    avgTenureTrend: number;
  };
  recruitment: {
    openPositions: number;
    totalCandidates: number;
    interviewsScheduled: number;
    offersExtended: number;
    offerAcceptanceRate: number;
    avgTimeToHire: number;
    recruitmentPipeline: {
      applied: number;
      screening: number;
      interview: number;
      offer: number;
      hired: number;
    };
    urgentPositions: Array<{
      title: string;
      department: string;
      daysOpen: number;
      applicants: number;
    }>;
  };
  attendance: {
    presentToday: number;
    presentRate: number;
    onLeave: number;
    lateArrivals: number;
    earlyDepartures: number;
    workFromHome: number;
    avgWorkHours: number;
    leaveRequests: {
      pending: number;
      approved: number;
      rejected: number;
    };
    leaveBalance: {
      casual: number;
      sick: number;
      annual: number;
    };
  };
  performance: {
    avgPerformanceScore: number;
    reviewsCompleted: number;
    reviewsPending: number;
    reviewsDue: number;
    topPerformers: Array<{
      name: string;
      department: string;
      score: number;
      avatar?: string;
    }>;
    needsImprovement: Array<{
      name: string;
      department: string;
      score: number;
      areas: string[];
    }>;
    departmentScores: Array<{
      department: string;
      score: number;
      improvement: number;
    }>;
  };
  training: {
    totalPrograms: number;
    activePrograms: number;
    completedThisMonth: number;
    upcomingSessions: number;
    enrolledEmployees: number;
    completionRate: number;
    avgSatisfactionScore: number;
    programsByCategory: Array<{
      category: string;
      programs: number;
      enrolled: number;
    }>;
    upcomingTrainings: Array<{
      title: string;
      date: string;
      enrolled: number;
      capacity: number;
    }>;
  };
  onboarding: {
    newHiresThisMonth: number;
    onboardingInProgress: number;
    onboardingCompleted: number;
    avgCompletionTime: number;
    completionRate: number;
    pendingTasks: Array<{
      employee: string;
      joinDate: string;
      daysElapsed: number;
      tasksCompleted: number;
      totalTasks: number;
    }>;
  };
  exits: {
    resignationsThisMonth: number;
    terminationsThisMonth: number;
    totalExits: number;
    turnoverRate: number;
    avgNoticeperiod: number;
    exitInterviewsCompleted: number;
    exitInterviewsPending: number;
    topExitReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
    exitsByDepartment: Array<{
      department: string;
      exits: number;
      rate: number;
    }>;
  };
  compensation: {
    totalPayroll: number;
    avgSalary: number;
    salaryIncreasesBudget: number;
    salaryIncreasesUsed: number;
    pendingIncrements: number;
    bonusesPaid: number;
    benefitsEnrollment: number;
    topBenefits: Array<{
      benefit: string;
      enrolled: number;
      cost: number;
    }>;
  };
  diversity: {
    genderRatio: {
      male: number;
      female: number;
      other: number;
    };
    ageDistribution: Array<{
      range: string;
      count: number;
    }>;
    departmentDiversity: Array<{
      department: string;
      diversity_score: number;
    }>;
  };
  engagement: {
    satisfactionScore: number;
    engagementScore: number;
    eNPS: number;
    surveyResponseRate: number;
    recognitionsThisMonth: number;
    feedbackSubmitted: number;
    oneOnOnesMeetings: number;
    teamEvents: number;
  };
  alerts: Array<{
    type: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    timestamp: string;
  }>;
  recentActivity: Array<{
    action: string;
    employee: string;
    timestamp: string;
    type: 'hire' | 'exit' | 'promotion' | 'training' | 'leave' | 'performance';
  }>;
}

// Mock data generator
const generateMockData = (): HRDashboardData => ({
  overview: {
    totalEmployees: 247,
    totalEmployeesTrend: 8.3,
    activeEmployees: 235,
    activeEmployeesTrend: 6.2,
    newHiresThisMonth: 12,
    newHiresTrend: 15.5,
    avgTenure: 3.4,
    avgTenureTrend: -2.1,
  },
  recruitment: {
    openPositions: 18,
    totalCandidates: 142,
    interviewsScheduled: 24,
    offersExtended: 8,
    offerAcceptanceRate: 87.5,
    avgTimeToHire: 28,
    recruitmentPipeline: {
      applied: 142,
      screening: 68,
      interview: 34,
      offer: 12,
      hired: 8,
    },
    urgentPositions: [
      { title: 'Senior Full Stack Developer', department: 'Engineering', daysOpen: 45, applicants: 28 },
      { title: 'Product Manager', department: 'Product', daysOpen: 38, applicants: 19 },
      { title: 'DevOps Engineer', department: 'Engineering', daysOpen: 32, applicants: 22 },
      { title: 'UX Designer', department: 'Design', daysOpen: 28, applicants: 15 },
    ],
  },
  attendance: {
    presentToday: 218,
    presentRate: 92.8,
    onLeave: 14,
    lateArrivals: 6,
    earlyDepartures: 3,
    workFromHome: 31,
    avgWorkHours: 8.3,
    leaveRequests: {
      pending: 8,
      approved: 42,
      rejected: 3,
    },
    leaveBalance: {
      casual: 156,
      sick: 234,
      annual: 892,
    },
  },
  performance: {
    avgPerformanceScore: 8.2,
    reviewsCompleted: 198,
    reviewsPending: 35,
    reviewsDue: 14,
    topPerformers: [
      { name: 'Sarah Johnson', department: 'Engineering', score: 9.5 },
      { name: 'Michael Chen', department: 'Product', score: 9.3 },
      { name: 'Emily Davis', department: 'Design', score: 9.2 },
      { name: 'James Wilson', department: 'Engineering', score: 9.1 },
      { name: 'Lisa Anderson', department: 'Sales', score: 9.0 },
    ],
    needsImprovement: [
      { name: 'John Doe', department: 'Support', score: 6.2, areas: ['Communication', 'Time Management'] },
      { name: 'Jane Smith', department: 'Operations', score: 6.5, areas: ['Technical Skills', 'Leadership'] },
    ],
    departmentScores: [
      { department: 'Engineering', score: 8.7, improvement: 5.2 },
      { department: 'Product', score: 8.5, improvement: 3.8 },
      { department: 'Design', score: 8.4, improvement: 4.1 },
      { department: 'Sales', score: 8.1, improvement: 6.5 },
      { department: 'Marketing', score: 7.9, improvement: 2.3 },
      { department: 'Support', score: 7.6, improvement: -1.2 },
    ],
  },
  training: {
    totalPrograms: 45,
    activePrograms: 28,
    completedThisMonth: 156,
    upcomingSessions: 12,
    enrolledEmployees: 189,
    completionRate: 78.5,
    avgSatisfactionScore: 4.3,
    programsByCategory: [
      { category: 'Technical Skills', programs: 18, enrolled: 92 },
      { category: 'Leadership', programs: 12, enrolled: 45 },
      { category: 'Soft Skills', programs: 8, enrolled: 67 },
      { category: 'Compliance', programs: 7, enrolled: 235 },
    ],
    upcomingTrainings: [
      { title: 'Advanced React Patterns', date: '2026-01-20', enrolled: 24, capacity: 30 },
      { title: 'Leadership Fundamentals', date: '2026-01-22', enrolled: 18, capacity: 20 },
      { title: 'Agile Project Management', date: '2026-01-25', enrolled: 15, capacity: 25 },
      { title: 'Data Privacy & Security', date: '2026-01-27', enrolled: 98, capacity: 150 },
    ],
  },
  onboarding: {
    newHiresThisMonth: 12,
    onboardingInProgress: 8,
    onboardingCompleted: 4,
    avgCompletionTime: 14,
    completionRate: 85.3,
    pendingTasks: [
      { employee: 'Alex Thompson', joinDate: '2026-01-02', daysElapsed: 13, tasksCompleted: 18, totalTasks: 25 },
      { employee: 'Maria Garcia', joinDate: '2026-01-06', daysElapsed: 9, tasksCompleted: 12, totalTasks: 25 },
      { employee: 'David Kim', joinDate: '2026-01-10', daysElapsed: 5, tasksCompleted: 8, totalTasks: 25 },
    ],
  },
  exits: {
    resignationsThisMonth: 5,
    terminationsThisMonth: 1,
    totalExits: 6,
    turnoverRate: 2.4,
    avgNoticeperiod: 28,
    exitInterviewsCompleted: 4,
    exitInterviewsPending: 2,
    topExitReasons: [
      { reason: 'Better Opportunity', count: 15, percentage: 42.8 },
      { reason: 'Career Growth', count: 9, percentage: 25.7 },
      { reason: 'Relocation', count: 6, percentage: 17.1 },
      { reason: 'Work-Life Balance', count: 3, percentage: 8.6 },
      { reason: 'Compensation', count: 2, percentage: 5.8 },
    ],
    exitsByDepartment: [
      { department: 'Engineering', exits: 2, rate: 2.1 },
      { department: 'Sales', exits: 2, rate: 4.5 },
      { department: 'Support', exits: 1, rate: 3.8 },
      { department: 'Operations', exits: 1, rate: 2.9 },
    ],
  },
  compensation: {
    totalPayroll: 2450000,
    avgSalary: 85200,
    salaryIncreasesBudget: 245000,
    salaryIncreasesUsed: 156000,
    pendingIncrements: 18,
    bonusesPaid: 328000,
    benefitsEnrollment: 94.5,
    topBenefits: [
      { benefit: 'Health Insurance', enrolled: 235, cost: 45000 },
      { benefit: 'Retirement Plan', enrolled: 198, cost: 89000 },
      { benefit: 'Flexible Hours', enrolled: 214, cost: 0 },
      { benefit: 'Remote Work', enrolled: 156, cost: 0 },
    ],
  },
  diversity: {
    genderRatio: {
      male: 145,
      female: 98,
      other: 4,
    },
    ageDistribution: [
      { range: '18-25', count: 32 },
      { range: '26-35', count: 128 },
      { range: '36-45', count: 65 },
      { range: '46-55', count: 18 },
      { range: '56+', count: 4 },
    ],
    departmentDiversity: [
      { department: 'Engineering', diversity_score: 72 },
      { department: 'Product', diversity_score: 85 },
      { department: 'Design', diversity_score: 78 },
      { department: 'Sales', diversity_score: 68 },
      { department: 'Marketing', diversity_score: 82 },
    ],
  },
  engagement: {
    satisfactionScore: 8.4,
    engagementScore: 8.1,
    eNPS: 42,
    surveyResponseRate: 87.5,
    recognitionsThisMonth: 45,
    feedbackSubmitted: 128,
    oneOnOnesMeetings: 189,
    teamEvents: 8,
  },
  alerts: [
    {
      type: 'critical',
      title: 'Compliance Training Overdue',
      description: '12 employees have overdue mandatory compliance training',
      timestamp: '2 hours ago',
    },
    {
      type: 'warning',
      title: 'High Turnover in Sales',
      description: 'Sales department showing 4.5% turnover rate this quarter',
      timestamp: '5 hours ago',
    },
    {
      type: 'info',
      title: 'Performance Reviews Due',
      description: '14 performance reviews are due this week',
      timestamp: '1 day ago',
    },
    {
      type: 'warning',
      title: 'Open Position Alert',
      description: 'Senior Developer position open for 45 days',
      timestamp: '1 day ago',
    },
  ],
  recentActivity: [
    { action: 'New hire onboarded', employee: 'Alex Thompson', timestamp: '2 hours ago', type: 'hire' },
    { action: 'Exit interview completed', employee: 'Robert Johnson', timestamp: '4 hours ago', type: 'exit' },
    { action: 'Promoted to Senior Engineer', employee: 'Sarah Chen', timestamp: '1 day ago', type: 'promotion' },
    { action: 'Completed Leadership Training', employee: 'Michael Brown', timestamp: '1 day ago', type: 'training' },
    { action: 'Leave request approved', employee: 'Emily Davis', timestamp: '2 days ago', type: 'leave' },
    { action: 'Performance review submitted', employee: 'James Wilson', timestamp: '2 days ago', type: 'performance' },
  ],
});

export default function HRDashboardPage() {
  const [data, setData] = useState<HRDashboardData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    // Simulate API call
    setTimeout(() => {
      setData(generateMockData());
    }, 500);
  };

  const handleDownloadPDF = async () => {
    if (!pageRef.current) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(pageRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`HR-Dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!data) {
    return (
      <div className="space-y-6 pb-8">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-4xl" />
          
          {/* Overview Stats Skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-28 mb-2" />
                      <Skeleton className="h-8 w-24 mb-1" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="h-14 w-14 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts and Details Skeleton */}
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-48 w-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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

  const MetricCard = ({
    title,
    value,
    trend,
    icon: Icon,
    iconColor = 'primary',
    suffix = '',
    prefix = '',
    description,
  }: {
    title: string;
    value: number | string;
    trend?: number;
    icon: any;
    iconColor?: string;
    suffix?: string;
    prefix?: string;
    description?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-bold">
                {prefix}
                {value}
                {suffix}
              </h3>
              {trend !== undefined && (
                <span className={`flex items-center text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(trend)}%
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

  return (
    <div ref={pageRef} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HR Dashboard 360°</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive overview of all HR operations and metrics
          </p>
        </div>
        <div className="flex gap-2">
          {!isDownloading && (
            <>
              <Button variant="outline" size="sm" onClick={loadDashboardData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Employees"
          value={data.overview.totalEmployees}
          trend={data.overview.totalEmployeesTrend}
          icon={Users}
          iconColor="blue"
        />
        <MetricCard
          title="Active Employees"
          value={data.overview.activeEmployees}
          trend={data.overview.activeEmployeesTrend}
          icon={UserCheck}
          iconColor="green"
        />
        <MetricCard
          title="New Hires This Month"
          value={data.overview.newHiresThisMonth}
          trend={data.overview.newHiresTrend}
          icon={UserPlus}
          iconColor="purple"
        />
        <MetricCard
          title="Avg Tenure"
          value={data.overview.avgTenure}
          trend={data.overview.avgTenureTrend}
          icon={Calendar}
          iconColor="orange"
          suffix=" years"
        />
      </div>

      {/* Attendance Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Present Today</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">{data.attendance.presentToday}</h3>
                </div>
                <Progress value={data.attendance.presentRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {data.attendance.presentRate}% attendance rate
                </p>
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
                <p className="text-sm font-medium text-muted-foreground">On Leave</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">{data.attendance.onLeave}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending: {data.attendance.leaveRequests.pending}
                </p>
              </div>
              <div className="p-4 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <UserX className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Work From Home</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">{data.attendance.workFromHome}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((data.attendance.workFromHome / data.overview.activeEmployees) * 100).toFixed(1)}%
                  of active employees
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
                <p className="text-sm font-medium text-muted-foreground">Avg Work Hours</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">{data.attendance.avgWorkHours}h</h3>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  <span>Late: {data.attendance.lateArrivals}</span>
                  <span className="mx-1">•</span>
                  <span>Early: {data.attendance.earlyDepartures}</span>
                </div>
              </div>
              <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Detailed Views */}
      <Tabs defaultValue="recruitment" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9">
          <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="exits">Exits</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
          <TabsTrigger value="diversity">Diversity</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Recruitment Tab */}
        <TabsContent value="recruitment" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Open Positions"
              value={data.recruitment.openPositions}
              icon={Briefcase}
            />
            <MetricCard
              title="Total Candidates"
              value={data.recruitment.totalCandidates}
              icon={Users}
            />
            <MetricCard
              title="Interviews Scheduled"
              value={data.recruitment.interviewsScheduled}
              icon={Calendar}
            />
            <MetricCard
              title="Offers Extended"
              value={data.recruitment.offersExtended}
              icon={FileText}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recruitment Pipeline</CardTitle>
                <CardDescription>Candidate progression through hiring stages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(data.recruitment.recruitmentPipeline).map(([stage, count]) => (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize font-medium">{stage}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <Progress
                      value={(count / data.recruitment.totalCandidates) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recruitment Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Offer Acceptance Rate</p>
                    <p className="text-2xl font-bold">{data.recruitment.offerAcceptanceRate}%</p>
                  </div>
                  <Award className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Avg Time to Hire</p>
                    <p className="text-2xl font-bold">{data.recruitment.avgTimeToHire} days</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Urgent Open Positions</CardTitle>
              <CardDescription>Positions open for more than 3 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recruitment.urgentPositions.map((position, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{position.title}</p>
                      <p className="text-sm text-muted-foreground">{position.department}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="text-muted-foreground">Open for</p>
                        <p className="font-medium">{position.daysOpen} days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Applicants</p>
                        <p className="font-medium">{position.applicants}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        View <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Avg Performance Score"
              value={data.performance.avgPerformanceScore}
              icon={Target}
              suffix="/10"
            />
            <MetricCard
              title="Reviews Completed"
              value={data.performance.reviewsCompleted}
              icon={CheckCircle}
            />
            <MetricCard
              title="Reviews Pending"
              value={data.performance.reviewsPending}
              icon={Clock}
            />
            <MetricCard
              title="Reviews Due"
              value={data.performance.reviewsDue}
              icon={AlertCircle}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Highest scoring employees this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.performance.topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                        #{index + 1}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{performer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{performer.name}</p>
                        <p className="text-sm text-muted-foreground">{performer.department}</p>
                      </div>
                      <Badge variant="secondary" className="font-bold">
                        {performer.score}/10
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
                <CardDescription>Average scores by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.performance.departmentScores.map((dept, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{dept.department}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{dept.score}/10</span>
                          {dept.improvement >= 0 ? (
                            <Badge variant="secondary" className="text-green-600">
                              +{dept.improvement}%
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-red-600">
                              {dept.improvement}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Progress value={dept.score * 10} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {data.performance.needsImprovement.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Employees Needing Support</CardTitle>
                <CardDescription>Performance improvement plans recommended</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.performance.needsImprovement.map((employee, index) => (
                    <div key={index} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.department}</p>
                        </div>
                        <Badge variant="outline">{employee.score}/10</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {employee.areas.map((area, i) => (
                          <Badge key={i} variant="secondary">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Active Programs"
              value={data.training.activePrograms}
              icon={BookOpen}
            />
            <MetricCard
              title="Enrolled Employees"
              value={data.training.enrolledEmployees}
              icon={Users}
            />
            <MetricCard
              title="Completion Rate"
              value={data.training.completionRate}
              icon={Target}
              suffix="%"
            />
            <MetricCard
              title="Avg Satisfaction"
              value={data.training.avgSatisfactionScore}
              icon={ThumbsUp}
              suffix="/5"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Programs by Category</CardTitle>
                <CardDescription>Training distribution across categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.training.programsByCategory.map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{category.category}</span>
                        <span className="text-muted-foreground">
                          {category.programs} programs • {category.enrolled} enrolled
                        </span>
                      </div>
                      <Progress
                        value={(category.enrolled / data.training.enrolledEmployees) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Training Sessions</CardTitle>
                <CardDescription>Scheduled training in next 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.training.upcomingTrainings.map((training, index) => (
                    <div key={index} className="p-3 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="space-y-1">
                          <p className="font-medium">{training.title}</p>
                          <p className="text-xs text-muted-foreground">{training.date}</p>
                        </div>
                        <Badge variant="outline">
                          {training.enrolled}/{training.capacity}
                        </Badge>
                      </div>
                      <Progress
                        value={(training.enrolled / training.capacity) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="New Hires This Month"
              value={data.onboarding.newHiresThisMonth}
              icon={UserPlus}
            />
            <MetricCard
              title="Onboarding In Progress"
              value={data.onboarding.onboardingInProgress}
              icon={Activity}
            />
            <MetricCard
              title="Onboarding Completed"
              value={data.onboarding.onboardingCompleted}
              icon={CheckCircle}
            />
            <MetricCard
              title="Avg Completion Time"
              value={data.onboarding.avgCompletionTime}
              icon={Clock}
              suffix=" days"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Onboarding Progress</CardTitle>
              <CardDescription>Current onboarding tasks status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.onboarding.pendingTasks.map((task, index) => (
                  <div key={index} className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{task.employee}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {task.joinDate} • Day {task.daysElapsed}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {task.tasksCompleted}/{task.totalTasks} tasks
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {Math.round((task.tasksCompleted / task.totalTasks) * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={(task.tasksCompleted / task.totalTasks) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exits Tab */}
        <TabsContent value="exits" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Resignations This Month"
              value={data.exits.resignationsThisMonth}
              icon={UserMinus}
            />
            <MetricCard
              title="Turnover Rate"
              value={data.exits.turnoverRate}
              icon={TrendingDown}
              suffix="%"
            />
            <MetricCard
              title="Exit Interviews Completed"
              value={data.exits.exitInterviewsCompleted}
              icon={CheckCircle}
            />
            <MetricCard
              title="Exit Interviews Pending"
              value={data.exits.exitInterviewsPending}
              icon={Clock}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Exit Reasons</CardTitle>
                <CardDescription>Most common reasons for employee exits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.exits.topExitReasons.map((reason, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{reason.reason}</span>
                        <span className="text-muted-foreground">
                          {reason.count} ({reason.percentage}%)
                        </span>
                      </div>
                      <Progress value={reason.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exits by Department</CardTitle>
                <CardDescription>Turnover rate across departments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.exits.exitsByDepartment.map((dept, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{dept.department}</p>
                        <p className="text-sm text-muted-foreground">{dept.exits} employees</p>
                      </div>
                      <Badge
                        variant={dept.rate > 3 ? 'destructive' : 'secondary'}
                        className="font-bold"
                      >
                        {dept.rate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compensation Tab */}
        <TabsContent value="compensation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Monthly Payroll"
              value={(data.compensation.totalPayroll / 1000).toFixed(0)}
              icon={DollarSign}
              prefix="$"
              suffix="K"
            />
            <MetricCard
              title="Avg Salary"
              value={(data.compensation.avgSalary / 1000).toFixed(0)}
              icon={DollarSign}
              prefix="$"
              suffix="K"
            />
            <MetricCard
              title="Bonuses Paid"
              value={(data.compensation.bonusesPaid / 1000).toFixed(0)}
              icon={Award}
              prefix="$"
              suffix="K"
            />
            <MetricCard
              title="Benefits Enrollment"
              value={data.compensation.benefitsEnrollment}
              icon={Heart}
              suffix="%"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Salary Increase Budget</CardTitle>
                <CardDescription>Budget utilization for salary increments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Used</span>
                    <span className="font-medium">
                      ${(data.compensation.salaryIncreasesUsed / 1000).toFixed(0)}K / $
                      {(data.compensation.salaryIncreasesBudget / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <Progress
                    value={
                      (data.compensation.salaryIncreasesUsed /
                        data.compensation.salaryIncreasesBudget) *
                      100
                    }
                    className="h-2"
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm font-medium">Pending Increments</span>
                  <Badge variant="secondary">{data.compensation.pendingIncrements}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Benefits</CardTitle>
                <CardDescription>Most utilized employee benefits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.compensation.topBenefits.map((benefit, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{benefit.benefit}</p>
                        <p className="text-sm text-muted-foreground">
                          {benefit.enrolled} employees
                        </p>
                      </div>
                      {benefit.cost > 0 && (
                        <span className="text-sm font-medium">
                          ${(benefit.cost / 1000).toFixed(0)}K/mo
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Diversity Tab */}
        <TabsContent value="diversity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Employee gender ratio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Male</span>
                      <span className="font-medium">{data.diversity.genderRatio.male}</span>
                    </div>
                    <Progress
                      value={
                        (data.diversity.genderRatio.male / data.overview.totalEmployees) * 100
                      }
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Female</span>
                      <span className="font-medium">{data.diversity.genderRatio.female}</span>
                    </div>
                    <Progress
                      value={
                        (data.diversity.genderRatio.female / data.overview.totalEmployees) * 100
                      }
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Other</span>
                      <span className="font-medium">{data.diversity.genderRatio.other}</span>
                    </div>
                    <Progress
                      value={
                        (data.diversity.genderRatio.other / data.overview.totalEmployees) * 100
                      }
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
                <CardDescription>Employees by age group</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.diversity.ageDistribution.map((age, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{age.range}</span>
                      <Badge variant="secondary">{age.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Diversity Score</CardTitle>
                <CardDescription>Diversity index by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.diversity.departmentDiversity.map((dept, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{dept.department}</span>
                        <span className="font-medium">{dept.diversity_score}/100</span>
                      </div>
                      <Progress value={dept.diversity_score} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Satisfaction Score"
              value={data.engagement.satisfactionScore}
              icon={ThumbsUp}
              iconColor="green"
              suffix="/10"
            />
            <MetricCard
              title="Engagement Score"
              value={data.engagement.engagementScore}
              icon={Heart}
              iconColor="red"
              suffix="/10"
            />
            <MetricCard
              title="eNPS"
              value={data.engagement.eNPS}
              icon={Target}
              iconColor="blue"
            />
            <MetricCard
              title="Survey Response Rate"
              value={data.engagement.surveyResponseRate}
              icon={BarChart3}
              iconColor="purple"
              suffix="%"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Recognitions This Month</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">{data.engagement.recognitionsThisMonth}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Peer-to-peer recognition
                    </p>
                  </div>
                  <div className="p-4 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    <Award className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Feedback Submitted</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">{data.engagement.feedbackSubmitted}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Anonymous and direct feedback
                    </p>
                  </div>
                  <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">1-on-1 Meetings</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">{data.engagement.oneOnOnesMeetings}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Manager-employee meetings
                    </p>
                  </div>
                  <div className="p-4 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Team Events</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">{data.engagement.teamEvents}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Team building activities
                    </p>
                  </div>
                  <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Heart className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Critical Alerts & Warnings</CardTitle>
                <CardDescription>Items requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.alerts.map((alert, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-l-4 ${
                        alert.type === 'critical'
                          ? 'border-red-500 bg-red-50 dark:bg-red-950'
                          : alert.type === 'warning'
                          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
                          : 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <AlertCircle
                            className={`h-4 w-4 ${
                              alert.type === 'critical'
                                ? 'text-red-600'
                                : alert.type === 'warning'
                                ? 'text-yellow-600'
                                : 'text-blue-600'
                            }`}
                          />
                          <p className="font-medium">{alert.title}</p>
                        </div>
                        <Badge
                          variant={
                            alert.type === 'critical'
                              ? 'destructive'
                              : alert.type === 'warning'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {alert.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">{alert.description}</p>
                      <p className="text-xs text-muted-foreground ml-6 mt-1">{alert.timestamp}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent HR Activity</CardTitle>
                <CardDescription>Latest actions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          activity.type === 'hire'
                            ? 'bg-green-100 dark:bg-green-900'
                            : activity.type === 'exit'
                            ? 'bg-red-100 dark:bg-red-900'
                            : activity.type === 'promotion'
                            ? 'bg-purple-100 dark:bg-purple-900'
                            : activity.type === 'training'
                            ? 'bg-blue-100 dark:bg-blue-900'
                            : activity.type === 'leave'
                            ? 'bg-yellow-100 dark:bg-yellow-900'
                            : 'bg-gray-100 dark:bg-gray-900'
                        }`}
                      >
                        {activity.type === 'hire' && (
                          <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                        {activity.type === 'exit' && (
                          <UserMinus className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                        {activity.type === 'promotion' && (
                          <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        )}
                        {activity.type === 'training' && (
                          <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                        {activity.type === 'leave' && (
                          <Calendar className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        )}
                        {activity.type === 'performance' && (
                          <Target className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.employee}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
