'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarColor } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Calendar,
  Video,
  Phone,
  MapPin,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Trash2,
  CalendarDays,
  List,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import {
  interviewApi,
  Interview,
  InterviewType,
  InterviewStatus,
  interviewTypeLabels,
  interviewTypeColors,
  interviewStatusLabels,
  interviewStatusColors,
  interviewModeLabels,
} from '@/lib/api/interviews';
import { ScheduleInterviewDialog } from './_components/ScheduleInterviewDialog';
import { InterviewCalendarView } from './_components/InterviewCalendarView';

// ============================================================================
// INTERVIEW CARD COMPONENT
// ============================================================================

interface InterviewCardProps {
  interview: Interview;
  onView: (id: string) => void;
  onReschedule: (interview: Interview) => void;
  onCancel: (interview: Interview) => void;
  onJoin: (interview: Interview) => void;
}

function InterviewCard({ interview, onView, onReschedule, onCancel, onJoin }: InterviewCardProps) {
  const scheduledDate = new Date(interview.scheduledAt);
  
  const getModeIcon = () => {
    switch (interview.mode) {
      case 'VIDEO': return <Video className="h-4 w-4" />;
      case 'PHONE': return <Phone className="h-4 w-4" />;
      case 'IN_PERSON': return <MapPin className="h-4 w-4" />;
    }
  };

  const canJoin = interview.status === 'SCHEDULED' || interview.status === 'CONFIRMED' || interview.status === 'IN_PROGRESS';
  const isCompleted = interview.status === 'COMPLETED';
  const isCancelled = interview.status === 'CANCELLED' || interview.status === 'NO_SHOW';

  return (
    <Card 
      className={`transition-all hover:shadow-md cursor-pointer ${isCancelled ? 'opacity-60' : ''}`}
      onClick={() => onView(interview.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Time Column - Time big, date small, duration below */}
          <div className="flex-shrink-0 text-center min-w-[90px]">
            <div className="text-xl font-bold text-primary">
              {format(scheduledDate, 'h:mm a')}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(scheduledDate, 'MMM d, yyyy')}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {interview.duration} min
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Candidate Name & Job */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium truncate">
                {interview.candidate?.firstName} {interview.candidate?.lastName}
              </span>
              <span className="text-muted-foreground">-</span>
              <span className="text-sm text-muted-foreground truncate">
                {interview.job?.title}
              </span>
            </div>

            {/* Interview Type & Round */}
            <div className="flex items-center gap-2 mb-2">
              <Badge className={interviewTypeColors[interview.type]} variant="secondary">
                {interviewTypeLabels[interview.type]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Round {interview.roundNumber} of {interview.totalRounds}
              </span>
            </div>

            {/* Mode & Location */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                {getModeIcon()}
                <span>{interviewModeLabels[interview.mode]}</span>
              </div>
              {interview.meetingLink && (
                <span className="truncate max-w-[150px]">{interview.meetingLink}</span>
              )}
              {interview.location && (
                <span className="truncate">{interview.location}</span>
              )}
            </div>

            {/* Panelists */}
            {interview.panelists && interview.panelists.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Users className="h-3 w-3 text-muted-foreground" />
                <div className="flex -space-x-2">
                  {interview.panelists.slice(0, 3).map((panelist) => (
                    <Avatar key={panelist.id} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={panelist.employee?.avatar} />
                      <AvatarFallback className={`${getAvatarColor((panelist.employee?.email || '') + (panelist.employee?.firstName || '') + (panelist.employee?.lastName || '')).className} text-xs font-semibold`}>
                        {panelist.employee?.firstName?.[0]}{panelist.employee?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {interview.panelists.length > 3 && (
                    <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                      +{interview.panelists.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {interview.panelists.map(p => p.employee?.firstName).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Status & Actions */}
          <div className="flex flex-col items-end gap-2">
            <Badge className={interviewStatusColors[interview.status]}>
              {interviewStatusLabels[interview.status]}
            </Badge>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {canJoin && interview.meetingLink && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onJoin(interview)}
                  className="h-7 text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Join
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(interview.id); }}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {!isCompleted && !isCancelled && (
                    <>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReschedule(interview); }}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reschedule
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); onCancel(interview); }}
                        className="text-destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Interview
                      </DropdownMenuItem>
                    </>
                  )}
                  {isCompleted && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(interview.id); }}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View Feedback
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// INTERVIEW GROUP COMPONENT
// ============================================================================

interface InterviewGroupProps {
  title: string;
  interviews: Interview[];
  onView: (id: string) => void;
  onReschedule: (interview: Interview) => void;
  onCancel: (interview: Interview) => void;
  onJoin: (interview: Interview) => void;
}

function InterviewGroup({ title, interviews, onView, onReschedule, onCancel, onJoin }: InterviewGroupProps) {
  if (interviews.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {interviews.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {interviews.map((interview) => (
          <InterviewCard
            key={interview.id}
            interview={interview}
            onView={onView}
            onReschedule={onReschedule}
            onCancel={onCancel}
            onJoin={onJoin}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// STATS CARDS COMPONENT
// ============================================================================

interface StatsCardsProps {
  stats: {
    upcomingToday: number;
    upcomingWeek: number;
    upcomingAll: number;
    upcomingExcludingToday: number;
    totalScheduled: number;
    totalCompleted: number;
    passRate: number;
  };
}

function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-2xl font-bold">{stats.upcomingToday}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-bold">{stats.totalScheduled}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{stats.totalCompleted}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pass Rate</p>
              <p className="text-2xl font-bold">{stats.passRate}%</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SKELETON LOADER FOR INTERVIEW LIST ONLY
// ============================================================================

function InterviewListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-12 w-20" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// SKELETON LOADER FOR INITIAL PAGE LOAD
// ============================================================================

function InterviewsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Filters Skeleton */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <Skeleton className="h-10 w-[280px]" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[160px]" />
          <Skeleton className="h-10 w-[140px]" />
          <Skeleton className="h-10 w-[80px]" />
        </div>
      </div>
      
      {/* Interview Cards Skeleton */}
      <InterviewListSkeleton />
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function InterviewsPage() {
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [stats, setStats] = useState({
    upcomingToday: 0,
    upcomingWeek: 0,
    upcomingAll: 0,
    upcomingExcludingToday: 0,
    totalScheduled: 0,
    totalCompleted: 0,
    passRate: 0,
  });
  
  // Filter states
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past' | 'all'>('today');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<InterviewType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | 'all'>('all');
  
  // Dialog states
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [interviewToCancel, setInterviewToCancel] = useState<Interview | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [interviewToReschedule, setInterviewToReschedule] = useState<Interview | null>(null);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true);
      await Promise.all([loadInterviewsData(), loadStats()]);
      setInitialLoading(false);
    };
    loadInitialData();
  }, []);

  // Load interviews when filters change (not initial load)
  useEffect(() => {
    if (!initialLoading) {
      loadInterviews();
    }
  }, [activeTab, typeFilter, statusFilter, searchTerm]);

  const loadInterviewsData = async () => {
    try {
      let data: Interview[] = [];
      
      switch (activeTab) {
        case 'today':
          data = await interviewApi.getTodayInterviews();
          break;
        case 'upcoming':
          data = await interviewApi.getUpcomingInterviews();
          break;
        case 'past':
          data = await interviewApi.getPastInterviews();
          break;
        case 'all':
        default:
          data = await interviewApi.getInterviews({
            type: typeFilter !== 'all' ? typeFilter : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            search: searchTerm || undefined,
          });
      }
      
      setInterviews(data);
    } catch (error) {
      console.error('Failed to load interviews:', error);
      toast.error('Failed to load interviews');
    }
  };

  const loadInterviews = async () => {
    try {
      setListLoading(true);
      await loadInterviewsData();
    } finally {
      setListLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await interviewApi.getStats();
      setStats({
        upcomingToday: data.upcomingToday,
        upcomingWeek: data.upcomingWeek,
        upcomingAll: data.upcomingAll,
        upcomingExcludingToday: data.upcomingExcludingToday,
        totalScheduled: data.totalScheduled,
        totalCompleted: data.totalCompleted,
        passRate: data.passRate,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Group interviews by date
  const groupInterviewsByDate = (interviews: Interview[]) => {
    const today: Interview[] = [];
    const tomorrow: Interview[] = [];
    const thisWeek: Interview[] = [];
    const nextWeek: Interview[] = [];
    const others: Interview[] = [];
    const past: Interview[] = [];

    const now = new Date();
    const endOfThisWeek = addDays(startOfDay(now), 7);
    const endOfNextWeek = addDays(startOfDay(now), 14);

    interviews.forEach((interview) => {
      const date = new Date(interview.scheduledAt);
      
      if (date < startOfDay(now)) {
        past.push(interview);
      } else if (isToday(date)) {
        today.push(interview);
      } else if (isTomorrow(date)) {
        tomorrow.push(interview);
      } else if (date < endOfThisWeek) {
        thisWeek.push(interview);
      } else if (date < endOfNextWeek) {
        nextWeek.push(interview);
      } else {
        others.push(interview);
      }
    });

    return { today, tomorrow, thisWeek, nextWeek, others, past };
  };

  const groupedInterviews = groupInterviewsByDate(interviews);

  // Handlers
  const handleView = (id: string) => {
    router.push(`/hr/interviews/${id}`);
  };

  const handleReschedule = (interview: Interview) => {
    setInterviewToReschedule(interview);
    setRescheduleDialogOpen(true);
  };

  const handleCancel = (interview: Interview) => {
    setInterviewToCancel(interview);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!interviewToCancel) return;
    
    try {
      await interviewApi.cancelInterview(interviewToCancel.id);
      toast.success('Interview cancelled successfully');
      loadInterviews();
      loadStats();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel interview');
    } finally {
      setCancelDialogOpen(false);
      setInterviewToCancel(null);
    }
  };

  const handleJoin = (interview: Interview) => {
    if (interview.meetingLink) {
      window.open(interview.meetingLink, '_blank');
    }
  };

  const handleScheduleSuccess = () => {
    setScheduleDialogOpen(false);
    loadInterviews();
    loadStats();
    toast.success('Interview scheduled successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interviews</h1>
          <p className="text-muted-foreground mt-2">
            Schedule and manage candidate interviews
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/hr/interviews/analytics')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => setScheduleDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Interview
          </Button>
        </div>
      </div>

      {/* Show full skeleton only for initial loading */}
      {initialLoading ? (
        <InterviewsSkeleton />
      ) : (
        <>
          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList>
                  <TabsTrigger value="today" className="gap-2">
                    Today
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      {stats.upcomingToday}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="upcoming" className="gap-2">
                    Upcoming
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      {stats.upcomingExcludingToday}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="past">Past</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>

              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as InterviewType | 'all')}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Interview Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="PHONE_SCREEN">Phone Screen</SelectItem>
                  <SelectItem value="TECHNICAL">Technical</SelectItem>
                  <SelectItem value="HR">HR Round</SelectItem>
                  <SelectItem value="MANAGER">Manager Round</SelectItem>
                  <SelectItem value="FINAL">Final Round</SelectItem>
                  <SelectItem value="ASSIGNMENT">Assignment</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InterviewStatus | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="rounded-l-none"
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content - Show skeleton only for list when switching tabs */}
          <div className="min-h-[300px]">
            {listLoading ? (
              <InterviewListSkeleton />
            ) : viewMode === 'calendar' ? (
              <InterviewCalendarView interviews={interviews} onView={handleView} />
            ) : interviews.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No interviews found</h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === 'today'
                      ? "You don't have any interviews scheduled for today."
                      : activeTab === 'upcoming'
                      ? 'No upcoming interviews scheduled.'
                      : activeTab === 'past'
                      ? 'No past interviews found.'
                      : 'No interviews match your filters.'}
                  </p>
                  <Button onClick={() => setScheduleDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule an Interview
                  </Button>
                </CardContent>
              </Card>
            ) : activeTab === 'all' ? (
              <div className="space-y-6">
                {interviews.map((interview) => (
                  <InterviewCard
                    key={interview.id}
                    interview={interview}
                    onView={handleView}
                    onReschedule={handleReschedule}
                    onCancel={handleCancel}
                    onJoin={handleJoin}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                <InterviewGroup
                  title="Today"
                  interviews={groupedInterviews.today}
                  onView={handleView}
                  onReschedule={handleReschedule}
                  onCancel={handleCancel}
                  onJoin={handleJoin}
                />
                <InterviewGroup
                  title="Tomorrow"
                  interviews={groupedInterviews.tomorrow}
                  onView={handleView}
                  onReschedule={handleReschedule}
                  onCancel={handleCancel}
                  onJoin={handleJoin}
                />
                <InterviewGroup
                  title="This Week"
                  interviews={groupedInterviews.thisWeek}
                  onView={handleView}
                onReschedule={handleReschedule}
                onCancel={handleCancel}
                onJoin={handleJoin}
              />
              <InterviewGroup
                title="Next Week"
                interviews={groupedInterviews.nextWeek}
                onView={handleView}
                onReschedule={handleReschedule}
                onCancel={handleCancel}
                onJoin={handleJoin}
              />
              <InterviewGroup
                title="Others"
                interviews={groupedInterviews.others}
                onView={handleView}
                onReschedule={handleReschedule}
                onCancel={handleCancel}
                onJoin={handleJoin}
              />
              <InterviewGroup
                title="Past"
                interviews={groupedInterviews.past}
                onView={handleView}
                onReschedule={handleReschedule}
                onCancel={handleCancel}
                onJoin={handleJoin}
              />
            </div>
          )}
          </div>
        </>
      )}

      {/* Schedule Interview Dialog */}
      <ScheduleInterviewDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSuccess={handleScheduleSuccess}
      />

      {/* Reschedule Dialog */}
      <ScheduleInterviewDialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        interview={interviewToReschedule}
        mode="reschedule"
        onSuccess={() => {
          setRescheduleDialogOpen(false);
          setInterviewToReschedule(null);
          loadInterviews();
          toast.success('Interview rescheduled successfully');
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Interview?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this interview with{' '}
              <strong>
                {interviewToCancel?.candidate?.firstName} {interviewToCancel?.candidate?.lastName}
              </strong>
              ? This action will notify all participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Interview</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive text-destructive-foreground">
              Cancel Interview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
