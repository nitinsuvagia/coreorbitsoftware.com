'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Users,
  Video,
  Loader2,
  MapPin,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  meetingUrl?: string;
  type: 'MEETING' | 'TASK' | 'REMINDER' | 'LEAVE' | 'HOLIDAY' | 'BIRTHDAY' | 'OTHER';
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  color?: string;
  attendees: Array<{
    id: string;
    user: { id: string; firstName: string; lastName: string };
    status: string;
    isOrganizer: boolean;
  }>;
  createdBy: { id: string; firstName: string; lastName: string };
}

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endDate: z.string().min(1, 'End date is required'),
  endTime: z.string().min(1, 'End time is required'),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional().or(z.literal('')),
  type: z.enum(['MEETING', 'TASK', 'REMINDER', 'LEAVE', 'HOLIDAY', 'BIRTHDAY', 'OTHER']),
});

type EventFormData = z.infer<typeof eventSchema>;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: 'MEETING',
    },
  });

  // Fetch events when month changes
  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  async function fetchEvents() {
    setIsLoading(true);
    try {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      
      const response = await apiClient.get<{ success: boolean; data: CalendarEvent[] }>('/calendar/events', {
        params: {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString(),
        },
      });
      
      if (response.data?.success) {
        setEvents(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      // Use empty array if API fails
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(data: EventFormData) {
    setIsSubmitting(true);
    try {
      const startTime = new Date(`${data.startDate}T${data.startTime}`).toISOString();
      const endTime = new Date(`${data.endDate}T${data.endTime}`).toISOString();
      
      const response = await apiClient.post<{ success: boolean }>('/calendar/events', {
        title: data.title,
        description: data.description,
        startTime,
        endTime,
        location: data.location,
        meetingUrl: data.meetingUrl || undefined,
        type: data.type,
      });
      
      if (response.data?.success) {
        toast.success('Event created successfully');
        setIsDialogOpen(false);
        reset();
        fetchEvents();
      }
    } catch (error) {
      toast.error('Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Generate calendar days
  const calendarDays = useMemo(() => {
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
  }, [year, month, firstDayOfMonth, daysInMonth, daysInPrevMonth]);

  function previousMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  }

  function getEventsForDate(date: Date) {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      return (
        eventStart.getDate() === date.getDate() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getFullYear() === date.getFullYear()
      );
    });
  }

  const selectedEvents = getEventsForDate(selectedDate);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.start) >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 4);
  }, [events]);

  const getEventColor = (type: string) => {
    switch (type) {
      case 'MEETING':
        return 'bg-blue-500';
      case 'TASK':
        return 'bg-green-500';
      case 'LEAVE':
        return 'bg-orange-500';
      case 'REMINDER':
        return 'bg-purple-500';
      case 'HOLIDAY':
        return 'bg-red-500';
      case 'BIRTHDAY':
        return 'bg-pink-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatEventTime = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    return { time: startTime, duration };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
          <p className="text-muted-foreground">
            Manage your schedule and events
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
                <DialogDescription>
                  Add a new event to your calendar
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" {...register('title')} placeholder="Event title" />
                  {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" {...register('description')} placeholder="Event description" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input id="startDate" type="date" {...register('startDate')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input id="startTime" type="time" {...register('startTime')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" type="date" {...register('endDate')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input id="endTime" type="time" {...register('endTime')} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Event Type</Label>
                  <select
                    id="type"
                    {...register('type')}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="MEETING">Meeting</option>
                    <option value="TASK">Task</option>
                    <option value="REMINDER">Reminder</option>
                    <option value="LEAVE">Leave</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location (optional)</Label>
                  <Input id="location" {...register('location')} placeholder="Meeting room or address" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="meetingUrl">Meeting URL (optional)</Label>
                  <Input id="meetingUrl" {...register('meetingUrl')} placeholder="https://meet.google.com/..." />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Event
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Calendar */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {MONTHS[month]} {year}
              </h3>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
            <div className="flex items-center gap-1 border rounded-lg p-1">
              {(['month', 'week', 'day'] as const).map((v) => (
                <Button
                  key={v}
                  variant={view === v ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView(v)}
                  className="capitalize"
                >
                  {v}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {/* Day headers skeleton */}
                <div className="grid grid-cols-7 gap-1">
                  {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
                {/* Calendar grid skeleton */}
                <div className="grid grid-cols-7 gap-1">
                  {[...Array(35)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAYS.map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const dayEvents = getEventsForDate(day.date);
                    const isToday =
                      day.date.getDate() === today.getDate() &&
                      day.date.getMonth() === today.getMonth() &&
                      day.date.getFullYear() === today.getFullYear();
                    const isSelected =
                      day.date.getDate() === selectedDate.getDate() &&
                      day.date.getMonth() === selectedDate.getMonth() &&
                      day.date.getFullYear() === selectedDate.getFullYear();

                    return (
                      <button
                        key={index}
                        className={`
                          min-h-[100px] p-2 text-left border rounded-lg transition-colors
                          ${day.isCurrentMonth ? 'bg-background' : 'bg-muted/50 text-muted-foreground'}
                          ${isSelected ? 'ring-2 ring-primary' : 'hover:bg-accent'}
                          ${isToday ? 'border-primary' : 'border-transparent'}
                        `}
                        onClick={() => setSelectedDate(day.date)}
                      >
                        <span className={`
                          inline-flex h-7 w-7 items-center justify-center rounded-full text-sm
                          ${isToday ? 'bg-primary text-primary-foreground' : ''}
                        `}>
                          {day.day}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className={`${event.color || getEventColor(event.type)} text-white text-xs px-1.5 py-0.5 rounded truncate`}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{dayEvents.length - 2} more
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Selected Day Events */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{formatDate(selectedDate)}</CardTitle>
              <CardDescription>
                {selectedEvents.length} events scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No events scheduled for this day
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedEvents.map((event) => {
                    const { time, duration } = formatEventTime(event.start, event.end);
                    return (
                      <div key={event.id} className="flex gap-3">
                        <div className={`w-1 rounded-full ${event.color || getEventColor(event.type)}`} />
                        <div className="flex-1">
                          <p className="font-medium">{event.title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{time}</span>
                            <span>•</span>
                            <span>{duration} min</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.attendees.length > 0 && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <Users className="h-3 w-3" />
                              <span>{event.attendees.length} attendees</span>
                            </div>
                          )}
                          {event.meetingUrl && (
                            <a
                              href={event.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary mt-1 hover:underline"
                            >
                              <Video className="h-3 w-3" />
                              Join Meeting
                            </a>
                          )}
                          <Badge variant="outline" className="mt-2 capitalize">
                            {event.type.toLowerCase()}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No upcoming events
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => {
                    const eventDate = new Date(event.start);
                    return (
                      <div key={event.id} className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${event.color || getEventColor(event.type)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(eventDate)} at {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
