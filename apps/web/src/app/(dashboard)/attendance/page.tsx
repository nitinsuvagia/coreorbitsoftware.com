'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import {
  useMyAttendance,
  useCheckIn,
  useCheckOut,
  useLeaveBalance,
  useMyLeaves,
  AttendanceRecord,
  LeaveRequest,
} from '@/hooks/use-attendance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatDate, formatTime, formatDuration, getStatusColor } from '@/lib/utils';
import { getTodayInTimezone } from '@/lib/format';
import { useOrgSettings } from '@/hooks/use-org-settings';
import { toast } from 'sonner';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  Timer,
  TrendingUp,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  SessionHistoryDialog,
  getTotalWorkedSeconds,
  formatWorkedSeconds,
  formatElapsedHMS,
} from '@/components/attendance/session-history-dialog';

export default function AttendancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const isTenantOwner = user?.roles?.includes('tenant_admin') ?? false;
  const { timezone } = useOrgSettings();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data: attendanceData, isLoading } = useMyAttendance({
    startDate: `${month}-01`,
    endDate: `${month}-31`,
    limit: 50,
  });

  const { data: leaveBalanceRaw } = useLeaveBalance();
  const leaveBalance = Array.isArray(leaveBalanceRaw) ? leaveBalanceRaw : (leaveBalanceRaw as any)?.data || [];
  const { data: leavesDataRaw } = useMyLeaves({ status: 'pending', limit: 5 });

  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const attendance = attendanceData?.items || [];
  const pendingLeaves = (leavesDataRaw as any)?.data || (Array.isArray(leavesDataRaw) ? leavesDataRaw : []);

  // Calculate today's status — prefer the open (no checkout) session
  const today = getTodayInTimezone(timezone);
  const todayRecords = attendance.filter((r) => r.date?.slice(0, 10) === today);
  const todayRecord = todayRecords.find((r) => r.checkIn && !r.checkOut) || todayRecords[0] || null;

  const isCheckedIn = !!(todayRecord?.checkIn && !todayRecord?.checkOut);
  const isCheckedOut = !!(todayRecord?.checkIn && todayRecord?.checkOut);
  const hasAnySessions = todayRecords.length > 0;

  // Total worked today (all sessions combined, live-updating)
  const [totalElapsed, setTotalElapsed] = useState(0);
  useEffect(() => {
    function tick() {
      setTotalElapsed(getTotalWorkedSeconds(todayRecords));
    }
    tick();
    if (isCheckedIn) {
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }
  }, [todayRecords, isCheckedIn]);

  // Tenant owner is not an employee — redirect to dashboard
  useEffect(() => {
    if (isTenantOwner) router.replace('/dashboard');
  }, [isTenantOwner, router]);

  if (isTenantOwner) return null;

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

  // Calculate monthly stats — group sessions by date to handle multiple sessions per day
  const dayMap = new Map<string, { workHours: number; isLate: boolean; statuses: string[] }>();
  for (const r of attendance) {
    const dateKey = r.date?.slice(0, 10) || '';
    if (!dateKey) continue;
    const existing = dayMap.get(dateKey) || { workHours: 0, isLate: false, statuses: [] };
    existing.workHours += r.workHours || 0;
    if (r.isLate) existing.isLate = true;
    existing.statuses.push(r.status);
    dayMap.set(dateKey, existing);
  }
  // Present = at least one session with status 'present' or 'half_day' that day
  const presentDays = Array.from(dayMap.values()).filter(
    (d) => d.statuses.some((s) => ['present', 'half_day'].includes(s))
  ).length;
  const lateDays = Array.from(dayMap.values()).filter((d) => d.isLate).length;

  // Days where the employee showed up but worked < 4 h are also counted as absent
  const shortWorkDates = new Set(
    Array.from(dayMap.entries())
      .filter(([, d]) => d.workHours < 4)
      .map(([k]) => k)
  );

  // Absent days = working days (Mon-Fri) that have passed in the month with NO attendance record
  // OR where the employee has a record but worked less than 4 hours
  const attendedDates = new Set(dayMap.keys());
  const todayDate = getTodayInTimezone(timezone);
  const todayD = new Date(todayDate + 'T00:00:00');
  const [mYear, mMonth] = month.split('-').map(Number);
  // Last countable date: today or last day of month, whichever is earlier
  const lastDayOfMonth = new Date(mYear, mMonth, 0).getDate();
  const endDay = (mYear === todayD.getFullYear() && mMonth === todayD.getMonth() + 1)
    ? Math.min(todayD.getDate() - 1, lastDayOfMonth)  // up to yesterday (today isn't over yet)
    : lastDayOfMonth;
  let absentDays = 0;
  for (let d = 1; d <= endDay; d++) {
    const dt = new Date(mYear, mMonth - 1, d);
    const dow = dt.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    const key = `${mYear}-${String(mMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!attendedDates.has(key) || shortWorkDates.has(key)) absentDays++;
  }

  const totalWorkHours = Array.from(dayMap.values()).reduce((sum, d) => sum + d.workHours, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Track your attendance and manage leaves
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/attendance/request-leave">
              <Calendar className="mr-2 h-4 w-4" />
              Request Leave
            </Link>
          </Button>
        </div>
      </div>

      {/* Today's Status Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {formatDate(new Date())}
              </p>
              {!hasAnySessions && (
                <>
                  <h3 className="text-2xl font-bold">You haven&apos;t checked in yet</h3>
                  <p className="text-sm text-muted-foreground">Click Check In to start your work day</p>
                </>
              )}
              {isCheckedIn && (
                <>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <h3 className="text-2xl font-bold">Checked in at {formatTime(todayRecord!.checkIn!)}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-primary">
                    <Timer className="h-4 w-4 animate-pulse" />
                    <span className="text-lg font-mono font-semibold">{formatElapsedHMS(totalElapsed)}</span>
                    <span className="text-xs text-muted-foreground ml-1">total today</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Remember to check out before you leave</p>
                </>
              )}
              {hasAnySessions && !isCheckedIn && (
                <>
                  <h3 className="text-2xl font-bold text-green-600">Worked for {formatWorkedSeconds(totalElapsed)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {todayRecords.length} session{todayRecords.length !== 1 ? 's' : ''} today
                  </p>
                </>
              )}
              {hasAnySessions && (
                <SessionHistoryDialog>
                  <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                    <History className="h-3 w-3" />
                    View all sessions
                  </button>
                </SessionHistoryDialog>
              )}
            </div>
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={handleCheckIn}
                disabled={isCheckedIn || checkInMutation.isPending}
              >
                <LogIn className="mr-2 h-5 w-5" />
                Check In
              </Button>
              <Button
                size="lg"
                variant={isCheckedIn ? 'default' : 'outline'}
                onClick={handleCheckOut}
                disabled={!isCheckedIn || checkOutMutation.isPending}
              >
                <LogOut className="mr-2 h-5 w-5" />
                Check Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Present Days</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold text-green-600">{presentDays}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <div className="p-4 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Late Days</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold text-yellow-600">{lateDays}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <div className="p-4 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                <Timer className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Absent Days</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold text-red-600">{absentDays}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <div className="p-4 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Work Hours</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">{totalWorkHours.toFixed(1)}h</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Balance & History */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Leave Balance */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Balance</CardTitle>
            <CardDescription>Your remaining leave days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaveBalance.length > 0 ? leaveBalance.map((balance: any) => (
                <div key={balance.id || balance.leaveTypeId} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">
                      {(typeof balance.leaveType === 'object' ? balance.leaveType?.name : balance.leaveType) || balance.leaveTypeName || 'Leave'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {balance.used ?? balance.usedDays ?? 0} used of {balance.total ?? balance.totalDays ?? 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{balance.remaining ?? balance.remainingDays ?? 0}</p>
                    <p className="text-sm text-muted-foreground">remaining</p>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No leave balance data</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Your leave quotas will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Leave Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Leave Requests</CardTitle>
            <CardDescription>Your pending leave applications</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingLeaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No pending leave requests</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Your leave applications will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingLeaves.map((leave: LeaveRequest) => (
                  <div key={leave.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium capitalize">
                        {(typeof leave.leaveType === 'string' 
                          ? leave.leaveType 
                          : leave.leaveType?.name || 'Leave'
                        ).replace('_', ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(leave.fromDate || leave.startDate || '')} - {formatDate(leave.toDate || leave.endDate || '')}
                      </p>
                    </div>
                    <Badge variant="warning">{leave.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Attendance History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Your attendance records</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const [y, m] = month.split('-').map(Number);
                  const d = new Date(y, m - 2, 1);
                  setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 text-sm font-medium min-w-[120px] text-center">
                {new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={month >= new Date().toISOString().slice(0, 7)}
                onClick={() => {
                  const [y, m] = month.split('-').map(Number);
                  const d = new Date(y, m, 1);
                  setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : attendance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-lg mb-1">No Records Found</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                No attendance records for this month. Check in to start tracking your attendance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Check In</th>
                    <th className="text-left p-3 font-medium">Check Out</th>
                    <th className="text-left p-3 font-medium">Duration</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record: AttendanceRecord) => (
                    <tr key={record.id} className="border-b">
                      <td className="p-3">{formatDate(record.date)}</td>
                      <td className="p-3">
                        {record.checkIn ? formatTime(record.checkIn) : '-'}
                      </td>
                      <td className="p-3">
                        {record.checkOut ? formatTime(record.checkOut) : '-'}
                      </td>
                      <td className="p-3">
                        {(() => {
                          if (!record.checkIn) return '-';
                          const start = new Date(record.checkIn).getTime();
                          const end = record.checkOut ? new Date(record.checkOut).getTime() : Date.now();
                          const mins = Math.round((end - start) / 60000);
                          if (mins < 60) return `${mins}m`;
                          const h = Math.floor(mins / 60);
                          const m = mins % 60;
                          return m > 0 ? `${h}h ${m}m` : `${h}h`;
                        })()}
                      </td>
                      <td className="p-3">
                        <Badge className={getStatusColor(record.status)}>
                          {record.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
