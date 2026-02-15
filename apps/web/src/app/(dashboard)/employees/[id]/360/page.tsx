'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useEmployee } from '@/hooks/use-employees';
import { useOrgFormatters } from '@/hooks/use-org-settings';
import { Button } from '@/components/ui/button';
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
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  Building,
  Calendar,
  MapPin,
  User,
  Briefcase,
  GraduationCap,
  CreditCard,
  AlertCircle,
  Clock,
  Trophy,
  Star,
  TrendingUp,
  Target,
  Users,
  CheckCircle2,
  XCircle,
  Timer,
  Award,
  Zap,
  MessageSquare,
  Shield,
  Heart,
  Lightbulb,
  GitBranch,
  Folder,
  BarChart3,
  CalendarDays,
  DollarSign,
  FileText,
  ChevronRight,
  Sparkles,
  Download,
  Camera,
  Share2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Helper to calculate tenure
function calculateTenure(joinDate: string): { years: number; months: number; days: number; totalDays: number } {
  const start = new Date(joinDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = totalDays % 30;
  
  return { years, months, days, totalDays };
}

// Helper to format currency
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Metric Card Component
function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  trend,
  color = 'primary' 
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

// Performance Score Component
function PerformanceScore({ 
  label, 
  score, 
  maxScore = 10,
  description 
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
        <div 
          className={`h-full rounded-full transition-all ${getScoreColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// Timeline Item Component
function TimelineItem({ 
  date, 
  title, 
  description, 
  type,
  isLast = false 
}: { 
  date: string; 
  title: string; 
  description: string; 
  type: 'promotion' | 'project' | 'achievement' | 'join' | 'training';
  isLast?: boolean;
}) {
  const typeConfig = {
    promotion: { icon: TrendingUp, color: 'bg-green-500' },
    project: { icon: Folder, color: 'bg-blue-500' },
    achievement: { icon: Trophy, color: 'bg-yellow-500' },
    join: { icon: Users, color: 'bg-purple-500' },
    training: { icon: GraduationCap, color: 'bg-orange-500' },
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
      <div className={`flex-1 pb-8 ${isLast ? '' : ''}`}>
        <p className="text-xs text-muted-foreground">{date}</p>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// Project Card Component
function ProjectCard({ 
  name, 
  role, 
  status, 
  contribution, 
  startDate, 
  endDate 
}: { 
  name: string; 
  role: string; 
  status: 'active' | 'completed' | 'on-hold'; 
  contribution: number;
  startDate: string;
  endDate?: string;
}) {
  const statusConfig = {
    active: { label: 'Active', color: 'bg-green-500/10 text-green-600' },
    completed: { label: 'Completed', color: 'bg-blue-500/10 text-blue-600' },
    'on-hold': { label: 'On Hold', color: 'bg-orange-500/10 text-orange-600' },
  };

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium">{name}</h4>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
        <Badge className={statusConfig[status].color}>{statusConfig[status].label}</Badge>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Contribution</span>
          <span className="font-medium">{contribution}%</span>
        </div>
        <Progress value={contribution} className="h-1.5" />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {startDate} - {endDate || 'Present'}
      </p>
    </div>
  );
}

// Skill Badge Component
function SkillBadge({ name, level }: { name: string; level: 'beginner' | 'intermediate' | 'advanced' | 'expert' }) {
  const levelConfig = {
    beginner: { color: 'bg-gray-100 text-gray-700 border-gray-300', stars: 1 },
    intermediate: { color: 'bg-blue-50 text-blue-700 border-blue-300', stars: 2 },
    advanced: { color: 'bg-purple-50 text-purple-700 border-purple-300', stars: 3 },
    expert: { color: 'bg-amber-50 text-amber-700 border-amber-300', stars: 4 },
  };

  const config = levelConfig[level];

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${config.color}`}>
      <span className="text-sm font-medium">{name}</span>
      <div className="flex">
        {Array.from({ length: config.stars }).map((_, i) => (
          <Star key={i} className="h-3 w-3 fill-current" />
        ))}
      </div>
    </div>
  );
}

// Badge/Award Component
function AwardBadge({ name, description, icon: Icon, color }: { name: string; description: string; icon: any; color: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <h4 className="font-medium text-sm">{name}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

interface DominantColors {
  primary: string;
  secondary: string;
}

// Hook to extract dominant colors from an image (primary and secondary)
function useDominantColors(imageUrl: string | undefined, fallbackIdentifier: string): DominantColors {
  const [colors, setColors] = useState<DominantColors>({ primary: 'blue', secondary: 'cyan' });
  
  useEffect(() => {
    // Get consistent color from getAvatarColor for fallback
    const avatarColor = getAvatarColor(fallbackIdentifier);
    const colorMatch = avatarColor.bg.match(/bg-(\w+)-/);
    const fallbackColor = colorMatch ? colorMatch[1] : 'blue';
    const colorOrder = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
    const idx = colorOrder.indexOf(fallbackColor);
    const secondaryFallback = colorOrder[(idx + 3) % colorOrder.length]; // Pick a contrasting color
    
    if (!imageUrl) {
      setColors({ primary: fallbackColor, secondary: secondaryFallback });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Sample a small version for performance
        const sampleSize = 50;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;

        // Count color occurrences (simplified color bucketing)
        const colorCounts: Record<string, number> = {};
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Skip transparent/near-transparent pixels
          if (a < 128) continue;
          
          // Skip very dark or very light pixels (likely background)
          const brightness = (r + g + b) / 3;
          if (brightness < 30 || brightness > 240) continue;
          
          // Determine dominant color based on RGB values
          const color = getDominantColorName(r, g, b);
          if (color !== 'gray') { // Skip gray for more vibrant colors
            colorCounts[color] = (colorCounts[color] || 0) + 1;
          }
        }

        // Sort colors by count and get top 2
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([color]) => color);

        const primary = sortedColors[0] || fallbackColor;
        let secondary = sortedColors[1] || sortedColors[0] || secondaryFallback;
        
        // If secondary is same as primary, pick a contrasting color
        if (secondary === primary) {
          const pidx = colorOrder.indexOf(primary);
          secondary = colorOrder[(pidx + 3) % colorOrder.length];
        }

        setColors({ primary, secondary });
      } catch (e) {
        console.error('Error extracting dominant colors:', e);
        setColors({ primary: fallbackColor, secondary: secondaryFallback });
      }
    };

    img.onerror = () => {
      setColors({ primary: fallbackColor, secondary: secondaryFallback });
    };

    img.src = imageUrl;
  }, [imageUrl, fallbackIdentifier]);

  return colors;
}

// Helper to determine color name from RGB values
function getDominantColorName(r: number, g: number, b: number): string {
  // Calculate hue from RGB
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  // Check for grayscale
  if (diff < 20) {
    return 'gray';
  }
  
  let hue = 0;
  if (max === r) {
    hue = ((g - b) / diff) % 6;
  } else if (max === g) {
    hue = (b - r) / diff + 2;
  } else {
    hue = (r - g) / diff + 4;
  }
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  // Calculate saturation
  const saturation = max === 0 ? 0 : (diff / max) * 100;
  
  // Low saturation = grayish
  if (saturation < 20) {
    return 'gray';
  }

  // Map hue to Tailwind color names
  if (hue >= 0 && hue < 15) return 'red';
  if (hue >= 15 && hue < 35) return 'orange';
  if (hue >= 35 && hue < 50) return 'amber';
  if (hue >= 50 && hue < 65) return 'yellow';
  if (hue >= 65 && hue < 85) return 'lime';
  if (hue >= 85 && hue < 140) return 'green';
  if (hue >= 140 && hue < 165) return 'emerald';
  if (hue >= 165 && hue < 180) return 'teal';
  if (hue >= 180 && hue < 195) return 'cyan';
  if (hue >= 195 && hue < 210) return 'sky';
  if (hue >= 210 && hue < 240) return 'blue';
  if (hue >= 240 && hue < 265) return 'indigo';
  if (hue >= 265 && hue < 280) return 'violet';
  if (hue >= 280 && hue < 300) return 'purple';
  if (hue >= 300 && hue < 330) return 'fuchsia';
  if (hue >= 330 && hue < 345) return 'pink';
  if (hue >= 345) return 'rose';
  
  return 'blue';
}

// Color hex values for inline styles (Tailwind dynamic classes don't work)
const COLOR_HEX: Record<string, { light: string; medium: string; dark: string }> = {
  'red': { light: '#fca5a5', medium: '#f87171', dark: '#ef4444' },
  'orange': { light: '#fdba74', medium: '#fb923c', dark: '#f97316' },
  'amber': { light: '#fcd34d', medium: '#fbbf24', dark: '#f59e0b' },
  'yellow': { light: '#fde047', medium: '#facc15', dark: '#eab308' },
  'lime': { light: '#bef264', medium: '#a3e635', dark: '#84cc16' },
  'green': { light: '#86efac', medium: '#4ade80', dark: '#22c55e' },
  'emerald': { light: '#6ee7b7', medium: '#34d399', dark: '#10b981' },
  'teal': { light: '#5eead4', medium: '#2dd4bf', dark: '#14b8a6' },
  'cyan': { light: '#67e8f9', medium: '#22d3ee', dark: '#06b6d4' },
  'sky': { light: '#7dd3fc', medium: '#38bdf8', dark: '#0ea5e9' },
  'blue': { light: '#93c5fd', medium: '#60a5fa', dark: '#3b82f6' },
  'indigo': { light: '#a5b4fc', medium: '#818cf8', dark: '#6366f1' },
  'violet': { light: '#c4b5fd', medium: '#a78bfa', dark: '#8b5cf6' },
  'purple': { light: '#d8b4fe', medium: '#c084fc', dark: '#a855f7' },
  'fuchsia': { light: '#f0abfc', medium: '#e879f9', dark: '#d946ef' },
  'pink': { light: '#f9a8d4', medium: '#f472b6', dark: '#ec4899' },
  'rose': { light: '#fda4af', medium: '#fb7185', dark: '#f43f5e' },
  'gray': { light: '#d1d5db', medium: '#9ca3af', dark: '#6b7280' },
};

// Ring class mapping (these are static so they work)
const RING_CLASSES: Record<string, string> = {
  'red': 'ring-red-400/50',
  'orange': 'ring-orange-400/50',
  'amber': 'ring-amber-400/50',
  'yellow': 'ring-yellow-400/50',
  'lime': 'ring-lime-400/50',
  'green': 'ring-green-400/50',
  'emerald': 'ring-emerald-400/50',
  'teal': 'ring-teal-400/50',
  'cyan': 'ring-cyan-400/50',
  'sky': 'ring-sky-400/50',
  'blue': 'ring-blue-400/50',
  'indigo': 'ring-indigo-400/50',
  'violet': 'ring-violet-400/50',
  'purple': 'ring-purple-400/50',
  'fuchsia': 'ring-fuchsia-400/50',
  'pink': 'ring-pink-400/50',
  'rose': 'ring-rose-400/50',
  'gray': 'ring-gray-400/50',
};

// Generate glass gradient colors from primary and secondary
function getGlassColors(colors: DominantColors): {
  primaryHex: { light: string; medium: string; dark: string };
  secondaryHex: { light: string; medium: string; dark: string };
  ringClass: string;
} {
  return {
    primaryHex: COLOR_HEX[colors.primary] || COLOR_HEX['blue'],
    secondaryHex: COLOR_HEX[colors.secondary] || COLOR_HEX['cyan'],
    ringClass: RING_CLASSES[colors.primary] || RING_CLASSES['blue'],
  };
}

export default function Employee360Page() {
  const params = useParams();
  const employeeId = params.id as string;
  const { data: employee, isLoading, error } = useEmployee(employeeId);
  const { formatDate } = useOrgFormatters();
  const pageRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Extract dominant colors from profile picture (primary and secondary)
  const dominantColors = useDominantColors(
    employee?.avatar, 
    employee?.email || employee?.id || employeeId
  );

  // PDF Download Handler
  const handleDownloadPDF = async () => {
    if (!pageRef.current || !employee) return;
    
    setIsDownloading(true);
    try {
      // Hide download button temporarily
      const buttons = pageRef.current.querySelectorAll('button');
      buttons.forEach(btn => btn.style.display = 'none');

      const canvas = await html2canvas(pageRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${employee.firstName}_${employee.lastName}_360_Profile.pdf`);

      // Show buttons again
      buttons.forEach(btn => btn.style.display = '');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96 md:col-span-1" />
          <Skeleton className="h-96 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Employee Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The employee you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/employees">Back to Employees</Link>
        </Button>
      </div>
    );
  }

  const tenure = calculateTenure(employee.joinDate);
  
  // Mock data for demonstration - these would come from API in production
  const mockPerformanceScores = {
    communication: 8.5,
    proactiveness: 7.8,
    accountability: 9.0,
    teamwork: 8.2,
    technicalSkills: 8.8,
    leadership: 7.5,
    problemSolving: 8.6,
    timeManagement: 7.9,
  };

  const mockProjects = [
    { name: 'Office Management System', role: 'Lead Developer', status: 'active' as const, contribution: 85, startDate: 'Jan 2025', endDate: undefined },
    { name: 'E-Commerce Platform', role: 'Full Stack Developer', status: 'completed' as const, contribution: 70, startDate: 'Jun 2024', endDate: 'Dec 2024' },
    { name: 'CRM Integration', role: 'Backend Developer', status: 'completed' as const, contribution: 60, startDate: 'Mar 2024', endDate: 'May 2024' },
  ];

  const mockCareerHistory = [
    { date: formatDate(employee.joinDate), title: 'Joined the Organization', description: `Started as ${employee.designation?.name || 'Team Member'}`, type: 'join' as const },
    { date: 'Mar 2024', title: 'Completed AWS Certification', description: 'AWS Solutions Architect - Associate', type: 'training' as const },
    { date: 'Jun 2024', title: 'Project Excellence Award', description: 'For outstanding contribution to E-Commerce Platform', type: 'achievement' as const },
    { date: 'Sep 2024', title: 'Promoted to Senior Developer', description: 'Recognized for consistent performance', type: 'promotion' as const },
    { date: 'Jan 2025', title: 'Started OMS Project', description: 'Leading the Office Management System development', type: 'project' as const },
  ].reverse();

  const mockBadges = [
    { name: 'Early Bird', description: 'Consistently on time', icon: Clock, color: 'bg-blue-500' },
    { name: 'Team Player', description: 'Great collaboration', icon: Users, color: 'bg-green-500' },
    { name: 'Problem Solver', description: '50+ issues resolved', icon: Lightbulb, color: 'bg-purple-500' },
    { name: 'Mentor', description: 'Helped 5+ new joiners', icon: Heart, color: 'bg-pink-500' },
  ];

  const mockSkills = [
    { name: 'TypeScript', level: 'expert' as const },
    { name: 'React', level: 'expert' as const },
    { name: 'Node.js', level: 'advanced' as const },
    { name: 'PostgreSQL', level: 'advanced' as const },
    { name: 'AWS', level: 'intermediate' as const },
    { name: 'Docker', level: 'intermediate' as const },
    { name: 'GraphQL', level: 'intermediate' as const },
    { name: 'Python', level: 'beginner' as const },
  ];

  const monthlySalary = employee.baseSalary || 0;
  const annualSalary = monthlySalary * 12;
  
  // Mock leave data
  const leaveBalance = { total: 24, used: 8, pending: 2, available: 14 };

  return (
    <div className="space-y-6" ref={pageRef}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button 
            variant="ghost" 
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/employees">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Employees
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">
              {employee.displayName}
            </h2>
            <Badge variant="outline">
              <Sparkles className="h-3 w-3 mr-1" />
              360° View
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {employee.employeeCode} • {employee.designation?.name} • {employee.department?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/employees/${employee.id}`}>
              <User className="mr-2 h-4 w-4" />
              Basic View
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/employees/${employee.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <MetricCard
          icon={Clock}
          label="Tenure"
          value={tenure.years > 0 ? `${tenure.years}y ${tenure.months}m` : `${tenure.months}m ${tenure.days}d`}
          subValue={`${tenure.totalDays} days total`}
          color="blue"
        />
        <MetricCard
          icon={DollarSign}
          label="Monthly Salary"
          value={formatCurrency(monthlySalary, employee.currency)}
          subValue={`${formatCurrency(annualSalary, employee.currency)}/year`}
          color="green"
        />
        <MetricCard
          icon={CalendarDays}
          label="Leave Balance"
          value={`${leaveBalance.available} days`}
          subValue={`${leaveBalance.used} used, ${leaveBalance.pending} pending`}
          color="orange"
        />
        <MetricCard
          icon={Folder}
          label="Projects"
          value={mockProjects.length}
          subValue={`${mockProjects.filter(p => p.status === 'active').length} active`}
          color="purple"
        />
        <MetricCard
          icon={Trophy}
          label="Badges Earned"
          value={mockBadges.length}
          subValue="This year"
          color="primary"
        />
        <MetricCard
          icon={Star}
          label="Overall Rating"
          value="8.3/10"
          subValue="Top 15%"
          trend="up"
          color="green"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile & Quick Info */}
        <div className="space-y-6">
          {/* Profile Card with Glass Effect - Dual Color Gradient */}
          {(() => {
            const glassColors = getGlassColors(dominantColors);
            const { primaryHex, secondaryHex, ringClass } = glassColors;
            return (
              <Card className="relative overflow-hidden border-0 shadow-xl">
                {/* Glass background gradient using inline styles */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to bottom right, ${primaryHex.dark}40, ${secondaryHex.medium}30, ${primaryHex.light}35)`
                  }}
                />
                <div className="absolute inset-0 backdrop-blur-3xl" />
                <div className="absolute inset-0 bg-white/40 dark:bg-gray-900/40" />
                
                {/* Decorative blurred circles - primary top-left, secondary center, primary bottom-right */}
                <div 
                  className="absolute -top-20 -left-20 w-60 h-60 rounded-full blur-3xl"
                  style={{ backgroundColor: `${primaryHex.dark}50` }}
                />
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl"
                  style={{ backgroundColor: `${secondaryHex.dark}40` }}
                />
                <div 
                  className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full blur-3xl"
                  style={{ backgroundColor: `${primaryHex.dark}45` }}
                />
                
                <CardContent className="relative z-10 pt-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div 
                        className="absolute inset-0 rounded-full blur-xl transition-opacity group-hover:opacity-100 opacity-75"
                        style={{
                          background: `linear-gradient(to bottom right, ${primaryHex.dark}60, ${secondaryHex.dark}50)`
                        }}
                      />
                      <Avatar className={`h-32 w-32 ring-4 ${ringClass} shadow-2xl relative z-10 border-4 border-white/80 dark:border-gray-800/80`}>
                        <AvatarImage src={employee.avatar} />
                        <AvatarFallback 
                          className="text-4xl font-semibold"
                          style={{
                            background: `linear-gradient(to bottom right, ${primaryHex.light}60, ${secondaryHex.light}50)`
                          }}
                        >
                          {getInitials(`${employee.firstName} ${employee.lastName}`)}
                        </AvatarFallback>
                      </Avatar>
                      <button 
                        className="absolute bottom-1 right-1 z-20 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 text-foreground shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-all hover:scale-110 backdrop-blur-sm"
                        title="Change profile picture"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
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
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{employee.workLocation || 'Remote'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Joined {formatDate(employee.joinDate)}
                        </span>
                      </div>
                      <Badge className={`${getStatusColor(employee.status)}`}>
                        {employee.status}
                      </Badge>
                    </div>
                    {employee.reportingManager && (
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Reports to {employee.reportingManager.firstName} {employee.reportingManager.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Badges & Awards */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5" />
                Badges & Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockBadges.map((badge, i) => (
                <AwardBadge key={i} {...badge} />
              ))}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5" />
                Skills & Expertise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {mockSkills.map((skill, i) => (
                  <SkillBadge key={i} {...skill} />
                ))}
              </div>
              {(employee as any).certifications && (employee as any).certifications.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <h4 className="text-sm font-medium mb-2">Certifications</h4>
                  <div className="space-y-2">
                    {(employee as any).certifications.map((cert: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {cert}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>
                Assessment scores across key performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <PerformanceScore 
                  label="Communication" 
                  score={mockPerformanceScores.communication} 
                  description="Clear and effective verbal/written communication"
                />
                <PerformanceScore 
                  label="Pro-activeness" 
                  score={mockPerformanceScores.proactiveness} 
                  description="Taking initiative and anticipating needs"
                />
                <PerformanceScore 
                  label="Accountability" 
                  score={mockPerformanceScores.accountability} 
                  description="Ownership of tasks and meeting commitments"
                />
                <PerformanceScore 
                  label="Teamwork" 
                  score={mockPerformanceScores.teamwork} 
                  description="Collaboration and supporting team members"
                />
                <PerformanceScore 
                  label="Technical Skills" 
                  score={mockPerformanceScores.technicalSkills} 
                  description="Expertise in required technologies"
                />
                <PerformanceScore 
                  label="Leadership" 
                  score={mockPerformanceScores.leadership} 
                  description="Guiding and mentoring others"
                />
                <PerformanceScore 
                  label="Problem Solving" 
                  score={mockPerformanceScores.problemSolving} 
                  description="Analytical thinking and finding solutions"
                />
                <PerformanceScore 
                  label="Time Management" 
                  score={mockPerformanceScores.timeManagement} 
                  description="Meeting deadlines and prioritization"
                />
              </div>
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    Projects
                  </CardTitle>
                  <CardDescription>
                    Current and past project assignments
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mockProjects.map((project, i) => (
                  <ProjectCard key={i} {...project} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Career History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Career Journey
              </CardTitle>
              <CardDescription>
                Professional milestones and achievements timeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="ml-2">
                {mockCareerHistory.map((item, i) => (
                  <TimelineItem 
                    key={i} 
                    {...item} 
                    isLast={i === mockCareerHistory.length - 1}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Details Tabs */}
          <Card>
            <Tabs defaultValue="compensation" className="w-full">
              <CardHeader>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="compensation">Compensation</TabsTrigger>
                  <TabsTrigger value="leaves">Leaves</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="compensation" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Base Salary (Monthly)</p>
                      <p className="text-2xl font-bold">{formatCurrency(monthlySalary, employee.currency)}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Annual CTC</p>
                      <p className="text-2xl font-bold">{formatCurrency(annualSalary, employee.currency)}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Employment Type</p>
                      <p className="font-medium">{employee.employmentType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Currency</p>
                      <p className="font-medium">{employee.currency}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Revision</p>
                      <p className="font-medium">Apr 2024</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Next Review</p>
                      <p className="font-medium">Apr 2025</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="leaves" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-4 bg-muted/30 rounded-lg text-center">
                      <p className="text-3xl font-bold text-primary">{leaveBalance.total}</p>
                      <p className="text-sm text-muted-foreground">Total Entitled</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg text-center">
                      <p className="text-3xl font-bold text-green-600">{leaveBalance.available}</p>
                      <p className="text-sm text-muted-foreground">Available</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg text-center">
                      <p className="text-3xl font-bold text-orange-600">{leaveBalance.used}</p>
                      <p className="text-sm text-muted-foreground">Used</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg text-center">
                      <p className="text-3xl font-bold text-blue-600">{leaveBalance.pending}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">Leave Types Breakdown</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Casual Leave</span>
                        <span className="font-medium">8 / 12 days available</span>
                      </div>
                      <Progress value={(8/12)*100} className="h-2" />
                      <div className="flex items-center justify-between">
                        <span>Sick Leave</span>
                        <span className="font-medium">4 / 6 days available</span>
                      </div>
                      <Progress value={(4/6)*100} className="h-2" />
                      <div className="flex items-center justify-between">
                        <span>Earned Leave</span>
                        <span className="font-medium">2 / 6 days available</span>
                      </div>
                      <Progress value={(2/6)*100} className="h-2" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-4">
                  <div className="space-y-3">
                    {[
                      { name: 'Resume.pdf', type: 'Resume', date: 'Jan 15, 2024' },
                      { name: 'ID_Proof.pdf', type: 'Identity', date: 'Jan 15, 2024' },
                      { name: 'Offer_Letter.pdf', type: 'Employment', date: 'Jan 10, 2024' },
                      { name: 'AWS_Certificate.pdf', type: 'Certification', date: 'Mar 20, 2024' },
                    ].map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">{doc.type} • {doc.date}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">View</Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <div className="space-y-4">
                    {[
                      { author: 'HR Manager', date: 'Jan 10, 2025', note: 'Excellent performance in Q4. Recommended for project lead role.' },
                      { author: 'Team Lead', date: 'Dec 15, 2024', note: 'Completed all assigned tasks ahead of schedule. Great team collaboration.' },
                    ].map((item, i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{item.author}</span>
                          <span className="text-xs text-muted-foreground">{item.date}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.note}</p>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
