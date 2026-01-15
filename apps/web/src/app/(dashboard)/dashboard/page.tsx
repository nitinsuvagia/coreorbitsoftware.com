'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useDashboard } from './hooks';
import {
  WelcomeHeader,
  ErrorAlert,
  StatsGrid,
  TodaySchedule,
  AlertsCard,
  RecentActivity,
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

      {/* Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Today's Schedule */}
        <TodaySchedule loading={loading} />

        {/* Quick Actions / Alerts */}
        <AlertsCard stats={stats} tenant={tenant} loading={loading} />
      </div>

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}
