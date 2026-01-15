'use client';

import { useState } from 'react';
import {
  useMyAttendance,
  useCheckIn,
  useCheckOut,
  useLeaveBalance,
  useMyLeaves,
  AttendanceRecord,
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
import { toast } from 'sonner';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  Timer,
  TrendingUp,
  Download,
} from 'lucide-react';
import Link from 'next/link';

export default function AttendancePage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data: attendanceData, isLoading } = useMyAttendance({
    startDate: `${month}-01`,
    endDate: `${month}-31`,
    limit: 50,
  });

  const { data: leaveBalance } = useLeaveBalance();
  const { data: leavesData } = useMyLeaves({ status: 'pending', limit: 5 });

  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const attendance = attendanceData?.items || [];
  const pendingLeaves = leavesData?.items || [];

  // Calculate today's status
  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = attendance.find((r) => r.date.slice(0, 10) === today);

  const isCheckedIn = !!(todayRecord?.checkIn && !todayRecord?.checkOut);
  const isCheckedOut = !!(todayRecord?.checkIn && todayRecord?.checkOut);

  async function handleCheckIn() {
    try {
      await checkInMutation.mutateAsync({});
      toast.success('Checked in successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to check in');
    }
  }

  async function handleCheckOut() {
    try {
      await checkOutMutation.mutateAsync({});
      toast.success('Checked out successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to check out');
    }
  }

  // Calculate monthly stats
  const presentDays = attendance.filter((r) => r.status === 'present').length;
  const lateDays = attendance.filter((r) => r.status === 'late').length;
  const absentDays = attendance.filter((r) => r.status === 'absent').length;
  const totalWorkHours = attendance.reduce((sum, r) => sum + (r.workHours || 0), 0);

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
          <Button variant="outline" size="icon" title="Download PDF">
            <Download className="h-4 w-4" />
          </Button>
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
              <h3 className="text-2xl font-bold">
                {!todayRecord
                  ? "You haven't checked in yet"
                  : isCheckedIn
                  ? `Checked in at ${formatTime(todayRecord.checkIn!)}`
                  : `Worked for ${formatDuration(todayRecord.workHours! * 60)}`}
              </h3>
              {isCheckedIn && (
                <p className="text-sm text-muted-foreground">
                  Remember to check out before you leave
                </p>
              )}
            </div>
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={handleCheckIn}
                disabled={isCheckedIn || isCheckedOut || checkInMutation.isPending}
              >
                <LogIn className="mr-2 h-5 w-5" />
                Check In
              </Button>
              <Button
                size="lg"
                variant="outline"
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
              {leaveBalance?.map((balance) => (
                <div key={balance.leaveType} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">
                      {balance.leaveType.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {balance.used} used of {balance.total}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{balance.remaining}</p>
                    <p className="text-sm text-muted-foreground">remaining</p>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground">No leave balance data</p>
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
              <p className="text-muted-foreground">No pending leave requests</p>
            ) : (
              <div className="space-y-4">
                {pendingLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium capitalize">
                        {leave.leaveType.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
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
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            />
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
            <p className="text-muted-foreground text-center py-8">
              No attendance records for this month
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Check In</th>
                    <th className="text-left p-3 font-medium">Check Out</th>
                    <th className="text-left p-3 font-medium">Work Hours</th>
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
                        {record.workHours ? `${record.workHours.toFixed(1)}h` : '-'}
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
