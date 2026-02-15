'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarColor } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  Mail,
  FileText,
  ExternalLink,
  Users,
  MessageSquare,
  CheckCircle,
  XCircle,
  RefreshCw,
  Star,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Send,
  CalendarPlus,
  User,
  Briefcase,
  Building2,
  Gavel,
  Award,
} from 'lucide-react';
import {
  interviewApi,
  Interview,
  InterviewFeedback,
  interviewTypeLabels,
  interviewTypeColors,
  interviewStatusLabels,
  interviewStatusColors,
  interviewModeLabels,
  recommendationLabels,
  recommendationColors,
  recommendationIcons,
} from '@/lib/api/interviews';
import { api } from '@/lib/api/client';
import { ScheduleInterviewDialog } from '../_components/ScheduleInterviewDialog';
import { FeedbackFormDialog } from '../_components/FeedbackFormDialog';
import { SendOfferDialog } from '@/components/hr/SendOfferDialog';

// ============================================================================
// SKELETON LOADER
// ============================================================================

function InterviewDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button 
          variant="ghost" 
          className="mb-2 -ml-2 text-muted-foreground opacity-50"
          disabled
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Interviews
        </Button>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-5 w-48" />
      </div>
      
      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INTERVIEW PROGRESS COMPONENT
// ============================================================================

interface InterviewProgressProps {
  currentRound: number;
  totalRounds: number;
  interviewType: string;
}

function InterviewProgress({ currentRound, totalRounds, interviewType }: InterviewProgressProps) {
  const stages = [
    { name: 'Phone Screen', round: 1 },
    { name: 'Technical R1', round: 2 },
    { name: 'Technical R2', round: 3 },
    { name: 'HR Round', round: 4 },
  ];

  return (
    <div className="relative">
      <div className="flex justify-between items-center">
        {stages.slice(0, totalRounds).map((stage, index) => {
          const isCompleted = index + 1 < currentRound;
          const isCurrent = index + 1 === currentRound;
          
          return (
            <div key={stage.round} className="flex flex-col items-center flex-1">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${isCompleted 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : isCurrent 
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 ring-2 ring-yellow-500' 
                    : 'bg-muted text-muted-foreground'}
                `}
              >
                {isCompleted ? <CheckCircle className="h-5 w-5" /> : index + 1}
              </div>
              <span className="text-xs mt-2 text-center">{stage.name}</span>
              {isCurrent && (
                <Badge variant="secondary" className="text-xs mt-1">Current</Badge>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Progress line */}
      <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-muted -z-10">
        <div 
          className="h-full bg-green-500 transition-all"
          style={{ width: `${((currentRound - 1) / (totalRounds - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// PANELIST CARD COMPONENT
// ============================================================================

interface PanelistCardProps {
  panelist: NonNullable<Interview['panelists']>[0];
  feedback?: InterviewFeedback;
  onSubmitFeedback: () => void;
  isCurrentUser?: boolean;
}

function PanelistCard({ panelist, feedback, onSubmitFeedback, isCurrentUser }: PanelistCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={panelist.employee?.avatar} />
            <AvatarFallback className={`${getAvatarColor((panelist.employee?.email || '') + (panelist.employee?.firstName || '') + (panelist.employee?.lastName || '')).className} font-semibold`}>
              {panelist.employee?.firstName?.[0]}{panelist.employee?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">
                {panelist.employee?.firstName} {panelist.employee?.lastName}
              </span>
              {panelist.isLead && (
                <Badge variant="outline" className="text-xs">Lead</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {panelist.employee?.designation}
            </p>
            
            {/* Status */}
            <div className="mt-2">
              {feedback ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={recommendationColors[feedback.recommendation]}>
                      {recommendationIcons[feedback.recommendation]} {recommendationLabels[feedback.recommendation]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= feedback.overallRating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-muted-foreground">
                      ({feedback.overallRating}/5)
                    </span>
                  </div>
                </div>
              ) : panelist.joinedAt ? (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Joined
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Waiting
                </Badge>
              )}
            </div>
          </div>
          
          {/* Action button for current user */}
          {isCurrentUser && !feedback && (
            <Button size="sm" onClick={onSubmitFeedback}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Submit Feedback
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FEEDBACK SUMMARY COMPONENT
// ============================================================================

interface FeedbackSummaryProps {
  feedbacks: InterviewFeedback[];
}

function FeedbackSummary({ feedbacks }: FeedbackSummaryProps) {
  if (feedbacks.length === 0) return null;

  const avgRating = feedbacks.reduce((sum, f) => sum + f.overallRating, 0) / feedbacks.length;
  const recommendations = feedbacks.reduce((acc, f) => {
    acc[f.recommendation] = (acc[f.recommendation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Feedback Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Average Rating */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Average Rating</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(avgRating)
                    ? 'text-yellow-500 fill-yellow-500'
                    : 'text-muted-foreground'
                }`}
              />
            ))}
            <span className="ml-2 font-medium">{avgRating.toFixed(1)}/5</span>
          </div>
        </div>

        <Separator />

        {/* Recommendations breakdown */}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Recommendations</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(recommendations).map(([rec, count]) => (
              <Badge 
                key={rec} 
                className={recommendationColors[rec as keyof typeof recommendationColors]}
              >
                {recommendationIcons[rec as keyof typeof recommendationIcons]} {recommendationLabels[rec as keyof typeof recommendationLabels]} ({count})
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Individual Feedbacks */}
        <div className="space-y-3">
          {feedbacks.map((feedback) => (
            <div key={feedback.id} className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className={`${getAvatarColor((feedback.interviewer?.firstName || '') + (feedback.interviewer?.lastName || '')).className} text-xs font-semibold`}>
                    {feedback.interviewer?.firstName?.[0]}{feedback.interviewer?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">
                  {feedback.interviewer?.firstName} {feedback.interviewer?.lastName}
                </span>
                <Badge variant="outline" className="text-xs">
                  {feedback.overallRating}/5
                </Badge>
              </div>
              
              {feedback.strengths && (
                <div className="text-sm mb-1">
                  <span className="text-green-600 dark:text-green-400">+</span> {feedback.strengths}
                </div>
              )}
              
              {feedback.weaknesses && (
                <div className="text-sm mb-1">
                  <span className="text-red-600 dark:text-red-400">-</span> {feedback.weaknesses}
                </div>
              )}
              
              {feedback.comments && (
                <p className="text-sm text-muted-foreground mt-2">
                  "{feedback.comments}"
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function InterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState<Interview | null>(null);
  
  // Dialog states
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [finalDecisionDialogOpen, setFinalDecisionDialogOpen] = useState(false);
  const [makingDecision, setMakingDecision] = useState(false);
  const [sendOfferOpen, setSendOfferOpen] = useState(false);

  // TODO: Replace with actual user role check from auth context
  const isHR = true; // HR can always submit/update feedback
  const currentUserId = 'current-user'; // TODO: Get from auth context

  // Load interview data
  useEffect(() => {
    loadInterview();
  }, [interviewId]);

  const loadInterview = async () => {
    try {
      setLoading(true);
      const data = await interviewApi.getInterview(interviewId);
      setInterview(data);
    } catch (error) {
      console.error('Failed to load interview:', error);
      toast.error('Failed to load interview details');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleComplete = async () => {
    try {
      await interviewApi.completeInterview(interviewId);
      toast.success('Interview marked as complete. Please submit your feedback.');
      setCompleteDialogOpen(false);
      await loadInterview();
      // Auto-open feedback form after completing interview
      setFeedbackDialogOpen(true);
    } catch (error) {
      toast.error('Failed to complete interview');
      setCompleteDialogOpen(false);
    }
  };

  const handleCancel = async () => {
    try {
      await interviewApi.cancelInterview(interviewId);
      toast.success('Interview cancelled');
      router.push('/hr/interviews');
    } catch (error) {
      toast.error('Failed to cancel interview');
    } finally {
      setCancelDialogOpen(false);
    }
  };

  const handleJoinMeeting = () => {
    if (interview?.meetingLink) {
      window.open(interview.meetingLink, '_blank');
    }
  };

  const getModeIcon = () => {
    if (!interview) return null;
    switch (interview.mode) {
      case 'VIDEO': return <Video className="h-5 w-5" />;
      case 'PHONE': return <Phone className="h-5 w-5" />;
      case 'IN_PERSON': return <MapPin className="h-5 w-5" />;
    }
  };

  const handleFinalDecision = async (decision: 'OFFERED' | 'HIRED' | 'REJECTED') => {
    try {
      setMakingDecision(true);
      
      // For HIRED, use the proper hire endpoint that creates employee
      if (decision === 'HIRED') {
        const response = await fetch('/api/v1/onboarding/hire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            candidateId: interview?.candidateId,
          }),
        });
        
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to mark as hired');
        }
        
        toast.success(result.message || `Successfully hired ${interview?.candidate?.firstName} ${interview?.candidate?.lastName}`);
      } else {
        // For other statuses, use the regular update
        await api.patch(`/api/v1/candidates/${interview?.candidateId}/status`, { status: decision });
        
        const decisionLabels = {
          OFFERED: 'Offer extended to',
          REJECTED: 'Candidate rejected',
        };
        
        toast.success(`${decisionLabels[decision]} ${interview?.candidate?.firstName} ${interview?.candidate?.lastName}`);
      }
      
      setFinalDecisionDialogOpen(false);
      loadInterview();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update candidate status');
    } finally {
      setMakingDecision(false);
    }
  };

  if (loading) {
    return <InterviewDetailSkeleton />;
  }

  if (!interview) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Interview not found</h3>
            <p className="text-muted-foreground mb-4">
              The interview you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => router.push('/hr/interviews')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Interviews
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scheduledDate = new Date(interview.scheduledAt);
  const endTime = new Date(scheduledDate.getTime() + interview.duration * 60000);
  const isCompleted = interview.status === 'COMPLETED';
  const isCancelled = interview.status === 'CANCELLED' || interview.status === 'NO_SHOW';
  const canModify = !isCompleted && !isCancelled;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/hr/interviews')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Interviews
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 text-xl">
              <AvatarFallback className={`${getAvatarColor((interview.candidate?.email || '') + (interview.candidate?.firstName || '') + (interview.candidate?.lastName || '')).className} font-semibold`}>
                {interview.candidate?.firstName?.[0]}{interview.candidate?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {interview.candidate?.firstName} {interview.candidate?.lastName}
                </h1>
                <Badge className={interviewStatusColors[interview.status]}>
                  {interviewStatusLabels[interview.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {interview.candidate?.currentRole} at {interview.candidate?.currentCompany}
                {' · '}{interviewTypeLabels[interview.type]} · Round {interview.roundNumber} of {interview.totalRounds}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {interview.candidate?.resumeUrl && (
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              View Resume
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/hr/candidates/${interview.jobId}/${interview.candidateId}`)}
          >
            <User className="h-4 w-4 mr-2" />
            View Profile
          </Button>
          {canModify && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRescheduleDialogOpen(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setCancelDialogOpen(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interview Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Interview Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date, Time, Duration */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Date & Time</span>
                  </div>
                  <div className="font-medium">
                    {format(scheduledDate, 'MMM dd, yyyy')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(scheduledDate, 'h:mm a')} - {format(endTime, 'h:mm a')}
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Duration</span>
                  </div>
                  <div className="font-medium">{interview.duration} minutes</div>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    {getModeIcon()}
                    <span className="text-sm">Mode</span>
                  </div>
                  <div className="font-medium">{interviewModeLabels[interview.mode]}</div>
                  {interview.meetingLink && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-sm"
                      onClick={handleJoinMeeting}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Join Meeting
                    </Button>
                  )}
                  {interview.location && (
                    <div className="text-sm text-muted-foreground">{interview.location}</div>
                  )}
                </div>
              </div>

              {/* Job Info */}
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Briefcase className="h-4 w-4" />
                  <span className="text-sm">Position</span>
                </div>
                <div className="font-medium">{interview.job?.title}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {interview.job?.department}
                </div>
              </div>

              {/* Quick Actions */}
              {canModify && (
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button onClick={handleJoinMeeting} disabled={!interview.meetingLink}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Join Meeting
                  </Button>
                  {/* HR can submit feedback anytime */}
                  {isHR && (
                    <Button variant="outline" onClick={() => setFeedbackDialogOpen(true)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => toast.success('Calendar invites resent')}>
                    <Send className="h-4 w-4 mr-2" />
                    Resend Invites
                  </Button>
                  <Button variant="outline" onClick={() => setCompleteDialogOpen(true)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                  <Button variant="outline">
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Schedule Next Round
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interview Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interview Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <InterviewProgress
                currentRound={interview.roundNumber}
                totalRounds={interview.totalRounds}
                interviewType={interview.type}
              />
            </CardContent>
          </Card>

          {/* Instructions Card */}
          {interview.instructions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Interview Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans bg-muted/50 p-4 rounded-lg">
                    {interview.instructions}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback Summary */}
          {interview.feedback && interview.feedback.length > 0 && (
            <FeedbackSummary feedbacks={interview.feedback} />
          )}
        </div>

        {/* Right Column - Panel & Actions */}
        <div className="space-y-6">
          {/* Interview Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Interview Panel ({interview.panelists?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {interview.panelists?.map((panelist) => (
                <PanelistCard
                  key={panelist.id}
                  panelist={panelist}
                  feedback={interview.feedback?.find(f => f.interviewerId === panelist.employeeId)}
                  onSubmitFeedback={() => setFeedbackDialogOpen(true)}
                  isCurrentUser={panelist.employeeId === 'current-user'} // TODO: Replace with actual current user check
                />
              ))}
              
              {(!interview.panelists || interview.panelists.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No interviewers assigned
                </p>
              )}
            </CardContent>
          </Card>

          {/* Submit Feedback Button */}
          {/* HR can submit/update feedback anytime, Interviewers only after interview is completed */}
          {!isCancelled && (isHR || isCompleted) && (
            <Button className="w-full" onClick={() => setFeedbackDialogOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              {isHR ? 'Submit / Update Feedback' : 'Submit Feedback'}
            </Button>
          )}

          {/* Final Decision Panel (if interview is complete) */}
          {isCompleted && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gavel className="h-4 w-4" />
                  Final Decision
                </CardTitle>
                <CardDescription>
                  Make a hiring decision for this candidate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white" 
                  onClick={() => setSendOfferOpen(true)}
                  disabled={makingDecision}
                >
                  <Award className="h-4 w-4 mr-2" />
                  Extend Offer
                </Button>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                  onClick={() => handleFinalDecision('HIRED')}
                  disabled={makingDecision}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Hired
                </Button>
                <Button 
                  variant="destructive"
                  className="w-full" 
                  onClick={() => handleFinalDecision('REJECTED')}
                  disabled={makingDecision}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Candidate
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ScheduleInterviewDialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        interview={interview}
        mode="reschedule"
        onSuccess={() => {
          setRescheduleDialogOpen(false);
          loadInterview();
          toast.success('Interview rescheduled successfully');
        }}
      />

      <FeedbackFormDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        interview={interview}
        onSuccess={() => {
          setFeedbackDialogOpen(false);
          loadInterview();
          toast.success('Feedback submitted successfully');
        }}
      />

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Interview?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this interview? This will notify all participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Interview</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
              Cancel Interview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Interview as Complete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the interview as completed. You will be prompted to submit your feedback immediately after confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete & Submit Feedback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Offer Dialog */}
      {interview?.candidate && interview?.job && (
        <SendOfferDialog
          open={sendOfferOpen}
          onOpenChange={setSendOfferOpen}
          candidate={{
            id: interview.candidateId,
            jobId: interview.jobId,
            firstName: interview.candidate.firstName,
            lastName: interview.candidate.lastName,
            email: interview.candidate.email,
          }}
          job={{
            title: interview.job.title,
            department: interview.job.department,
          }}
          currency="INR"
          onSuccess={loadInterview}
        />
      )}
    </div>
  );
}
