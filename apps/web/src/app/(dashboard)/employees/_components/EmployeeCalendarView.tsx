'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
  getMonth,
  getDate,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  Cake,
  CalendarHeart,
  UserPlus,
  Building,
} from 'lucide-react';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import Link from 'next/link';
import type { Employee } from '@/hooks/use-employees';

// Event types for the calendar
type EventType = 'birthday' | 'anniversary' | 'joining';

interface CalendarEvent {
  id: string;
  employee: Employee;
  type: EventType;
  date: Date;
  label: string;
}

interface EmployeeCalendarViewProps {
  employees: Employee[];
}

const eventStyles: Record<EventType, { bg: string; text: string; icon: any; label: string }> = {
  birthday: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-700 dark:text-pink-400',
    icon: Cake,
    label: 'Birthday',
  },
  anniversary: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
    icon: CalendarHeart,
    label: 'Work Anniversary',
  },
  joining: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    icon: UserPlus,
    label: 'Joining Date',
  },
};

export function EmployeeCalendarView({ employees }: EmployeeCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showFilters, setShowFilters] = useState({
    birthday: true,
    anniversary: true,
    joining: false,
  });

  // Generate calendar events from employees
  const events = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    const allEvents: CalendarEvent[] = [];

    employees.forEach((employee) => {
      // Birthday events
      if (showFilters.birthday && employee.dateOfBirth) {
        const birthDate = new Date(employee.dateOfBirth);
        const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
        allEvents.push({
          id: `birthday-${employee.id}`,
          employee,
          type: 'birthday',
          date: birthdayThisYear,
          label: `${employee.firstName}'s Birthday`,
        });
      }

      // Work anniversary events
      if (showFilters.anniversary && employee.joinDate) {
        const joinDate = new Date(employee.joinDate);
        const yearsWorked = currentYear - joinDate.getFullYear();
        if (yearsWorked > 0) {
          const anniversaryThisYear = new Date(currentYear, joinDate.getMonth(), joinDate.getDate());
          allEvents.push({
            id: `anniversary-${employee.id}`,
            employee,
            type: 'anniversary',
            date: anniversaryThisYear,
            label: `${employee.firstName}'s ${yearsWorked} year anniversary`,
          });
        }
      }

      // Joining date events (for new joiners - within current month/year)
      if (showFilters.joining && employee.joinDate) {
        const joinDate = new Date(employee.joinDate);
        if (joinDate.getFullYear() === currentYear) {
          allEvents.push({
            id: `joining-${employee.id}`,
            employee,
            type: 'joining',
            date: joinDate,
            label: `${employee.firstName} joining`,
          });
        }
      }
    });

    return allEvents;
  }, [employees, currentDate, showFilters]);

  // Get calendar days for the month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(event.date, day));
  };

  // Navigation handlers
  const goToPrevious = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNext = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Toggle event type filter
  const toggleFilter = (type: EventType) => {
    setShowFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* Calendar Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <h2 className="text-lg font-semibold ml-2">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>

          {/* Event Type Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.keys(eventStyles) as EventType[]).map((type) => {
              const style = eventStyles[type];
              const Icon = style.icon;
              return (
                <Button
                  key={type}
                  variant={showFilters[type] ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter(type)}
                  className={cn(
                    'gap-1.5',
                    showFilters[type] && type === 'birthday' && 'bg-pink-600 hover:bg-pink-700',
                    showFilters[type] && type === 'anniversary' && 'bg-purple-600 hover:bg-purple-700',
                    showFilters[type] && type === 'joining' && 'bg-emerald-600 hover:bg-emerald-700'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {style.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Month View Calendar */}
        <div className="border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-muted/50">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium border-r last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const hasEvents = dayEvents.length > 0;

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[100px] border-r border-t last:border-r-0 p-1',
                    !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                    isToday(day) && 'bg-primary/5'
                  )}
                >
                  <div
                    className={cn(
                      'text-sm font-medium mb-1 p-1 w-6 h-6 flex items-center justify-center',
                      isToday(day) &&
                        'bg-primary text-primary-foreground rounded-full'
                    )}
                  >
                    {format(day, 'd')}
                  </div>

                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => {
                      const style = eventStyles[event.type];
                      const Icon = style.icon;
                      const avatarColor = getAvatarColor(
                        event.employee.email || event.employee.id
                      );

                      return (
                        <TooltipProvider key={event.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={`/employees/${event.employee.id}`}
                                className={cn(
                                  'flex items-center gap-1 p-1 rounded text-xs truncate',
                                  style.bg,
                                  style.text
                                )}
                              >
                                <Icon className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {event.employee.firstName}
                                </span>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="p-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage
                                    src={event.employee.avatar}
                                    alt={event.employee.displayName}
                                  />
                                  <AvatarFallback
                                    className={cn(
                                      avatarColor.className,
                                      'font-semibold'
                                    )}
                                  >
                                    {getInitials(
                                      `${event.employee.firstName} ${event.employee.lastName}`
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">
                                    {event.employee.firstName}{' '}
                                    {event.employee.lastName}
                                  </div>
                                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Icon className="h-3 w-3" />
                                    {event.label}
                                  </div>
                                  {event.employee.department && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                      <Building className="h-3 w-3" />
                                      {event.employee.department.name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t flex-wrap">
          <span className="text-sm text-muted-foreground">Legend:</span>
          {(Object.keys(eventStyles) as EventType[]).map((type) => {
            const style = eventStyles[type];
            const Icon = style.icon;
            return (
              <div key={type} className="flex items-center gap-1.5 text-sm">
                <div className={cn('p-1 rounded', style.bg)}>
                  <Icon className={cn('h-3 w-3', style.text)} />
                </div>
                <span>{style.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
