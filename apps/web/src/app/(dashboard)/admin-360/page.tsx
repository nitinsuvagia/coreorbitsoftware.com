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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth/auth-context';
import { api } from '@/lib/api/client';
import { 
  Users, 
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
  Download,
  RefreshCw,
  ArrowUpRight,
  BarChart3,
  Home,
  Timer,
  Star,
  Bell,
  CheckSquare,
  XCircle,
  Loader2,
  Sparkles,
  Mail,
  Layers,
  Grid3X3,
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

interface PerformanceEmployee {
  id: string;
  name: string;
  score: number;
  department: string;
  avatar?: string | null;
  email?: string | null;
  reviewCount: number;
}

interface PerformanceMetrics {
  avgTeamScore: number;
  topPerformers: PerformanceEmployee[];
  improvementNeeded: number;
  needsImprovementList: PerformanceEmployee[];
  departmentScores: { dept: string; score: number }[];
}

interface DepartmentEmployeeCount {
  name: string;
  count: number;
}

interface SkillMatrixRow {
  category: string;
  beginner: number;
  intermediate: number;
  advanced: number;
  expert: number;
  total: number;
}

interface EmployeeSkillEntry {
  id: string;
  name: string;
  department: string;
  skills: { name: string; category: string; level: string; isPrimary: boolean }[];
}

interface DashboardData {
  organization: OrganizationStats;
  attendance: AttendanceMetrics;
  financial: FinancialMetrics;
  projects: ProjectMetrics;
  tasks: TaskMetrics;
  performance: PerformanceMetrics;
  skillMatrix?: SkillMatrixRow[];
  employeeSkillMatrix?: EmployeeSkillEntry[];
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
        {items.map((item, index) => {
          const percentage = item.max > 0 ? (item.value / item.max) * 100 : 0;
          const isZero = item.value === 0 || item.max === 0;
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground">
                  {item.value}/{item.max}
                </span>
              </div>
              <Progress 
                value={percentage} 
                className={isZero ? "h-2 bg-muted" : "h-2"}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface ChartCardProps {
  title: string;
  data: { label: string; value: number; color?: string }[];
  type: 'bar' | 'pie';
  maxValue?: number; // Optional: if provided, bars scale relative to this value
  formatValue?: (value: number) => string; // Optional: custom value formatter
  scrollHeight?: number; // Optional: enables internal scroll at this pixel height
}

function ChartCard({ title, data, type, maxValue: propMaxValue, formatValue, scrollHeight }: ChartCardProps) {
  const maxValue = propMaxValue || Math.max(...data.map(d => d.value), 1); // Ensure at least 1 to avoid division by zero

  const barContent = data.length === 0 ? (
    <div className="text-center py-8 text-muted-foreground">
      <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
      <p>No data available</p>
    </div>
  ) : type === 'bar' ? (
    <div className="space-y-4">
      {data.map((item, index) => {
        const isZero = item.value === 0;
        const displayValue = formatValue ? formatValue(item.value) : item.value;
        return (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate flex-1">{item.label}</span>
              <span className="text-muted-foreground ml-2">{displayValue}</span>
            </div>
            <div className={`w-full rounded-full h-2 ${isZero ? 'bg-gray-200 dark:bg-gray-700' : 'bg-muted'}`}>
              {!isZero && (
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color || 'hsl(var(--primary))',
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
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
  );

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {scrollHeight ? (
          <ScrollArea style={{ height: scrollHeight }} className="px-6 pb-4">
            {barContent}
          </ScrollArea>
        ) : (
          <div className="px-6 pb-4">{barContent}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SYNCED-SCROLL DEPARTMENT CHARTS
// ============================================================================
// Both "Salaries by Department" and "Department Performance Scores" show the
// same set of departments, so scrolling one card scrolls the other in sync.

interface SyncedDepartmentChartsProps {
  salaryTitle: string;
  salaryData: { label: string; value: number; color?: string }[];
  formatSalary: (value: number) => string;
  performanceData: { label: string; value: number; color?: string }[];
}

function SyncedDepartmentCharts({
  salaryTitle,
  salaryData,
  formatSalary,
  performanceData,
}: SyncedDepartmentChartsProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const handleScroll = (source: 'left' | 'right') => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    const from = source === 'left' ? leftRef.current : rightRef.current;
    const to = source === 'left' ? rightRef.current : leftRef.current;

    if (from && to) {
      // Sync by scroll ratio so it works even if content heights differ slightly
      const ratio = from.scrollTop / (from.scrollHeight - from.clientHeight || 1);
      to.scrollTop = ratio * (to.scrollHeight - to.clientHeight || 1);
    }

    // Use rAF to release the sync lock after the browser paints
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  };

  const renderBar = (
    data: { label: string; value: number; color?: string }[],
    formatter?: (v: number) => string,
  ) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No data available</p>
        </div>
      );
    }
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
      <div className="space-y-4">
        {data.map((item, index) => {
          const isZero = item.value === 0;
          const display = formatter ? formatter(item.value) : item.value;
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate flex-1">{item.label}</span>
                <span className="text-muted-foreground ml-2">{display}</span>
              </div>
              <div className={`w-full rounded-full h-2 ${isZero ? 'bg-gray-200 dark:bg-gray-700' : 'bg-muted'}`}>
                {!isZero && (
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(item.value / max) * 100}%`,
                      backgroundColor: item.color || 'hsl(var(--primary))',
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Salaries by Department */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">{salaryTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <div
            ref={leftRef}
            onScroll={() => handleScroll('left')}
            className="overflow-y-auto px-6 pb-4"
            style={{ height: 320 }}
          >
            {renderBar(salaryData, formatSalary)}
          </div>
        </CardContent>
      </Card>

      {/* Department Performance Scores */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">Department Performance Scores</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <div
            ref={rightRef}
            onScroll={() => handleScroll('right')}
            className="overflow-y-auto px-6 pb-4"
            style={{ height: 320 }}
          >
            {renderBar(performanceData)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Simple Stat Card for attendance and quick stats
interface SimpleStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'yellow';
}

const colorClasses = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
};

function SimpleStatCard({ title, value, subtitle, icon: Icon, color }: SimpleStatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold mt-2">{value}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-4 rounded-full ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Financial Summary Row component
interface FinancialSummaryRowProps {
  label: string;
  value: string | number;
  color: 'green' | 'blue' | 'purple' | 'orange';
}

function FinancialSummaryRow({ label, value, color }: FinancialSummaryRowProps) {
  const bgColors = {
    green: 'bg-green-50 dark:bg-green-950/20',
    blue: 'bg-blue-50 dark:bg-blue-950/20',
    purple: 'bg-purple-50 dark:bg-purple-950/20',
    orange: 'bg-orange-50 dark:bg-orange-950/20',
  };
  const dotColors = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };
  const textColors = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };
  return (
    <div className={`flex items-center justify-between p-3 ${bgColors[color]} rounded-lg`}>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${dotColors[color]}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={`text-sm font-bold ${textColors[color]}`}>{value}</span>
    </div>
  );
}

// Performer List Item component for modals
interface PerformerListItemProps {
  performer: PerformanceEmployee;
  index: number;
  variant: 'top' | 'needs-improvement';
}

function PerformerListItem({ performer, index, variant }: PerformerListItemProps) {
  const isTop = variant === 'top';
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        {isTop && (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-600 font-bold text-sm">
            #{index + 1}
          </div>
        )}
        <Avatar className="h-12 w-12">
          {performer.avatar && <AvatarImage src={performer.avatar} />}
          <AvatarFallback className={isTop ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-600"}>
            {performer.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <p className="font-semibold">{performer.name}</p>
          <p className="text-sm text-muted-foreground">{performer.department}</p>
          {performer.email && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {performer.email}
            </p>
          )}
        </div>
      </div>
      <div className="text-right space-y-1">
        <div className="flex items-center gap-1 justify-end">
          <Star className={`h-5 w-5 ${isTop ? 'fill-yellow-500 text-yellow-500' : 'text-orange-500'}`} />
          <span className={`text-xl font-bold ${isTop ? '' : 'text-orange-600'}`}>{performer.score}</span>
          <span className="text-muted-foreground">/10</span>
        </div>
        <p className="text-xs text-muted-foreground">{performer.reviewCount} reviews</p>
        <Badge variant="outline" className={isTop ? "bg-green-500/10 text-green-600 border-green-600/20" : "bg-orange-500/10 text-orange-600 border-orange-600/20"}>
          {isTop ? 'Excellent' : 'Needs Support'}
        </Badge>
      </div>
    </div>
  );
}

export default function TenantAdmin360Page() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state for performance tab
  const [showTopPerformersModal, setShowTopPerformersModal] = useState(false);
  const [showNeedsImprovementModal, setShowNeedsImprovementModal] = useState(false);

  // Currency formatter based on organization settings
  const currencyCode = data?.settings?.currency || 'INR';
  const formatCurrency = (amount: number, compact: boolean = false) => {
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
    const symbol = currencySymbols[currencyCode] || currencyCode + ' ';
    
    if (compact) {
      if (amount >= 10000000) { // 1 Crore for INR or 10M for others
        return `${symbol}${(amount / (currencyCode === 'INR' ? 10000000 : 1000000)).toFixed(2)}${currencyCode === 'INR' ? 'Cr' : 'M'}`;
      } else if (amount >= 100000) { // 1 Lakh for INR or 100K for others  
        return `${symbol}${(amount / (currencyCode === 'INR' ? 100000 : 1000)).toFixed(currencyCode === 'INR' ? 2 : 0)}${currencyCode === 'INR' ? 'L' : 'K'}`;
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
        setError(response.data.error?.message || 'Failed to load dashboard data');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
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
  const skillMatrix = data.skillMatrix || [];
  const employeeSkillMatrix = data.employeeSkillMatrix || [];

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
          title="Active Employees"
          value={org.activeEmployees}
          change={org.growthRate !== 0 ? org.growthRate : undefined}
          icon={Users}
          color="blue"
          subtitle={`${org.totalEmployees} total (incl. ex) • ${org.onLeave} on leave`}
        />
        <MetricCard
          title="Active Projects"
          value={org.activeProjects > 0 ? org.activeProjects : '—'}
          icon={Folder}
          color="purple"
          subtitle={org.activeProjects > 0 || org.completedProjects > 0 ? `${org.completedProjects} completed this year` : 'No project data yet'}
        />
        <MetricCard
          title="Total Revenue"
          value={org.totalRevenue > 0 ? formatCurrency(org.totalRevenue, true) : '—'}
          icon={DollarSign}
          color="green"
          subtitle={org.totalRevenue > 0 ? 'This fiscal year' : 'No revenue data yet'}
        />
        <MetricCard
          title="Budget Utilized"
          value={org.monthlyBudget > 0 ? `${org.budgetUtilized}%` : '—'}
          icon={Activity}
          color="orange"
          subtitle={org.monthlyBudget > 0 ? `${formatCurrency(org.monthlyBudget, true)} monthly budget` : 'No budget data yet'}
        />
      </div>

      {/* Attendance & Presence */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SimpleStatCard
          title="Today's Attendance"
          value={`${attendance.attendanceRate}%`}
          subtitle={`${attendance.todayPresent} present • ${attendance.todayAbsent} absent`}
          icon={UserCheck}
          color="green"
        />
        <SimpleStatCard
          title="Remote Workers"
          value={attendance.todayRemote}
          subtitle="Working from home today"
          icon={Home}
          color="blue"
        />
        <SimpleStatCard
          title="Late Arrivals"
          value={attendance.todayLate}
          subtitle={`On-time: ${attendance.onTimePercentage}%`}
          icon={Clock}
          color="orange"
        />
        <SimpleStatCard
          title="Avg Work Hours"
          value={attendance.avgWorkHours}
          subtitle="Hours per employee/day"
          icon={Timer}
          color="purple"
        />
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
              maxValue={org.activeEmployees}
              scrollHeight={320}
              data={(data.employeesByDepartment || []).map((dept, index) => {
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
                  <Progress value={projects.avgCompletion} className={projects.avgCompletion === 0 ? "h-2 bg-muted" : "h-2"} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue & Performance — synced scroll */}
          <SyncedDepartmentCharts
            salaryTitle={`Salaries by Department (Annual) - ${currencyCode}`}
            salaryData={(financial.departmentSalaries || []).map((dept, idx) => ({
              label: dept.name,
              value: dept.annualSalary,
              color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 5],
            }))}
            formatSalary={(value) => formatCurrency(value)}
            performanceData={performance.departmentScores.map((dept, idx) => ({
              label: dept.dept,
              value: dept.score,
              color: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'][idx],
            }))}
          />

          {/* Skill Matrix Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Skill Matrix */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-600" />
                  Skill Matrix
                </CardTitle>
                <CardDescription>Skills distribution by category and proficiency level</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-[380px] px-6 pb-4">
                  {skillMatrix.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                      <Layers className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm font-medium">No skills data available</p>
                      <p className="text-xs mt-1 text-center max-w-[200px]">Add skills to employees to populate this matrix</p>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-6 text-xs font-semibold text-muted-foreground py-2 border-b sticky top-0 bg-background z-10">
                        <span className="col-span-2">Category</span>
                        <span className="text-center text-blue-500">Beginner</span>
                        <span className="text-center text-green-500">Intermediate</span>
                        <span className="text-center text-orange-500">Advanced</span>
                        <span className="text-center text-purple-500">Expert</span>
                      </div>
                      {skillMatrix.map((row) => (
                        <div key={row.category} className="grid grid-cols-6 text-sm py-2.5 border-b last:border-0 hover:bg-muted/40 rounded-sm items-center">
                          <span className="col-span-2 font-medium capitalize truncate pr-2">{row.category}</span>
                          {[
                            { val: row.beginner, color: 'text-blue-600 bg-blue-500/10' },
                            { val: row.intermediate, color: 'text-green-600 bg-green-500/10' },
                            { val: row.advanced, color: 'text-orange-600 bg-orange-500/10' },
                            { val: row.expert, color: 'text-purple-600 bg-purple-500/10' },
                          ].map(({ val, color }, i) => (
                            <div key={i} className="text-center">
                              {val > 0 ? (
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${color}`}>
                                  {val}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Employee Skill Matrix */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5 text-blue-600" />
                  Employee Skill Matrix
                </CardTitle>
                <CardDescription>Skills and proficiency per employee</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-[380px] px-6 pb-4">
                  {employeeSkillMatrix.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                      <Grid3X3 className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm font-medium">No employee skills available</p>
                      <p className="text-xs mt-1 text-center max-w-[200px]">Assign skills to employees to populate this matrix</p>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      {employeeSkillMatrix.map((emp) => (
                        <div key={emp.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {emp.name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold leading-none truncate">{emp.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{emp.department}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs flex-shrink-0">{emp.skills.length} skill{emp.skills.length !== 1 ? 's' : ''}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {emp.skills.map((skill: { name: string; level: string; isPrimary: boolean }, i: number) => {
                              const levelColors: Record<string, string> = {
                                expert: 'bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-300 dark:border-purple-800',
                                advanced: 'bg-orange-500/10 text-orange-700 border-orange-200 dark:text-orange-300 dark:border-orange-800',
                                intermediate: 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-300 dark:border-green-800',
                                beginner: 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300 dark:border-blue-800',
                              };
                              return (
                                <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${levelColors[skill.level] || 'bg-muted text-muted-foreground border-border'}`}>
                                  {skill.isPrimary && <Star className="h-2.5 w-2.5 mr-1 fill-current" />}
                                  {skill.name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
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
                    <Badge variant={projects.resourceUtilization > 80 ? 'destructive' : projects.resourceUtilization === 0 ? 'secondary' : 'default'}>
                      {projects.resourceUtilization > 80 ? 'High' : projects.resourceUtilization === 0 ? 'No Data' : 'Optimal'}
                    </Badge>
                  </div>
                  <Progress value={projects.resourceUtilization} className={projects.resourceUtilization === 0 ? "h-2 bg-muted" : "h-2"} />
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
                    {projects.avgCompletion === 0 ? (
                      <span className="text-xs text-muted-foreground">No projects</span>
                    ) : (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <Progress value={projects.avgCompletion} className={projects.avgCompletion === 0 ? "h-2 bg-muted" : "h-2"} />
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
                      <Progress value={project.completion} className={project.completion === 0 ? "h-1.5 bg-muted" : "h-1.5"} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Folder className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h4 className="font-semibold text-lg">No active projects</h4>
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
                ? formatCurrency(financial.totalPayroll)
                : formatCurrency(0)}
              icon={DollarSign}
              color="green"
              subtitle="Monthly salary costs"
            />
            <MetricCard
              title="Annual Payroll"
              value={financial.totalAnnualPayroll 
                ? formatCurrency(financial.totalAnnualPayroll)
                : formatCurrency(0)}
              icon={Briefcase}
              color="blue"
              subtitle="Yearly salary budget"
            />
            <MetricCard
              title="Pending Payments"
              value={financial.pendingPayments > 0 
                ? formatCurrency(financial.pendingPayments)
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
              <CardContent className="p-0">
                {(financial.departmentSalaries && financial.departmentSalaries.length > 0) ? (
                  <ScrollArea className="h-[320px] px-6 pb-4">
                    <div className="space-y-4 pt-1">
                      {financial.departmentSalaries.map((dept, idx) => {
                        const maxSalary = Math.max(...(financial.departmentSalaries || []).map(d => d.monthlySalary));
                        const percent = maxSalary > 0 ? (dept.monthlySalary / maxSalary) * 100 : 0;
                        return (
                          <div key={idx} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{dept.name}</span>
                              <span className="text-muted-foreground">
                                {formatCurrency(dept.monthlySalary)}/mo
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={percent} className={percent === 0 ? "h-2 flex-1 bg-muted" : "h-2 flex-1"} />
                              <span className="text-xs text-muted-foreground w-24 text-right">
                                {formatCurrency(dept.annualSalary)}/yr
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
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
                  <FinancialSummaryRow
                    label="Total Monthly Payroll"
                    value={formatCurrency(financial.totalPayroll)}
                    color="green"
                  />
                  <FinancialSummaryRow
                    label="Total Annual Payroll"
                    value={formatCurrency(financial.totalAnnualPayroll || 0)}
                    color="blue"
                  />
                  <FinancialSummaryRow
                    label="Departments with Payroll"
                    value={financial.departmentSalaries?.filter(d => d.annualSalary > 0).length || 0}
                    color="purple"
                  />
                  <FinancialSummaryRow
                    label="Avg Salary per Employee"
                    value={`${org.activeEmployees > 0 
                      ? formatCurrency(Math.round((financial.totalAnnualPayroll || 0) / org.activeEmployees))
                      : formatCurrency(0)}/yr`}
                    color="orange"
                  />
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
                  <Progress value={performance.avgTeamScore * 10} className={performance.avgTeamScore === 0 ? "h-2 bg-muted" : "h-2"} />
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
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    size="sm"
                    onClick={() => setShowTopPerformersModal(true)}
                    disabled={performance.topPerformers.length === 0}
                  >
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
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    size="sm"
                    onClick={() => setShowNeedsImprovementModal(true)}
                    disabled={performance.improvementNeeded === 0}
                  >
                    Review Employees
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
                  <p>No top performers yet</p>
                  <p className="text-xs mt-1">Employees with 8.5+ average rating will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {performance.topPerformers.slice(0, 5).map((performer, idx) => (
                    <div key={performer.id || idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          #{idx + 1}
                        </div>
                        <Avatar className="h-10 w-10">
                          {performer.avatar && <AvatarImage src={performer.avatar} />}
                          <AvatarFallback>{performer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{performer.name}</p>
                          <p className="text-xs text-muted-foreground">{performer.department} • {performer.reviewCount} reviews</p>
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
                        <Badge variant={dept.score >= 8.5 ? 'default' : dept.score >= 7.5 ? 'secondary' : dept.score === 0 ? 'outline' : 'outline'}>
                          {dept.score >= 8.5 ? 'Excellent' : dept.score >= 7.5 ? 'Good' : dept.score === 0 ? 'No Data' : 'Average'}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={dept.score * 10} className={dept.score === 0 ? "h-2 bg-muted" : "h-2"} />
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
            <SimpleStatCard
              title="Pending Approvals"
              value={data?.quickStats?.pendingApprovals || 0}
              icon={CheckSquare}
              color="blue"
            />
            <SimpleStatCard
              title="Documents Expiring"
              value={data?.quickStats?.documentsExpiring || 0}
              icon={FileText}
              color="orange"
            />
            <SimpleStatCard
              title="New Hire Onboarding"
              value={data?.quickStats?.newHireOnboarding || 0}
              icon={UserCheck}
              color="green"
            />
            <SimpleStatCard
              title="Exit Interviews"
              value={data?.quickStats?.exitInterviews || 0}
              icon={UserX}
              color="red"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Top Performers Modal */}
      <Dialog open={showTopPerformersModal} onOpenChange={setShowTopPerformersModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              All Top Performers
            </DialogTitle>
            <DialogDescription>
              Employees with an average rating of 8.5 or higher
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {performance.topPerformers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No top performers found</p>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {performance.topPerformers.map((performer, idx) => (
                  <PerformerListItem
                    key={performer.id || idx}
                    performer={performer}
                    index={idx}
                    variant="top"
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Needs Improvement Modal */}
      <Dialog open={showNeedsImprovementModal} onOpenChange={setShowNeedsImprovementModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Employees Needing Improvement
            </DialogTitle>
            <DialogDescription>
              Employees with an average rating below 7.0 who may benefit from additional support, training, or performance improvement plans
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {(performance.needsImprovementList || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-600" />
                <p>No employees need improvement</p>
                <p className="text-sm mt-1">All employees are performing at or above 7.0</p>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {(performance.needsImprovementList || []).map((employee, idx) => (
                  <PerformerListItem
                    key={employee.id || idx}
                    performer={employee}
                    index={idx}
                    variant="needs-improvement"
                  />
                ))}
                <Separator className="my-4" />
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Recommended Actions
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Schedule one-on-one meetings to discuss performance concerns</li>
                    <li>• Create personalized Performance Improvement Plans (PIPs)</li>
                    <li>• Identify training or skill development opportunities</li>
                    <li>• Set clear, measurable goals with regular check-ins</li>
                    <li>• Provide mentorship or coaching support</li>
                  </ul>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
