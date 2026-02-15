'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useDashboard } from './hooks';
import {
  WelcomeHeader,
  ErrorAlert,
  StatsGrid,
  TodaySchedule,
  TodoList,
  AlertsCard,
  RecentActivity,
  CalendarSection,
} from './_components';

export default function DashboardPage() {
  const { user } = useAuth();
  const { stats, tenant, limits, loading, error } = useDashboard();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <WelcomeHeader firstName={user?.firstName} tenant={tenant} />

      {/* Error Alert */}
      <ErrorAlert error={error} />

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
