'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { JobDescriptionForm } from '../jobs/_components/JobDescriptionForm';
import type { JobFormData } from '../jobs/_components/JobDescriptionForm';
import { ScheduleInterviewDialog } from '../interviews/_components/ScheduleInterviewDialog';
import { SelectEmployeeReviewDialog } from '@/components/hr/SelectEmployeeReviewDialog';
import { jobApi } from '@/lib/api/jobs';
import { interviewApi, type Interview } from '@/lib/api/interviews';
import { get } from '@/lib/api/client';
import { useMyAttendance, useCheckIn, useCheckOut } from '@/hooks/use-attendance';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDate, formatTime, formatDuration } from '@/lib/utils';
import {
  SessionHistoryDialog,
  getTotalWorkedSeconds,
  formatWorkedSeconds,
  formatElapsedHMS,
} from '@/components/attendance/session-history-dialog';
import {
  getHRAlerts,
  getProbationContractStatus,
  getLeaveRequestsSummary,
  getUpcomingEvents,
  getRecentActivities,
  getRecruitmentStats,
  getOnboardingStats,
  getExitsStats,
  getDiversityStats,
  getComplianceStats,
  getPerformanceStats,
  getCompensationStats,
  getEngagementStats,
  getSkillsStats,
  getAssetsStats,
  type HRAlert,
  type ProbationContractStatus,
  type LeaveRequestsSummary,
  type UpcomingEvents,
  type RecentActivity,
  type RecruitmentStats,
  type OnboardingStats,
  type ExitsStats,
  type DiversityStats,
  type ComplianceStats,
  type PerformanceStats,
  type CompensationStats,
  type EngagementStats,
  type SkillsStats,
  type AssetsStats,
} from '@/lib/api/hr-dashboard';
import { getInitials, getAvatarColor, cn } from '@/lib/utils';
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
  Cake,
  Gift,
  PartyPopper,
  CalendarDays,
  FileWarning,
  Shield,
  AlertTriangle,
  Laptop,
  Monitor,
  Smartphone,
  Headphones,
  Car,
  Key,
  MessageSquareWarning,
  ClipboardCheck,
  ClipboardList,
  UserCog,
  FileCheck,
  FileClock,
  Zap,
  ArrowRight,
  Star,
  MapPin,
  Mail,
  Phone,
  Plus,
  Eye,
  Edit,
  Settings,
  Bell,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Timer,
  Hourglass,
  CircleDot,
  BadgeCheck,
  Layers,
  Code,
  Palette,
  Megaphone,
  LineChart,
  Wrench,
  Package,
  Globe,
  Scale,
  LogIn,
  LogOut,
  History,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const iconColorClasses: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
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
  compact = false,
  loading = false,
}: {
  title: string;
  value: number | string;
  trend?: number;
  icon: any;
  iconColor?: string;
  suffix?: string;
  prefix?: string;
  description?: string;
  compact?: boolean;
  loading?: boolean;
}) => (
  <Card className={compact ? 'shadow-sm' : ''}>
    <CardContent className={compact ? 'p-4' : 'p-6'}>
      {loading ? (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            {description && <Skeleton className="h-3 w-24" />}
          </div>
          <Skeleton className={`rounded-full ${compact ? 'h-10 w-10' : 'h-14 w-14'}`} />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={`font-medium text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className={`font-bold ${compact ? 'text-2xl' : 'text-3xl'}`}>
                {prefix}
                {value}
                {suffix}
              </h3>
              {trend !== undefined && (
                <span className={`flex items-center text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className={`rounded-full ${iconColorClasses[iconColor]} ${compact ? 'p-2.5' : 'p-4'}`}>
            <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

const MiniStatCard = ({
  title,
  value,
  icon: Icon,
  iconColor = 'primary',
  suffix = '',
}: {
  title: string;
  value: number | string;
  icon: any;
  iconColor?: string;
  suffix?: string;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
    <div className={`rounded-full p-2 ${iconColorClasses[iconColor]}`}>
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold">{value}{suffix}</p>
    </div>
  </div>
);

const QuickActionButton = ({
  label,
  icon: Icon,
  url,
  count,
  color,
  onClick,
}: {
  label: string;
  icon: any;
  url?: string;
  count?: number;
  color: string;
  onClick?: () => void;
}) => {
  if (onClick) {
    return (
      <Button
        variant="outline"
        className="h-auto flex flex-col items-center gap-2 p-4 relative hover:border-primary"
        onClick={onClick}
      >
        <div className={`rounded-full p-2.5 ${color} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium">{label}</span>
        {count !== undefined && count > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 text-xs">
            {count}
          </Badge>
        )}
      </Button>
    );
  }
  
  return (
    <Button
      variant="outline"
      className="h-auto flex flex-col items-center gap-2 p-4 relative hover:border-primary"
      asChild
    >
      <a href={url}>
        <div className={`rounded-full p-2.5 ${color} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium">{label}</span>
        {count !== undefined && count > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 text-xs">
            {count}
          </Badge>
        )}
      </a>
    </Button>
  );
};

const getIcon = (iconName: string) => {
  const icons: Record<string, any> = {
    Code, Palette, Megaphone, Users, DollarSign, Settings, Package, TrendingUp,
    UserPlus, Briefcase, Calendar, CalendarDays, Bell, Laptop, Monitor, Smartphone,
    Headphones, Key, Heart, Target, Clock, Building2, Activity, Shield, Scale,
  };
  return icons[iconName] || Users;
};

// Celebrations types
interface Birthday {
  id: string;
  name: string;
  avatar?: string | null;
  department: string;
}

interface Anniversary {
  id: string;
  name: string;
  avatar?: string | null;
  years: number;
  department: string;
}

interface CelebrationsData {
  birthdaysToday: Birthday[];
  anniversariesToday: Anniversary[];
}

// Attendance overview type
interface AttendanceOverview {
  totalEmployees: number;
  present: number;
  absent: number;
  onLeave: number;
  late: number;
  workFromHome: number;
  presentRate: number;
}

// HR Dashboard Stats from API
interface HRDashboardStats {
  overview: {
    totalEmployees: number;
    totalEmployeesTrend: number;
    activeEmployees: number;
    activeEmployeesTrend?: number;
    newHiresThisMonth: number;
    newHiresTrend: number;
    onProbation: number;
    contractExpiring: number;
    remoteWorkers: number;
    departmentCount: number;
  };
  recruitment: {
    openPositions: number;
    totalCandidates: number;
  };
  onboarding: {
    onboardingInProgress: number;
  };
  exits: {
    exitedThisMonth: number;
    turnoverRate: number;
    retentionRate: number;
  };
  lifecycle: {
    candidates: number;
    offerAccepted: number;
    onboarding: number;
    active: number;
    offboarding: number;
    alumni: number;
  };
}

// Department overview from API
interface DepartmentOverviewItem {
  id: string;
  name: string;
  code: string;
  icon: string;
  headcount: number;
  openPositions: number;
  onLeaveToday: number;
  activeProjects: number;
  avgPerformance: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HRDashboardPage() {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const pageRef = useRef<HTMLDivElement>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  
  // Dialog states
  const [showJobForm, setShowJobForm] = useState(false);
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  
  // Real data states
  const [todaysInterviews, setTodaysInterviews] = useState<Interview[]>([]);
  const [interviewsLoading, setInterviewsLoading] = useState(true);
  const [celebrations, setCelebrations] = useState<CelebrationsData>({ birthdaysToday: [], anniversariesToday: [] });
  const [celebrationsLoading, setCelebrationsLoading] = useState(true);
  const [attendanceOverview, setAttendanceOverview] = useState<AttendanceOverview | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [hrStats, setHrStats] = useState<HRDashboardStats | null>(null);
  const [hrStatsLoading, setHrStatsLoading] = useState(true);
  const [departmentOverview, setDepartmentOverview] = useState<DepartmentOverviewItem[]>([]);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  
  // HR 360 Dashboard Real Data States
  const [hrAlerts, setHrAlerts] = useState<HRAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [probationStatus, setProbationStatus] = useState<ProbationContractStatus | null>(null);
  const [probationLoading, setProbationLoading] = useState(true);
  const [leaveRequestsSummary, setLeaveRequestsSummary] = useState<LeaveRequestsSummary | null>(null);
  const [leaveRequestsLoading, setLeaveRequestsLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvents | null>(null);
  const [upcomingEventsLoading, setUpcomingEventsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // HR 360 Tab-specific Real Data States
  const [recruitmentStats, setRecruitmentStats] = useState<RecruitmentStats | null>(null);
  const [recruitmentLoading, setRecruitmentLoading] = useState(true);
  const [onboardingStats, setOnboardingStats] = useState<OnboardingStats | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [exitsStats, setExitsStats] = useState<ExitsStats | null>(null);
  const [exitsLoading, setExitsLoading] = useState(true);
  const [diversityStats, setDiversityStats] = useState<DiversityStats | null>(null);
  const [diversityLoading, setDiversityLoading] = useState(true);
  const [complianceStats, setComplianceStats] = useState<ComplianceStats | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(true);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [compensationStats, setCompensationStats] = useState<CompensationStats | null>(null);
  const [compensationLoading, setCompensationLoading] = useState(true);
  const [engagementStats, setEngagementStats] = useState<EngagementStats | null>(null);
  const [engagementLoading, setEngagementLoading] = useState(true);
  const [skillsStats, setSkillsStats] = useState<SkillsStats | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [assetsStats, setAssetsStats] = useState<AssetsStats | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(true);

  // Check if user is tenant admin (not an employee)
  const { hasRole } = usePermissions();
  const isTenantAdmin = hasRole('tenant_admin');

  // Fetch today's attendance overview from API

  // Personal Check-In/Check-Out
  const today = new Date().toISOString().slice(0, 10);
  const { data: myAttendanceData } = useMyAttendance({
    startDate: today,
    endDate: today,
    limit: 10,
  });
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  // Prefer the open (no checkout) session; fall back to the latest
  const myTodayItems = myAttendanceData?.items || [];
  const myTodayRecord = myTodayItems.find((r: any) => r.checkIn && !r.checkOut) || myTodayItems[0] || null;
  const isCheckedIn = !!(myTodayRecord?.checkIn && !myTodayRecord?.checkOut);
  const isCheckedOut = !!(myTodayRecord?.checkIn && myTodayRecord?.checkOut);
  const hasAnySessions = myTodayItems.length > 0;

  // Total worked today (all sessions combined, live-updating)
  const [totalElapsed, setTotalElapsed] = useState(0);
  useEffect(() => {
    function tick() {
      setTotalElapsed(getTotalWorkedSeconds(myTodayItems));
    }
    tick();
    if (isCheckedIn) {
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }
  }, [myTodayItems, isCheckedIn]);

  async function handleCheckIn() {
    try {
      await checkInMutation.mutateAsync({});
      toast.success('Checked in successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.error || error.response?.data?.message || 'Failed to check in';
      toast.error(typeof msg === 'string' ? msg : 'Failed to check in');
    }
  }

  async function handleCheckOut() {
    try {
      await checkOutMutation.mutateAsync({});
      toast.success('Checked out successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.error || error.response?.data?.message || 'Failed to check out';
      toast.error(typeof msg === 'string' ? msg : 'Failed to check out');
    }
  }

  const loadAttendanceOverview = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const data = await get<AttendanceOverview>('/api/v1/attendance/overview/today');
      setAttendanceOverview(data);
    } catch (error) {
      console.error('Error fetching attendance overview:', error);
      setAttendanceOverview(null);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  // Fetch today's celebrations from API
  const loadCelebrations = useCallback(async () => {
    setCelebrationsLoading(true);
    try {
      const data = await get<CelebrationsData>('/api/v1/employees/celebrations/today');
      setCelebrations(data);
    } catch (error) {
      console.error('Error fetching celebrations:', error);
      setCelebrations({ birthdaysToday: [], anniversariesToday: [] });
    } finally {
      setCelebrationsLoading(false);
    }
  }, []);

  // Fetch HR dashboard stats from API
  const loadHRStats = useCallback(async () => {
    setHrStatsLoading(true);
    try {
      const data = await get<HRDashboardStats>('/api/v1/employees/hr-dashboard-stats');
      setHrStats(data);
    } catch (error) {
      console.error('Error fetching HR dashboard stats:', error);
      setHrStats(null);
    } finally {
      setHrStatsLoading(false);
    }
  }, []);

  // Fetch department overview from API
  const loadDepartmentOverview = useCallback(async () => {
    setDepartmentLoading(true);
    try {
      const data = await get<DepartmentOverviewItem[]>('/api/v1/employees/department-overview');
      setDepartmentOverview(data);
    } catch (error) {
      console.error('Error fetching department overview:', error);
      setDepartmentOverview([]);
    } finally {
      setDepartmentLoading(false);
    }
  }, []);

  // Fetch HR alerts and notifications from API
  const loadHRAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const alerts = await getHRAlerts();
      setHrAlerts(alerts);
    } catch (error) {
      console.error('Error fetching HR alerts:', error);
      setHrAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  // Fetch probation and contract status from API
  const loadProbationStatus = useCallback(async () => {
    setProbationLoading(true);
    try {
      const status = await getProbationContractStatus();
      setProbationStatus(status);
    } catch (error) {
      console.error('Error fetching probation status:', error);
      setProbationStatus(null);
    } finally {
      setProbationLoading(false);
    }
  }, []);

  // Fetch leave requests summary from API
  const loadLeaveRequestsSummary = useCallback(async () => {
    setLeaveRequestsLoading(true);
    try {
      const summary = await getLeaveRequestsSummary();
      setLeaveRequestsSummary(summary);
    } catch (error) {
      console.error('Error fetching leave requests summary:', error);
      setLeaveRequestsSummary(null);
    } finally {
      setLeaveRequestsLoading(false);
    }
  }, []);

  // Fetch upcoming events from API
  const loadUpcomingEvents = useCallback(async () => {
    setUpcomingEventsLoading(true);
    try {
      const events = await getUpcomingEvents();
      setUpcomingEvents(events);
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      setUpcomingEvents(null);
    } finally {
      setUpcomingEventsLoading(false);
    }
  }, []);

  // Fetch recent activities from API
  const loadRecentActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const activities = await getRecentActivities(20);
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setRecentActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  // Fetch recruitment stats from API
  const loadRecruitmentStats = useCallback(async () => {
    setRecruitmentLoading(true);
    try {
      const stats = await getRecruitmentStats();
      setRecruitmentStats(stats);
    } catch (error) {
      console.error('Error fetching recruitment stats:', error);
      setRecruitmentStats(null);
    } finally {
      setRecruitmentLoading(false);
    }
  }, []);

  // Fetch onboarding stats from API
  const loadOnboardingStats = useCallback(async () => {
    setOnboardingLoading(true);
    try {
      const stats = await getOnboardingStats();
      setOnboardingStats(stats);
    } catch (error) {
      console.error('Error fetching onboarding stats:', error);
      setOnboardingStats(null);
    } finally {
      setOnboardingLoading(false);
    }
  }, []);

  // Fetch exits stats from API
  const loadExitsStats = useCallback(async () => {
    setExitsLoading(true);
    try {
      const stats = await getExitsStats();
      setExitsStats(stats);
    } catch (error) {
      console.error('Error fetching exits stats:', error);
      setExitsStats(null);
    } finally {
      setExitsLoading(false);
    }
  }, []);

  // Fetch diversity stats from API
  const loadDiversityStats = useCallback(async () => {
    setDiversityLoading(true);
    try {
      const stats = await getDiversityStats();
      setDiversityStats(stats);
    } catch (error) {
      console.error('Error fetching diversity stats:', error);
      setDiversityStats(null);
    } finally {
      setDiversityLoading(false);
    }
  }, []);

  // Fetch compliance stats from API
  const loadComplianceStats = useCallback(async () => {
    setComplianceLoading(true);
    try {
      const stats = await getComplianceStats();
      setComplianceStats(stats);
    } catch (error) {
      console.error('Error fetching compliance stats:', error);
      setComplianceStats(null);
    } finally {
      setComplianceLoading(false);
    }
  }, []);

  // Fetch performance stats from API
  const loadPerformanceStats = useCallback(async () => {
    setPerformanceLoading(true);
    try {
      const stats = await getPerformanceStats();
      setPerformanceStats(stats);
    } catch (error) {
      console.error('Error fetching performance stats:', error);
      setPerformanceStats(null);
    } finally {
      setPerformanceLoading(false);
    }
  }, []);

  // Fetch compensation stats from API
  const loadCompensationStats = useCallback(async () => {
    setCompensationLoading(true);
    try {
      const stats = await getCompensationStats();
      setCompensationStats(stats);
    } catch (error) {
      console.error('Error fetching compensation stats:', error);
      setCompensationStats(null);
    } finally {
      setCompensationLoading(false);
    }
  }, []);

  // Fetch engagement stats from API
  const loadEngagementStats = useCallback(async () => {
    setEngagementLoading(true);
    try {
      const stats = await getEngagementStats();
      setEngagementStats(stats);
    } catch (error) {
      console.error('Error fetching engagement stats:', error);
      setEngagementStats(null);
    } finally {
      setEngagementLoading(false);
    }
  }, []);

  // Fetch skills stats from API
  const loadSkillsStats = useCallback(async () => {
    setSkillsLoading(true);
    try {
      const stats = await getSkillsStats();
      setSkillsStats(stats);
    } catch (error) {
      console.error('Error fetching skills stats:', error);
      setSkillsStats(null);
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  // Fetch assets stats from API
  const loadAssetsStats = useCallback(async () => {
    setAssetsLoading(true);
    try {
      const stats = await getAssetsStats();
      setAssetsStats(stats);
    } catch (error) {
      console.error('Error fetching assets stats:', error);
      setAssetsStats(null);
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  // Fetch today's interviews from API
  const loadTodaysInterviews = useCallback(async () => {
    setInterviewsLoading(true);
    try {
      const today = new Date();
      const interviews = await interviewApi.getInterviews({
        dateFrom: format(startOfDay(today), 'yyyy-MM-dd'),
        dateTo: format(endOfDay(today), 'yyyy-MM-dd'),
      });
      setTodaysInterviews(interviews);
    } catch (error) {
      console.error('Error fetching today\'s interviews:', error);
      setTodaysInterviews([]);
    } finally {
      setInterviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Set initial time on client mount to avoid hydration mismatch
    setLastUpdatedTime(new Date().toLocaleTimeString());
    // Load real data from APIs
    loadTodaysInterviews();
    loadCelebrations();
    loadAttendanceOverview();
    loadHRStats();
    loadDepartmentOverview();
    // Load HR 360 real data
    loadHRAlerts();
    loadProbationStatus();
    loadLeaveRequestsSummary();
    loadUpcomingEvents();
    loadRecentActivities();
    // Load tab-specific real data
    loadRecruitmentStats();
    loadOnboardingStats();
    loadExitsStats();
    loadDiversityStats();
    loadComplianceStats();
    loadPerformanceStats();
    loadCompensationStats();
    loadEngagementStats();
    loadSkillsStats();
    loadAssetsStats();
  }, [loadTodaysInterviews, loadCelebrations, loadAttendanceOverview, loadHRStats, loadDepartmentOverview, loadHRAlerts, loadProbationStatus, loadLeaveRequestsSummary, loadUpcomingEvents, loadRecentActivities, loadRecruitmentStats, loadOnboardingStats, loadExitsStats, loadDiversityStats, loadComplianceStats, loadPerformanceStats, loadCompensationStats, loadEngagementStats, loadSkillsStats, loadAssetsStats]);

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
      pdf.addImage(imgData, 'PNG', imgX, 0, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`HR-360-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle job form submission
  const handleJobSubmit = async (formData: JobFormData) => {
    try {
      await jobApi.createJob({
        title: formData.title,
        department: formData.department,
        location: formData.location,
        employmentType: formData.employmentType,
        salaryMin: formData.salaryMin,
        salaryMax: formData.salaryMax,
        currency: formData.currency,
        status: formData.status,
        closingDate: formData.closingDate,
        openings: formData.openings,
        experienceMin: formData.experienceMin,
        experienceMax: formData.experienceMax,
        description: formData.description,
        requirements: formData.requirements,
        responsibilities: formData.responsibilities,
        benefits: formData.benefits,
        techStack: formData.techStack,
      });
      toast.success('Job Created Successfully', {
        description: 'The new job opening has been created and is now active.',
      });
      setShowJobForm(false);
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error('Failed to create job');
    }
  };

  // Handle interview scheduling
  const handleInterviewScheduled = () => {
    setShowInterviewDialog(false);
    // Refresh today's interviews data
    loadTodaysInterviews();
  };

  return (
    <div ref={pageRef} className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">HR 360°</h1>
              <p className="text-muted-foreground">
                Comprehensive view of all HR operations{lastUpdatedTime ? ` • Last updated: ${lastUpdatedTime}` : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isDownloading && (
            <>
              <Button variant="outline" size="sm" onClick={() => {
                setLastUpdatedTime(new Date().toLocaleTimeString());
                loadTodaysInterviews();
                loadCelebrations();
                loadAttendanceOverview();
                loadHRStats();
                loadDepartmentOverview();
                loadHRAlerts();
                loadProbationStatus();
                loadLeaveRequestsSummary();
                loadUpcomingEvents();
                loadRecentActivities();
                loadRecruitmentStats();
                loadOnboardingStats();
                loadExitsStats();
                loadDiversityStats();
                loadComplianceStats();
                loadPerformanceStats();
                loadCompensationStats();
                loadEngagementStats();
                loadSkillsStats();
                loadAssetsStats();
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <QuickActionButton
              label="Add Employee"
              icon={UserPlus}
              color="bg-blue-500"
              onClick={() => router.push('/employees/new')}
            />
            <QuickActionButton
              label="Post Job"
              icon={Briefcase}
              color="bg-green-500"
              onClick={() => setShowJobForm(true)}
            />
            <QuickActionButton
              label="Approve Leaves"
              icon={Calendar}
              url="/hr/leave-management"
              count={leaveRequestsSummary?.leaveRequests?.pending || 0}
              color="bg-orange-500"
            />
            <QuickActionButton
              label="Schedule Interview"
              icon={CalendarDays}
              color="bg-purple-500"
              onClick={() => setShowInterviewDialog(true)}
            />
            <QuickActionButton
              label="Write Review"
              icon={ClipboardList}
              color="bg-indigo-500"
              onClick={() => setShowReviewDialog(true)}
            />
            <QuickActionButton
              label="Notifications"
              icon={Bell}
              url="/notifications"
              color="bg-pink-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Job Form Dialog */}
      <JobDescriptionForm
        open={showJobForm}
        onOpenChange={setShowJobForm}
        onSubmit={handleJobSubmit}
        mode="create"
      />

      {/* Schedule Interview Dialog */}
      <ScheduleInterviewDialog
        open={showInterviewDialog}
        onOpenChange={setShowInterviewDialog}
        onSuccess={handleInterviewScheduled}
      />

      {/* Write Performance Review Dialog */}
      <SelectEmployeeReviewDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
      />

      {/* Personal Check-In / Check-Out Card — hidden for tenant admin (not an employee) */}
      {!isTenantAdmin && (
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {formatDate(new Date())}
              </p>
              {!hasAnySessions && (
                <h3 className="text-2xl font-bold">You haven&apos;t checked in yet</h3>
              )}
              {isCheckedIn && myTodayRecord && (
                <>
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    Checked in at {formatTime(myTodayRecord.checkIn!)}
                  </h3>
                  <div className="flex items-center gap-2 text-lg font-mono tabular-nums text-primary">
                    <Timer className="h-4 w-4 animate-pulse" />
                    {formatElapsedHMS(totalElapsed)}
                    <span className="text-xs font-sans text-muted-foreground ml-1">total today</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Remember to check out before you leave
                  </p>
                </>
              )}
              {hasAnySessions && !isCheckedIn && (
                <>
                  <h3 className="text-2xl font-bold">
                    Worked for {formatWorkedSeconds(totalElapsed)}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {myTodayItems.length} session{myTodayItems.length !== 1 ? 's' : ''} today
                  </p>
                </>
              )}
              {hasAnySessions && (
                <SessionHistoryDialog>
                  <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                    <History className="h-3 w-3" />
                    View all sessions
                  </button>
                </SessionHistoryDialog>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                size="lg"
                onClick={handleCheckIn}
                disabled={isCheckedIn || checkInMutation.isPending}
              >
                <LogIn className="mr-2 h-5 w-5" />
                {checkInMutation.isPending ? 'Checking in...' : 'Check In'}
              </Button>
              <Button
                size="lg"
                variant={isCheckedIn ? 'default' : 'outline'}
                onClick={handleCheckOut}
                disabled={!isCheckedIn || checkOutMutation.isPending}
              >
                <LogOut className="mr-2 h-5 w-5" />
                {checkOutMutation.isPending ? 'Checking out...' : 'Check Out'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Today's Overview Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today's Stats */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendanceLoading ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-3 rounded-lg border">
                      <Skeleton className="h-3 w-12 mb-2" />
                      <Skeleton className="h-6 w-8" />
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ) : attendanceOverview ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStatCard title="Present" value={attendanceOverview.present} icon={UserCheck} iconColor="green" />
                  <MiniStatCard title="On Leave" value={attendanceOverview.onLeave} icon={Calendar} iconColor="orange" />
                  <MiniStatCard title="WFH" value={attendanceOverview.workFromHome} icon={Building2} iconColor="blue" />
                  <MiniStatCard title="Late" value={attendanceOverview.late} icon={Clock} iconColor="red" />
                </div>
                <div className="pt-2">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Attendance Rate</span>
                    <span className="font-medium">{attendanceOverview.presentRate}%</span>
                  </div>
                  <Progress value={attendanceOverview.presentRate} className="h-2" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <CalendarDays className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Unable to load attendance data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Interviews */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-purple-500" />
                Today's Interviews
              </CardTitle>
              <Badge variant="secondary">{todaysInterviews.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              {interviewsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg border">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-16 mb-1" />
                        <Skeleton className="h-5 w-14" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : todaysInterviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <CalendarDays className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No interviews scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaysInterviews.map((interview) => {
                    const candidateName = interview.candidate 
                      ? `${interview.candidate.firstName} ${interview.candidate.lastName}`
                      : 'Unknown Candidate';
                    const position = interview.job?.title || 'Unknown Position';
                    const time = format(new Date(interview.scheduledAt), 'hh:mm a');
                    const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
                      'SCHEDULED': 'secondary',
                      'CONFIRMED': 'secondary',
                      'IN_PROGRESS': 'default',
                      'COMPLETED': 'outline',
                      'CANCELLED': 'destructive',
                      'RESCHEDULED': 'secondary',
                      'NO_SHOW': 'destructive',
                    };
                    const statusLabel = interview.status === 'IN_PROGRESS' ? 'Live' : interview.status.toLowerCase().replace('_', ' ');
                    
                    return (
                      <div
                        key={interview.id}
                        className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/hr/interviews/${interview.id}`)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-purple-100 text-purple-600 text-xs">
                            {candidateName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{candidateName}</p>
                          <p className="text-xs text-muted-foreground truncate">{position}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{time}</p>
                          <Badge
                            variant={statusMap[interview.status] || 'secondary'}
                            className="text-xs capitalize"
                          >
                            {statusLabel}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Celebrations & Events */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-pink-500" />
              Celebrations Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              {celebrationsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg border">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {celebrations.birthdaysToday.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Cake className="h-3 w-3" /> Birthdays
                      </p>
                      {celebrations.birthdaysToday.map((person) => {
                        const nameParts = (person.name || '').split(' ');
                        const firstName = nameParts[0] || '';
                        const lastName = nameParts.slice(1).join(' ') || '';
                        const avatarColor = getAvatarColor(person.id);
                        return (
                          <div
                            key={person.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-pink-50 dark:bg-pink-950/30 cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-950/50 transition-colors"
                            onClick={() => router.push(`/employees/${person.id}`)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={person.avatar || undefined} alt={person.name} />
                              <AvatarFallback className={cn(avatarColor.className, "text-xs font-semibold")}>
                                {getInitials(firstName, lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{person.name}</p>
                              <p className="text-xs text-muted-foreground">{person.department}</p>
                            </div>
                            <Cake className="h-4 w-4 text-pink-500 ml-auto" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {celebrations.anniversariesToday.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Award className="h-3 w-3" /> Work Anniversaries
                      </p>
                      {celebrations.anniversariesToday.map((person) => {
                        const nameParts = (person.name || '').split(' ');
                        const firstName = nameParts[0] || '';
                        const lastName = nameParts.slice(1).join(' ') || '';
                        const avatarColor = getAvatarColor(person.id);
                        return (
                          <div
                            key={person.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                            onClick={() => router.push(`/employees/${person.id}`)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={person.avatar || undefined} alt={person.name} />
                              <AvatarFallback className={cn(avatarColor.className, "text-xs font-semibold")}>
                                {getInitials(firstName, lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{person.name}</p>
                              <p className="text-xs text-muted-foreground">{person.years} year{person.years > 1 ? 's' : ''}!</p>
                            </div>
                            <Award className="h-4 w-4 text-amber-500 ml-auto" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {celebrations.birthdaysToday.length === 0 && celebrations.anniversariesToday.length === 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <PartyPopper className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">No celebrations today</p>
                        <p className="text-xs text-muted-foreground/60">Birthdays &amp; anniversaries will appear here</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Employees"
          value={hrStats?.overview.activeEmployees ?? 0}
          trend={hrStats?.overview.activeEmployeesTrend}
          icon={Users}
          iconColor="blue"
          description={hrStats ? `${hrStats.overview.totalEmployees} total (incl. ex-employees)` : undefined}
          loading={hrStatsLoading}
        />
        <MetricCard
          title="Open Positions"
          value={hrStats?.recruitment.openPositions ?? 0}
          icon={Briefcase}
          iconColor="purple"
          description={hrStats ? `${hrStats.recruitment.totalCandidates} candidates` : undefined}
          loading={hrStatsLoading}
        />
        <MetricCard
          title="New Hires (MTD)"
          value={hrStats?.overview.newHiresThisMonth ?? 0}
          trend={hrStats?.overview.newHiresTrend}
          icon={UserPlus}
          iconColor="green"
          description={hrStats ? `${hrStats.onboarding.onboardingInProgress} onboarding` : undefined}
          loading={hrStatsLoading}
        />
        <MetricCard
          title="Turnover Rate"
          value={hrStats?.exits.turnoverRate ?? 0}
          suffix="%"
          icon={TrendingDown}
          iconColor="red"
          description={hrStats ? `${hrStats.exits.retentionRate}% retention` : undefined}
          loading={hrStatsLoading}
        />
      </div>

      {/* Employee Lifecycle Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-500" />
            Employee Lifecycle Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hrStatsLoading ? (
            <div className="flex items-center justify-between gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex-1 flex items-center">
                  <div className="flex-1 text-center">
                    <Skeleton className="mx-auto w-14 h-14 rounded-full mb-2" />
                    <Skeleton className="mx-auto w-8 h-5 mb-1" />
                    <Skeleton className="mx-auto w-16 h-3" />
                  </div>
                  {i < 6 && <Skeleton className="h-4 w-4 mx-0.5" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              {[
                { label: 'Candidates', value: hrStats?.lifecycle.candidates ?? 0, color: 'bg-blue-500', icon: Users },
                { label: 'Offer Accepted', value: hrStats?.lifecycle.offerAccepted ?? 0, color: 'bg-purple-500', icon: CheckCircle },
                { label: 'Onboarding', value: hrStats?.lifecycle.onboarding ?? 0, color: 'bg-green-500', icon: UserPlus },
                { label: 'Active', value: hrStats?.lifecycle.active ?? 0, color: 'bg-emerald-500', icon: UserCheck },
                { label: 'Offboarding', value: hrStats?.lifecycle.offboarding ?? 0, color: 'bg-orange-500', icon: UserMinus },
                { label: 'Alumni', value: hrStats?.lifecycle.alumni ?? 0, color: 'bg-gray-500', icon: Users },
              ].map((stage, index) => (
                <div key={stage.label} className="flex-1 flex items-center">
                  <div className="flex-1 text-center">
                    <div className={`mx-auto w-14 h-14 rounded-full ${stage.color} flex items-center justify-center text-white mb-2`}>
                      <stage.icon className="h-5 w-5" />
                    </div>
                    <p className="text-xl font-bold">{stage.value}</p>
                    <p className="text-xs text-muted-foreground">{stage.label}</p>
                  </div>
                  {index < 5 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-0.5 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts & Probation Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Critical Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Alerts & Notifications
              </CardTitle>
              <Badge variant={hrAlerts.some(a => a.type === 'critical') ? 'destructive' : 'secondary'}>
                {alertsLoading ? '...' : hrAlerts.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {alertsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-lg border-l-4 border-gray-200">
                      <Skeleton className="h-4 w-40 mb-2" />
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              ) : hrAlerts.length > 0 ? (
                <div className="space-y-3">
                  {hrAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        alert.type === 'critical'
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                          : alert.type === 'warning'
                          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30'
                          : alert.type === 'success'
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                          : 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
                        </div>
                        {alert.action && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                            <a href={alert.actionUrl}>{alert.action}</a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">No alerts or notifications</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Probation & Contract Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Hourglass className="h-4 w-4 text-orange-500" />
              Probation & Contract Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {probationLoading ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <MiniStatCard 
                    title="On Probation" 
                    value={probationStatus?.onProbation ?? 0} 
                    icon={Timer} 
                    iconColor="orange" 
                  />
                  <MiniStatCard 
                    title="Contract Expiring" 
                    value={probationStatus?.contractExpiring ?? 0} 
                    icon={FileClock} 
                    iconColor="red" 
                  />
                </div>
                <ScrollArea className="h-[120px]">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Probation Ending Soon</p>
                    {(probationStatus?.probationEnding ?? []).length > 0 ? (
                      (probationStatus?.probationEnding ?? []).map((emp) => (
                        <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg border">
                          <div>
                            <p className="text-sm font-medium">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.department}</p>
                          </div>
                          <Badge variant={emp.daysRemaining <= 7 ? 'destructive' : 'secondary'}>
                            {emp.daysRemaining} days
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-xs">No employees ending probation soon</p>
                      </div>
                    )}
                    
                    {(probationStatus?.contractsEnding ?? []).length > 0 && (
                      <>
                        <p className="text-xs font-medium text-muted-foreground mt-3">Contracts Expiring Soon</p>
                        {probationStatus?.contractsEnding.map((emp) => (
                          <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg border">
                            <div>
                              <p className="text-sm font-medium">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.department}</p>
                            </div>
                            <Badge variant={emp.daysRemaining <= 7 ? 'destructive' : 'secondary'}>
                              {emp.daysRemaining} days
                            </Badge>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-500" />
              Department Overview
            </CardTitle>
            <Badge variant="secondary">
              {departmentOverview.length} departments
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
          {departmentLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border">
                  <Skeleton className="h-10 w-10 rounded-xl mb-3" />
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : departmentOverview.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {departmentOverview.map((dept, index) => {
                const DeptIcon = getIcon(dept.icon);
                const iconColors = [
                  { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
                  { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
                  { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400' },
                  { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
                  { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
                  { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
                  { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
                  { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400' },
                  { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
                  { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
                ];
                const colorSet = iconColors[index % iconColors.length];
                return (
                  <Card 
                    key={dept.name} 
                    className="hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-muted-foreground truncate">{dept.name}</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-2xl font-bold">{dept.headcount}</p>
                            <span className="text-xs text-muted-foreground">employees</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {dept.onLeaveToday > 0 && (
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                {dept.onLeaveToday} on leave
                              </Badge>
                            )}
                            {dept.openPositions > 0 ? (
                              <div className="flex items-center gap-1 text-xs">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                <span className="text-green-600 dark:text-green-400 font-medium">{dept.openPositions} open</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CheckCircle className="h-3 w-3" />
                                <span>Fully staffed</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={`p-3 rounded-full ${colorSet.bg} ml-3 flex-shrink-0`}>
                          <DeptIcon className={`h-5 w-5 ${colorSet.text}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">No departments found</p>
              <p className="text-xs text-muted-foreground mt-1">Department data will appear here once available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="recruitment" className="text-xs">Recruitment</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
          <TabsTrigger value="onboarding" className="text-xs">Onboarding</TabsTrigger>
          <TabsTrigger value="exits" className="text-xs">Attrition</TabsTrigger>
          <TabsTrigger value="compensation" className="text-xs">Compensation</TabsTrigger>
          <TabsTrigger value="diversity" className="text-xs">Diversity</TabsTrigger>
          <TabsTrigger value="engagement" className="text-xs">Engagement</TabsTrigger>
          <TabsTrigger value="skills" className="text-xs">Skills</TabsTrigger>
          <TabsTrigger value="assets" className="text-xs">Assets</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Leave Requests */}
            <Card className="flex flex-col min-h-[420px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  Leave Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 flex-1">
                {leaveRequestsLoading ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                      ))}
                    </div>
                    <Skeleton className="h-px w-full my-3" />
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-8 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status Cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 rounded-lg border text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                        <p className="text-2xl font-bold">
                          {leaveRequestsSummary?.leaveRequests.pending ?? 0}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground">Pending</p>
                      </div>
                      <div className="p-3 rounded-lg border text-center">
                        <div className="flex items-center justify-center mb-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <p className="text-2xl font-bold">
                          {leaveRequestsSummary?.leaveRequests.approved ?? 0}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground">Approved</p>
                      </div>
                      <div className="p-3 rounded-lg border text-center">
                        <div className="flex items-center justify-center mb-1">
                          <XCircle className="h-4 w-4 text-red-500" />
                        </div>
                        <p className="text-2xl font-bold">
                          {leaveRequestsSummary?.leaveRequests.rejected ?? 0}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground">Rejected</p>
                      </div>
                    </div>

                    {/* Leave Balance Section */}
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground">Leave Balance (Company-wide)</p>
                      </div>
                      <ScrollArea className="h-[180px] pr-2">
                        {leaveRequestsSummary?.leaveBalance && Object.keys(leaveRequestsSummary.leaveBalance).length > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(leaveRequestsSummary.leaveBalance).map(([type, count]) => (
                              <div key={type} className="flex items-center gap-3 p-2 rounded-lg border">
                                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-xs font-medium">
                                  {String(type).charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</p>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {count} days
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Layers className="h-8 w-8 text-muted-foreground/30 mb-3" />
                            <p className="text-xs text-muted-foreground">No leave balance data</p>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="flex flex-col min-h-[420px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-pink-500" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 flex-1">
                <ScrollArea className="h-[330px] pr-3">
                  {upcomingEventsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((section) => (
                        <div key={section} className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          {[1, 2].map((item) => (
                            <Skeleton key={item} className="h-14 w-full rounded-xl" />
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Birthdays Section */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Cake className="h-3.5 w-3.5 text-pink-500" />
                          <p className="text-sm font-medium">Birthdays</p>
                          <Badge variant="secondary" className="ml-auto text-xs h-5">
                            {(upcomingEvents?.birthdays ?? []).length}
                          </Badge>
                        </div>
                        {(upcomingEvents?.birthdays ?? []).slice(0, 3).length > 0 ? (
                          <div className="space-y-2">
                            {(upcomingEvents?.birthdays ?? []).slice(0, 3).map((person) => (
                              <div key={person.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={(person as any).avatar || undefined} alt={person.name || ''} />
                                  <AvatarFallback className="text-xs bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400">
                                    {(person.name || '').split(' ').map(n => n[0] || '').join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{person.name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground truncate">{person.department}</p>
                                </div>
                                <Badge 
                                  variant={person.daysUntil === 0 ? 'default' : 'outline'} 
                                  className="text-xs shrink-0"
                                >
                                  {person.daysUntil === 0 ? '🎂 Today!' : person.daysUntil === 1 ? 'Tomorrow' : `${person.daysUntil} days`}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-2 rounded-lg border border-dashed">
                            <div className="h-8 w-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center shrink-0">
                              <Cake className="h-4 w-4 text-pink-400" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">No upcoming birthdays</p>
                              <p className="text-xs text-muted-foreground/60">None in the next 30 days</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Work Anniversaries Section */
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="h-3.5 w-3.5 text-amber-500" />
                          <p className="text-sm font-medium">Work Anniversaries</p>
                          <Badge variant="secondary" className="ml-auto text-xs h-5">
                            {(upcomingEvents?.workAnniversaries ?? []).length}
                          </Badge>
                        </div>
                        {(upcomingEvents?.workAnniversaries ?? []).slice(0, 3).length > 0 ? (
                          <div className="space-y-2">
                            {(upcomingEvents?.workAnniversaries ?? []).slice(0, 3).map((person) => (
                              <div key={person.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={(person as any).avatar || undefined} alt={person.name || ''} />
                                  <AvatarFallback className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                    {(person.name || '').split(' ').map(n => n[0] || '').join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{person.name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground truncate">{person.years} year{person.years > 1 ? 's' : ''} at company</p>
                                </div>
                                <Badge 
                                  variant={person.daysUntil === 0 ? 'default' : 'outline'} 
                                  className="text-xs shrink-0"
                                >
                                  {person.daysUntil === 0 ? '🎉 Today!' : person.daysUntil === 1 ? 'Tomorrow' : `${person.daysUntil} days`}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-2 rounded-lg border border-dashed">
                            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                              <Award className="h-4 w-4 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">No upcoming anniversaries</p>
                              <p className="text-xs text-muted-foreground/60">None in the next 30 days</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Holidays Section */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-3.5 w-3.5 text-blue-500" />
                          <p className="text-sm font-medium">Holidays</p>
                          <Badge variant="secondary" className="ml-auto text-xs h-5">
                            {(upcomingEvents?.holidays ?? []).length}
                          </Badge>
                        </div>
                        {(upcomingEvents?.holidays ?? []).length > 0 ? (
                          <div className="space-y-2">
                            {(upcomingEvents?.holidays ?? []).slice(0, 3).map((holiday, i) => (
                              <div key={i} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                                <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex flex-col items-center justify-center text-blue-700 dark:text-blue-400">
                                  <span className="text-[9px] font-medium leading-none">{new Date(holiday.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
                                  <span className="text-xs font-bold leading-none">{new Date(holiday.date).getDate()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{holiday.name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{holiday.type} holiday</p>
                                </div>
                                <Badge 
                                  variant={holiday.daysUntil === 0 ? 'default' : 'outline'} 
                                  className="text-xs shrink-0"
                                >
                                  {holiday.daysUntil === 0 ? 'Today' : holiday.daysUntil === 1 ? 'Tomorrow' : `${holiday.daysUntil} days`}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-2 rounded-lg border border-dashed">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                              <Calendar className="h-4 w-4 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">No upcoming holidays</p>
                              <p className="text-xs text-muted-foreground/60">None in the next 30 days</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="flex flex-col min-h-[420px]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-500" />
                    Recent Activity
                  </CardTitle>
                  <Badge variant="secondary">
                    {recentActivities.length} events
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-4 flex-1">
                <ScrollArea className="h-[330px] pr-3">
                  {activitiesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-start gap-3 p-2">
                          <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-40 mb-2" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentActivities.length > 0 ? (
                    <div className="space-y-2">
                      {recentActivities.map((activity) => {
                        const activityType = 'type' in activity ? activity.type : '';
                        const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
                          'hire': { icon: UserPlus, color: 'text-green-500', label: 'New Hire' },
                          'HIRE': { icon: UserPlus, color: 'text-green-500', label: 'New Hire' },
                          'exit': { icon: UserMinus, color: 'text-red-500', label: 'Exit' },
                          'EXIT': { icon: UserMinus, color: 'text-red-500', label: 'Exit' },
                          'promotion': { icon: TrendingUp, color: 'text-purple-500', label: 'Promotion' },
                          'PROMOTION': { icon: TrendingUp, color: 'text-purple-500', label: 'Promotion' },
                          'training': { icon: GraduationCap, color: 'text-blue-500', label: 'Training' },
                          'TRAINING': { icon: GraduationCap, color: 'text-blue-500', label: 'Training' },
                          'leave': { icon: Calendar, color: 'text-amber-500', label: 'Leave' },
                          'LEAVE': { icon: Calendar, color: 'text-amber-500', label: 'Leave' },
                          'performance': { icon: Target, color: 'text-cyan-500', label: 'Performance' },
                          'PERFORMANCE': { icon: Target, color: 'text-cyan-500', label: 'Performance' },
                          'document': { icon: FileText, color: 'text-slate-500', label: 'Document' },
                          'DOCUMENT': { icon: FileText, color: 'text-slate-500', label: 'Document' },
                          'grievance': { icon: MessageSquareWarning, color: 'text-orange-500', label: 'Grievance' },
                          'GRIEVANCE': { icon: MessageSquareWarning, color: 'text-orange-500', label: 'Grievance' },
                          'interview': { icon: CalendarDays, color: 'text-indigo-500', label: 'Interview' },
                          'INTERVIEW': { icon: CalendarDays, color: 'text-indigo-500', label: 'Interview' },
                        };
                        const config = typeConfig[activityType] || { icon: Activity, color: 'text-muted-foreground', label: 'Activity' };
                        const IconComponent = config.icon;
                        
                        return (
                          <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                            <div className="p-2 rounded-md bg-muted flex-shrink-0">
                              <IconComponent className={`h-4 w-4 ${config.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium leading-tight">{activity.action}</p>
                                <Badge variant="outline" className="text-[10px] shrink-0 h-5">
                                  {config.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span>{activity.employee}</span>
                                <span>•</span>
                                <span>{activity.timestamp}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Activity className="h-8 w-8 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                      <p className="text-xs text-muted-foreground mt-1">Activities will appear here as they happen</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recruitment Tab */}
        <TabsContent value="recruitment" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Open Positions" value={recruitmentStats?.openPositions ?? 0} icon={Briefcase} compact />
            <MetricCard title="Total Candidates" value={recruitmentStats?.totalCandidates ?? 0} icon={Users} compact />
            <MetricCard title="Interviews Scheduled" value={recruitmentStats?.interviewsScheduled ?? 0} icon={Calendar} compact />
            <MetricCard title="Offers Extended" value={recruitmentStats?.offersExtended ?? 0} icon={FileText} compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recruitment Pipeline</CardTitle>
                <CardDescription>Candidate progression through stages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(recruitmentStats?.recruitmentPipeline ?? { applied: 0, screening: 0, interview: 0, offer: 0, hired: 0 }).map(([stage, count]) => (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize font-medium">{stage}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <Progress value={(count / Math.max((recruitmentStats?.totalCandidates ?? 0), 1)) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recruitment Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Offer Acceptance Rate</p>
                    <p className="text-2xl font-bold">{recruitmentStats?.offerAcceptanceRate ?? 0}%</p>
                  </div>
                  <Award className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Avg Time to Hire</p>
                    <p className="text-2xl font-bold">{recruitmentStats?.avgTimeToHire ?? 0} days</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Urgent Open Positions</CardTitle>
              <CardDescription>Positions requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(recruitmentStats?.urgentPositions ?? []).map((position, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{position.title}</p>
                        <Badge variant={
                          position.priority === 'critical' ? 'destructive' :
                          position.priority === 'high' ? 'default' : 'secondary'
                        } className="text-xs">
                          {position.priority}
                        </Badge>
                      </div>
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
            <MetricCard title="Avg Performance Score" value={performanceStats?.avgScore ?? 0} suffix="/10" icon={Target} compact />
            <MetricCard title="Reviews Completed" value={performanceStats?.reviewsCompleted ?? 0} icon={CheckCircle} iconColor="green" compact />
            <MetricCard title="Reviews Pending" value={performanceStats?.reviewsPending ?? 0} icon={Clock} iconColor="orange" compact />
            <MetricCard title="Needs Improvement" value={performanceStats?.needsImprovement ?? 0} icon={AlertTriangle} iconColor="red" compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Performers</CardTitle>
                <CardDescription>Highest scoring employees this period</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceStats?.topPerformers && performanceStats.topPerformers.length > 0 ? (
                  <div className="space-y-4">
                    {performanceStats.topPerformers.map((performer, index) => (
                      <div key={performer.id} className="flex items-center gap-4">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                          #{index + 1}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{(performer.name || '').split(' ').map(n => n[0] || '').join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{performer.name}</p>
                          <p className="text-sm text-muted-foreground">{performer.department}</p>
                        </div>
                        <Badge variant="secondary" className="font-bold">{performer.score}/10</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Award className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No top performers data</p>
                    <p className="text-xs text-muted-foreground mt-1">Performance reviews will populate this list</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Department Performance</CardTitle>
                <CardDescription>Average scores by department</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceStats?.departmentScores && performanceStats.departmentScores.length > 0 ? (
                  <div className="space-y-4">
                    {performanceStats.departmentScores.map((dept) => (
                      <div key={dept.department} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{dept.department}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{dept.score}/10</span>
                          </div>
                        </div>
                        <Progress value={dept.score * 10} className="h-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No department scores</p>
                    <p className="text-xs text-muted-foreground mt-1">Performance data will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="New Hires (MTD)" value={onboardingStats?.newHiresThisMonth ?? 0} icon={UserPlus} compact />
            <MetricCard title="In Progress" value={onboardingStats?.onboardingInProgress ?? 0} icon={Activity} iconColor="blue" compact />
            <MetricCard title="Completed" value={onboardingStats?.onboardingCompleted ?? 0} icon={CheckCircle} iconColor="green" compact />
            <MetricCard title="Avg Completion" value={onboardingStats?.avgCompletionTime ?? 0} suffix=" days" icon={Clock} compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Onboarding Checklist Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'Documents Submitted', value: onboardingStats?.checklistSummary.documentsSubmitted ?? 0, total: onboardingStats?.checklistSummary.total ?? 0, icon: FileCheck },
                    { label: 'IT Setup Complete', value: onboardingStats?.checklistSummary.itSetupComplete ?? 0, total: onboardingStats?.checklistSummary.total ?? 0, icon: Laptop },
                    { label: 'Training Assigned', value: onboardingStats?.checklistSummary.trainingAssigned ?? 0, total: onboardingStats?.checklistSummary.total ?? 0, icon: BookOpen },
                    { label: 'Mentor Assigned', value: onboardingStats?.checklistSummary.mentorAssigned ?? 0, total: onboardingStats?.checklistSummary.total ?? 0, icon: Users },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                          <span>{item.label}</span>
                        </div>
                        <span className="font-medium">{item.value}/{item.total}</span>
                      </div>
                      <Progress value={item.total > 0 ? (item.value / item.total) * 100 : 0} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Onboarding Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {onboardingStats?.pendingTasks && onboardingStats.pendingTasks.length > 0 ? (
                  <div className="space-y-4">
                    {onboardingStats.pendingTasks.map((task) => (
                      <div key={task.id} className="p-3 rounded-lg border space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {(task.employee || '').split(' ').map(n => n[0] || '').join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{task.employee}</p>
                              <p className="text-xs text-muted-foreground">Day {task.daysElapsed}</p>
                            </div>
                          </div>
                          <Badge variant="outline">{task.tasksCompleted}/{task.totalTasks}</Badge>
                        </div>
                        <Progress value={(task.tasksCompleted / task.totalTasks) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserPlus className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No onboarding in progress</p>
                    <p className="text-xs text-muted-foreground mt-1">New hires will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Exits Tab */}
        <TabsContent value="exits" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Resignations (MTD)" value={exitsStats?.resignationsThisMonth ?? 0} icon={UserMinus} iconColor="red" compact />
            <MetricCard title="Turnover Rate" value={exitsStats?.turnoverRate ?? 0} suffix="%" icon={TrendingDown} iconColor="orange" compact />
            <MetricCard title="Retention Rate" value={exitsStats?.retentionRate ?? 0} suffix="%" icon={UserCheck} iconColor="green" compact />
            <MetricCard title="Exit Interviews Pending" value={exitsStats?.exitInterviewsPending ?? 0} icon={ClipboardCheck} compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Exit Reasons</CardTitle>
              </CardHeader>
              <CardContent>
                {exitsStats?.topExitReasons && exitsStats.topExitReasons.length > 0 ? (
                  <div className="space-y-4">
                    {exitsStats.topExitReasons.map((reason) => (
                      <div key={reason.reason} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{reason.reason}</span>
                          <span className="text-muted-foreground">{reason.count} ({reason.percentage}%)</span>
                        </div>
                        <Progress value={reason.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserMinus className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No exit data available</p>
                    <p className="text-xs text-muted-foreground mt-1">Exit interview data will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exits by Department</CardTitle>
              </CardHeader>
              <CardContent>
                {exitsStats?.exitsByDepartment && exitsStats.exitsByDepartment.length > 0 ? (
                  <div className="space-y-4">
                    {exitsStats.exitsByDepartment.map((dept) => (
                      <div key={dept.department} className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{dept.department}</p>
                          <p className="text-sm text-muted-foreground">{dept.exits} employees</p>
                        </div>
                        <Badge variant={dept.rate > 3 ? 'destructive' : 'secondary'} className="font-bold">
                          {dept.rate}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Building2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No department exits</p>
                    <p className="text-xs text-muted-foreground mt-1">Exit data by department will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compensation Tab */}
        <TabsContent value="compensation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Payroll" value={compensationStats ? `${(compensationStats.totalPayroll / 100000).toFixed(1)}L` : `${(0 / 1000000).toFixed(1)}M`} prefix={compensationStats?.currency ?? '$'} icon={DollarSign} compact />
            <MetricCard title="Avg Salary" value={compensationStats ? `${(compensationStats.avgSalary / 1000).toFixed(0)}K` : `${(0 / 1000).toFixed(0)}K`} prefix={compensationStats?.currency ?? '$'} icon={DollarSign} compact />
            <MetricCard title="Employees with Salary" value={compensationStats?.employeesWithSalary ?? 0} icon={Users} iconColor="green" compact />
            <MetricCard title="No Salary Data" value={compensationStats?.employeesWithoutSalary ?? 0} icon={AlertCircle} iconColor="orange" compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Salary Distribution</CardTitle>
                <CardDescription>Number of employees by salary band ({compensationStats?.currency ?? 'INR'})</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {compensationStats?.salaryBands.map((band) => {
                    const maxCount = Math.max(...(compensationStats?.salaryBands.map(b => b.count) ?? [1]));
                    return (
                      <div key={band.range} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{band.range}</span>
                          <span className="font-medium">{band.count} employees</span>
                        </div>
                        <Progress value={(band.count / maxCount) * 100} className="h-2" />
                      </div>
                    );
                  }) ?? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No salary data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compensation Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Total Monthly Payroll</span>
                    <span className="font-bold text-lg">{compensationStats?.currency ?? '₹'} {((compensationStats?.totalPayroll ?? 0) / 100000).toFixed(2)}L</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Average Salary</span>
                    <span className="font-bold text-lg">{compensationStats?.currency ?? '₹'} {((compensationStats?.avgSalary ?? 0) / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm font-medium">Data Coverage</span>
                    <Badge variant="secondary">
                      {compensationStats ? Math.round((compensationStats.employeesWithSalary / (compensationStats.employeesWithSalary + compensationStats.employeesWithoutSalary)) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department-wise Salary Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Department-wise Salary Distribution</CardTitle>
              <CardDescription>Total salary distribution across departments ({compensationStats?.currency ?? 'INR'})</CardDescription>
            </CardHeader>
            <CardContent>
              {compensationStats?.departmentSalaries && compensationStats.departmentSalaries.length > 0 ? (
                <div className="space-y-4">
                  {compensationStats.departmentSalaries.map((dept) => {
                    const maxSalary = Math.max(...(compensationStats?.departmentSalaries?.map(d => d.totalSalary) ?? [1]));
                    const percentage = (dept.totalSalary / (compensationStats?.totalPayroll || 1)) * 100;
                    return (
                      <div key={dept.departmentId} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{dept.department}</span>
                            <Badge variant="outline" className="text-xs">
                              {dept.employeeCount} {dept.employeeCount === 1 ? 'employee' : 'employees'}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <span className="font-bold">{compensationStats?.currency ?? '₹'} {(dept.totalSalary / 100000).toFixed(2)}L</span>
                            <span className="text-muted-foreground ml-2">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={(dept.totalSalary / maxSalary) * 100} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-20 text-right">
                            Avg: {compensationStats?.currency ?? '₹'}{(dept.avgSalary / 1000).toFixed(0)}K
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No department salary data available</p>
                  <p className="text-xs mt-1">Add salary information to employees to see distribution</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diversity Tab */}
        <TabsContent value="diversity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Male', value: diversityStats?.genderRatio.male ?? 0, color: 'bg-blue-500' },
                    { label: 'Female', value: diversityStats?.genderRatio.female ?? 0, color: 'bg-pink-500' },
                    { label: 'Other', value: diversityStats?.genderRatio.other ?? 0, color: 'bg-purple-500' },
                  ].map((item) => {
                    const totalEmps = (diversityStats?.genderRatio.male ?? 0) + (diversityStats?.genderRatio.female ?? 0) + (diversityStats?.genderRatio.other ?? 0) || 0;
                    return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${item.color}`} />
                          <span>{item.label}</span>
                        </div>
                        <span className="font-medium">{item.value} ({totalEmps > 0 ? ((item.value / totalEmps) * 100).toFixed(1) : 0}%)</span>
                      </div>
                      <Progress value={totalEmps > 0 ? (item.value / totalEmps) * 100 : 0} className="h-2" />
                    </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Age Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {diversityStats?.ageDistribution && diversityStats.ageDistribution.length > 0 ? (
                  <div className="space-y-3">
                    {diversityStats.ageDistribution.map((age) => (
                      <div key={age.range} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{age.range}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={age.percentage} className="w-20 h-2" />
                          <Badge variant="secondary">{age.count}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No age data available</p>
                    <p className="text-xs text-muted-foreground mt-1">Employee age distribution will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Location Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {diversityStats?.locationDistribution && diversityStats.locationDistribution.length > 0 ? (
                  <div className="space-y-3">
                    {diversityStats.locationDistribution.map((loc) => (
                      <div key={loc.location} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{loc.location}</span>
                        </div>
                        <Badge variant="secondary">{loc.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MapPin className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No location data</p>
                    <p className="text-xs text-muted-foreground mt-1">Employee location distribution will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Satisfaction Score" value={engagementStats?.satisfactionScore ?? 0} suffix="/10" icon={ThumbsUp} iconColor="green" compact />
            <MetricCard title="Engagement Score" value={engagementStats?.engagementScore ?? 0} suffix="/10" icon={Heart} iconColor="red" compact />
            <MetricCard title="eNPS" value={engagementStats?.eNPS ?? 0} icon={Target} iconColor="blue" compact />
            <MetricCard title="Recognitions" value={engagementStats?.recognitionsThisMonth ?? 0} icon={Award} iconColor="yellow" compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <MiniStatCard title="Recognitions" value={engagementStats?.recognitionsThisMonth ?? 0} icon={Award} iconColor="yellow" />
                  <MiniStatCard title="Feedback" value={engagementStats?.feedbackSubmitted ?? 0} icon={MessageSquareWarning} iconColor="blue" />
                  <MiniStatCard title="1-on-1s" value={engagementStats?.oneOnOnesMeetings ?? 0} icon={Users} iconColor="green" />
                  <MiniStatCard title="Team Events" value={engagementStats?.teamEvents ?? 0} icon={PartyPopper} iconColor="pink" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Recognitions</CardTitle>
              </CardHeader>
              <CardContent>
                {engagementStats?.recentRecognitions && engagementStats.recentRecognitions.length > 0 ? (
                  <div className="space-y-3">
                    {engagementStats.recentRecognitions.map((rec, i) => (
                      <div key={i} className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">{rec.from}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{rec.to}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.timestamp}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Award className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No recent recognitions</p>
                    <p className="text-xs text-muted-foreground mt-1">Employee recognitions will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Unique Skills" value={skillsStats?.totalUniqueSkills ?? 0} icon={Code} compact />
            <MetricCard title="Employees with Skills" value={skillsStats?.employeesWithSkills ?? 0} icon={Users} iconColor="green" compact />
            <MetricCard title="Avg Skills/Employee" value={skillsStats?.avgSkillsPerEmployee?.toFixed(1) ?? '0'} icon={Target} iconColor="blue" compact />
            <MetricCard title="Most Common Skills" value={skillsStats?.topSkills.length ?? 0} icon={BadgeCheck} iconColor="purple" compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Skills</CardTitle>
                <CardDescription>Most common skills in the organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(skillsStats?.topSkills ?? []).length > 0 ? (
                    (skillsStats?.topSkills ?? []).map((skill) => (
                      <Badge key={skill.skill} variant="outline" className="text-sm py-1.5 px-3">
                        {skill.skill}
                        <span className="ml-2 text-xs text-muted-foreground">{skill.count}</span>
                      </Badge>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground w-full">
                      <p>No skills data available</p>
                      <p className="text-xs mt-1">Add skills to employee profiles to see data here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skills Distribution Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Total Unique Skills</span>
                    <span className="font-bold text-lg">{skillsStats?.totalUniqueSkills ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Employees with Skills</span>
                    <span className="font-bold text-lg">{skillsStats?.employeesWithSkills ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm font-medium">Avg Skills per Employee</span>
                    <Badge variant="secondary">{skillsStats?.avgSkillsPerEmployee?.toFixed(1) ?? '0'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Assigned" value={assetsStats?.totalAssigned ?? 0} icon={Laptop} compact />
            <MetricCard title="Pending Returns" value={assetsStats?.pendingReturns ?? 0} icon={Package} iconColor="orange" compact />
            <MetricCard title="Pending Issues" value={assetsStats?.pendingIssues ?? 0} icon={AlertCircle} iconColor="yellow" compact />
            <MetricCard title="Categories" value={assetsStats?.assetsByCategory?.length ?? 0} icon={Layers} compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assets by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {(assetsStats?.assetsByCategory ?? []).length > 0 ? (
                  <div className="space-y-3">
                    {(assetsStats?.assetsByCategory ?? []).map((asset) => {
                      const AssetIcon = getIcon(asset.icon);
                      return (
                        <div key={asset.category} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              <AssetIcon className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{asset.category}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-600">{asset.assigned} assigned</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-blue-600">{asset.available} available</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Laptop className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No asset data available</p>
                    <p className="text-xs mt-1">Asset tracking module not yet implemented</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                {(assetsStats?.recentAssignments ?? []).length > 0 ? (
                  <div className="space-y-3">
                    {(assetsStats?.recentAssignments ?? []).map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium text-sm">{assignment.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{assignment.assetName}</p>
                        </div>
                        <Badge variant={
                          assignment.status === 'assigned' ? 'default' :
                          assignment.status === 'pending-return' ? 'secondary' : 'outline'
                        }>
                          {assignment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent assignments</p>
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
