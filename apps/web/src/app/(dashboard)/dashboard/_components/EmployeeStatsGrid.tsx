'use client';

import { Clock, CalendarDays, FolderKanban, CheckSquare } from 'lucide-react';
import { StatCard } from './StatCard';
import type { EmployeeAttendanceInfo, EmployeeLeaveInfo, EmployeeTasksInfo, EmployeeProjectsInfo } from '@/lib/api/dashboard';

interface EmployeeStatsGridProps {
  attendance?: EmployeeAttendanceInfo;
  leave?: EmployeeLeaveInfo;
  tasks?: EmployeeTasksInfo;
  projects?: EmployeeProjectsInfo;
  loading: boolean;
}

function getAttendanceStatusText(status: string): string {
  switch (status) {
    case 'checked_in':
      return 'Checked In';
    case 'checked_out':
      return 'Checked Out';
    default:
      return 'Not Checked In';
  }
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '--:--';
  const date = new Date(timeStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function EmployeeStatsGrid({ attendance, leave, tasks, projects, loading }: EmployeeStatsGridProps) {
  const attendanceStatus = attendance?.today?.status || 'not_checked_in';
  const checkInTime = attendance?.today?.checkInTime
    ? formatTime(attendance.today.checkInTime)
    : null;

  // Build attendance description
  let attendanceDesc = '';
  const monthlyTotal = attendance?.monthlyTotal || 0;
  const monthlyPresent = attendance?.monthlyPresent || 0;
  const monthlyRate = attendance?.monthlyRate || 0;

  if (attendanceStatus === 'checked_in' && checkInTime) {
    attendanceDesc = monthlyTotal > 0
      ? `In at ${checkInTime} · ${monthlyRate}% this month`
      : `In at ${checkInTime} · ${monthlyPresent} day${monthlyPresent !== 1 ? 's' : ''} this month`;
  } else if (attendanceStatus === 'checked_out') {
    const hours = Math.floor((attendance?.today?.workMinutes || 0) / 60);
    const mins = (attendance?.today?.workMinutes || 0) % 60;
    attendanceDesc = monthlyTotal > 0
      ? `Worked ${hours}h ${mins}m · ${monthlyRate}% this month`
      : `Worked ${hours}h ${mins}m · ${monthlyPresent} day${monthlyPresent !== 1 ? 's' : ''} this month`;
  } else {
    attendanceDesc = monthlyTotal > 0
      ? `${monthlyPresent}/${monthlyTotal} days this month`
      : monthlyPresent > 0
        ? `${monthlyPresent} day${monthlyPresent !== 1 ? 's' : ''} present this month`
        : 'No check-in today';
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="My Attendance"
        value={getAttendanceStatusText(attendanceStatus)}
        description={attendanceDesc}
        icon={<Clock className="h-6 w-6" />}
        iconColor={attendanceStatus === 'checked_in' ? 'green' : attendanceStatus === 'checked_out' ? 'blue' : 'orange'}
        loading={loading}
      />
      <StatCard
        title="Leave Balance"
        value={`${leave?.totalRemaining || 0} days`}
        description={`${leave?.totalUsed || 0} used · ${leave?.pendingRequests || 0} pending`}
        icon={<CalendarDays className="h-6 w-6" />}
        iconColor="purple"
        loading={loading}
      />
      <StatCard
        title="My Projects"
        value={projects?.active || 0}
        description="Active projects assigned"
        icon={<FolderKanban className="h-6 w-6" />}
        iconColor="blue"
        loading={loading}
      />
      <StatCard
        title="My Tasks"
        value={tasks?.pending || 0}
        description={`${tasks?.completed || 0} completed · ${tasks?.total || 0} total`}
        icon={<CheckSquare className="h-6 w-6" />}
        iconColor="orange"
        loading={loading}
      />
    </div>
  );
}
