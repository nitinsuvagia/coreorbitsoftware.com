'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, BellOff, RefreshCw, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDashboardAlerts, type Alert, type AlertType } from '@/lib/api/dashboard';
import type { DashboardStats, TenantInfo } from '../types';
import Link from 'next/link';

interface AlertsCardProps {
  stats?: DashboardStats;
  tenant?: TenantInfo;
  loading: boolean;
}

const alertIcons: Record<AlertType, React.ReactNode> = {
  warning: <AlertTriangle className="h-5 w-5" />,
  error: <XCircle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  success: <CheckCircle className="h-5 w-5" />,
};

const alertColors: Record<AlertType, string> = {
  warning: 'text-yellow-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  success: 'text-green-500',
};

export function AlertsCard({ stats, tenant, loading: parentLoading }: AlertsCardProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [useApiAlerts, setUseApiAlerts] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await getDashboardAlerts();
      setAlerts(data);
      setUseApiAlerts(true);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setUseApiAlerts(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const isLoading = loading || parentLoading;

  // Fallback to stats-based alerts if API fails
  const fallbackAlerts = !useApiAlerts ? (
    <>
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
    </>
  ) : null;

  const hasFallbackAlerts = !useApiAlerts && (
    stats?.pendingLeaveRequests || 
    stats?.highPriorityTasks || 
    stats?.projectsDueThisWeek ||
    (tenant?.status === 'TRIAL' && tenant.daysRemaining !== null && tenant.daysRemaining <= 7)
  );

  const hasContent = useApiAlerts ? alerts.length > 0 : hasFallbackAlerts;

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 flex-shrink-0">
        <div>
          <CardTitle>Alerts & Reminders</CardTitle>
          <CardDescription>
            Items requiring your attention
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
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : !hasContent ? (
          <div className="text-center py-8 text-muted-foreground">
            <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No alerts at this time</p>
            <p className="text-sm">Everything looks good!</p>
          </div>
        ) : useApiAlerts ? (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-4">
                <span className={alertColors[alert.type]}>
                  {alertIcons[alert.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  {alert.link && (
                    <Link 
                      href={alert.link} 
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      View details →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {fallbackAlerts}
          </div>
        )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
