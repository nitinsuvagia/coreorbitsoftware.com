'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BellOff } from 'lucide-react';
import type { DashboardStats, TenantInfo } from '../types';

interface AlertsCardProps {
  stats?: DashboardStats;
  tenant?: TenantInfo;
  loading: boolean;
}

export function AlertsCard({ stats, tenant, loading }: AlertsCardProps) {
  const hasAlerts = 
    stats?.pendingLeaveRequests || 
    stats?.highPriorityTasks || 
    stats?.projectsDueThisWeek ||
    (tenant?.status === 'TRIAL' && tenant.daysRemaining !== null && tenant.daysRemaining <= 7);

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Alerts & Reminders</CardTitle>
        <CardDescription>
          Items requiring your attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {stats?.pendingLeaveRequests ? (
              <div className="flex items-center gap-4">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <p className="text-sm">{stats.pendingLeaveRequests} leave requests pending</p>
              </div>
            ) : null}
            
            {stats?.highPriorityTasks ? (
              <div className="flex items-center gap-4">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm">{stats.highPriorityTasks} high priority tasks</p>
              </div>
            ) : null}
            
            {stats?.projectsDueThisWeek ? (
              <div className="flex items-center gap-4">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <p className="text-sm">{stats.projectsDueThisWeek} project deadlines this week</p>
              </div>
            ) : null}
            
            {tenant?.status === 'TRIAL' && tenant.daysRemaining !== null && tenant.daysRemaining <= 7 && (
              <div className="flex items-center gap-4">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <p className="text-sm">Trial ends in {tenant.daysRemaining} days</p>
              </div>
            )}
            
            {!hasAlerts && (
              <div className="text-center py-8 text-muted-foreground">
                <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No alerts at this time</p>
                <p className="text-sm">Everything looks good!</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
