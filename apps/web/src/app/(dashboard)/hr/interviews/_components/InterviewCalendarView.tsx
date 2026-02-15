'use client';

import { useState } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  Video,
  Phone,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Interview,
  interviewTypeLabels,
  interviewTypeColors,
  interviewStatusColors,
} from '@/lib/api/interviews';

// ============================================================================
// COMPONENT
// ============================================================================

interface InterviewCalendarViewProps {
  interviews: Interview[];
  onView: (id: string) => void;
}

export function InterviewCalendarView({ interviews, onView }: InterviewCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'week' | 'month'>('week');

  // Get days for the current view
  const getDays = () => {
    if (viewType === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      // Include days from previous/next month to fill the calendar grid
      const calendarStart = startOfWeek(start, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(end, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }
  };

  const days = getDays();

  // Get interviews for a specific day
  const getInterviewsForDay = (day: Date) => {
    return interviews.filter((interview) => {
      const interviewDate = new Date(interview.scheduledAt);
      return isSameDay(interviewDate, day);
    });
  };

  // Navigation handlers
  const goToPrevious = () => {
    if (viewType === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (viewType === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get mode icon
  const getModeIcon = (mode: Interview['mode']) => {
    switch (mode) {
      case 'VIDEO':
        return <Video className="h-3 w-3" />;
      case 'PHONE':
        return <Phone className="h-3 w-3" />;
      case 'IN_PERSON':
        return <MapPin className="h-3 w-3" />;
    }
  };

  // Time slots for week view
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  ];

  return (
    <Card>
      <CardContent className="p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
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
              {viewType === 'week'
                ? `${format(days[0], 'MMM d')} - ${format(days[6], 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>

          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant={viewType === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewType('week')}
              className="rounded-r-none"
            >
              Week
            </Button>
            <Button
              variant={viewType === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewType('month')}
              className="rounded-l-none"
            >
              Month
            </Button>
          </div>
        </div>

        {/* Week View */}
        {viewType === 'week' && (
          <div className="grid grid-cols-8 border rounded-lg overflow-hidden">
            {/* Time column header */}
            <div className="border-r bg-muted/50 p-2">
              <div className="h-10" />
            </div>
            
            {/* Day headers */}
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'border-r last:border-r-0 p-2 text-center bg-muted/50',
                  isToday(day) && 'bg-primary/10'
                )}
              >
                <div className="text-xs text-muted-foreground">
                  {format(day, 'EEE')}
                </div>
                <div
                  className={cn(
                    'text-lg font-semibold',
                    isToday(day) && 'text-primary'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}

            {/* Time slots */}
            {timeSlots.map((time) => (
              <>
                {/* Time label */}
                <div
                  key={`time-${time}`}
                  className="border-r border-t bg-muted/30 p-2 text-xs text-muted-foreground"
                >
                  {format(new Date(`2000-01-01T${time}`), 'h a')}
                </div>
                
                {/* Day cells */}
                {days.map((day) => {
                  const dayInterviews = getInterviewsForDay(day).filter((interview) => {
                    const hour = new Date(interview.scheduledAt).getHours();
                    return hour === parseInt(time);
                  });

                  return (
                    <div
                      key={`${day.toISOString()}-${time}`}
                      className={cn(
                        'border-r border-t last:border-r-0 p-1 min-h-[60px]',
                        isToday(day) && 'bg-primary/5'
                      )}
                    >
                      {dayInterviews.map((interview) => (
                        <TooltipProvider key={interview.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => onView(interview.id)}
                                className={cn(
                                  'w-full text-left p-1 rounded text-xs mb-1 truncate',
                                  interviewTypeColors[interview.type]
                                )}
                              >
                                <div className="flex items-center gap-1">
                                  {getModeIcon(interview.mode)}
                                  <span className="truncate">
                                    {interview.candidate?.firstName} {interview.candidate?.lastName?.[0]}.
                                  </span>
                                </div>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="p-3">
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {interview.candidate?.firstName} {interview.candidate?.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {interviewTypeLabels[interview.type]} - Round {interview.roundNumber}
                                </div>
                                <div className="text-sm">
                                  {format(new Date(interview.scheduledAt), 'h:mm a')} ({interview.duration} min)
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {interview.job?.title}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        )}

        {/* Month View */}
        {viewType === 'month' && (
          <div className="border rounded-lg overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-muted/50">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const dayInterviews = getInterviewsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);

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
                        'text-sm font-medium mb-1 p-1',
                        isToday(day) &&
                          'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center'
                      )}
                    >
                      {format(day, 'd')}
                    </div>

                    <div className="space-y-1">
                      {dayInterviews.slice(0, 3).map((interview) => (
                        <TooltipProvider key={interview.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => onView(interview.id)}
                                className={cn(
                                  'w-full text-left p-1 rounded text-xs truncate',
                                  interviewTypeColors[interview.type]
                                )}
                              >
                                <span className="font-medium">
                                  {format(new Date(interview.scheduledAt), 'h:mm a')}
                                </span>{' '}
                                {interview.candidate?.firstName}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                <div className="font-medium">
                                  {interview.candidate?.firstName} {interview.candidate?.lastName}
                                </div>
                                <div>{interviewTypeLabels[interview.type]}</div>
                                <div>{interview.job?.title}</div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}

                      {dayInterviews.length > 3 && (
                        <div className="text-xs text-muted-foreground pl-1">
                          +{dayInterviews.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-sm">
          <span className="text-muted-foreground">Interview Types:</span>
          {Object.entries(interviewTypeLabels).slice(0, 4).map(([type, label]) => (
            <Badge key={type} className={interviewTypeColors[type as keyof typeof interviewTypeColors]} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
