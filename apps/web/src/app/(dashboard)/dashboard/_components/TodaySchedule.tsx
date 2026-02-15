'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  Users, 
  Palmtree,
  CalendarCheck,
  Briefcase,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTodaySchedule, ScheduleItem, TodayScheduleResponse } from '@/lib/api/dashboard';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface TodayScheduleProps {
  loading?: boolean;
}

const typeConfig: Record<string, { icon: typeof Calendar; color: string; bgColor: string }> = {
  meeting: { icon: Video, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  interview: { icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  event: { icon: CalendarCheck, color: 'text-green-600', bgColor: 'bg-green-100' },
  leave: { icon: Palmtree, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  holiday: { icon: Calendar, color: 'text-red-600', bgColor: 'bg-red-100' },
  task: { icon: Briefcase, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

function formatTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'h:mm a');
  } catch {
    return '';
  }
}

function formatTimeRange(startTime: string, endTime?: string): string {
  const start = formatTime(startTime);
  if (endTime) {
    const end = formatTime(endTime);
    return `${start} - ${end}`;
  }
  return start;
}

function ScheduleItemRow({ item }: { item: ScheduleItem }) {
  const config = typeConfig[item.type] || typeConfig.event;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Time or All Day indicator */}
      <div className="flex-shrink-0 w-16 text-center">
        {item.allDay ? (
          <Badge variant="outline" className="text-xs">All Day</Badge>
        ) : (
          <div className="text-sm font-medium text-muted-foreground">
            {formatTime(item.startTime)}
          </div>
        )}
      </div>

      {/* Icon */}
      <div className={cn('flex-shrink-0 p-2 rounded-lg', config.bgColor)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.title}</span>
          <Badge variant="secondary" className="text-xs capitalize flex-shrink-0">
            {item.type}
          </Badge>
        </div>
        
        {item.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {item.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {!item.allDay && item.endTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeRange(item.startTime, item.endTime)}
            </span>
          )}
          
          {item.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.location}
            </span>
          )}

          {item.meetingUrl && (
            <a 
              href={item.meetingUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              <Video className="h-3 w-3" />
              Join
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function TodaySchedule({ loading: externalLoading }: TodayScheduleProps) {
  const [scheduleData, setScheduleData] = useState<TodayScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTodaySchedule();
      setScheduleData(data);
    } catch (err) {
      setError('Failed to load schedule');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const isLoading = externalLoading || loading;
  const items = scheduleData?.items || [];
  const summary = scheduleData?.summary;

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            Today's Schedule
            {summary && summary.total > 0 && (
              <Badge variant="secondary" className="ml-2">
                {summary.total} item{summary.total !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Your meetings, interviews, and events for today
          </CardDescription>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={fetchSchedule}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-16 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-red-400" />
            <p className="text-red-500">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchSchedule}>
              Try Again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No scheduled events for today</p>
            <p className="text-sm mt-1">Enjoy your free day!</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-1">
              {items.map((item) => (
                <ScheduleItemRow key={item.id} item={item} />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Summary badges */}
        {!isLoading && !error && items.length > 0 && summary && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {summary.meetings > 0 && (
              <Badge variant="outline" className="text-blue-600">
                <Video className="h-3 w-3 mr-1" />
                {summary.meetings} Meeting{summary.meetings !== 1 ? 's' : ''}
              </Badge>
            )}
            {summary.interviews > 0 && (
              <Badge variant="outline" className="text-purple-600">
                <Users className="h-3 w-3 mr-1" />
                {summary.interviews} Interview{summary.interviews !== 1 ? 's' : ''}
              </Badge>
            )}
            {summary.events > 0 && (
              <Badge variant="outline" className="text-green-600">
                <CalendarCheck className="h-3 w-3 mr-1" />
                {summary.events} Event{summary.events !== 1 ? 's' : ''}
              </Badge>
            )}
            {summary.leaves > 0 && (
              <Badge variant="outline" className="text-orange-600">
                <Palmtree className="h-3 w-3 mr-1" />
                On Leave
              </Badge>
            )}
            {summary.holidays > 0 && (
              <Badge variant="outline" className="text-red-600">
                <Calendar className="h-3 w-3 mr-1" />
                Holiday
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
