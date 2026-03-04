'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isBefore, startOfDay, getDaysInMonth, startOfMonth, getDay, isSameDay, isWeekend } from 'date-fns';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Gift,
  Building2,
  Users,
  List,
  CalendarDays,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { get } from '@/lib/api/client';
import { usePermissions } from '@/hooks/use-permissions';
import type { OrganizationSettings } from '@/app/(dashboard)/organization/types';
import { AIHolidayImportDialog } from '@/components/holidays/ai-holiday-import-dialog';
import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  usePreviewHolidayImport,
  useImportHolidays,
  downloadHolidayImportTemplate,
  Holiday,
  CreateHolidayInput,
  HolidayImportPreview,
} from '@/hooks/use-holidays';

const HOLIDAY_TYPES = [
  { value: 'public', label: 'Public Holiday', color: 'bg-rose-100 text-rose-800', calendarColor: 'bg-rose-500' },
  { value: 'optional', label: 'Optional Holiday', color: 'bg-amber-100 text-amber-800', calendarColor: 'bg-amber-500' },
  { value: 'restricted', label: 'Restricted Holiday', color: 'bg-purple-100 text-purple-800', calendarColor: 'bg-purple-500' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface HolidayFormData {
  name: string;
  date: string;
  type: 'public' | 'optional' | 'restricted';
  description: string;
  isRecurring: boolean;
  appliesToAll: boolean;
}

const initialFormData: HolidayFormData = {
  name: '',
  date: '',
  type: 'public',
  description: '',
  isRecurring: false,
  appliesToAll: true,
};

export default function HolidaysPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAIImportDialogOpen, setIsAIImportDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState<HolidayFormData>(initialFormData);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<HolidayImportPreview | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // Permission check - only users with holidays:write can add/edit/delete
  const { can } = usePermissions();
  const canWriteHolidays = can('holidays:write');

  // Fetch organization settings for enabled holiday types
  const { data: orgSettingsResponse } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: () => get<{ settings: OrganizationSettings }>('/api/v1/organization/settings'),
  });
  const orgSettings = orgSettingsResponse?.settings;
  const enabledHolidayTypes = orgSettings?.enabledHolidayTypes || { public: true, optional: true, restricted: true };

  // Filter HOLIDAY_TYPES based on organization settings
  const availableHolidayTypes = useMemo(() => {
    return HOLIDAY_TYPES.filter(type => enabledHolidayTypes[type.value as keyof typeof enabledHolidayTypes] !== false);
  }, [enabledHolidayTypes]);

  // Queries
  const { data: holidaysResponse, isLoading, error } = useHolidays({ year: selectedYear });
  const holidays = holidaysResponse?.data || [];

  // Mutations
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const previewImport = usePreviewHolidayImport();
  const importHolidays = useImportHolidays();

  // Filter holidays by type
  const filteredHolidays = useMemo(() => {
    if (selectedType === 'all') return holidays;
    return holidays.filter((h) => h.type === selectedType);
  }, [holidays, selectedType]);

  // Group holidays by month
  const holidaysByMonth = useMemo(() => {
    const grouped: Record<number, Holiday[]> = {};
    filteredHolidays.forEach((holiday) => {
      const month = parseISO(holiday.date).getMonth();
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(holiday);
    });
    // Sort holidays within each month by date
    Object.keys(grouped).forEach((month) => {
      grouped[parseInt(month)].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });
    return grouped;
  }, [filteredHolidays]);

  // Create holiday lookup by date string for calendar view
  const holidaysByDate = useMemo(() => {
    const map: Record<string, Holiday[]> = {};
    filteredHolidays.forEach((holiday) => {
      const dateKey = holiday.date.split('T')[0]; // YYYY-MM-DD
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(holiday);
    });
    return map;
  }, [filteredHolidays]);

  // Stats
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    return {
      total: holidays.length,
      public: holidays.filter((h) => h.type === 'public').length,
      optional: holidays.filter((h) => h.type === 'optional').length,
      restricted: holidays.filter((h) => h.type === 'restricted').length,
      upcoming: holidays.filter((h) => !isBefore(parseISO(h.date), today)).length,
    };
  }, [holidays]);

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: holiday.date.split('T')[0],
        type: holiday.type,
        description: holiday.description || '',
        isRecurring: holiday.isRecurring,
        appliesToAll: holiday.appliesToAll,
      });
    } else {
      setEditingHoliday(null);
      // Set default type to first available holiday type
      const defaultType = availableHolidayTypes.length > 0 
        ? availableHolidayTypes[0].value as 'public' | 'optional' | 'restricted'
        : 'public';
      setFormData({ ...initialFormData, type: defaultType });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingHoliday(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.date) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      const payload: CreateHolidayInput = {
        name: formData.name,
        date: formData.date,
        type: formData.type,
        description: formData.description || undefined,
        isRecurring: formData.isRecurring,
        appliesToAll: formData.appliesToAll,
      };

      if (editingHoliday) {
        await updateHoliday.mutateAsync({ id: editingHoliday.id, data: payload });
        toast.success(`${formData.name} has been updated successfully.`);
      } else {
        await createHoliday.mutateAsync(payload);
        toast.success(`${formData.name} has been added to the calendar.`);
      }
      handleCloseDialog();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save holiday.');
    }
  };

  const handleDelete = async () => {
    if (!deletingHoliday) return;

    try {
      await deleteHoliday.mutateAsync(deletingHoliday.id);
      toast.success(`${deletingHoliday.name} has been removed.`);
      setIsDeleteDialogOpen(false);
      setDeletingHoliday(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete holiday.');
    }
  };

  const openDeleteDialog = (holiday: Holiday) => {
    setDeletingHoliday(holiday);
    setIsDeleteDialogOpen(true);
  };

  // Import handlers
  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      await downloadHolidayImportTemplate();
      toast.success('Template downloaded successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportPreview(null);

    try {
      const preview = await previewImport.mutateAsync(file);
      setImportPreview(preview);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to parse file');
      setImportFile(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      const result = await importHolidays.mutateAsync({ file: importFile, skipDuplicates: true });
      toast.success(`Successfully imported ${result.created} holidays`);
      setIsImportDialogOpen(false);
      setImportFile(null);
      setImportPreview(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to import holidays');
    }
  };

  const handleCloseImportDialog = () => {
    setIsImportDialogOpen(false);
    setImportFile(null);
    setImportPreview(null);
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = HOLIDAY_TYPES.find((t) => t.value === type);
    return (
      <Badge className={typeConfig?.color || 'bg-gray-100 text-gray-800'}>
        {typeConfig?.label || type}
      </Badge>
    );
  };

  const isPastHoliday = (date: string) => {
    return isBefore(parseISO(date), startOfDay(new Date()));
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load holidays. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Holidays Calendar</h1>
          <p className="text-muted-foreground">
            Manage company holidays and special events
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canWriteHolidays && (
            <>
              <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => setIsAIImportDialogOpen(true)}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI Import
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Generate holidays using AI</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Holiday
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total Holidays</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">
                    {isLoading ? <Skeleton className="h-9 w-16" /> : stats.total}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">For {selectedYear}</p>
              </div>
              <div className="p-4 rounded-full bg-blue-500/10">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Public Holidays</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold text-rose-600">
                    {isLoading ? <Skeleton className="h-9 w-16" /> : stats.public}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Mandatory offs</p>
              </div>
              <div className="p-4 rounded-full bg-rose-500/10">
                <Gift className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Optional Holidays</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold text-amber-600">
                    {isLoading ? <Skeleton className="h-9 w-16" /> : stats.optional}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Choose any</p>
              </div>
              <div className="p-4 rounded-full bg-amber-500/10">
                <Building2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold text-green-600">
                    {isLoading ? <Skeleton className="h-9 w-16" /> : stats.upcoming}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Remaining this year</p>
              </div>
              <div className="p-4 rounded-full bg-green-500/10">
                <CalendarDays className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear((y) => y - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-lg min-w-[60px] text-center">
                {selectedYear}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear((y) => y + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {availableHolidayTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list')} className="ml-auto">
              <TabsList className="grid w-[200px] grid-cols-2">
                <TabsTrigger value="calendar" className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-1">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="text-sm text-muted-foreground">
              {filteredHolidays.length} holiday(s)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Year Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {MONTHS.map((monthName, monthIndex) => {
            const firstDayOfMonth = new Date(selectedYear, monthIndex, 1);
            const daysInMonth = getDaysInMonth(firstDayOfMonth);
            const startDay = getDay(startOfMonth(firstDayOfMonth)); // 0 = Sunday
            const monthHolidays = holidaysByMonth[monthIndex] || [];
            
            return (
              <Card key={monthName} className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{monthName}</CardTitle>
                    {monthHolidays.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {monthHolidays.length}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-2">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div
                        key={i}
                        className={cn(
                          'text-center text-[10px] font-medium py-1',
                          i === 0 || i === 6 ? 'text-muted-foreground' : 'text-foreground'
                        )}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before the first of the month */}
                    {Array.from({ length: startDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {/* Days of the month */}
                    {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                      const dayNum = dayIndex + 1;
                      const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const prevDateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum - 1).padStart(2, '0')}`;
                      const nextDateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum + 1).padStart(2, '0')}`;
                      const dayHolidays = holidaysByDate[dateStr] || [];
                      const prevDayHolidays = holidaysByDate[prevDateStr] || [];
                      const nextDayHolidays = holidaysByDate[nextDateStr] || [];
                      const currentDate = new Date(selectedYear, monthIndex, dayNum);
                      const isWeekendDay = isWeekend(currentDate);
                      const isPast = isBefore(currentDate, startOfDay(new Date()));
                      const isToday = isSameDay(currentDate, new Date());
                      
                      // Check if this holiday continues from previous day or to next day
                      const currentHolidayName = dayHolidays.length > 0 ? dayHolidays[0].name : null;
                      const prevHolidayName = prevDayHolidays.length > 0 ? prevDayHolidays[0].name : null;
                      const nextHolidayName = nextDayHolidays.length > 0 ? nextDayHolidays[0].name : null;
                      const isContinuedFromPrev = currentHolidayName && prevHolidayName && currentHolidayName === prevHolidayName;
                      const continuestoNext = currentHolidayName && nextHolidayName && currentHolidayName === nextHolidayName;

                      return (
                        <TooltipProvider key={dayNum}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'aspect-square flex items-center justify-center text-xs relative cursor-default transition-colors',
                                  // Weekend light gray background
                                  isWeekendDay && !dayHolidays.length && !isToday && 'bg-gray-100 dark:bg-gray-800 text-muted-foreground',
                                  // Past dates dimmed
                                  isPast && !dayHolidays.length && !isWeekendDay && !isToday && 'text-muted-foreground/50',
                                  // Today indicator - filled with blue color and bold (distinct from holiday colors)
                                  isToday && !dayHolidays.length && 'bg-blue-500 text-white font-bold',
                                  // Today with holiday - show holiday color but keep bold with blue ring
                                  isToday && dayHolidays.length > 0 && 'font-bold ring-2 ring-blue-500 ring-offset-1',
                                  // Holiday colors - Public = Rose, Optional = Amber, Restricted = Purple
                                  dayHolidays.length > 0 && dayHolidays[0].type === 'public' && 'bg-rose-500 text-white font-semibold',
                                  dayHolidays.length > 0 && dayHolidays[0].type === 'optional' && 'bg-amber-500 text-white font-semibold',
                                  dayHolidays.length > 0 && dayHolidays[0].type === 'restricted' && 'bg-purple-500 text-white font-semibold',
                                  // Rounded corners for continuous holidays
                                  dayHolidays.length > 0 && !isContinuedFromPrev && !continuestoNext && 'rounded-sm',
                                  dayHolidays.length > 0 && !isContinuedFromPrev && continuestoNext && 'rounded-l-sm',
                                  dayHolidays.length > 0 && isContinuedFromPrev && !continuestoNext && 'rounded-r-sm',
                                  dayHolidays.length > 0 && isContinuedFromPrev && continuestoNext && 'rounded-none',
                                  // No holiday - normal rounded
                                  !dayHolidays.length && 'rounded-sm',
                                )}
                              >
                                {dayNum}
                                {dayHolidays.length > 1 && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                                )}
                              </div>
                            </TooltipTrigger>
                            {dayHolidays.length > 0 && (
                              <TooltipContent 
                                side="top" 
                                className="max-w-[220px] bg-slate-800 border-slate-700 shadow-xl p-3"
                              >
                                <div className="space-y-2">
                                  {dayHolidays.map((h) => {
                                    const typeColors = {
                                      public: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                                      optional: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                                      restricted: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                                    };
                                    return (
                                      <div key={h.id} className="space-y-1.5">
                                        <p className="font-semibold text-sm text-white">{h.name}</p>
                                        <Badge 
                                          variant="outline" 
                                          className={cn(
                                            'text-xs font-medium capitalize',
                                            typeColors[h.type as keyof typeof typeColors] || 'bg-gray-500/20 text-gray-300'
                                          )}
                                        >
                                          {h.type} Holiday
                                        </Badge>
                                        {(isContinuedFromPrev || continuestoNext) && (
                                          <p className="text-xs text-slate-400 italic">Multi-day holiday</p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {viewMode === 'calendar' && (
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              {enabledHolidayTypes.public !== false && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-rose-500" />
                  <span>Public Holiday</span>
                </div>
              )}
              {enabledHolidayTypes.optional !== false && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-500" />
                  <span>Optional Holiday</span>
                </div>
              )}
              {enabledHolidayTypes.restricted !== false && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-500" />
                  <span>Restricted Holiday</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700" />
                <span>Weekend</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Holidays List by Month (List View) */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Holiday Name</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium hidden md:table-cell">Description</th>
                    {canWriteHolidays && <th className="text-right p-4 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-20" /></td>
                      <td className="p-4 hidden md:table-cell"><Skeleton className="h-4 w-48" /></td>
                      {canWriteHolidays && <td className="p-4 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : filteredHolidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="rounded-full bg-primary/10 p-6 mb-4">
                  <Calendar className="h-16 w-16 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No holidays found</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  No holidays found for {selectedYear}. Add holidays to keep your team informed.
                </p>
                {canWriteHolidays && (
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Holiday
                  </Button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Holiday Name</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium hidden md:table-cell">Description</th>
                    {canWriteHolidays && <th className="text-right p-4 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredHolidays.map((holiday) => (
                    <tr
                      key={holiday.id}
                      className={cn(
                        'border-b hover:bg-muted/50',
                        isPastHoliday(holiday.date) && 'opacity-60'
                      )}
                    >
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-medium">{format(parseISO(holiday.date), 'EEE, dd MMM yyyy')}</div>
                          {!isPastHoliday(holiday.date) && (
                            <div className="text-xs text-muted-foreground">
                              In {Math.ceil((parseISO(holiday.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{holiday.name}</span>
                          {holiday.isRecurring && (
                            <Badge variant="outline" className="text-xs">
                              Recurring
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{getTypeBadge(holiday.type)}</td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">
                        {holiday.description || '-'}
                      </td>
                      {canWriteHolidays && (
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(holiday)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(holiday)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
            </DialogTitle>
            <DialogDescription>
              {editingHoliday
                ? 'Update the holiday details below.'
                : 'Fill in the details to add a new holiday to the calendar.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Holiday Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Independence Day"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Holiday Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'public' | 'optional' | 'restricted') =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {availableHolidayTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recurring">Recurring Holiday</Label>
                <p className="text-sm text-muted-foreground">
                  Repeats every year on the same date
                </p>
              </div>
              <Switch
                id="recurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isRecurring: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="appliesToAll">Applies to All Employees</Label>
                <p className="text-sm text-muted-foreground">
                  Holiday applies to all departments
                </p>
              </div>
              <Switch
                id="appliesToAll"
                checked={formData.appliesToAll}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, appliesToAll: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createHoliday.isPending || updateHoliday.isPending}
            >
              {(createHoliday.isPending || updateHoliday.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingHoliday ? 'Update Holiday' : 'Add Holiday'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingHoliday?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteHoliday.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={handleCloseImportDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Holidays from Excel
            </DialogTitle>
            <DialogDescription>
              Upload an Excel file (.xlsx) to import multiple holidays at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Download Template Button */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Download Sample Template</p>
                  <p className="text-sm text-muted-foreground">
                    Use this template to ensure correct formatting
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
              >
                {isDownloadingTemplate ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="import-file">Select Excel File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={previewImport.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: .xlsx, .xls (max 5MB)
              </p>
            </div>

            {/* Loading State */}
            {previewImport.isPending && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Parsing file...</span>
              </div>
            )}

            {/* Preview Results */}
            {importPreview && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-700 dark:text-green-400">{importPreview.valid}</p>
                      <p className="text-xs text-green-600 dark:text-green-500">Valid</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-700 dark:text-amber-400">{importPreview.duplicates}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-500">Duplicates</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-700 dark:text-red-400">{importPreview.invalid}</p>
                      <p className="text-xs text-red-600 dark:text-red-500">Invalid</p>
                    </div>
                  </div>
                </div>

                {/* Preview Table */}
                {importPreview.preview.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2 border-b">
                      <p className="font-medium text-sm">Preview (first 10 records)</p>
                    </div>
                    <div className="max-h-[200px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.preview.map((h, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{h.name}</TableCell>
                              <TableCell>{h.date}</TableCell>
                              <TableCell>
                                {getTypeBadge(h.type)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Duplicate Details */}
                {importPreview.duplicateDetails.length > 0 && (
                  <div className="border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
                    <div className="bg-amber-50 dark:bg-amber-950/30 px-4 py-2 border-b border-amber-200 dark:border-amber-800">
                      <p className="font-medium text-sm text-amber-800 dark:text-amber-300">
                        Duplicate Holidays (will be skipped)
                      </p>
                    </div>
                    <div className="max-h-[150px] overflow-auto p-2">
                      {importPreview.duplicateDetails.slice(0, 5).map((d, i) => (
                        <div key={i} className="flex items-center justify-between py-1 px-2 text-sm">
                          <span>{d.holiday.name}</span>
                          <span className="text-muted-foreground">{d.holiday.date}</span>
                        </div>
                      ))}
                      {importPreview.duplicateDetails.length > 5 && (
                        <p className="text-xs text-muted-foreground px-2 py-1">
                          ...and {importPreview.duplicateDetails.length - 5} more
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Invalid Details */}
                {importPreview.invalidDetails.length > 0 && (
                  <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                    <div className="bg-red-50 dark:bg-red-950/30 px-4 py-2 border-b border-red-200 dark:border-red-800">
                      <p className="font-medium text-sm text-red-800 dark:text-red-300">
                        Invalid Rows (will be skipped)
                      </p>
                    </div>
                    <div className="max-h-[150px] overflow-auto p-2">
                      {importPreview.invalidDetails.slice(0, 5).map((inv, i) => (
                        <div key={i} className="py-1 px-2 text-sm">
                          <span className="text-red-600">Row {inv.row}:</span>{' '}
                          <span className="text-muted-foreground">{inv.message}</span>
                        </div>
                      ))}
                      {importPreview.invalidDetails.length > 5 && (
                        <p className="text-xs text-muted-foreground px-2 py-1">
                          ...and {importPreview.invalidDetails.length - 5} more
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseImportDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importPreview || importPreview.valid === 0 || importHolidays.isPending}
            >
              {importHolidays.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Import {importPreview?.valid || 0} Holidays
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Holiday Import Dialog */}
      <AIHolidayImportDialog
        open={isAIImportDialogOpen}
        onOpenChange={setIsAIImportDialogOpen}
        onImportSuccess={() => {
          // Refresh holidays list
        }}
        defaultYear={selectedYear}
      />
    </div>
  );
}
