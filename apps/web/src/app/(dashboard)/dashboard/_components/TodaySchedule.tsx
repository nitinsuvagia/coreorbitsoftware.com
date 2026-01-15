'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';

interface TodayScheduleProps {
  loading: boolean;
}

export function TodaySchedule({ loading }: TodayScheduleProps) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Today's Schedule</CardTitle>
        <CardDescription>
          Your meetings and tasks for today
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-16 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No scheduled events for today</p>
            <p className="text-sm">Schedule tracking coming soon...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
