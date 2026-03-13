'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyAttendance, AttendanceRecord } from '@/hooks/use-attendance';
import { formatTime } from '@/lib/utils';
import { getTodayInTimezone } from '@/lib/format';
import { useOrgSettings } from '@/hooks/use-org-settings';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  LogIn,
  LogOut,
  History,
  Timer,
} from 'lucide-react';

// ============================================================================
// Helper: compute total worked seconds from a list of attendance sessions
// For open sessions (checked in, no checkout), count up to now
// ============================================================================
export function getTotalWorkedSeconds(sessions: AttendanceRecord[]): number {
  let total = 0;
  for (const s of sessions) {
    if (!s.checkIn) continue;
    const start = new Date(s.checkIn).getTime();
    const end = s.checkOut ? new Date(s.checkOut).getTime() : Date.now();
    total += Math.max(0, Math.floor((end - start) / 1000));
  }
  return total;
}

// ============================================================================
// Helper: format seconds to "Xh Ym" or "Ym"
// ============================================================================
export function formatWorkedSeconds(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ============================================================================
// Helper: format seconds to "HH:MM:SS"
// ============================================================================
export function formatElapsedHMS(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ============================================================================
// Format a date for display
// ============================================================================
function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================================
// Shift a YYYY-MM-DD string by +/- n days
// ============================================================================
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  // Use local date parts (not toISOString which is UTC) to avoid timezone shift
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================================================
// Session duration display for a single row
// ============================================================================
function sessionDuration(s: AttendanceRecord): string {
  if (!s.checkIn) return '-';
  const start = new Date(s.checkIn).getTime();
  const end = s.checkOut ? new Date(s.checkOut).getTime() : Date.now();
  const sec = Math.max(0, Math.floor((end - start) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ============================================================================
// DIALOG COMPONENT
// ============================================================================
interface SessionHistoryDialogProps {
  children: React.ReactNode; // trigger element
}

export function SessionHistoryDialog({ children }: SessionHistoryDialogProps) {
  const { timezone } = useOrgSettings();
  const todayStr = getTodayInTimezone(timezone);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const { data, isLoading } = useMyAttendance({
    startDate: selectedDate,
    endDate: selectedDate,
    limit: 50,
  });

  const sessions: AttendanceRecord[] = useMemo(() => {
    return (data?.items || []).sort((a, b) => {
      // Sort by checkIn ascending so earliest session is first
      const aTime = a.checkIn ? new Date(a.checkIn).getTime() : 0;
      const bTime = b.checkIn ? new Date(b.checkIn).getTime() : 0;
      return aTime - bTime;
    });
  }, [data?.items]);

  const isToday = selectedDate === todayStr;
  const hasOpenSession = sessions.some((s) => s.checkIn && !s.checkOut);

  // Live-updating total worked seconds (ticks every second when there's an open session)
  const [totalSec, setTotalSec] = useState(() => getTotalWorkedSeconds(sessions));
  useEffect(() => {
    function tick() {
      setTotalSec(getTotalWorkedSeconds(sessions));
    }
    tick();
    if (hasOpenSession) {
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }
  }, [sessions, hasOpenSession]);

  // Tick counter to force re-render of per-session durations
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!hasOpenSession) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [hasOpenSession]);

  function goBack() {
    setSelectedDate((d) => shiftDate(d, -1));
  }
  function goForward() {
    setSelectedDate((d) => {
      const next = shiftDate(d, 1);
      return next > todayStr ? d : next;
    });
  }
  function goToday() {
    setSelectedDate(todayStr);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Session History
          </DialogTitle>
        </DialogHeader>

        {/* Date navigation */}
        <div className="flex items-center justify-between py-2">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="font-medium text-sm">{formatDisplayDate(selectedDate)}</p>
            {!isToday && (
              <button
                onClick={goToday}
                className="text-xs text-primary hover:underline mt-0.5"
              >
                Go to Today
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={goForward}
            disabled={isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Total worked */}
        <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" />
            Total Worked
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              {formatWorkedSeconds(totalSec)}
            </span>
            {hasOpenSession && (
              <Badge variant="outline" className="text-xs animate-pulse text-green-600 border-green-300">
                In Progress
              </Badge>
            )}
          </div>
        </div>

        {/* Session list */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading...
            </p>
          )}
          {!isLoading && sessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sessions recorded for this day
            </p>
          )}
          {sessions.map((s, idx) => {
            const isOpen = !!(s.checkIn && !s.checkOut);
            return (
              <div
                key={s.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  isOpen ? 'border-green-300 bg-green-50 dark:bg-green-950/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-sm">
                      <LogIn className="h-3.5 w-3.5 text-green-600" />
                      <span>{s.checkIn ? formatTime(s.checkIn) : '-'}</span>
                      {s.checkOut && (
                        <>
                          <span className="text-muted-foreground mx-1">→</span>
                          <LogOut className="h-3.5 w-3.5 text-red-500" />
                          <span>{formatTime(s.checkOut)}</span>
                        </>
                      )}
                    </div>
                    {isOpen && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Timer className="h-3 w-3 animate-pulse" />
                        Currently active
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${isOpen ? 'text-green-600' : ''}`}>
                    {sessionDuration(s)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sessions count */}
        {sessions.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
