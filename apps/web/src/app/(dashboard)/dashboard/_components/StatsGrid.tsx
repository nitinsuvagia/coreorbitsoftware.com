'use client';

import { Users, Clock, FolderKanban, CheckSquare } from 'lucide-react';
import { StatCard } from './StatCard';
import type { DashboardStats, DashboardLimits } from '../types';

interface StatsGridProps {
  stats?: DashboardStats;
  limits?: DashboardLimits;
  loading: boolean;
}

export function StatsGrid({ stats, limits, loading }: StatsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Employees"
        value={stats?.totalEmployees || 0}
        description={`${stats?.activeEmployees || 0} active${limits ? ` / ${limits.maxUsers} max` : ''}`}
        icon={<Users className="h-6 w-6" />}
        iconColor="blue"
        loading={loading}
      />
      <StatCard
        title="Present Today"
        value={stats?.presentToday || 0}
        description={`${stats?.attendanceRate || 0}% attendance rate`}
        icon={<Clock className="h-6 w-6" />}
        iconColor="green"
        loading={loading}
      />
      <StatCard
        title="Active Projects"
        value={stats?.activeProjects || 0}
        description={`${stats?.projectsDueThisWeek || 0} due this week`}
        icon={<FolderKanban className="h-6 w-6" />}
        iconColor="purple"
        loading={loading}
      />
      <StatCard
        title="Pending Tasks"
        value={stats?.pendingTasks || 0}
        description={`${stats?.highPriorityTasks || 0} high priority`}
        icon={<CheckSquare className="h-6 w-6" />}
        iconColor="orange"
        loading={loading}
      />
    </div>
  );
}
