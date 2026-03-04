'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useEmployee, useUpdateEmployee } from '@/hooks/use-employees';
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
import { Textarea } from '@/components/ui/textarea';
import { PhoneDisplay } from '@/components/ui/phone-input';
import { getInitials, getStatusColor } from '@/lib/utils';
import { getAvatarColor } from '@/lib/format';
import { WriteReviewDialog } from '@/components/hr/WriteReviewDialog';
import { useEmployeeBadges, useAssignBadge } from '@/hooks/use-badges';
import { useEmployeePerformanceSummary, useEmployeeReviews } from '@/hooks/use-performance-reviews';
import { useLeaveBalance, type LeaveBalance } from '@/hooks/use-attendance';
import { useEmployeeSkills, useAddSkill, useDeleteSkill } from '@/hooks/use-skills';
import { AddSkillDialog } from '@/components/skills/AddSkillDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, api } from '@/lib/api/client';
import { toast } from 'sonner';
import { AssignBadgeDialog, getIconComponent } from '@/components/badges/AssignBadgeDialog';
import type { EmployeeBadge } from '@/lib/api/badges';
import type { PerformanceReview } from '@/lib/api/performance-reviews';
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
  ClipboardList,
  Camera,
  Share2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { usePermissions } from '@/hooks/use-permissions';
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

// Helper to safely extract string from potential object fields like {id, name, code}
function fieldStr(val: any, fallback: string = '—'): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  return val.name || val.code || val.label || fallback;
}

// Helper to format currency
function formatCurrency(amount: number, currency: any = 'USD'): string {
  const code = typeof currency === 'string' ? currency : (currency?.code || currency?.name || 'USD');
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
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
  type: 'promotion' | 'project' | 'achievement' | 'join' | 'training' | 'badge' | 'review';
  isLast?: boolean;
}) {
  const typeConfig = {
    promotion: { icon: TrendingUp, color: 'bg-green-500' },
    project: { icon: Folder, color: 'bg-blue-500' },
    achievement: { icon: Trophy, color: 'bg-yellow-500' },
    join: { icon: Users, color: 'bg-purple-500' },
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
function SkillBadge({ name, level, onRemove }: { name: string; level: 'beginner' | 'intermediate' | 'advanced' | 'expert'; onRemove?: () => void }) {
  // Map level to 1-5 stars
  const levelConfig: Record<string, { color: string; stars: number }> = {
    beginner: { color: 'bg-gray-100 text-gray-700 border-gray-300', stars: 2 },
    intermediate: { color: 'bg-blue-50 text-blue-700 border-blue-300', stars: 3 },
    advanced: { color: 'bg-purple-50 text-purple-700 border-purple-300', stars: 4 },
    expert: { color: 'bg-amber-50 text-amber-700 border-amber-300', stars: 5 },
  };

  const config = levelConfig[level] || levelConfig.intermediate;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${config.color} group`}>
      <span className="text-sm font-medium">{name}</span>
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star 
            key={i} 
            className={`h-3 w-3 ${i < config.stars ? 'fill-current' : 'text-gray-300'}`} 
          />
        ))}
      </div>
      {onRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }} 
          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
          title="Remove skill"
        >
          <XCircle className="h-3.5 w-3.5" />
        </button>
      )}
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
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canEdit = can('employees:write');
  const pageRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showWriteReviewDialog, setShowWriteReviewDialog] = useState(false);
  const [showAssignBadgeDialog, setShowAssignBadgeDialog] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showAddSkillDialog, setShowAddSkillDialog] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  // Update employee mutation (for avatar change)
  const updateEmployee = useUpdateEmployee();
  
  // Fetch real badge data
  const { data: employeeBadges = [] } = useEmployeeBadges(employeeId);
  
  // Fetch real performance data
  const { data: performanceSummary } = useEmployeePerformanceSummary(employeeId);
  const { data: employeeReviews = [] } = useEmployeeReviews(employeeId);

  // Fetch real leave balance
  const { data: leaveBalanceData } = useLeaveBalance(employeeId);

  // Fetch real documents for this employee
  const { data: employeeDocs = [] } = useQuery({
    queryKey: ['employee-documents', employeeId],
    queryFn: async () => {
      const resp = await apiClient.get(`/api/documents/entity/employee/${employeeId}/files`);
      return (resp.data as any[]) || [];
    },
    enabled: !!employeeId,
  });

  // Fetch real notes for this employee
  const { data: employeeNotes = [] } = useQuery({
    queryKey: ['employee-notes', employeeId],
    queryFn: async () => {
      const resp = await apiClient.get(`/api/v1/employees/${employeeId}/notes`);
      return (resp.data as any[]) || [];
    },
    enabled: !!employeeId,
  });

  // Fetch real skills data
  const { data: employeeSkills = [] } = useEmployeeSkills(employeeId);
  const addSkillMutation = useAddSkill(employeeId);
  const deleteSkillMutation = useDeleteSkill(employeeId);
  
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

  // Photo change handler
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      // Upload the file to document service
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await api.post(
        `/api/documents/files/upload?entityType=employee&entityId=${employee.id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const uploaded = uploadRes.data?.data?.uploaded?.[0];
      if (uploaded?.storageKey) {
        // Use key-based public download URL (no auth required for img tags)
        const avatarUrl = `/api/documents/files/download?key=${encodeURIComponent(uploaded.storageKey)}&inline=true`;
        
        // Update employee with new avatar URL
        await updateEmployee.mutateAsync({
          id: employee.id,
          data: { avatar: avatarUrl }
        });
        
        toast.success('Profile photo updated');
        queryClient.invalidateQueries({ queryKey: ['employee', employee.id] });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      console.error('Failed to update photo:', error);
      toast.error(error.message || 'Failed to update profile photo');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
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
  const performanceScores = performanceSummary?.scores || {
    communication: 0,
    technicalSkills: 0,
    teamwork: 0,
    problemSolving: 0,
    punctuality: 0,
    initiative: 0,
  };
  const overallRating = performanceSummary?.overallRating || 0;
  const performanceTrend = performanceSummary?.trend || 'neutral';
  const performancePercentile = performanceSummary?.percentile || 0;

  // TODO: Projects section hidden until project module is live
  // const mockProjects = [...];

  // Build Career Journey from real data: join date, badges earned, high-rated reviews
  const careerJourney = (() => {
    const events: { date: string; sortDate: Date; title: string; description: string; type: 'promotion' | 'project' | 'achievement' | 'join' | 'training' | 'badge' | 'review' }[] = [];

    // Join event
    if (employee.joinDate) {
      events.push({
        date: formatDate(employee.joinDate),
        sortDate: new Date(employee.joinDate),
        title: 'Joined the Organization',
        description: `Started as ${employee.designation?.name || 'Team Member'}`,
        type: 'join',
      });
    }

    // Badge events
    employeeBadges.forEach((badge: any) => {
      const givenAt = badge.given_at || badge.givenAt;
      if (givenAt) {
        events.push({
          date: formatDate(givenAt),
          sortDate: new Date(givenAt),
          title: `Earned "${badge.name}" Badge`,
          description: badge.reason || badge.description || 'Recognition for excellence',
          type: 'badge',
        });
      }
    });

    // High-rated review events (rating >= 8)
    employeeReviews.forEach((review: any) => {
      if (review.overallRating && review.overallRating >= 8) {
        const reviewDate = review.submittedAt || review.createdAt;
        if (reviewDate) {
          events.push({
            date: formatDate(reviewDate),
            sortDate: new Date(reviewDate),
            title: `Outstanding ${review.reviewType?.charAt(0).toUpperCase() + review.reviewType?.slice(1) || ''} Review`,
            description: `Achieved ${review.overallRating}/10 rating for ${review.reviewPeriod}`,
            type: 'review',
          });
        }
      }
    });

    // Sort by date descending (most recent first)
    return events.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  })();

  const mockBadges = employeeBadges;

  const annualSalary = employee.baseSalary || 0;
  const monthlySalary = Math.round(annualSalary / 12);
  
  // Compute leave summary from real data
  const leaveBalances: LeaveBalance[] = (leaveBalanceData as any)?.data || leaveBalanceData || [];
  // Exclude special/optional leave types from summary totals (Maternity, Leave Without Pay, etc.)
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
          <Button 
            variant="outline" 
            onClick={() => setShowWriteReviewDialog(true)}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            Write Review
          </Button>
          {canEdit && (
            <Button asChild>
              <Link href={`/employees/${employee.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
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
{canEdit && (
        <MetricCard
          icon={DollarSign}
          label="Annual Salary"
          value={formatCurrency(annualSalary, employee.currency)}
          subValue={`${formatCurrency(monthlySalary, employee.currency)}/month`}
          color="green"
        />
        )}
        <MetricCard
          icon={CalendarDays}
          label="Leave Balance"
          value={`${leaveSummary.available} days`}
          subValue={`${leaveSummary.used} used, ${leaveSummary.pending} pending`}
          color="orange"
        />
        {/* TODO: Projects metric hidden until project module is live */}
        <MetricCard
          icon={Trophy}
          label="Badges Earned"
          value={employeeBadges.length}
          subValue={employeeBadges.length > 0 ? `${employeeBadges.reduce((sum: number, b: EmployeeBadge) => sum + b.points, 0)} pts` : 'None yet'}
          color="primary"
        />
        <MetricCard
          icon={Star}
          label="Overall Rating"
          value={overallRating > 0 ? `${overallRating}/10` : 'N/A'}
          subValue={performancePercentile > 0 ? `Top ${100 - performancePercentile}%` : `${performanceSummary?.totalReviews || 0} reviews`}
          trend={performanceTrend}
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
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      {canEdit && (
                        <button 
                          onClick={() => photoInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="absolute bottom-1 right-1 z-20 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 text-foreground shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-all hover:scale-110 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Change profile picture"
                        >
                          {uploadingPhoto ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Camera className="h-4 w-4" />
                          )}
                        </button>
                      )}
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5" />
                  Badges & Achievements
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowAssignBadgeDialog(true)}>
                  <Award className="h-3.5 w-3.5 mr-1" />
                  Award
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {employeeBadges.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No badges yet</p>
                  <p className="text-xs">Award a badge to recognize this employee</p>
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
                        {badge.reason && (
                          <p className="text-xs text-muted-foreground/70 italic mt-0.5">"{badge.reason}"</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          By {badge.given_by_name} • {new Date(badge.given_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Assign Badge Dialog */}
          <AssignBadgeDialog
            open={showAssignBadgeDialog}
            onOpenChange={setShowAssignBadgeDialog}
            employeeId={employeeId}
            employeeName={employee.displayName}
          />

          {/* Skills */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Skills & Expertise
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowAddSkillDialog(true)}>
                  <span className="text-xs">+ Add</span>
                </Button>
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
                    <SkillBadge
                      key={skill.id}
                      name={skill.name}
                      level={skill.level || 'intermediate'}
                      onRemove={() => deleteSkillMutation.mutate(skill.id)}
                    />
                  ))
                )}
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
                  score={performanceScores.communication} 
                  description="Clear and effective verbal/written communication"
                />
                <PerformanceScore 
                  label="Initiative" 
                  score={performanceScores.initiative} 
                  description="Taking initiative and anticipating needs"
                />
                <PerformanceScore 
                  label="Punctuality" 
                  score={performanceScores.punctuality} 
                  description="Attendance and meeting deadlines consistently"
                />
                <PerformanceScore 
                  label="Teamwork" 
                  score={performanceScores.teamwork} 
                  description="Collaboration and supporting team members"
                />
                <PerformanceScore 
                  label="Technical Skills" 
                  score={performanceScores.technicalSkills} 
                  description="Expertise in required technologies"
                />
                <PerformanceScore 
                  label="Problem Solving" 
                  score={performanceScores.problemSolving} 
                  description="Analytical thinking and finding solutions"
                />
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
                  <p className="text-sm">No performance reviews yet. Click "Write Review" to add the first one.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* TODO: Projects card hidden until project module is live */}

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
              {careerJourney.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GitBranch className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No milestones yet</p>
                  <p className="text-sm">Career events will appear here as badges are earned and reviews are completed</p>
                </div>
              ) : (
                <div className="ml-2">
                  {careerJourney.map((item, i) => (
                    <TimelineItem 
                      key={i} 
                      date={item.date}
                      title={item.title}
                      description={item.description}
                      type={item.type}
                      isLast={i === careerJourney.length - 1}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Details Tabs */}
          <Card>
            <Tabs defaultValue="reviews" className="w-full">
              <CardHeader>
                <TabsList className={`grid w-full ${canEdit ? 'grid-cols-5' : 'grid-cols-4'}`}>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  {canEdit && <TabsTrigger value="compensation">Compensation</TabsTrigger>}
                  <TabsTrigger value="leaves">Leaves</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                {/* Reviews Tab */}
                <TabsContent value="reviews" className="space-y-4">
                  {employeeReviews.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="font-medium">No reviews yet</p>
                      <p className="text-sm">Write a review to start tracking performance</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {employeeReviews.map((review: PerformanceReview) => (
                        <div key={review.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{review.reviewPeriod}</span>
                              <Badge variant="outline" className="text-xs">{review.reviewType}</Badge>
                              <Badge variant={review.status === 'submitted' ? 'default' : review.status === 'acknowledged' ? 'secondary' : 'outline'} className="text-xs">
                                {review.status}
                              </Badge>
                            </div>
                            {review.overallRating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-bold">{review.overallRating}/10</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Rating bars */}
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

                          {review.strengths && (
                            <p className="text-xs text-green-600 mt-1"><strong>Strengths:</strong> {review.strengths.substring(0, 120)}{review.strengths.length > 120 ? '...' : ''}</p>
                          )}
                          {review.areasForImprovement && (
                            <p className="text-xs text-orange-600 mt-1"><strong>Improve:</strong> {review.areasForImprovement.substring(0, 120)}{review.areasForImprovement.length > 120 ? '...' : ''}</p>
                          )}

                          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                            <span>By {review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : 'Unknown'}</span>
                            <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {canEdit && (
                  <TabsContent value="compensation" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">Annual Salary (CTC)</p>
                        <p className="text-2xl font-bold">{formatCurrency(annualSalary, employee.currency)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Monthly: {formatCurrency(monthlySalary, employee.currency)}</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">Monthly Equivalent</p>
                        <p className="text-2xl font-bold">{formatCurrency(monthlySalary, employee.currency)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Based on annual CTC</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Employment Type</p>
                        <p className="font-medium">{fieldStr(employee.employmentType, 'Full-time')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Currency</p>
                        <p className="font-medium">{fieldStr(employee.currency, 'INR')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Join Date</p>
                        <p className="font-medium">{employee.joinDate ? new Date(employee.joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Department</p>
                        <p className="font-medium">{fieldStr(employee.department)}</p>
                      </div>
                    </div>
                  </TabsContent>
                )}

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
                      <p className="text-sm text-muted-foreground">No leave data available for this employee.</p>
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

                <TabsContent value="documents" className="space-y-4">
                  <div className="space-y-3">
                    {employeeDocs.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No documents uploaded for this employee.</p>
                      </div>
                    ) : (
                      (employeeDocs as any[]).map((doc: any, i: number) => (
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
                          {doc.url || doc.filePath ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.url || doc.filePath} target="_blank" rel="noopener noreferrer">View</a>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled>View</Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <div className="space-y-4">
                    {(employeeNotes as any[]).length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No notes yet. Add the first note below.</p>
                      </div>
                    ) : (
                      (employeeNotes as any[]).map((item: any, i: number) => (
                        <div key={item.id || i} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{item.authorName || item.author || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.content || item.note}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Note UI */}
                  {addingNote ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Type your note here..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setAddingNote(false); setNewNote(''); }}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!newNote.trim()}
                          onClick={async () => {
                            try {
                              await apiClient.post(`/api/v1/employees/${employeeId}/notes`, { content: newNote.trim() });
                              queryClient.invalidateQueries({ queryKey: ['employee-notes', employeeId] });
                              setNewNote('');
                              setAddingNote(false);
                            } catch (err) {
                              console.error('Failed to add note:', err);
                            }
                          }}
                        >
                          Save Note
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => setAddingNote(true)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Write Review Dialog */}
      <WriteReviewDialog
        open={showWriteReviewDialog}
        onOpenChange={setShowWriteReviewDialog}
        employee={{
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          employeeCode: employee.employeeCode,
          designation: employee.designation,
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['employee-performance-summary', employeeId] });
          queryClient.invalidateQueries({ queryKey: ['employee-reviews', employeeId] });
        }}
      />

      {/* Add Skill Dialog */}
      <AddSkillDialog
        open={showAddSkillDialog}
        onOpenChange={setShowAddSkillDialog}
        existingSkillNames={employeeSkills.map((s: any) => s.name)}
        onAddSkill={async (skill) => {
          await addSkillMutation.mutateAsync(skill);
        }}
        isAdding={addSkillMutation.isPending}
      />
    </div>
  );
}
