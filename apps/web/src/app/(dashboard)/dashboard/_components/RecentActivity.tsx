'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  UserPlus, 
  UserMinus, 
  TrendingUp, 
  BookOpen, 
  CalendarOff,
  FileText, 
  Users, 
  Calendar, 
  CheckCircle,
  Clock,
  AlertCircle,
  Activity as ActivityIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRecentActivities, type Activity, type ActivityType } from '@/lib/api/dashboard';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityProps {
  loading?: boolean;
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  HIRE: <UserPlus className="h-4 w-4" />,
  EXIT: <UserMinus className="h-4 w-4" />,
  PROMOTION: <TrendingUp className="h-4 w-4" />,
  TRAINING: <BookOpen className="h-4 w-4" />,
  LEAVE: <CalendarOff className="h-4 w-4" />,
  PERFORMANCE: <TrendingUp className="h-4 w-4" />,
  DOCUMENT: <FileText className="h-4 w-4" />,
  GRIEVANCE: <AlertCircle className="h-4 w-4" />,
  INTERVIEW: <Users className="h-4 w-4" />,
  CANDIDATE: <UserPlus className="h-4 w-4" />,
  ONBOARDING: <CheckCircle className="h-4 w-4" />,
  OFFBOARDING: <UserMinus className="h-4 w-4" />,
  COMPLIANCE: <FileText className="h-4 w-4" />,
  ATTENDANCE: <Clock className="h-4 w-4" />,
};

const activityColors: Record<ActivityType, string> = {
  HIRE: 'text-green-500 bg-green-50 dark:bg-green-950',
  EXIT: 'text-red-500 bg-red-50 dark:bg-red-950',
  PROMOTION: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
  TRAINING: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  LEAVE: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950',
  PERFORMANCE: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950',
  DOCUMENT: 'text-gray-500 bg-gray-50 dark:bg-gray-950',
  GRIEVANCE: 'text-orange-500 bg-orange-50 dark:bg-orange-950',
  INTERVIEW: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950',
  CANDIDATE: 'text-teal-500 bg-teal-50 dark:bg-teal-950',
  ONBOARDING: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950',
  OFFBOARDING: 'text-rose-500 bg-rose-50 dark:bg-rose-950',
  COMPLIANCE: 'text-slate-500 bg-slate-50 dark:bg-slate-950',
  ATTENDANCE: 'text-sky-500 bg-sky-50 dark:bg-sky-950',
};

export function RecentActivity({ loading: parentLoading }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      const data = await getRecentActivities(10);
      setActivities(data);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const isLoading = loading || parentLoading;

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 flex-shrink-0">
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates across your organization
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading || refreshing}
          className="h-8 w-8"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ActivityIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm">Activities will appear here as things happen</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={cn(
                  "rounded-full p-2 shrink-0",
                  activityColors[activity.type] || 'text-gray-500 bg-gray-50'
                )}>
                  {activityIcons[activity.type] || <ActivityIcon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {activity.action}
                    {activity.entityName && (
                      <span className="text-muted-foreground font-normal"> - {activity.entityName}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {activity.userName && (
                      <span className="text-xs text-muted-foreground">
                        by {activity.userName}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

