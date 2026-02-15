'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { getAvatarColor } from '@/lib/format';
import { assessmentApi, LiveMonitorData, QuestionProgress } from '@/lib/api/assessments';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Clock,
  Timer,
  Monitor,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Ban,
  Activity,
  FileQuestion,
  MousePointer,
  Keyboard,
  Camera,
  CameraOff,
  Wifi,
  WifiOff,
  Copy,
  ExternalLink,
  AlertCircle,
  ClipboardList,
  ChevronRight,
  RefreshCw,
  Maximize,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface ScheduledTest {
  id: string;
  testName: string;
  testId: string;
  candidateName: string;
  candidateEmail: string;
  position: string;
  scheduledDate: Date;
  scheduledTime: string;
  duration: number;
  status: string;
  startedAt?: Date;
  timeRemaining?: number;
  isToday: boolean;
  assessmentCode: string;
  score?: number;
  passed?: boolean;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusIndicator({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`relative flex h-2.5 w-2.5`}>
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isActive ? 'bg-green-500' : 'bg-yellow-500'} opacity-75`}></span>
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isActive ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
      </span>
      <Wifi className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{isActive ? 'Active' : 'Idle'}</span>
    </div>
  );
}

function QuestionGrid({ progress }: { progress: QuestionProgress[] }) {
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {progress.map((q) => {
        const statusConfig = {
          answered: { bg: 'bg-green-500', title: 'Answered' },
          skipped: { bg: 'bg-yellow-500', title: 'Skipped' },
          current: { bg: 'bg-blue-500 animate-pulse', title: 'Current' },
          not_visited: { bg: 'bg-muted', title: 'Not visited' },
        };
        const config = statusConfig[q.status];
        
        return (
          <TooltipProvider key={q.questionNumber}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'h-6 w-6 rounded flex items-center justify-center text-xs font-medium cursor-default transition-transform hover:scale-110',
                    config.bg,
                    q.status === 'answered' || q.status === 'current' ? 'text-white' : 'text-muted-foreground'
                  )}
                >
                  {q.questionNumber}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Q{q.questionNumber}: {config.title}</p>
                {q.timeSpent > 0 && <p className="text-xs text-muted-foreground">Time: {Math.floor(q.timeSpent / 60)}m {q.timeSpent % 60}s</p>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface MonitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: ScheduledTest | null;
}

export function MonitorDialog({ open, onOpenChange, test }: MonitorDialogProps) {
  const [monitorData, setMonitorData] = useState<LiveMonitorData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localRemainingTime, setLocalRemainingTime] = useState<number | null>(null);

  const fetchMonitorData = useCallback(async () => {
    if (!test?.id) return;
    
    try {
      const data = await assessmentApi.getLiveMonitorData(test.id);
      setMonitorData(data);
      setLocalRemainingTime(data.remainingTime || null);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch monitor data:', err);
      setError(err.message || 'Failed to load monitoring data');
    }
  }, [test?.id]);

  useEffect(() => {
    if (open && test) {
      setIsLoading(true);
      setError(null);
      
      fetchMonitorData().finally(() => setIsLoading(false));
      
      // Poll for updates every 5 seconds
      const pollInterval = setInterval(() => {
        fetchMonitorData();
      }, 5000);
      
      // Count down remaining time locally every second
      const countdownInterval = setInterval(() => {
        setLocalRemainingTime((prev) => {
          if (prev === null || prev <= 0) return prev;
          return prev - (1 / 60); // Decrease by 1 second (1/60 of a minute)
        });
      }, 1000);

      return () => {
        clearInterval(pollInterval);
        clearInterval(countdownInterval);
      };
    }
  }, [open, test, fetchMonitorData]);

  const handleRefresh = async () => {
    if (!test) return;
    setIsRefreshing(true);
    await fetchMonitorData();
    setIsRefreshing(false);
    toast.success('Monitor data refreshed');
  };

  const handleTerminate = () => {
    toast.error('Assessment terminated', {
      description: `${test?.candidateName}'s assessment has been terminated.`,
    });
    onOpenChange(false);
  };

  const handlePause = () => {
    toast.info('Assessment paused', {
      description: `${test?.candidateName}'s assessment has been paused.`,
    });
  };

  // Skeleton Loading for Monitor Dialog
  const MonitorSkeleton = () => (
    <div className="space-y-6 pb-4">
      {/* Candidate Info Skeleton */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Stats Skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div>
                  <Skeleton className="h-6 w-12 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Bar Skeleton */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Activity Log Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  if (!test) return null;

  const progressPercent = monitorData && monitorData.totalQuestions 
    ? ((monitorData.answeredQuestions || 0) / monitorData.totalQuestions) * 100 
    : 0;
  const timePercent = monitorData && monitorData.elapsedTime !== undefined 
    ? (monitorData.elapsedTime / (monitorData.duration || test.duration)) * 100 
    : 0;
  const displayRemainingTime = localRemainingTime !== null ? localRemainingTime : (monitorData?.remainingTime || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Monitor className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Live Assessment Monitor</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  {monitorData?.notStarted ? (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <Clock className="h-3 w-3 mr-1" /> Not Started
                    </Badge>
                  ) : monitorData?.status === 'COMPLETED' ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" /> Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      <Play className="h-3 w-3 mr-1 animate-pulse" /> In Progress
                    </Badge>
                  )}
                  {monitorData && !monitorData.notStarted && <StatusIndicator isActive={monitorData.isActive || false} />}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <MonitorSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg font-medium text-red-600">Failed to load monitoring data</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button onClick={handleRefresh} variant="outline" className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : monitorData?.notStarted ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-16 w-16 text-yellow-500 mb-4" />
              <p className="text-lg font-medium">Assessment Not Started Yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {monitorData.candidateName} has not started the assessment yet.
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm"><strong>Test:</strong> {monitorData.testName}</p>
                <p className="text-sm"><strong>Duration:</strong> {monitorData.duration} minutes</p>
                <p className="text-sm"><strong>Status:</strong> {monitorData.invitationStatus}</p>
              </div>
            </div>
          ) : monitorData ? (
          <div className="space-y-6 pb-4">
            {/* Candidate Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={`${getAvatarColor((monitorData.candidateEmail || '') + (monitorData.candidateName || '')).className} text-lg font-semibold`}>
                        {(monitorData.candidateName || 'C').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{monitorData.candidateName}</h3>
                      <p className="text-sm text-muted-foreground">{monitorData.candidateEmail}</p>
                      <p className="text-sm text-muted-foreground">{monitorData.position}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{monitorData.testName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Started at {monitorData.startedAt ? format(new Date(monitorData.startedAt), 'h:mm a') : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Time Remaining */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-full',
                      displayRemainingTime < 10 ? 'bg-red-100' : 'bg-blue-100'
                    )}>
                      <Timer className={cn(
                        'h-5 w-5',
                        displayRemainingTime < 10 ? 'text-red-600' : 'text-blue-600'
                      )} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {Math.floor(displayRemainingTime)}m
                      </p>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Questions Answered */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-100">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {monitorData.answeredQuestions || 0}/{monitorData.totalQuestions || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Answered</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Question */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-purple-100">
                      <FileQuestion className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        Q{monitorData.currentQuestion || 1}
                      </p>
                      <p className="text-xs text-muted-foreground">Current</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Status */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-full',
                      monitorData.isActive ? 'bg-green-100' : 'bg-yellow-100'
                    )}>
                      <Activity className={cn(
                        'h-5 w-5',
                        monitorData.isActive ? 'text-green-600' : 'text-yellow-600'
                      )} />
                    </div>
                    <div>
                      <p className="text-lg font-bold">
                        {monitorData.isActive ? 'Active' : 'Idle'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last: {monitorData.lastActivity ? format(new Date(monitorData.lastActivity), 'h:mm:ss a') : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Progress Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Questions Answered</span>
                    <span className="font-medium">{Math.round(progressPercent)}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                {/* Time Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Time Used</span>
                    <span className="font-medium">{Math.round(timePercent)}%</span>
                  </div>
                  <Progress value={timePercent} className="h-2" />
                </div>

                <Separator />

                {/* Question Grid */}
                {monitorData.questionProgress && monitorData.questionProgress.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-3">Question Status</p>
                    <QuestionGrid progress={monitorData.questionProgress} />
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded bg-green-500" />
                        <span>Answered ({monitorData.answeredQuestions || 0})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded bg-yellow-500" />
                        <span>Skipped ({monitorData.skippedQuestions || 0})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded bg-blue-500" />
                        <span>Current</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded bg-muted" />
                        <span>Not visited</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Proctoring & Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Proctoring Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Proctoring Status
                    {monitorData.proctoringEnabled && (
                      <Badge variant="outline" className="ml-2 text-xs">Enabled</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Maximize className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Fullscreen Required</span>
                    </div>
                    <Badge variant={monitorData.fullscreenRequired ? 'default' : 'secondary'}>
                      {monitorData.fullscreenRequired ? 'Yes' : 'No'}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Tab Switches</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={(monitorData.tabSwitchLimit && (monitorData.tabSwitchCount || 0) >= monitorData.tabSwitchLimit) ? 'destructive' : (monitorData.tabSwitchCount || 0) > 0 ? 'secondary' : 'default'}>
                        {monitorData.tabSwitchCount || 0}{monitorData.tabSwitchLimit ? ` / ${monitorData.tabSwitchLimit}` : ''}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Warnings</span>
                    </div>
                    <Badge variant={(monitorData.warningsCount || 0) > 2 ? 'destructive' : (monitorData.warningsCount || 0) > 0 ? 'secondary' : 'default'}>
                      {monitorData.warningsCount || 0}
                    </Badge>
                  </div>

                  {monitorData.browserInfo && (
                    <>
                      <Separator />
                      <div className="text-xs text-muted-foreground">
                        <p><strong>Browser:</strong> {monitorData.browserInfo}</p>
                        {monitorData.ipAddress && <p><strong>IP:</strong> {monitorData.ipAddress}</p>}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Activity Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Activity Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Time Elapsed</p>
                        <p className="text-2xl font-bold">{monitorData.elapsedTime || 0}m</p>
                      </div>
                      <Timer className="h-8 w-8 text-muted-foreground" />
                    </div>
                    
                    {(monitorData.tabSwitchCount || 0) > 0 && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {monitorData.tabSwitchCount} tab switch{(monitorData.tabSwitchCount || 0) > 1 ? 'es' : ''} detected
                          </span>
                        </div>
                        {monitorData.tabSwitchLimit && (monitorData.tabSwitchCount || 0) >= monitorData.tabSwitchLimit && (
                          <p className="text-xs text-orange-600 mt-1">Limit reached - Assessment may be terminated</p>
                        )}
                      </div>
                    )}

                    {(monitorData.tabSwitchCount || 0) === 0 && (monitorData.warningsCount || 0) === 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">No suspicious activity detected</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          ) : null}
        </ScrollArea>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePause} disabled={isLoading || monitorData?.notStarted || monitorData?.status === 'COMPLETED'}>
              <Pause className="h-4 w-4 mr-2" />
              Pause Test
            </Button>
            <Button variant="destructive" onClick={handleTerminate} disabled={isLoading || monitorData?.notStarted || monitorData?.status === 'COMPLETED'}>
              <Ban className="h-4 w-4 mr-2" />
              Terminate
            </Button>
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
