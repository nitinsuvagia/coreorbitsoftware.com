'use client';

import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { getAvatarColor } from '@/lib/format';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Mail,
  Phone,
  Calendar,
  Clock,
  FileText,
  Link,
  Copy,
  RefreshCw,
  Send,
  User,
  Briefcase,
  Timer,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ExternalLink,
  Activity,
  BarChart3,
} from 'lucide-react';
import { assessmentApi } from '@/lib/api/assessments';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface Invitation {
  id: string;
  testId: string;
  testName: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  position?: string;
  status: 'invited' | 'in_progress' | 'completed' | 'expired';
  invitedAt: Date;
  scheduledAt?: Date;
  expiresAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  assessmentCode: string;
  score?: number;
  passed?: boolean;
  timeTaken?: number;
  totalQuestions?: number;
  answeredQuestions?: number;
}

interface ViewCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invitation: Invitation | null;
  onResend?: () => void;
}

// ============================================================================
// VIEW CANDIDATE DIALOG
// ============================================================================

export function ViewCandidateDialog({ 
  open, 
  onOpenChange, 
  invitation,
  onResend 
}: ViewCandidateDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 600);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!invitation) return null;

  const handleSendEmail = async () => {
    try {
      setIsSendingEmail(true);
      await assessmentApi.sendInvitationEmail(invitation.id);
      toast.success('Invitation email sent successfully!');
    } catch (err: any) {
      console.error('Failed to send email:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Skeleton Loading for Dialog
  const DialogSkeleton = () => (
    <div className="space-y-6 pr-4">
      {/* Candidate Info Skeleton */}
      <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="space-y-2 mt-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>

      {/* Test Info Skeleton */}
      <div className="p-4 border rounded-lg space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Code Section Skeleton */}
      <div className="p-4 border rounded-lg space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </div>

      {/* Timeline Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(invitation.assessmentCode);
      toast.success('Assessment code copied!');
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const handleCopyLink = async () => {
    try {
      const link = `${window.location.origin}/assessment/start?code=${invitation.assessmentCode}`;
      await navigator.clipboard.writeText(link);
      toast.success('Assessment link copied!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'invited':
        return <Badge className="bg-blue-100 text-blue-700">Invited</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-700">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-700">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Candidate Details
          </DialogTitle>
          <DialogDescription>
            View assessment invitation details and candidate information
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          {isLoading ? (
            <DialogSkeleton />
          ) : (
          <div className="space-y-6 pr-4">
            {/* Candidate Info Section */}
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
              <Avatar className="h-16 w-16">
                <AvatarFallback className={`${getAvatarColor((invitation.candidateEmail || '') + (invitation.candidateName || '')).className} text-xl font-semibold`}>
                  {(invitation.candidateName || 'C').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{invitation.candidateName}</h3>
                  {getStatusBadge(invitation.status)}
                </div>
                <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{invitation.candidateEmail}</span>
                  </div>
                  {invitation.candidatePhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{invitation.candidatePhone}</span>
                    </div>
                  )}
                  {invitation.position && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      <span>{invitation.position}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Assessment Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Assessment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Test Name</p>
                    <p className="font-medium">{invitation.testName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assessment Code</p>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-muted rounded font-mono text-sm">
                        {invitation.assessmentCode}
                      </code>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyCode}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Invited On</p>
                      <p className="font-medium">{format(invitation.invitedAt, 'PPP')}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(invitation.invitedAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {invitation.scheduledAt && (
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Assessment Date</p>
                        <p className="font-medium">{format(invitation.scheduledAt, 'PPP')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(invitation.scheduledAt, 'hh:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Expires On</p>
                      <p className="font-medium">{format(invitation.expiresAt, 'PPP')}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(invitation.expiresAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>

                {invitation.startedAt && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Started At</p>
                          <p className="font-medium">{format(invitation.startedAt, 'PPP p')}</p>
                        </div>
                      </div>
                      {invitation.completedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Completed At</p>
                            <p className="font-medium">{format(invitation.completedAt, 'PPP p')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Progress/Results Section */}
            {(invitation.status === 'in_progress' || invitation.status === 'completed') && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {invitation.status === 'completed' ? 'Results' : 'Progress'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {invitation.status === 'in_progress' && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Questions Answered</span>
                          <span className="font-medium">
                            {invitation.answeredQuestions || 0} / {invitation.totalQuestions || 0}
                          </span>
                        </div>
                        <Progress 
                          value={((invitation.answeredQuestions || 0) / (invitation.totalQuestions || 1)) * 100} 
                        />
                      </div>
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <p className="text-sm text-yellow-800">
                            Candidate is currently taking the test
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {invitation.status === 'completed' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-3xl font-bold text-primary">{Number(invitation.score).toFixed(2)}%</p>
                        <p className="text-sm text-muted-foreground">Score</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-3xl font-bold">{invitation.timeTaken}</p>
                        <p className="text-sm text-muted-foreground">Minutes</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        {invitation.passed ? (
                          <>
                            <CheckCircle className="h-8 w-8 mx-auto text-green-600" />
                            <p className="text-sm text-green-600 font-medium mt-1">Passed</p>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-8 w-8 mx-auto text-red-600" />
                            <p className="text-sm text-red-600 font-medium mt-1">Failed</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyLink}>
                    <Link className="h-4 w-4 mr-2" />
                    Copy Assessment Link
                  </Button>
                  {(invitation.status === 'invited' || invitation.status === 'expired') && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        onOpenChange(false);
                        onResend?.();
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resend Invitation
                    </Button>
                  )}
                  {invitation.status === 'completed' && (
                    <Button variant="outline" size="sm">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Full Report
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSendEmail}
                    disabled={isSendingEmail}
                  >
                    {isSendingEmail ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
