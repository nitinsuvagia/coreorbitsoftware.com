'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useDashboard, useEmployeeDashboard } from './hooks';
import { useMyAttendance, useCheckIn, useCheckOut } from '@/hooks/use-attendance';
import { formatDate, formatTime } from '@/lib/utils';
import { getTodayInTimezone } from '@/lib/format';
import { useOrgSettings } from '@/hooks/use-org-settings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Clock, Timer, History } from 'lucide-react';
import { toast } from 'sonner';
import {
  SessionHistoryDialog,
  getTotalWorkedSeconds,
  formatWorkedSeconds,
  formatElapsedHMS,
} from '@/components/attendance/session-history-dialog';
import {
  WelcomeHeader,
  ErrorAlert,
  StatsGrid,
  EmployeeStatsGrid,
  EmployeeInfoCard,
  TodaySchedule,
  TodoList,
  AlertsCard,
  RecentActivity,
  CalendarSection,
} from './_components';

export default function DashboardPage() {
  const { user } = useAuth();
  const { isAdmin, canAny } = usePermissions();

  // Determine if user should see admin dashboard
  // Admin/HR/Manager see org-level dashboard; employees see personal dashboard
  const isAdminView = isAdmin || canAny('organization:view', 'organization:manage');

  return isAdminView ? (
    <AdminDashboard firstName={user?.firstName} />
  ) : (
    <EmployeeDashboard firstName={user?.firstName} />
  );
}

// ============================================================================
// CHECK-IN / CHECK-OUT CARD (Shared by all roles)
// ============================================================================

function CheckInCard() {
  const { timezone } = useOrgSettings();
  const today = getTodayInTimezone(timezone);
  const { data: myAttendanceData } = useMyAttendance({
    startDate: today,
    endDate: today,
    limit: 10,
  });
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  // Prefer the open (no checkout) session; fall back to the latest
  const todayItems = myAttendanceData?.items || [];
  const todayRecord = todayItems.find((r: any) => r.checkIn && !r.checkOut) || todayItems[0] || null;
  const isCheckedIn = !!(todayRecord?.checkIn && !todayRecord?.checkOut);
  const isCheckedOut = !!(todayRecord?.checkIn && todayRecord?.checkOut);
  const hasAnySessions = todayItems.length > 0;

  // Total worked today (all sessions combined, live-updating)
  const [totalElapsed, setTotalElapsed] = useState(0);
  useEffect(() => {
    function tick() {
      setTotalElapsed(getTotalWorkedSeconds(todayItems));
    }
    tick();
    // Only set interval if there's an open session (need live update)
    if (isCheckedIn) {
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }
  }, [todayItems, isCheckedIn]);

  async function handleCheckIn() {
    try {
      await checkInMutation.mutateAsync({});
      toast.success('Checked in successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.error || error.response?.data?.message || 'Failed to check in';
      toast.error(typeof msg === 'string' ? msg : 'Failed to check in');
    }
  }

  async function handleCheckOut() {
    try {
      await checkOutMutation.mutateAsync({});
      toast.success('Checked out successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.error || error.response?.data?.message || 'Failed to check out';
      toast.error(typeof msg === 'string' ? msg : 'Failed to check out');
    }
  }

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
      <CardContent className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {formatDate(new Date())}
            </p>
            {/* State: Not checked in at all */}
            {!hasAnySessions && (
              <h3 className="text-2xl font-bold">You haven&apos;t checked in yet</h3>
            )}
            {/* State: Checked in — show current session timer + total */}
            {isCheckedIn && todayRecord && (
              <>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  Checked in at {formatTime(todayRecord.checkIn!)}
                </h3>
                <div className="flex items-center gap-2 text-lg font-mono tabular-nums text-primary">
                  <Timer className="h-4 w-4 animate-pulse" />
                  {formatElapsedHMS(totalElapsed)}
                  <span className="text-xs font-sans text-muted-foreground ml-1">total today</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Remember to check out before you leave
                </p>
              </>
            )}
            {/* State: All sessions checked out — show total */}
            {hasAnySessions && !isCheckedIn && (
              <>
                <h3 className="text-2xl font-bold">
                  Worked for {formatWorkedSeconds(totalElapsed)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {todayItems.length} session{todayItems.length !== 1 ? 's' : ''} today
                </p>
              </>
            )}
            {/* View Sessions link */}
            {hasAnySessions && (
              <SessionHistoryDialog>
                <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                  <History className="h-3 w-3" />
                  View all sessions
                </button>
              </SessionHistoryDialog>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              size="lg"
              onClick={handleCheckIn}
              disabled={isCheckedIn || checkInMutation.isPending}
            >
              <LogIn className="mr-2 h-5 w-5" />
              {checkInMutation.isPending ? 'Checking in...' : 'Check In'}
            </Button>
            <Button
              size="lg"
              variant={isCheckedIn ? 'default' : 'outline'}
              onClick={handleCheckOut}
              disabled={!isCheckedIn || checkOutMutation.isPending}
            >
              <LogOut className="mr-2 h-5 w-5" />
              {checkOutMutation.isPending ? 'Checking out...' : 'Check Out'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ADMIN / HR DASHBOARD (Organization-level view - unchanged)
// ============================================================================

function AdminDashboard({ firstName }: { firstName?: string }) {
  const { stats, tenant, limits, loading, error } = useDashboard();
  const { hasRole } = usePermissions();
  const isTenantOwner = hasRole('tenant_admin');

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <WelcomeHeader firstName={firstName} tenant={tenant} />

      {/* Error Alert */}
      <ErrorAlert error={error} />

      {/* Check-In / Check-Out — hidden for tenant owner (not an employee) */}
      {!isTenantOwner && <CheckInCard />}

      {/* Stats Grid */}
      <StatsGrid stats={stats} limits={limits} loading={loading} />

      {/* Content Grid - Schedule and Tasks */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Today's Schedule - spans 4 columns */}
        <TodaySchedule loading={loading} />

        {/* My Tasks / Todo List - spans 3 columns */}
        <TodoList loading={loading} />
      </div>

      {/* Alerts and Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Alerts & Reminders */}
        <AlertsCard stats={stats} tenant={tenant} loading={loading} />

        {/* Recent Activity */}
        <RecentActivity />
      </div>

      {/* HR Calendar Section - Full Calendar with Legend, Events, Stats */}
      <CalendarSection loading={loading} />
    </div>
  );
}

// ============================================================================
// EMPLOYEE DASHBOARD (Personal view)
// ============================================================================

function EmployeeDashboard({ firstName }: { firstName?: string }) {
  const { employee, attendance, leave, tasks, projects, loading, error } = useEmployeeDashboard();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <WelcomeHeader firstName={firstName} isEmployee />

      {/* Error Alert */}
      <ErrorAlert error={error} />

      {/* Check-In / Check-Out */}
      <CheckInCard />

      {/* Personal Stats Grid */}
      <EmployeeStatsGrid
        attendance={attendance}
        leave={leave}
        tasks={tasks}
        projects={projects}
        loading={loading}
      />

      {/* Content Grid - Schedule + Profile | Tasks */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Today's Schedule - spans 4 columns */}
        <TodaySchedule loading={loading} />

        {/* My Tasks / Todo List - spans 3 columns */}
        <TodoList loading={loading} />
      </div>

      {/* Profile Card + Calendar */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Employee Profile & Leave Balances */}
        <EmployeeInfoCard employee={employee} leave={leave} loading={loading} />

        {/* Calendar - spans 2 columns */}
        <div className="lg:col-span-2">
          <CalendarSection loading={loading} />
        </div>
      </div>
    </div>
  );
}

