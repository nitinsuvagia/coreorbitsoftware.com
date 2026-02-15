'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarDays,
  Award,
  Users,
  Clock,
  Filter,
  RefreshCw,
  Cake,
  Sun,
  Briefcase,
  PartyPopper,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Types
interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  description?: string;
  isRecurring: boolean;
  appliesToAll: boolean;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
  totalDays: string;
  isHalfDay: boolean;
  halfDayType?: string;
  reason?: string;
  status: string;
  leaveType: {
    name: string;
    code: string;
    color?: string;
  };
  employee: {
    firstName: string;
    lastName: string;
    avatar?: string;
    department?: {
      name: string;
    };
  };
}

interface Celebration {
  id: string;
  type: 'birthday' | 'anniversary';
  date: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    department?: {
      name: string;
    };
  };
  years?: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  endDate?: Date;
  type: 'HOLIDAY' | 'LEAVE' | 'BIRTHDAY' | 'ANNIVERSARY';
  color: string;
  icon: 'holiday' | 'leave' | 'birthday' | 'anniversary';
  metadata?: {
    employee?: {
      firstName: string;
      lastName: string;
      avatar?: string;
      department?: string;
    };
    leaveType?: string;
    years?: number;
    isHalfDay?: boolean;
    totalDays?: string;
  };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Event type configuration
const EVENT_CONFIG = {
  HOLIDAY: {
    color: 'bg-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    textColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: Sun,
    label: 'Holidays',
  },
  LEAVE: {
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: CalendarDays,
    label: 'Leaves',
  },
  BIRTHDAY: {
    color: 'bg-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    textColor: 'text-pink-700 dark:text-pink-300',
    borderColor: 'border-pink-200 dark:border-pink-800',
    icon: Cake,
    label: 'Birthdays',
  },
  ANNIVERSARY: {
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    textColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-200 dark:border-purple-800',
    icon: Award,
    label: 'Work Anniversaries',
  },
};

// Date utilities
function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(date: Date, includeYear = false): string {
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  if (includeYear) {
    return `${month} ${day}, ${date.getFullYear()}`;
  }
  return `${month} ${day}`;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

function formatRelativeDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface CalendarSectionProps {
  loading?: boolean;
}

export function CalendarSection({ loading: parentLoading = false }: CalendarSectionProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState<CalendarEvent | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    HOLIDAY: true,
    LEAVE: true,
    BIRTHDAY: true,
    ANNIVERSARY: true,
  });

  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch all HR data
  const fetchCalendarData = useCallback(async () => {
    try {
      // Parallel API calls for better performance
      const [holidaysRes, leavesRes, celebrationsRes] = await Promise.allSettled([
        apiClient.get<Holiday[]>('/api/v1/holidays'),
        apiClient.get<LeaveRequest[]>('/api/v1/attendance/leaves/requests?status=approved'),
        apiClient.get<{ birthdays: Celebration[]; workAnniversaries: Celebration[] }>('/api/v1/employees/upcoming-events'),
      ]);

      const calendarEvents: CalendarEvent[] = [];

      // Process holidays
      if (holidaysRes.status === 'fulfilled' && holidaysRes.value.success !== false) {
        const holidays = holidaysRes.value.data || [];
        holidays.forEach((holiday) => {
          const holidayDate = new Date(holiday.date);
          calendarEvents.push({
            id: `holiday-${holiday.id}`,
            title: holiday.name,
            description: holiday.description,
            date: holidayDate,
            type: 'HOLIDAY',
            color: EVENT_CONFIG.HOLIDAY.color,
            icon: 'holiday',
          });
        });
      }

      // Process approved leaves - single event per leave request with date range
      if (leavesRes.status === 'fulfilled' && leavesRes.value.success !== false) {
        const leaves = leavesRes.value.data || [];
        leaves.forEach((leave) => {
          const fromDate = new Date(leave.fromDate);
          fromDate.setHours(0, 0, 0, 0);
          const toDate = new Date(leave.toDate);
          toDate.setHours(0, 0, 0, 0);
          
          // Create single event with date range
          calendarEvents.push({
            id: `leave-${leave.id}`,
            title: `${leave.employee.firstName} ${leave.employee.lastName} - ${leave.leaveType.name}`,
            date: fromDate,
            endDate: toDate,
            type: 'LEAVE',
            color: leave.leaveType.color || EVENT_CONFIG.LEAVE.color,
            icon: 'leave',
            metadata: {
              employee: {
                firstName: leave.employee.firstName,
                lastName: leave.employee.lastName,
                avatar: leave.employee.avatar,
                department: leave.employee.department?.name,
              },
              leaveType: leave.leaveType.name,
              isHalfDay: leave.isHalfDay,
              totalDays: leave.totalDays,
            },
          });
        });
      }

      // Process birthdays and anniversaries
      if (celebrationsRes.status === 'fulfilled' && celebrationsRes.value.success !== false) {
        const { birthdays = [], workAnniversaries = [] } = celebrationsRes.value.data || {};
        
        birthdays.forEach((birthday) => {
          const birthdayDate = new Date(birthday.date);
          calendarEvents.push({
            id: `birthday-${birthday.employee.id}`,
            title: `${birthday.employee.firstName} ${birthday.employee.lastName}'s Birthday`,
            date: birthdayDate,
            type: 'BIRTHDAY',
            color: EVENT_CONFIG.BIRTHDAY.color,
            icon: 'birthday',
            metadata: {
              employee: {
                firstName: birthday.employee.firstName,
                lastName: birthday.employee.lastName,
                avatar: birthday.employee.avatar,
                department: birthday.employee.department?.name,
              },
            },
          });
        });

        workAnniversaries.forEach((anniversary) => {
          const anniversaryDate = new Date(anniversary.date);
          calendarEvents.push({
            id: `anniversary-${anniversary.employee.id}`,
            title: `${anniversary.employee.firstName} ${anniversary.employee.lastName} - ${anniversary.years} Year${anniversary.years !== 1 ? 's' : ''} Work Anniversary`,
            date: anniversaryDate,
            type: 'ANNIVERSARY',
            color: EVENT_CONFIG.ANNIVERSARY.color,
            icon: 'anniversary',
            metadata: {
              employee: {
                firstName: anniversary.employee.firstName,
                lastName: anniversary.employee.lastName,
                avatar: anniversary.employee.avatar,
                department: anniversary.employee.department?.name,
              },
              years: anniversary.years,
            },
          });
        });
      }

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchCalendarData();
  }, [fetchCalendarData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCalendarData();
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, daysInPrevMonth - i),
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }
    
    return days;
  }, [year, month]);

  // Filter events by type
  const filteredEvents = useMemo(() => {
    return events.filter((event) => filters[event.type]);
  }, [events, filters]);

  // Check if a date falls within an event's date range
  const isDateInEventRange = useCallback((date: Date, event: CalendarEvent) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const eventStart = new Date(event.date);
    eventStart.setHours(0, 0, 0, 0);
    const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
    eventEnd.setHours(0, 0, 0, 0);
    return checkDate >= eventStart && checkDate <= eventEnd;
  }, []);

  // Get the duration of an event in days
  const getEventDuration = useCallback((event: CalendarEvent) => {
    const eventStart = new Date(event.date);
    eventStart.setHours(0, 0, 0, 0);
    const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
    eventEnd.setHours(0, 0, 0, 0);
    return Math.ceil((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, []);

  // Get events for a specific date (including multi-day events), sorted by duration desc
  const getEventsForDate = useCallback((date: Date) => {
    return filteredEvents
      .filter((event) => isDateInEventRange(date, event))
      .sort((a, b) => getEventDuration(b) - getEventDuration(a));
  }, [filteredEvents, isDateInEventRange, getEventDuration]);

  // Get event position info for multi-day rendering
  const getEventPositionInfo = useCallback((date: Date, event: CalendarEvent) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const eventStart = new Date(event.date);
    eventStart.setHours(0, 0, 0, 0);
    const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
    eventEnd.setHours(0, 0, 0, 0);
    
    const isStart = checkDate.getTime() === eventStart.getTime();
    const isEnd = checkDate.getTime() === eventEnd.getTime();
    const isMiddle = checkDate > eventStart && checkDate < eventEnd;
    const totalDays = Math.ceil((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Check if event continues to next week (for spanning calculation)
    const dayOfWeek = checkDate.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const continuesNextWeek = !isEnd && isSaturday;
    const continuedFromLastWeek = !isStart && isSunday;
    
    return { isStart, isEnd, isMiddle, totalDays, continuesNextWeek, continuedFromLastWeek };
  }, []);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return getEventsForDate(selectedDate);
  }, [selectedDate, getEventsForDate]);

  // Upcoming events (next 30 days, including today)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return filteredEvents
      .filter((event) => event.date >= now && event.date <= thirtyDaysFromNow)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 8);
  }, [filteredEvents]);

  // Events for current month view (for display count)
  const currentMonthEvents = useMemo(() => {
    const monthStart = new Date(year, month, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    return filteredEvents.filter((event) => {
      const eventStart = new Date(event.date);
      const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
      // Event overlaps with current month if it starts before month ends AND ends after month starts
      return eventStart <= monthEnd && eventEnd >= monthStart;
    });
  }, [filteredEvents, year, month]);

  // Navigation functions
  const previousMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Get event icon
  const getEventIcon = (type: CalendarEvent['type']) => {
    const IconComponent = EVENT_CONFIG[type].icon;
    return <IconComponent className="h-3 w-3" />;
  };

  const globalLoading = isLoading || parentLoading;

  return (
    <div className="space-y-4">
      {/* Legend / Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filter:
            </div>
            {(Object.keys(EVENT_CONFIG) as Array<keyof typeof EVENT_CONFIG>).map((type) => {
              const config = EVENT_CONFIG[type];
              const IconComponent = config.icon;
              return (
                <label
                  key={type}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-full border transition-all",
                    filters[type]
                      ? `${config.bgColor} ${config.borderColor}`
                      : "bg-muted/50 border-transparent opacity-50"
                  )}
                >
                  <Checkbox
                    checked={filters[type]}
                    onCheckedChange={(checked) =>
                      setFilters((prev) => ({ ...prev, [type]: checked === true }))
                    }
                    className="hidden"
                  />
                  <span className={cn("w-3 h-3 rounded-full", config.color)} />
                  <IconComponent className={cn("h-4 w-4", filters[type] ? config.textColor : "text-muted-foreground")} />
                  <span className={cn("text-sm font-medium", filters[type] ? config.textColor : "text-muted-foreground")}>
                    {config.label}
                  </span>
                </label>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={globalLoading || isRefreshing}
              className="ml-auto"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Calendar */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg sm:text-xl font-semibold min-w-[180px] text-center">
                {MONTHS[month]} {year}
              </h3>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToToday} className="hidden sm:flex">
                Today
              </Button>
            </div>
            <div className="text-sm text-muted-foreground hidden md:block">
              {currentMonthEvents.length} events this month
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {globalLoading ? (
              <div className="space-y-2 p-4">
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((day) => (
                    <Skeleton key={day} className="h-8 w-full" />
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {[...Array(35)].map((_, i) => (
                    <Skeleton key={i} className="h-20 sm:h-24 w-full" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Days header */}
                <div className="grid grid-cols-7 border-b">
                  {DAYS.map((day, index) => (
                    <div
                      key={day}
                      className={cn(
                        "py-3 text-center text-xs sm:text-sm font-semibold",
                        index === 0 || index === 6
                          ? "text-muted-foreground"
                          : "text-foreground"
                      )}
                    >
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day.charAt(0)}</span>
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((dayInfo, index) => {
                    const dayEvents = getEventsForDate(dayInfo.date);
                    const isToday = isSameDay(dayInfo.date, today);
                    const isSelected = selectedDate && isSameDay(dayInfo.date, selectedDate);
                    const isWeekend = dayInfo.date.getDay() === 0 || dayInfo.date.getDay() === 6;
                    
                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedDate(dayInfo.date)}
                        className={cn(
                          "min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r cursor-pointer transition-colors hover:bg-muted/50",
                          !dayInfo.isCurrentMonth && "bg-muted/30",
                          isSelected && "bg-primary/5 ring-2 ring-primary ring-inset",
                          isWeekend && dayInfo.isCurrentMonth && "bg-muted/20"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 text-xs sm:text-sm font-medium rounded-full",
                              isToday && "bg-primary text-primary-foreground",
                              !isToday && !dayInfo.isCurrentMonth && "text-muted-foreground",
                              !isToday && dayInfo.isCurrentMonth && "text-foreground"
                            )}
                          >
                            {dayInfo.day}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-[10px] text-muted-foreground hidden sm:block">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>

                        {/* Events */}
                        <div className="mt-1 space-y-0.5 sm:space-y-1">
                          <TooltipProvider>
                            {dayEvents.slice(0, 3).map((event) => {
                              const config = EVENT_CONFIG[event.type];
                              const positionInfo = getEventPositionInfo(dayInfo.date, event);
                              const isMultiDay = positionInfo.totalDays > 1;
                              
                              return (
                                <Tooltip key={event.id}>
                                  <TooltipTrigger asChild>
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEventDetail(event);
                                      }}
                                      className={cn(
                                        "text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 truncate cursor-pointer transition-transform hover:scale-[1.02] border",
                                        config.bgColor,
                                        config.textColor,
                                        config.borderColor,
                                        // Multi-day spanning bar styles
                                        isMultiDay ? [
                                          // Start of multi-day event
                                          positionInfo.isStart && "rounded-l-md rounded-r-none -mr-2 pr-3",
                                          // End of multi-day event
                                          positionInfo.isEnd && "rounded-r-md rounded-l-none -ml-2 pl-3",
                                          // Middle of multi-day event
                                          positionInfo.isMiddle && "rounded-none -mx-2 px-3",
                                          // Continues to next week (no right rounding)
                                          positionInfo.continuesNextWeek && !positionInfo.isEnd && "rounded-r-none -mr-2 pr-3",
                                          // Continued from last week (no left rounding)
                                          positionInfo.continuedFromLastWeek && !positionInfo.isStart && "rounded-l-none -ml-2 pl-3",
                                        ] : "rounded"
                                      )}
                                    >
                                      {/* Show title only on first day or first day of week for multi-day events */}
                                      {(!isMultiDay || positionInfo.isStart || positionInfo.continuedFromLastWeek) ? (
                                        <>
                                          <span className="hidden sm:inline">{event.title}</span>
                                          <span className="sm:hidden flex items-center gap-0.5">
                                            {getEventIcon(event.type)}
                                          </span>
                                        </>
                                      ) : (
                                        <span className="opacity-0">·</span>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="font-medium">{event.title}</p>
                                    {isMultiDay && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {formatDate(event.date)} - {formatDate(event.endDate!, true)} ({positionInfo.totalDays} days)
                                      </p>
                                    )}
                                    {event.description && (
                                      <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <div className="text-[10px] sm:text-xs text-muted-foreground px-1">
                                +{dayEvents.length - 3} more
                              </div>
                            )}
                          </TooltipProvider>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected Date Events */}
          <Card className="h-[300px] flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                {selectedDate ? (
                  <>
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </>
                ) : (
                  'Select a Date'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden pb-4">
              <ScrollArea className="h-full pr-2">
                {selectedDateEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No events on this day
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => {
                      const config = EVENT_CONFIG[event.type];
                      const IconComponent = config.icon;
                      return (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEventDetail(event)}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                            config.bgColor,
                            config.borderColor
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn("p-1.5 rounded-md shrink-0", config.color, "text-white")}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm font-medium truncate", config.textColor)}>
                                {event.title}
                              </p>
                              {event.metadata?.employee && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {event.metadata.employee.department}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="h-[300px] flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden pb-4">
              <ScrollArea className="h-full pr-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming events
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => {
                      const config = EVENT_CONFIG[event.type];
                      const IconComponent = config.icon;
                      const isMultiDay = event.endDate && !isSameDay(event.date, event.endDate);
                      const totalDays = isMultiDay 
                        ? Math.ceil((event.endDate!.getTime() - event.date.getTime()) / (1000 * 60 * 60 * 24)) + 1
                        : 1;
                      return (
                        <div
                          key={event.id}
                          onClick={() => {
                            setSelectedDate(event.date);
                            setCurrentDate(event.date);
                            setSelectedEventDetail(event);
                          }}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <div className={cn("p-1.5 rounded-md shrink-0", config.color, "text-white")}>
                            <IconComponent className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {isMultiDay ? (
                                <>{formatDate(event.date)} - {formatDate(event.endDate!, true)} ({totalDays} days)</>
                              ) : (
                                formatRelativeDate(event.date)
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                {MONTHS[month]} Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(EVENT_CONFIG) as Array<keyof typeof EVENT_CONFIG>).map((type) => {
                  const config = EVENT_CONFIG[type];
                  const monthEvents = events.filter(
                    (e) =>
                      e.type === type &&
                      e.date.getMonth() === month &&
                      e.date.getFullYear() === year
                  );
                  
                  // For leaves, sum total days; for others, count events
                  const count = type === 'LEAVE' 
                    ? monthEvents.reduce((total, e) => {
                        const startDate = new Date(e.date);
                        const endDate = e.endDate ? new Date(e.endDate) : startDate;
                        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        return total + days;
                      }, 0)
                    : monthEvents.length;
                  
                  const label = type === 'LEAVE' ? 'Leave Days' : config.label;
                  const IconComponent = config.icon;
                  
                  return (
                    <div
                      key={type}
                      className={cn(
                        "p-3 rounded-lg border text-center",
                        config.bgColor,
                        config.borderColor
                      )}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <IconComponent className={cn("h-4 w-4", config.textColor)} />
                        <span className={cn("text-xl font-bold", config.textColor)}>
                          {count}
                        </span>
                      </div>
                      <p className={cn("text-xs mt-1", config.textColor)}>
                        {label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEventDetail} onOpenChange={(open) => !open && setSelectedEventDetail(null)}>
        <DialogContent className="sm:max-w-[425px]">
          {selectedEventDetail && (() => {
            const config = EVENT_CONFIG[selectedEventDetail.type];
            const IconComponent = config.icon;
            
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg", config.color, "text-white")}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <DialogTitle className="text-lg">{selectedEventDetail.title}</DialogTitle>
                      <DialogDescription className="mt-1">
                        <Badge variant="outline" className={cn(config.bgColor, config.textColor, "border-0")}>
                          {config.label.slice(0, -1)}
                        </Badge>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Date */}
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedEventDetail.date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Description */}
                  {selectedEventDetail.description && (
                    <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                      {selectedEventDetail.description}
                    </div>
                  )}

                  {/* Employee Details */}
                  {selectedEventDetail.metadata?.employee && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {selectedEventDetail.metadata.employee.firstName} {selectedEventDetail.metadata.employee.lastName}
                        </p>
                        {selectedEventDetail.metadata.employee.department && (
                          <p className="text-xs text-muted-foreground">
                            {selectedEventDetail.metadata.employee.department}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Leave specific info */}
                  {selectedEventDetail.type === 'LEAVE' && selectedEventDetail.metadata && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Leave Type</p>
                        <p className="text-sm font-medium mt-1">{selectedEventDetail.metadata.leaveType}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm font-medium mt-1">
                          {selectedEventDetail.metadata.isHalfDay ? 'Half Day' : `${selectedEventDetail.metadata.totalDays} Day(s)`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Anniversary specific info */}
                  {selectedEventDetail.type === 'ANNIVERSARY' && selectedEventDetail.metadata?.years && (
                    <div className="flex items-center justify-center gap-2 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                      <PartyPopper className="h-5 w-5 text-purple-600" />
                      <span className="text-lg font-bold text-purple-700 dark:text-purple-300">
                        {selectedEventDetail.metadata.years} Year{selectedEventDetail.metadata.years !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedEventDetail(null)}>
                    Close
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
