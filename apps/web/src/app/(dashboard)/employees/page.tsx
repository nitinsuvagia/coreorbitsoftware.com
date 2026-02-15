'use client';

import { useState, useEffect, useRef } from 'react';
import { useEmployees, useDepartments, Employee } from '@/hooks/use-employees';
import { useOrgFormatters } from '@/hooks/use-org-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { PhoneDisplay } from '@/components/ui/phone-input';
import { getInitials, getAvatarColor, cn } from '@/lib/utils';
import {
  Plus,
  Search,
  MoreVertical,
  Mail,
  Phone,
  Building,
  Filter,
  Sparkles,
  Download,
  Users,
  Eye,
  Edit,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { EmployeeCalendarView } from './_components/EmployeeCalendarView';

// Format date as "January 24th, 2010" (friendly format for joined date)
function formatJoinedDate(date: string | Date): string {
  const d = new Date(date);
  const day = d.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' 
    : day === 2 || day === 22 ? 'nd' 
    : day === 3 || day === 23 ? 'rd' 
    : 'th';
  return format(d, `MMMM d'${suffix}', yyyy`);
}

// Color hex values for glass effect (inline styles)
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

const RING_CLASSES: Record<string, string> = {
  'red': 'ring-red-400/50', 'orange': 'ring-orange-400/50', 'amber': 'ring-amber-400/50',
  'yellow': 'ring-yellow-400/50', 'lime': 'ring-lime-400/50', 'green': 'ring-green-400/50',
  'emerald': 'ring-emerald-400/50', 'teal': 'ring-teal-400/50', 'cyan': 'ring-cyan-400/50',
  'sky': 'ring-sky-400/50', 'blue': 'ring-blue-400/50', 'indigo': 'ring-indigo-400/50',
  'violet': 'ring-violet-400/50', 'purple': 'ring-purple-400/50', 'fuchsia': 'ring-fuchsia-400/50',
  'pink': 'ring-pink-400/50', 'rose': 'ring-rose-400/50', 'gray': 'ring-gray-400/50',
};

// Convert RGB to color name via HSL hue
function getDominantColorName(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  const d = max - min;
  
  if (d === 0) return 'gray';
  
  const s = d / (1 - Math.abs(2 * l - 1)) / 255;
  if (s < 0.15) return 'gray';
  
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  
  if (h < 15) return 'red';
  if (h < 35) return 'orange';
  if (h < 50) return 'amber';
  if (h < 65) return 'yellow';
  if (h < 85) return 'lime';
  if (h < 150) return 'green';
  if (h < 170) return 'teal';
  if (h < 195) return 'cyan';
  if (h < 220) return 'sky';
  if (h < 250) return 'blue';
  if (h < 270) return 'indigo';
  if (h < 290) return 'violet';
  if (h < 310) return 'purple';
  if (h < 340) return 'pink';
  return 'rose';
}

interface DominantColors {
  primary: string;
  secondary: string;
}

// Hook to extract dominant colors from image
function useDominantColors(imageUrl: string | undefined, fallbackId: string): DominantColors {
  const [colors, setColors] = useState<DominantColors>({ primary: 'blue', secondary: 'cyan' });
  
  useEffect(() => {
    // Get consistent color from getAvatarColor for fallback
    const avatarColor = getAvatarColor(fallbackId);
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
        
        const size = 50;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        
        const imageData = ctx.getImageData(0, 0, size, size).data;
        const colorCounts: Record<string, number> = {};
        
        for (let i = 0; i < imageData.length; i += 16) {
          const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2];
          const brightness = (r + g + b) / 3;
          if (brightness < 30 || brightness > 225) continue;
          
          const colorName = getDominantColorName(r, g, b);
          if (colorName !== 'gray') {
            colorCounts[colorName] = (colorCounts[colorName] || 0) + 1;
          }
        }
        
        const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
        if (sorted.length >= 2) {
          setColors({ primary: sorted[0][0], secondary: sorted[1][0] });
        } else if (sorted.length === 1) {
          setColors({ primary: sorted[0][0], secondary: sorted[0][0] });
        } else {
          // Use fallback colors
          setColors({ primary: fallbackColor, secondary: secondaryFallback });
        }
      } catch (e) {
        console.warn('Could not extract colors:', e);
        setColors({ primary: fallbackColor, secondary: secondaryFallback });
      }
    };
    
    img.onerror = () => {
      setColors({ primary: fallbackColor, secondary: secondaryFallback });
    };
    
    img.src = imageUrl;
  }, [imageUrl, fallbackId]);
  
  return colors;
}

// Glass effect employee card component
function GlassEmployeeCard({ employee }: { employee: Employee }) {
  const { formatDate } = useOrgFormatters();
  const [menuOpen, setMenuOpen] = useState(false);
  const dominantColors = useDominantColors(employee.avatar, employee.email || employee.id);
  const primaryHex = COLOR_HEX[dominantColors.primary] || COLOR_HEX['blue'];
  const secondaryHex = COLOR_HEX[dominantColors.secondary] || COLOR_HEX['cyan'];
  const ringClass = RING_CLASSES[dominantColors.primary] || RING_CLASSES['blue'];

  return (
    <Link href={`/employees/${employee.id}/360`} className="block">
    <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer">
      {/* Glass background gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${primaryHex.dark}35, ${secondaryHex.medium}25, ${primaryHex.light}30)`
        }}
      />
      <div className="absolute inset-0 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50" />
      
      {/* Decorative blurred circles */}
      <div 
        className="absolute -top-10 -left-10 w-32 h-32 rounded-full blur-2xl"
        style={{ backgroundColor: `${primaryHex.dark}40` }}
      />
      <div 
        className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-2xl"
        style={{ backgroundColor: `${secondaryHex.dark}35` }}
      />
      
      <CardContent className="relative z-10 p-6">
        {/* Dropdown menu in top right, visible on hover or when open */}
        <div className={cn("absolute top-3 right-3 z-20 transition-opacity", menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100")} onClick={(e) => e.preventDefault()}>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/employees/${employee.id}`} className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  View Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/employees/${employee.id}/360`} className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  360° View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/employees/${employee.id}/edit`} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex flex-col items-center gap-3 -mt-4">
          <div className="relative">
            <div 
              className="absolute inset-0 rounded-full blur-lg opacity-60"
              style={{
                background: `linear-gradient(135deg, ${primaryHex.dark}70, ${secondaryHex.dark}60)`
              }}
            />
            <Avatar className={`h-20 w-20 ring-3 ${ringClass} relative z-10 border-2 border-white/70 dark:border-gray-800/70`}>
              <AvatarImage src={employee.avatar} className="object-cover" />
              <AvatarFallback 
                className="text-lg font-semibold"
                style={{
                  background: `linear-gradient(135deg, ${primaryHex.light}80, ${secondaryHex.light}70)`
                }}
              >
                {getInitials(`${employee.firstName} ${employee.lastName}`)}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="text-center">
            <Link
              href={`/employees/${employee.id}`}
              className="font-semibold text-base hover:underline"
            >
              {employee.firstName} {employee.lastName}
            </Link>
            <p className="text-sm text-muted-foreground">
              {employee.designation?.name || employee.employmentType}
            </p>
          </div>
          
          {employee.employeeCode && (
            <Badge variant="secondary" className="font-mono text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {employee.employeeCode}
            </Badge>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-border/50 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground p-1.5 rounded-md bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{employee.email}</span>
          </div>
          {employee.phone && (
            <div className="flex items-center gap-2 text-muted-foreground p-1.5 rounded-md bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <PhoneDisplay value={employee.phone} />
            </div>
          )}
          {employee.department && (
            <div className="flex items-center gap-2 text-muted-foreground p-1.5 rounded-md bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm">
              <Building className="h-4 w-4 flex-shrink-0" />
              <span>{employee.department.name}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 text-muted-foreground p-1.5 rounded-md bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{employee.joinDate ? `Joined ${formatJoinedDate(employee.joinDate)}` : 'Join date not set'}</span>
            </div>
            <Badge className={cn("font-medium text-xs", getStatusColor(employee.status))}>
              {employee.status?.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'inactive':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'on_leave':
    case 'onleave':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'probation':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid');
  const { formatDate } = useOrgFormatters();

  const { data: employeesData, isLoading } = useEmployees({
    search: search || undefined,
    departmentId: department || undefined,
    status: statusFilter || undefined,
    page,
    limit: 12,
  });

  const { data: departments } = useDepartments();

  const employees = employeesData?.items || [];
  const totalPages = employeesData?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground">
            Manage your organization's employees
          </p>
        </div>
        <Button asChild>
          <Link href="/employees/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Building className="mr-2 h-4 w-4" />
              {department ? departments?.find(d => d.id === department)?.name : 'All Departments'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDepartment('')}>
              All Departments
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {departments?.map((dept) => (
              <DropdownMenuItem
                key={dept.id}
                onClick={() => setDepartment(dept.id)}
              >
                {dept.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {statusFilter ? statusFilter.replace('_', ' ') : 'All Status'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter('')}>All Status</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatusFilter('active')}>Active</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>Inactive</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('on_leave')}>On Leave</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('probation')}>Probation</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex-1" />
        <Button variant="outline" size="icon" title="Export">
          <Download className="h-4 w-4" />
        </Button>
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-r-none"
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-none border-x"
            onClick={() => setViewMode('list')}
            title="Table View"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-l-none"
            onClick={() => setViewMode('calendar')}
            title="Calendar View"
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Employee Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="relative overflow-hidden border shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-end -mt-2 -mr-2 mb-2">
                  <div className="h-8 w-8 rounded bg-muted animate-pulse" />
                </div>
                
                <div className="flex flex-col items-center gap-3 -mt-4">
                  {/* Avatar skeleton */}
                  <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
                  
                  {/* Name and code */}
                  <div className="text-center space-y-2">
                    <div className="h-5 w-32 bg-muted rounded mx-auto animate-pulse" />
                    <div className="h-3 w-24 bg-muted rounded mx-auto animate-pulse" />
                    <div className="h-4 w-28 bg-muted rounded mx-auto animate-pulse" />
                  </div>
                  
                  {/* Status badge */}
                  <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
                </div>
                
                {/* Contact info section */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2 p-1.5">
                    <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-40 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 p-1.5">
                    <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-28 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 p-1.5">
                    <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 p-1.5">
                    <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-36 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <Users className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Employees Found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {search || department || statusFilter
                ? 'Try adjusting your filters to find what you\'re looking for.'
                : 'Start building your team by adding employee profiles.'}
            </p>
            {!search && !department && !statusFilter && (
              <Button asChild size="lg">
                <Link href="/employees/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Employee
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        viewMode === 'calendar' ? (
          <EmployeeCalendarView employees={employees} />
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {employees.map((employee: Employee) => (
              <GlassEmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Employee</th>
                    <th className="text-left p-4 font-medium">Department</th>
                    <th className="text-left p-4 font-medium">Designation</th>
                    <th className="text-left p-4 font-medium">Contact</th>
                    <th className="text-left p-4 font-medium">Join Date</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee: Employee) => {
                    const avatarColor = getAvatarColor(employee.email || employee.id);
                    return (
                      <tr key={employee.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={employee.avatar} alt={employee.displayName} />
                              <AvatarFallback className={cn(avatarColor.className, "font-semibold")}>
                                {getInitials(employee.firstName, employee.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <Link
                                href={`/employees/${employee.id}`}
                                className="font-medium hover:underline"
                              >
                                {employee.firstName} {employee.lastName}
                              </Link>
                              <p className="text-sm text-muted-foreground">{employee.employeeCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-muted-foreground">
                            {employee.department?.name || '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-muted-foreground">
                            {employee.designation?.name || '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground truncate max-w-[200px]">{employee.email}</span>
                            </div>
                            {employee.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{employee.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-muted-foreground">
                            {employee.joinDate ? formatJoinedDate(employee.joinDate) : '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge className={cn("font-medium", getStatusColor(employee.status))}>
                            {employee.status?.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/employees/${employee.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/employees/${employee.id}/360`}>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  360° View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={`/employees/${employee.id}/edit`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {/* Pagination */}
      {totalPages > 1 && viewMode !== 'calendar' && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
