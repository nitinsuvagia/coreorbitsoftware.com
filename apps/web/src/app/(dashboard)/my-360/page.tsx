'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { useMyEmployee } from '@/hooks/use-employees';
import { useOrgFormatters } from '@/hooks/use-org-settings';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhoneDisplay } from '@/components/ui/phone-input';
import { getInitials, getStatusColor } from '@/lib/utils';
import { getAvatarColor } from '@/lib/format';
import { useEmployeeBadges } from '@/hooks/use-badges';
import { useEmployeePerformanceSummary, useEmployeeReviews } from '@/hooks/use-performance-reviews';
import { useLeaveBalance, type LeaveBalance } from '@/hooks/use-attendance';
import { useEmployeeSkills } from '@/hooks/use-skills';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { getIconComponent } from '@/components/badges/AssignBadgeDialog';
import type { EmployeeBadge } from '@/lib/api/badges';
import type { PerformanceReview } from '@/lib/api/performance-reviews';
import {
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  MapPin,
  User,
  AlertCircle,
  Clock,
  Trophy,
  Star,
  TrendingUp,
  Target,
  CheckCircle2,
  XCircle,
  Award,
  Zap,
  GitBranch,
  BarChart3,
  CalendarDays,
  FileText,
  Sparkles,
  ClipboardList,
  GraduationCap,
  CreditCard,
} from 'lucide-react';

// ─── Helper Functions ────────────────────────────────────────────────────────

function calculateTenure(joinDate: string) {
  const start = new Date(joinDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = totalDays % 30;
  return { years, months, days, totalDays };
}

function fieldStr(val: any, fallback: string = '—'): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  return val.name || val.code || val.label || fallback;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  color = 'primary',
}: {
  icon: any;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'green' | 'blue' | 'orange' | 'purple' | 'red';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-500/10 text-green-600',
    blue: 'bg-blue-500/10 text-blue-600',
    orange: 'bg-orange-500/10 text-orange-600',
    purple: 'bg-purple-500/10 text-purple-600',
    red: 'bg-red-500/10 text-red-600',
  };
  return (
    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
      <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </div>
      {trend && (
        <TrendingUp className={`h-5 w-5 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500 rotate-180' : 'text-gray-400'}`} />
      )}
    </div>
  );
}

function PerformanceScore({
  label,
  score,
  maxScore = 10,
  description,
}: {
  label: string;
  score: number;
  maxScore?: number;
  description: string;
}) {
  const percentage = (score / maxScore) * 100;
  const getScoreColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 60) return 'bg-blue-500';
    if (pct >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-bold">{score}/{maxScore}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${getScoreColor(percentage)}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function TimelineItem({
  date,
  title,
  description,
  type,
  isLast = false,
}: {
  date: string;
  title: string;
  description: string;
  type: 'promotion' | 'project' | 'achievement' | 'join' | 'training' | 'badge' | 'review';
  isLast?: boolean;
}) {
  const typeConfig = {
    promotion: { icon: TrendingUp, color: 'bg-green-500' },
    project: { icon: Target, color: 'bg-blue-500' },
    achievement: { icon: Trophy, color: 'bg-yellow-500' },
    join: { icon: User, color: 'bg-purple-500' },
    training: { icon: GraduationCap, color: 'bg-orange-500' },
    badge: { icon: Award, color: 'bg-amber-500' },
    review: { icon: Star, color: 'bg-blue-500' },
  };
  const config = typeConfig[type];
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${config.color}`}>
          <config.icon className="h-5 w-5" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-border mt-2" />}
      </div>
      <div className="flex-1 pb-8">
        <p className="text-xs text-muted-foreground">{date}</p>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SkillBadge({ name, level }: { name: string; level: string }) {
  const levelConfig: Record<string, { color: string; stars: number }> = {
    beginner: { color: 'bg-gray-100 text-gray-700 border-gray-300', stars: 2 },
    intermediate: { color: 'bg-blue-50 text-blue-700 border-blue-300', stars: 3 },
    advanced: { color: 'bg-purple-50 text-purple-700 border-purple-300', stars: 4 },
    expert: { color: 'bg-amber-50 text-amber-700 border-amber-300', stars: 5 },
  };
  const config = levelConfig[level] || levelConfig.intermediate;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${config.color}`}>
      <span className="text-sm font-medium">{name}</span>
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`h-3 w-3 ${i < config.stars ? 'fill-current' : 'text-gray-300'}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Dominant Color Extraction ───────────────────────────────────────────────

interface DominantColors { primary: string; secondary: string; }

function useDominantColors(imageUrl: string | undefined, fallbackId: string): DominantColors {
  const [colors, setColors] = useState<DominantColors>({ primary: 'blue', secondary: 'cyan' });
  useEffect(() => {
    const avatarColor = getAvatarColor(fallbackId);
    const colorMatch = avatarColor.bg.match(/bg-(\w+)-/);
    const fallbackColor = colorMatch ? colorMatch[1] : 'blue';
    const colorOrder = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
    const idx = colorOrder.indexOf(fallbackColor);
    const secondaryFallback = colorOrder[(idx + 3) % colorOrder.length];
    if (!imageUrl) { setColors({ primary: fallbackColor, secondary: secondaryFallback }); return; }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const s = 50; canvas.width = s; canvas.height = s;
        ctx.drawImage(img, 0, 0, s, s);
        const data = ctx.getImageData(0, 0, s, s).data;
        const counts: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          const br = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (br < 30 || br > 240) continue;
          const c = getColorName(data[i], data[i + 1], data[i + 2]);
          if (c !== 'gray') counts[c] = (counts[c] || 0) + 1;
        }
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c]) => c);
        const p = sorted[0] || fallbackColor;
        let sec = sorted[1] || sorted[0] || secondaryFallback;
        if (sec === p) { const pi = colorOrder.indexOf(p); sec = colorOrder[(pi + 3) % colorOrder.length]; }
        setColors({ primary: p, secondary: sec });
      } catch { setColors({ primary: fallbackColor, secondary: secondaryFallback }); }
    };
    img.onerror = () => setColors({ primary: fallbackColor, secondary: secondaryFallback });
    img.src = imageUrl;
  }, [imageUrl, fallbackId]);
  return colors;
}

function getColorName(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), diff = max - min;
  if (diff < 20) return 'gray';
  let h = 0;
  if (max === r) h = ((g - b) / diff) % 6;
  else if (max === g) h = (b - r) / diff + 2;
  else h = (r - g) / diff + 4;
  h = Math.round(h * 60); if (h < 0) h += 360;
  if ((max === 0 ? 0 : (diff / max) * 100) < 20) return 'gray';
  if (h < 15) return 'red'; if (h < 35) return 'orange'; if (h < 50) return 'amber';
  if (h < 65) return 'yellow'; if (h < 85) return 'lime'; if (h < 140) return 'green';
  if (h < 165) return 'emerald'; if (h < 180) return 'teal'; if (h < 195) return 'cyan';
  if (h < 210) return 'sky'; if (h < 240) return 'blue'; if (h < 265) return 'indigo';
  if (h < 280) return 'violet'; if (h < 300) return 'purple'; if (h < 330) return 'fuchsia';
  if (h < 345) return 'pink'; return 'rose';
}

const COLOR_HEX: Record<string, { light: string; medium: string; dark: string }> = {
  red: { light: '#fca5a5', medium: '#f87171', dark: '#ef4444' },
  orange: { light: '#fdba74', medium: '#fb923c', dark: '#f97316' },
  amber: { light: '#fcd34d', medium: '#fbbf24', dark: '#f59e0b' },
  yellow: { light: '#fde047', medium: '#facc15', dark: '#eab308' },
  lime: { light: '#bef264', medium: '#a3e635', dark: '#84cc16' },
  green: { light: '#86efac', medium: '#4ade80', dark: '#22c55e' },
  emerald: { light: '#6ee7b7', medium: '#34d399', dark: '#10b981' },
  teal: { light: '#5eead4', medium: '#2dd4bf', dark: '#14b8a6' },
  cyan: { light: '#67e8f9', medium: '#22d3ee', dark: '#06b6d4' },
  sky: { light: '#7dd3fc', medium: '#38bdf8', dark: '#0ea5e9' },
  blue: { light: '#93c5fd', medium: '#60a5fa', dark: '#3b82f6' },
  indigo: { light: '#a5b4fc', medium: '#818cf8', dark: '#6366f1' },
  violet: { light: '#c4b5fd', medium: '#a78bfa', dark: '#8b5cf6' },
  purple: { light: '#d8b4fe', medium: '#c084fc', dark: '#a855f7' },
  fuchsia: { light: '#f0abfc', medium: '#e879f9', dark: '#d946ef' },
  pink: { light: '#f9a8d4', medium: '#f472b6', dark: '#ec4899' },
  rose: { light: '#fda4af', medium: '#fb7185', dark: '#f43f5e' },
  gray: { light: '#d1d5db', medium: '#9ca3af', dark: '#6b7280' },
};

function getGlassColors(dc: DominantColors) {
  const ph = COLOR_HEX[dc.primary] || COLOR_HEX.blue;
  const sh = COLOR_HEX[dc.secondary] || COLOR_HEX.cyan;
  const ringMap: Record<string, string> = {
    red: 'ring-red-400/50', orange: 'ring-orange-400/50', amber: 'ring-amber-400/50',
    yellow: 'ring-yellow-400/50', lime: 'ring-lime-400/50', green: 'ring-green-400/50',
    emerald: 'ring-emerald-400/50', teal: 'ring-teal-400/50', cyan: 'ring-cyan-400/50',
    sky: 'ring-sky-400/50', blue: 'ring-blue-400/50', indigo: 'ring-indigo-400/50',
    violet: 'ring-violet-400/50', purple: 'ring-purple-400/50', fuchsia: 'ring-fuchsia-400/50',
    pink: 'ring-pink-400/50', rose: 'ring-rose-400/50', gray: 'ring-gray-400/50',
  };
  return { primaryHex: ph, secondaryHex: sh, ringClass: ringMap[dc.primary] || 'ring-blue-400/50' };
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function My360Page() {
  const { user } = useAuth();
  const router = useRouter();
  const isTenantOwner = user?.roles?.includes('tenant_admin') ?? false;

  const { data: employee, isLoading, error } = useMyEmployee();
  const { formatDate } = useOrgFormatters();

  const employeeId = employee?.id;

  // Dependent queries — only run once we have employeeId
  const { data: employeeBadges = [] } = useEmployeeBadges(employeeId!);
  const { data: performanceSummary } = useEmployeePerformanceSummary(employeeId!);
  const { data: employeeReviews = [] } = useEmployeeReviews(employeeId!);
  const { data: leaveBalanceData } = useLeaveBalance(employeeId);
  const { data: employeeSkills = [] } = useEmployeeSkills(employeeId);

  const { data: employeeDocs = [] } = useQuery({
    queryKey: ['employee-documents', employeeId],
    queryFn: async () => {
      const resp = await apiClient.get(`/api/documents/entity/employee/${employeeId}/files`);
      return (resp.data as any[]) || [];
    },
    enabled: !!employeeId,
  });

  const dominantColors = useDominantColors(employee?.avatar, employee?.email || employee?.id || '');

  // Tenant owner is not an employee — redirect to dashboard
  useEffect(() => {
    if (isTenantOwner) router.replace('/dashboard');
  }, [isTenantOwner, router]);

  if (isTenantOwner) return null;

  // ─── Loading / Error ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-32" /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96 md:col-span-1" /><Skeleton className="h-96 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Profile Not Found</h2>
        <p className="text-muted-foreground mb-4">Your employee profile could not be loaded. Please contact HR.</p>
      </div>
    );
  }

  // ─── Derived Data ───────────────────────────────────────────────────────
  const tenure = calculateTenure(employee.joinDate);

  const performanceScores = performanceSummary?.scores || {
    communication: 0, technicalSkills: 0, teamwork: 0, problemSolving: 0, punctuality: 0, initiative: 0,
  };
  const overallRating = performanceSummary?.overallRating || 0;
  const performanceTrend = performanceSummary?.trend || 'neutral';
  const performancePercentile = performanceSummary?.percentile || 0;

  // Leave summary
  const leaveBalances: LeaveBalance[] = (leaveBalanceData as any)?.data || leaveBalanceData || [];
  const EXCLUDED_LEAVE_TYPES = ['maternity leave', 'paternity leave', 'leave without pay', 'lwp'];
  const regularLeaves = leaveBalances.filter((b: LeaveBalance) => {
    const name = (typeof b.leaveType === 'object' ? (b.leaveType as any)?.name : b.leaveType) || '';
    return !EXCLUDED_LEAVE_TYPES.includes(name.toLowerCase());
  });
  const leaveSummary = {
    total: regularLeaves.reduce((s: number, b: LeaveBalance) => s + Number(b.totalDays || b.total || 0), 0),
    used: regularLeaves.reduce((s: number, b: LeaveBalance) => s + Number(b.usedDays || b.used || 0), 0),
    pending: regularLeaves.reduce((s: number, b: LeaveBalance) => s + Number(b.pendingDays || 0), 0),
    available: regularLeaves.reduce((s: number, b: LeaveBalance) => s + Number(b.remainingDays || b.remaining || 0), 0),
  };

  // Career Journey
  const careerJourney = (() => {
    const events: { date: string; sortDate: Date; title: string; description: string; type: 'promotion' | 'project' | 'achievement' | 'join' | 'training' | 'badge' | 'review' }[] = [];
    if (employee.joinDate) {
      events.push({ date: formatDate(employee.joinDate), sortDate: new Date(employee.joinDate), title: 'Joined the Organization', description: `Started as ${employee.designation?.name || 'Team Member'}`, type: 'join' });
    }
    employeeBadges.forEach((badge: any) => {
      const givenAt = badge.given_at || badge.givenAt;
      if (givenAt) {
        events.push({ date: formatDate(givenAt), sortDate: new Date(givenAt), title: `Earned "${badge.name}" Badge`, description: badge.reason || badge.description || 'Recognition for excellence', type: 'badge' });
      }
    });
    employeeReviews.forEach((review: any) => {
      if (review.overallRating && review.overallRating >= 8) {
        const reviewDate = review.submittedAt || review.createdAt;
        if (reviewDate) {
          events.push({ date: formatDate(reviewDate), sortDate: new Date(reviewDate), title: `Outstanding ${review.reviewType?.charAt(0).toUpperCase() + review.reviewType?.slice(1) || ''} Review`, description: `Achieved ${review.overallRating}/10 rating for ${review.reviewPeriod}`, type: 'review' });
        }
      }
    });
    return events.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  })();

  const glassColors = getGlassColors(dominantColors);
  const { primaryHex, secondaryHex, ringClass } = glassColors;

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold tracking-tight">My 360° View</h2>
          <Badge variant="outline">
            <Sparkles className="h-3 w-3 mr-1" />
            360° Profile
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          {employee.employeeCode} &bull; {employee.designation?.name} &bull; {employee.department?.name}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        <MetricCard icon={Clock} label="Tenure" value={tenure.years > 0 ? `${tenure.years}y ${tenure.months}m` : `${tenure.months}m ${tenure.days}d`} subValue={`${tenure.totalDays} days total`} color="blue" />
        <MetricCard icon={CalendarDays} label="Leave Balance" value={`${leaveSummary.available} days`} subValue={`${leaveSummary.used} used, ${leaveSummary.pending} pending`} color="orange" />
        <MetricCard icon={Trophy} label="Badges Earned" value={employeeBadges.length} subValue={employeeBadges.length > 0 ? `${employeeBadges.reduce((sum: number, b: EmployeeBadge) => sum + b.points, 0)} pts` : 'None yet'} color="primary" />
        <MetricCard icon={Star} label="Overall Rating" value={overallRating > 0 ? `${overallRating}/10` : 'N/A'} subValue={performancePercentile > 0 ? `Top ${100 - performancePercentile}%` : `${performanceSummary?.totalReviews || 0} reviews`} trend={performanceTrend} color="green" />
        <MetricCard icon={Zap} label="Skills" value={employeeSkills.length} subValue={employeeSkills.length > 0 ? `${employeeSkills.filter((s: any) => s.level === 'expert' || s.level === 'advanced').length} expert/advanced` : 'Add skills'} color="purple" />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column — Profile & Quick Info */}
        <div className="space-y-6">
          {/* Profile Card with Glass Effect */}
          <Card className="relative overflow-hidden border-0 shadow-xl">
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom right, ${primaryHex.dark}40, ${secondaryHex.medium}30, ${primaryHex.light}35)` }} />
            <div className="absolute inset-0 backdrop-blur-3xl" />
            <div className="absolute inset-0 bg-white/40 dark:bg-gray-900/40" />
            <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full blur-3xl" style={{ backgroundColor: `${primaryHex.dark}50` }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl" style={{ backgroundColor: `${secondaryHex.dark}40` }} />
            <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full blur-3xl" style={{ backgroundColor: `${primaryHex.dark}45` }} />

            <CardContent className="relative z-10 pt-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-xl opacity-75" style={{ background: `linear-gradient(to bottom right, ${primaryHex.dark}60, ${secondaryHex.dark}50)` }} />
                  <Avatar className={`h-32 w-32 ring-4 ${ringClass} shadow-2xl relative z-10 border-4 border-white/80 dark:border-gray-800/80`}>
                    <AvatarImage src={employee.avatar} />
                    <AvatarFallback className="text-4xl font-semibold" style={{ background: `linear-gradient(to bottom right, ${primaryHex.light}60, ${secondaryHex.light}50)` }}>
                      {getInitials(`${employee.firstName} ${employee.lastName}`)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold">{employee.displayName}</h3>
                  <p className="text-muted-foreground font-medium">{employee.designation?.name}</p>
                  <p className="text-sm text-muted-foreground">{employee.department?.name}</p>
                </div>
              </div>

              <Separator className="my-6 bg-border/50" />

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{employee.email}</span>
                </div>
                {employee.phone && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <PhoneDisplay value={employee.phone} className="text-sm" />
                  </div>
                )}
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{[employee.department?.name, employee.designation?.name].filter(Boolean).join(' · ') || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Joined {formatDate(employee.joinDate)}</span>
                  </div>
                  <Badge className={`${getStatusColor(employee.status)}`}>{employee.status}</Badge>
                </div>
                {employee.reportingManager && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Reports to {employee.reportingManager.firstName} {employee.reportingManager.lastName}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Badges & Achievements (read-only) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5" />
                Badges & Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {employeeBadges.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No badges yet</p>
                </div>
              ) : (
                employeeBadges.map((badge: EmployeeBadge) => {
                  const Icon = getIconComponent(badge.icon);
                  return (
                    <div key={badge.assignment_id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${badge.color} shrink-0`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{badge.name}</h4>
                        <p className="text-xs text-muted-foreground">{badge.description}</p>
                        {badge.reason && <p className="text-xs text-muted-foreground/70 italic mt-0.5">"{badge.reason}"</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          By {badge.given_by_name} &bull; {new Date(badge.given_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Skills (read-only) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5" />
                Skills & Expertise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {employeeSkills.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground w-full">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No skills added yet.</p>
                  </div>
                ) : (
                  employeeSkills.map((skill: any) => (
                    <SkillBadge key={skill.id} name={skill.name} level={skill.level || 'intermediate'} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Performance Metrics</CardTitle>
              <CardDescription>Assessment scores across key performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <PerformanceScore label="Communication" score={performanceScores.communication} description="Clear and effective verbal/written communication" />
                <PerformanceScore label="Initiative" score={performanceScores.initiative} description="Taking initiative and anticipating needs" />
                <PerformanceScore label="Punctuality" score={performanceScores.punctuality} description="Attendance and meeting deadlines consistently" />
                <PerformanceScore label="Teamwork" score={performanceScores.teamwork} description="Collaboration and supporting team members" />
                <PerformanceScore label="Technical Skills" score={performanceScores.technicalSkills} description="Expertise in required technologies" />
                <PerformanceScore label="Problem Solving" score={performanceScores.problemSolving} description="Analytical thinking and finding solutions" />
              </div>
              {performanceSummary && performanceSummary.totalReviews > 0 && (
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Based on {performanceSummary.totalReviews} review{performanceSummary.totalReviews !== 1 ? 's' : ''}
                    {performanceSummary.latestReviewPeriod && ` • Latest: ${performanceSummary.latestReviewPeriod}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-lg font-bold">{overallRating}/10</span>
                    <span className="text-sm text-muted-foreground">overall</span>
                  </div>
                </div>
              )}
              {(!performanceSummary || performanceSummary.totalReviews === 0) && (
                <div className="mt-4 pt-4 border-t text-center text-muted-foreground">
                  <p className="text-sm">No performance reviews yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Career Journey */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" />Career Journey</CardTitle>
              <CardDescription>Professional milestones and achievements timeline</CardDescription>
            </CardHeader>
            <CardContent>
              {careerJourney.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GitBranch className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No milestones yet</p>
                  <p className="text-sm">Career events will appear here as badges are earned and reviews are completed</p>
                </div>
              ) : (
                <div className="ml-2">
                  {careerJourney.map((item, i) => (
                    <TimelineItem key={i} date={item.date} title={item.title} description={item.description} type={item.type} isLast={i === careerJourney.length - 1} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detail Tabs: Personal | Employment | Reviews | Leaves | Documents */}
          <Card>
            <Tabs defaultValue="personal" className="w-full">
              <CardHeader>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="employment">Employment</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="leaves">Leaves</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                {/* ── Personal Tab ───────────────────────────────────────── */}
                <TabsContent value="personal" className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Basic Information</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div><label className="text-xs text-muted-foreground">First Name</label><p className="text-sm font-medium">{employee.firstName}</p></div>
                      <div><label className="text-xs text-muted-foreground">Last Name</label><p className="text-sm font-medium">{employee.lastName}</p></div>
                      <div><label className="text-xs text-muted-foreground">Personal Email</label><p className="text-sm font-medium">{employee.personalEmail || '—'}</p></div>
                      <div><label className="text-xs text-muted-foreground">Mobile</label><p className="text-sm font-medium">{employee.mobile ? <PhoneDisplay value={employee.mobile} /> : '—'}</p></div>
                      <div><label className="text-xs text-muted-foreground">Date of Birth</label><p className="text-sm font-medium">{employee.dateOfBirth ? formatDate(employee.dateOfBirth) : '—'}</p></div>
                      <div><label className="text-xs text-muted-foreground">Gender</label><p className="text-sm font-medium">{employee.gender || '—'}</p></div>
                      <div><label className="text-xs text-muted-foreground">Marital Status</label><p className="text-sm font-medium">{employee.maritalStatus || '—'}</p></div>
                      <div><label className="text-xs text-muted-foreground">Nationality</label><p className="text-sm font-medium">{employee.nationality || '—'}</p></div>
                      <div><label className="text-xs text-muted-foreground">Blood Group</label><p className="text-sm font-medium">{employee.bloodGroup || '—'}</p></div>
                    </div>
                  </div>

                  <Separator />

                  {/* Address */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Address</h4>
                    {employee.addressLine1 || employee.city || employee.state || employee.country ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="col-span-2 md:col-span-3"><label className="text-xs text-muted-foreground">Address</label><p className="text-sm font-medium">{[employee.addressLine1, employee.addressLine2].filter(Boolean).join(', ') || '—'}</p></div>
                        <div><label className="text-xs text-muted-foreground">City</label><p className="text-sm font-medium">{employee.city || '—'}</p></div>
                        <div><label className="text-xs text-muted-foreground">State</label><p className="text-sm font-medium">{employee.state || '—'}</p></div>
                        <div><label className="text-xs text-muted-foreground">Country</label><p className="text-sm font-medium">{employee.country || '—'}</p></div>
                        <div><label className="text-xs text-muted-foreground">Postal Code</label><p className="text-sm font-medium">{employee.postalCode || '—'}</p></div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No address information added yet.</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Emergency Contacts */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Emergency Contacts</h4>
                    {(employee as any).emergencyContacts?.length > 0 ? (
                      <div className="space-y-3">
                        {(employee as any).emergencyContacts.map((contact: any, index: number) => (
                          <div key={contact.id || index} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-medium text-sm">Contact {index + 1}</h5>
                              {contact.isPrimary && <Badge variant="secondary" className="text-[10px]">Primary</Badge>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div><label className="text-xs text-muted-foreground">Name</label><p className="text-sm">{contact.name}</p></div>
                              <div><label className="text-xs text-muted-foreground">Relationship</label><p className="text-sm">{contact.relationship}</p></div>
                              <div><label className="text-xs text-muted-foreground">Phone</label><p className="text-sm"><PhoneDisplay value={contact.phone} /></p></div>
                              <div><label className="text-xs text-muted-foreground">Email</label><p className="text-sm">{contact.email || '—'}</p></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No emergency contacts added yet.</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Bank Details */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Bank Details</h4>
                    {(employee as any).bankDetails?.length > 0 ? (
                      <div className="space-y-3">
                        {(employee as any).bankDetails.map((bank: any, index: number) => (
                          <div key={bank.id || index} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-medium text-sm">Account {index + 1}</h5>
                              {bank.isPrimary && <Badge variant="secondary" className="text-[10px]">Primary</Badge>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div><label className="text-xs text-muted-foreground">Holder Name</label><p className="text-sm">{bank.accountHolderName || '—'}</p></div>
                              <div><label className="text-xs text-muted-foreground">Bank</label><p className="text-sm">{bank.bankName}</p></div>
                              <div><label className="text-xs text-muted-foreground">Branch</label><p className="text-sm">{bank.branchName || '—'}</p></div>
                              <div><label className="text-xs text-muted-foreground">Account No.</label><p className="text-sm">{bank.accountNumber}</p></div>
                              <div><label className="text-xs text-muted-foreground">Type</label><p className="text-sm">{bank.accountType || '—'}</p></div>
                              <div><label className="text-xs text-muted-foreground">IFSC</label><p className="text-sm">{bank.ifscCode || '—'}</p></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No bank details added yet.</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Education */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Education</h4>
                    {(employee as any).educations?.length > 0 ? (
                      <div className="space-y-3">
                        {(employee as any).educations.map((edu: any, index: number) => (
                          <div key={edu.id || index} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h5 className="font-medium text-sm">{edu.degree || edu.educationType}</h5>
                                <p className="text-xs text-muted-foreground">{edu.institutionName}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">{edu.enrollmentYear} – {edu.isOngoing ? 'Present' : edu.completionYear}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                              <div><label className="text-xs text-muted-foreground">Field</label><p className="text-sm">{edu.fieldOfStudy || '—'}</p></div>
                              <div><label className="text-xs text-muted-foreground">Specialization</label><p className="text-sm">{edu.specialization || '—'}</p></div>
                              <div><label className="text-xs text-muted-foreground">Grade</label><p className="text-sm">{edu.grade || edu.percentage ? `${edu.grade || edu.percentage}%` : '—'}</p></div>
                              <div><label className="text-xs text-muted-foreground">Board / University</label><p className="text-sm">{edu.boardUniversity || '—'}</p></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No education records added yet.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── Employment Tab ─────────────────────────────────────── */}
                <TabsContent value="employment" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div><label className="text-xs text-muted-foreground">Employee Code</label><p className="text-sm font-medium">{employee.employeeCode}</p></div>
                    <div><label className="text-xs text-muted-foreground">Department</label><p className="text-sm font-medium">{employee.department?.name || '—'}</p></div>
                    <div><label className="text-xs text-muted-foreground">Designation</label><p className="text-sm font-medium">{employee.designation?.name || '—'}</p></div>
                    <div><label className="text-xs text-muted-foreground">Reporting Manager</label><p className="text-sm font-medium">{employee.reportingManager ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}` : '—'}</p></div>
                    <div><label className="text-xs text-muted-foreground">Employment Type</label><p className="text-sm font-medium">{employee.employmentType || '—'}</p></div>
                    <div><label className="text-xs text-muted-foreground">Join Date</label><p className="text-sm font-medium">{formatDate(employee.joinDate)}</p></div>
                    <div><label className="text-xs text-muted-foreground">Confirmation Date</label><p className="text-sm font-medium">{employee.confirmationDate ? formatDate(employee.confirmationDate) : '—'}</p></div>
                    <div><label className="text-xs text-muted-foreground">Probation End</label><p className="text-sm font-medium">{employee.probationEndDate ? formatDate(employee.probationEndDate) : '—'}</p></div>
                    <div><label className="text-xs text-muted-foreground">Work Location</label><p className="text-sm font-medium">{employee.workLocation || '—'}</p></div>
                    <div><label className="text-xs text-muted-foreground">Work Shift</label><p className="text-sm font-medium">{employee.workShift || '—'}</p></div>
                    <div><label className="text-xs text-muted-foreground">Timezone</label><p className="text-sm font-medium">{employee.timezone || '—'}</p></div>
                  </div>
                </TabsContent>

                {/* ── Reviews Tab (read-only) ───────────────────────────── */}
                <TabsContent value="reviews" className="space-y-4">
                  {employeeReviews.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="font-medium">No reviews yet</p>
                      <p className="text-sm">Performance reviews will appear here once submitted</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {employeeReviews.map((review: PerformanceReview) => (
                        <div key={review.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{review.reviewPeriod}</span>
                              <Badge variant="outline" className="text-xs">{review.reviewType}</Badge>
                              <Badge variant={review.status === 'submitted' ? 'default' : review.status === 'acknowledged' ? 'secondary' : 'outline'} className="text-xs">{review.status}</Badge>
                            </div>
                            {review.overallRating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-bold">{review.overallRating}/10</span>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            {[
                              { label: 'Comm', value: review.communicationRating },
                              { label: 'Tech', value: review.technicalSkillsRating },
                              { label: 'Team', value: review.teamworkRating },
                              { label: 'Problem', value: review.problemSolvingRating },
                              { label: 'Punct', value: review.punctualityRating },
                              { label: 'Init', value: review.initiativeRating },
                            ].map(cat => (
                              <div key={cat.label} className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground w-12">{cat.label}</span>
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${(cat.value || 0) >= 8 ? 'bg-green-500' : (cat.value || 0) >= 6 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${((cat.value || 0) / 10) * 100}%` }} />
                                </div>
                                <span className="font-medium w-4">{cat.value || '-'}</span>
                              </div>
                            ))}
                          </div>
                          {review.strengths && <p className="text-xs text-green-600 mt-1"><strong>Strengths:</strong> {review.strengths.substring(0, 120)}{review.strengths.length > 120 ? '...' : ''}</p>}
                          {review.areasForImprovement && <p className="text-xs text-orange-600 mt-1"><strong>Improve:</strong> {review.areasForImprovement.substring(0, 120)}{review.areasForImprovement.length > 120 ? '...' : ''}</p>}
                          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                            <span>By {review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : 'Unknown'}</span>
                            <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── Leaves Tab ─────────────────────────────────────────── */}
                <TabsContent value="leaves" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-4 bg-muted/30 rounded-lg text-center">
                      <p className="text-3xl font-bold text-primary">{leaveSummary.total}</p>
                      <p className="text-sm text-muted-foreground">Total Entitled</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg text-center">
                      <p className="text-3xl font-bold text-green-600">{leaveSummary.available}</p>
                      <p className="text-sm text-muted-foreground">Available</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg text-center">
                      <p className="text-3xl font-bold text-orange-600">{leaveSummary.used}</p>
                      <p className="text-sm text-muted-foreground">Used</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg text-center">
                      <p className="text-3xl font-bold text-blue-600">{leaveSummary.pending}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">Leave Types Breakdown</h4>
                    {leaveBalances.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No leave data available.</p>
                    ) : (
                      <div className="space-y-3">
                        {leaveBalances.map((lb: LeaveBalance, idx: number) => {
                          const name = typeof lb.leaveType === 'object' ? (lb.leaveType as any)?.name : lb.leaveType;
                          const total = Number(lb.totalDays || (lb as any).total || 0);
                          const remaining = Number(lb.remainingDays || (lb as any).remaining || 0);
                          const pct = total > 0 ? (remaining / total) * 100 : 0;
                          return (
                            <div key={idx}>
                              <div className="flex items-center justify-between">
                                <span>{name || 'Leave'}</span>
                                <span className="font-medium">{remaining} / {total} days available</span>
                              </div>
                              <Progress value={pct} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── Documents Tab ──────────────────────────────────────── */}
                <TabsContent value="documents" className="space-y-4">
                  {employeeDocs.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No documents uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(employeeDocs as any[]).map((doc: any, i: number) => (
                        <div key={doc.id || i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{doc.originalName || doc.fileName || doc.name || 'Document'}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.category || doc.fileType || doc.mimeType || 'File'}
                                {doc.createdAt ? ` • ${new Date(doc.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                                {doc.fileSize ? ` • ${(doc.fileSize / 1024).toFixed(0)} KB` : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
