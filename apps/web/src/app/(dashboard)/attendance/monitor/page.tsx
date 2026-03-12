'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import {
  useAdminWeeklyAttendance,
  WeeklyAttendanceSession,
  WeeklyAttendanceEmployee,
  WeeklyAttendanceLeave,
} from '@/hooks/use-attendance';
import { useOrgSettings } from '@/hooks/use-org-settings';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  LogIn,
  LogOut,
  CalendarX,
  Users,
} from 'lucide-react';
import { getTodayInTimezone } from '@/lib/format';

// ─── Date helpers ──────────────────────────────────────────────────────────────

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getWeekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
}

function formatDateHeader(dateStr: string): { day: string; date: string } {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

function formatDateRange(from: string, to: string): string {
  const f = new Date(from + 'T00:00:00');
  const t = new Date(to + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${f.toLocaleDateString('en-US', opts)} – ${t.toLocaleDateString('en-US', opts)}`;
}

// ─── Time formatting ───────────────────────────────────────────────────────────

function fmtTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '--:--';
  return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function totalWorkMinutes(sessions: WeeklyAttendanceSession[], now: number): number {
  return sessions.reduce((acc, s) => {
    if (!s.checkIn) return acc;
    const start = new Date(s.checkIn).getTime();
    const end = s.checkOut ? new Date(s.checkOut).getTime() : now;
    return acc + Math.max(0, Math.floor((end - start) / 60000));
  }, 0);
}

// ─── Session Popup ─────────────────────────────────────────────────────────────

interface SessionPopupProps {
  employee: WeeklyAttendanceEmployee;
  dateStr: string;
  sessions: WeeklyAttendanceSession[];
  isToday: boolean;
  onClose: () => void;
}

function SessionPopup({ employee, dateStr, sessions, isToday, onClose }: SessionPopupProps) {
  const [tick, setTick] = useState(0);

  const hasOpen = sessions.some((s) => s.checkIn && !s.checkOut);

  useEffect(() => {
    if (!hasOpen) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [hasOpen]);

  const now = Date.now();
  const total = totalWorkMinutes(sessions, now);

  const d = new Date(dateStr + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Session History
          </DialogTitle>
        </DialogHeader>

        {/* Employee + date */}
        <div className="flex items-center gap-3 pb-2 border-b">
          <Avatar className="h-9 w-9">
            <AvatarImage src={employee.avatar || ''} />
            <AvatarFallback>{employee.firstName[0]}{employee.lastName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{employee.firstName} {employee.lastName}</p>
            <p className="text-xs text-muted-foreground">{dateLabel}</p>
          </div>
        </div>

        {/* Total */}
        <div className="rounded-lg bg-muted/50 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total worked</span>
          <span className="font-bold text-base">
            {hasOpen
              ? (() => {
                  const sec = sessions.reduce((acc, s) => {
                    if (!s.checkIn) return acc;
                    const start = new Date(s.checkIn).getTime();
                    const end = s.checkOut ? new Date(s.checkOut).getTime() : now;
                    return acc + Math.max(0, Math.floor((end - start) / 1000));
                  }, 0);
                  const h = Math.floor(sec / 3600);
                  const m = Math.floor((sec % 3600) / 60);
                  const sv = sec % 60;
                  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sv).padStart(2, '0')}`;
                })()
              : fmtHM(total)}
          </span>
        </div>

        {/* Sessions list */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {sessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No sessions recorded</p>
          )}
          {sessions.map((s, idx) => {
            const open = s.checkIn && !s.checkOut;
            const secDur = (() => {
              if (!s.checkIn) return 0;
              const start = new Date(s.checkIn).getTime();
              const end = s.checkOut ? new Date(s.checkOut).getTime() : now;
              return Math.max(0, Math.floor((end - start) / 1000));
            })();
            const h = Math.floor(secDur / 3600);
            const m = Math.floor((secDur % 3600) / 60);
            const sv = secDur % 60;
            const durStr = open
              ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sv).padStart(2, '0')}`
              : fmtHM(Math.floor(secDur / 60));

            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${open ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Session {idx + 1}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <LogIn className="h-3.5 w-3.5 text-green-600" />
                      <span>{fmtTime(s.checkIn)}</span>
                      {s.checkOut ? (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <LogOut className="h-3.5 w-3.5 text-red-500" />
                          <span>{fmtTime(s.checkOut)}</span>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-300 text-xs py-0">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`font-mono text-sm font-semibold ${open ? 'text-green-600' : ''}`}>
                  {durStr}
                </span>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cell component ────────────────────────────────────────────────────────────

interface CellProps {
  employee: WeeklyAttendanceEmployee;
  dateStr: string;
  isToday: boolean;
  sessions: WeeklyAttendanceSession[];
  leave: WeeklyAttendanceLeave | null;
  tick: number;
  onClickSessions: () => void;
}

function AttendanceCell({ employee, dateStr, isToday, sessions, leave, tick, onClickSessions }: CellProps) {
  const now = Date.now();
  const hasOpen = sessions.some((s) => s.checkIn && !s.checkOut);
  const hasSessions = sessions.length > 0;
  const totalMins = totalWorkMinutes(sessions, now);

  // No sessions and on leave
  if (!hasSessions && leave) {
    return (
      <div className="flex flex-col items-center gap-1 py-1 min-w-[110px]">
        <Badge
          variant="outline"
          className="text-amber-700 bg-amber-50 border-amber-200 text-xs font-medium"
        >
          {leave.halfDay ? 'Half Day' : leave.leaveCode}
        </Badge>
        <span className="text-xs text-muted-foreground">{leave.leaveName}</span>
      </div>
    );
  }

  // No sessions, not a future date
  if (!hasSessions) {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d > today) {
      return <div className="text-center text-muted-foreground/40 text-xs py-1">—</div>;
    }
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        <div className="w-2 h-2 rounded-full bg-slate-300" />
        <span className="text-xs text-muted-foreground">Absent</span>
      </div>
    );
  }

  // Has sessions
  const sessionLabel = `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`;

  return (
    <div className="flex flex-col items-center gap-1 py-1 min-w-[110px]">
      {/* Status dot */}
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            hasOpen ? 'bg-green-500 animate-pulse' : 'bg-slate-400'
          }`}
        />
        <span className={`text-xs font-medium ${hasOpen ? 'text-green-700' : 'text-slate-600'}`}>
          {hasOpen ? 'Online' : 'Done'}
        </span>
      </div>

      {/* Total time */}
      <span className="text-sm font-semibold tabular-nums">
        {hasOpen
          ? (() => {
              const sec = sessions.reduce((acc, s) => {
                if (!s.checkIn) return acc;
                const start = new Date(s.checkIn).getTime();
                const end = s.checkOut ? new Date(s.checkOut).getTime() : now;
                return acc + Math.max(0, Math.floor((end - start) / 1000));
              }, 0);
              const h = Math.floor(sec / 3600);
              const m = Math.floor((sec % 3600) / 60);
              const sv = sec % 60;
              return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sv).padStart(2, '0')}`;
            })()
          : fmtHM(totalMins)}
      </span>

      {/* Session count link */}
      <button
        onClick={onClickSessions}
        className="text-xs text-primary hover:underline cursor-pointer"
      >
        ({sessionLabel})
      </button>

      {/* Leave badge alongside (half-day + attendance) */}
      {leave && (
        <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-[10px] py-0">
          +{leave.halfDay ? 'Half' : leave.leaveCode}
        </Badge>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AttendanceMonitorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { timezone } = useOrgSettings();

  // Access guard
  const isAllowed = user?.roles?.some((r) => r === 'tenant_admin' || r === 'admin') ?? false;

  useEffect(() => {
    if (user && !isAllowed) {
      router.replace('/dashboard');
    }
  }, [user, isAllowed, router]);

  const todayStr = getTodayInTimezone(timezone);
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(todayStr));

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekEnd = weekDays[6];

  const { data, isLoading, isError } = useAdminWeeklyAttendance(weekStart, weekEnd);

  // Live tick for running sessions
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Session popup state
  const [popup, setPopup] = useState<{
    employee: WeeklyAttendanceEmployee;
    dateStr: string;
    sessions: WeeklyAttendanceSession[];
  } | null>(null);

  const employees: WeeklyAttendanceEmployee[] = data?.data ?? [];

  function prevWeek() {
    setWeekStart((w) => shiftDate(w, -7));
  }
  function nextWeek() {
    setWeekStart((w) => shiftDate(w, 7));
  }
  function goThisWeek() {
    setWeekStart(getMondayOfWeek(todayStr));
  }

  const isCurrentWeek = weekStart === getMondayOfWeek(todayStr);

  if (!user) return null;
  if (!isAllowed) return null;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Attendance Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live check-in &amp; check-out tracking for all employees
          </p>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2 bg-card border rounded-xl px-3 py-2 shadow-sm">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[200px]">
            <p className="text-sm font-semibold">{formatDateRange(weekStart, weekEnd)}</p>
            {!isCurrentWeek && (
              <button onClick={goThisWeek} className="text-xs text-primary hover:underline">
                Back to current week
              </button>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
          Currently checked in (live timer)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
          Checked out
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
          Absent
        </span>
        <span className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-[10px] py-0">LV</Badge>
          On leave
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/40">
              {/* Sticky employee col */}
              <th className="sticky left-0 z-10 bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground min-w-[200px]">
                Employee
              </th>
              {weekDays.map((day) => {
                const { day: dayName, date } = formatDateHeader(day);
                const isToday = day === todayStr;
                return (
                  <th
                    key={day}
                    className={`px-3 py-3 text-center font-semibold min-w-[120px] ${
                      isToday ? 'text-primary bg-primary/5' : 'text-muted-foreground'
                    }`}
                  >
                    <div>{dayName}</div>
                    <div className={`text-xs font-normal mt-0.5 ${isToday ? 'font-semibold text-primary' : ''}`}>
                      {date}
                      {isToday && (
                        <span className="ml-1 text-[10px] bg-primary text-primary-foreground px-1 rounded">
                          Today
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="text-center py-16 text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading attendance data…
                  </div>
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={8} className="text-center py-16 text-destructive">
                  Failed to load attendance data. Please try again.
                </td>
              </tr>
            )}
            {!isLoading && !isError && employees.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-16 text-muted-foreground">
                  <CalendarX className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  No employees found.
                </td>
              </tr>
            )}
            {employees.map((emp, idx) => (
              <tr
                key={emp.employeeId}
                className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 1 ? 'bg-muted/10' : ''}`}
              >
                {/* Employee info – sticky */}
                <td className={`sticky left-0 z-10 px-4 py-3 ${idx % 2 === 1 ? 'bg-muted/10' : 'bg-card'} hover:bg-muted/30`}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={emp.avatar || ''} />
                      <AvatarFallback className="text-xs">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.department || emp.designation || emp.employeeCode}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Day cells */}
                {weekDays.map((day) => {
                  const sessions: WeeklyAttendanceSession[] = emp.attendance[day] ?? [];
                  const leave: WeeklyAttendanceLeave | null = emp.leaves[day] ?? null;
                  const isToday = day === todayStr;
                  return (
                    <td
                      key={day}
                      className={`px-2 py-1 text-center align-middle ${isToday ? 'bg-primary/5' : ''}`}
                    >
                      <AttendanceCell
                        employee={emp}
                        dateStr={day}
                        isToday={isToday}
                        sessions={sessions}
                        leave={leave}
                        tick={tick}
                        onClickSessions={() =>
                          sessions.length > 0 &&
                          setPopup({ employee: emp, dateStr: day, sessions })
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary bar */}
      {!isLoading && employees.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap pt-1">
          <span>
            <strong className="text-foreground">
              {employees.filter((e) => (e.attendance[todayStr] ?? []).some((s) => s.checkIn && !s.checkOut)).length}
            </strong>{' '}
            currently online
          </span>
          <span>
            <strong className="text-foreground">
              {employees.filter((e) => (e.attendance[todayStr] ?? []).length > 0).length}
            </strong>{' '}
            checked in today
          </span>
          <span>
            <strong className="text-foreground">
              {employees.filter((e) => (e.attendance[todayStr] ?? []).length === 0 && !e.leaves[todayStr]).length}
            </strong>{' '}
            absent today
          </span>
          <span>
            <strong className="text-foreground">{employees.length}</strong> total employees
          </span>
        </div>
      )}

      {/* Session popup */}
      {popup && (
        <SessionPopup
          employee={popup.employee}
          dateStr={popup.dateStr}
          sessions={popup.sessions}
          isToday={popup.dateStr === todayStr}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
