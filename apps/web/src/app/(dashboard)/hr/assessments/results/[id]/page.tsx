'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getAvatarColor } from '@/lib/format';
import { assessmentApi, AssessmentResult } from '@/lib/api/assessments';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ListChecks,
  Code,
  Type,
  FileText,
  ToggleLeft,
  Upload,
  FileQuestion,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
  Mail,
  Loader2,
  Send,
  Printer,
} from 'lucide-react';

// Type definitions for the result data
interface AnswerOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface AnswerDetail {
  id: string;
  questionId: string;
  answer?: string;
  selectedOptions?: string[];
  isCorrect: boolean;
  pointsEarned: number;
  timeSpent?: number;
  question: {
    id: string;
    question: string;
    type: string;
    options?: AnswerOption[];
    correctAnswer?: string;
    points: number;
    difficulty?: string;
  };
}

interface ResultData extends Omit<AssessmentResult, 'answers'> {
  answers?: AnswerDetail[];
  invitation?: {
    candidateId?: string;
    candidateJobId?: string;
    test?: {
      id?: string;
      passingScore?: number;
      duration?: number;
    };
  };
}

// Map API question types to UI types
const questionTypeMap: Record<string, string> = {
  'MULTIPLE_CHOICE': 'mcq',
  'MULTIPLE_SELECT': 'multi_select',
  'TRUE_FALSE': 'true_false',
  'SHORT_ANSWER': 'short_text',
  'ESSAY': 'long_text',
  'CODING': 'code',
};

const typeIcons: Record<string, React.ElementType> = {
  mcq: ListChecks,
  multi_select: ListChecks,
  true_false: ToggleLeft,
  short_text: Type,
  long_text: FileText,
  code: Code,
  file_upload: Upload,
  // Map database types too
  MULTIPLE_CHOICE: ListChecks,
  MULTIPLE_SELECT: ListChecks,
  TRUE_FALSE: ToggleLeft,
  SHORT_ANSWER: Type,
  ESSAY: FileText,
  CODING: Code,
};

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
  EASY: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HARD: 'bg-red-100 text-red-700',
};

// ============================================================================
// ANSWER CARD COMPONENT
// ============================================================================

interface AnswerCardAnswer {
  id: string;
  questionNumber?: number;
  question?: string;
  type?: string;
  difficulty?: string;
  points?: number;
  earnedPoints?: number;
  isCorrect?: boolean | null;
  candidateAnswer?: any;
  correctAnswer?: any;
  options?: { id: string; text: string; isCorrect?: boolean }[];
  timeSpent?: number;
  sampleAnswer?: string;
  testCases?: { input: string; passed: boolean; output: string }[];
  feedback?: string;
  // Real data fields
  answer?: string;
  selectedOptions?: string[];
  pointsEarned?: number;
  questionData?: {
    id: string;
    question: string;
    type: string;
    options?: { id: string; text: string; isCorrect?: boolean }[];
    correctAnswer?: string;
    points: number;
    difficulty?: string;
  };
}

interface AnswerCardProps {
  answer: AnswerCardAnswer;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function AnswerCard({ answer, index, isExpanded, onToggle }: AnswerCardProps) {
  // Support both mock data structure and real API data structure
  const questionType = answer.type || answer.questionData?.type || 'unknown';
  const TypeIcon = typeIcons[questionType] || FileQuestion;
  const difficulty = answer.difficulty || answer.questionData?.difficulty || 'MEDIUM';
  const questionText = answer.question || answer.questionData?.question || '';
  const points = answer.points || answer.questionData?.points || 0;
  const earnedPoints = answer.earnedPoints ?? answer.pointsEarned ?? 0;
  const options = answer.options || answer.questionData?.options || [];

  const getStatusBadge = () => {
    if (answer.isCorrect === true) {
      return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" /> Correct</Badge>;
    } else if (answer.isCorrect === false) {
      return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" /> Wrong</Badge>;
    } else if (earnedPoints > 0 && earnedPoints < points) {
      return <Badge className="bg-yellow-100 text-yellow-700"><AlertCircle className="h-3 w-3 mr-1" /> Partial</Badge>;
    } else if (earnedPoints === 0) {
      return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" /> Wrong</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" /> Correct</Badge>;
    }
  };

  // Get candidate answer (support both mock and real structures)
  const getCandidateAnswer = () => {
    if (answer.candidateAnswer !== undefined) return answer.candidateAnswer;
    if (answer.selectedOptions?.length) return answer.selectedOptions;
    return answer.answer;
  };

  const candidateAnswer = getCandidateAnswer();

  const renderAnswer = () => {
    const qType = questionTypeMap[questionType] || questionType;
    
    switch (qType) {
      case 'mcq':
      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-2">
            {options.map((opt, optIdx) => {
              const isSelected = candidateAnswer === opt.id || 
                (Array.isArray(candidateAnswer) && candidateAnswer.includes(opt.id));
              return (
                <div
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isSelected && opt.isCorrect
                      ? 'border-green-500 bg-green-50'
                      : isSelected && !opt.isCorrect
                      ? 'border-red-500 bg-red-50'
                      : opt.isCorrect
                      ? 'border-green-500 bg-green-50'
                      : 'border-border'
                  }`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium ${
                    isSelected
                      ? opt.isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      : opt.isCorrect ? 'bg-green-100 text-green-700' : 'bg-muted'
                  }`}>
                    {String.fromCharCode(65 + optIdx)}
                  </div>
                  <span className="flex-1" dangerouslySetInnerHTML={{ __html: opt.text }} />
                  {isSelected && (
                    <Badge variant="outline" className="text-xs">Selected</Badge>
                  )}
                  {opt.isCorrect && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'multi_select':
      case 'MULTIPLE_SELECT':
        return (
          <div className="space-y-2">
            {options.map((opt, optIdx) => {
              const selectedArray = Array.isArray(candidateAnswer) ? candidateAnswer : [];
              const wasSelected = selectedArray.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    wasSelected && opt.isCorrect
                      ? 'border-green-500 bg-green-50'
                      : wasSelected && !opt.isCorrect
                      ? 'border-red-500 bg-red-50'
                      : !wasSelected && opt.isCorrect
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-border'
                  }`}
                >
                  <div className={`flex items-center justify-center w-5 h-5 rounded border-2 ${
                    wasSelected
                      ? opt.isCorrect ? 'bg-green-600 border-green-600 text-white' : 'bg-red-600 border-red-600 text-white'
                      : opt.isCorrect ? 'border-yellow-500' : 'border-muted-foreground'
                  }`}>
                    {wasSelected && <CheckCircle className="h-3 w-3" />}
                  </div>
                  <span className="flex-1" dangerouslySetInnerHTML={{ __html: opt.text }} />
                  {opt.isCorrect && !wasSelected && (
                    <Badge variant="outline" className="text-xs text-yellow-600">Missed</Badge>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'true_false':
      case 'TRUE_FALSE':
        const tfAnswer = candidateAnswer?.toString().toLowerCase();
        const correctTF = (answer.correctAnswer || answer.questionData?.correctAnswer)?.toString().toLowerCase();
        return (
          <div className="flex gap-4">
            <div className={`flex-1 p-4 rounded-lg border-2 text-center ${
              tfAnswer === 'true'
                ? correctTF === 'true'
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
                : correctTF === 'true'
                ? 'border-green-500 bg-green-50'
                : 'border-border'
            }`}>
              <CheckCircle className={`h-6 w-6 mx-auto mb-2 ${
                tfAnswer === 'true' ? 'text-current' : 'text-muted-foreground'
              }`} />
              <p className="font-medium">True</p>
              {tfAnswer === 'true' && (
                <Badge variant="outline" className="mt-2 text-xs">Selected</Badge>
              )}
            </div>
            <div className={`flex-1 p-4 rounded-lg border-2 text-center ${
              tfAnswer === 'false'
                ? correctTF === 'false'
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
                : correctTF === 'false'
                ? 'border-green-500 bg-green-50'
                : 'border-border'
            }`}>
              <XCircle className={`h-6 w-6 mx-auto mb-2 ${
                tfAnswer === 'false' ? 'text-current' : 'text-muted-foreground'
              }`} />
              <p className="font-medium">False</p>
              {tfAnswer === 'false' && (
                <Badge variant="outline" className="mt-2 text-xs">Selected</Badge>
              )}
            </div>
          </div>
        );

      case 'short_text':
      case 'SHORT_ANSWER':
      case 'long_text':
      case 'ESSAY':
        const textAnswer = typeof candidateAnswer === 'string' ? candidateAnswer : '';
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Candidate's Answer:</p>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="whitespace-pre-wrap">{textAnswer || '(No answer provided)'}</p>
              </div>
            </div>
            {answer.sampleAnswer && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Sample Answer (Reference):</p>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="whitespace-pre-wrap text-sm">{answer.sampleAnswer}</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'code':
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Submitted Code:</p>
              <div className="p-4 bg-gray-900 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-100 font-mono">
                  {(typeof candidateAnswer === 'string' ? candidateAnswer : '') || '(No code submitted)'}
                </pre>
              </div>
            </div>
            {answer.testCases && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Test Cases:</p>
                <div className="space-y-2">
                  {answer.testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        tc.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {tc.passed ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-mono text-sm">{tc.input}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{tc.output}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        // Show text answer as fallback
        const defaultAnswer = typeof candidateAnswer === 'string' ? candidateAnswer : JSON.stringify(candidateAnswer);
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Candidate's Answer:</p>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="whitespace-pre-wrap">{defaultAnswer || '(No answer provided)'}</p>
              </div>
            </div>
          </div>
        );
    }
  };

  // Determine border color based on correctness
  const getBorderColor = () => {
    if (answer.isCorrect === true || earnedPoints === points) return 'border-green-200';
    if (answer.isCorrect === false || earnedPoints === 0) return 'border-red-200';
    if (earnedPoints > 0 && earnedPoints < points) return 'border-yellow-200';
    return '';
  };

  return (
    <Card className={getBorderColor()}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                  {answer.questionNumber ?? index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded bg-muted">
                      <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <Badge className={difficultyColors[difficulty] || difficultyColors['medium']} variant="secondary">
                      {difficulty?.toLowerCase()}
                    </Badge>
                    {getStatusBadge()}
                  </div>
                  <p className="font-medium line-clamp-2" dangerouslySetInnerHTML={{ __html: questionText }} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold">{earnedPoints}/{points}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
                {answer.timeSpent && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">{Math.floor(answer.timeSpent / 60)}:{(answer.timeSpent % 60).toString().padStart(2, '0')}</span>
                  </div>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            {renderAnswer()}
            {answer.feedback && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium text-sm">Evaluator Feedback</span>
                </div>
                <p className="text-sm text-blue-800">{answer.feedback}</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================================================
// SEND REPORT DIALOG
// ============================================================================

interface SendReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ResultData;
}

function SendReportDialog({ open, onOpenChange, result }: SendReportDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(`Assessment Result: ${result.candidateName} - ${result.testName}`);
  const [message, setMessage] = useState(
    `Dear Hiring Manager,\n\nPlease find below the assessment result for ${result.candidateName}.\n\nTest: ${result.testName}\nScore: ${Number(result.score).toFixed(2)}%\nResult: ${result.passed ? 'PASSED' : 'FAILED'}\n\nCompleted on: ${result.completedAt ? format(new Date(result.completedAt), 'MMM d, yyyy h:mm a') : 'N/A'}\n\nBest regards,\nHR Team`
  );
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!recipientEmail) {
      toast.error('Please enter a recipient email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    try {
      // Build HTML email content
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Assessment Result Report</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0;">Candidate Information</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${result.candidateName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${result.candidateEmail}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0;">Test Details</h3>
            <p style="margin: 5px 0;"><strong>Test:</strong> ${result.testName}</p>
            <p style="margin: 5px 0;"><strong>Questions:</strong> ${result.totalQuestions}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${result.timeTaken || 0} minutes</p>
          </div>
          
          <div style="background: ${result.passed ? '#dcfce7' : '#fee2e2'}; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h2 style="margin: 0; color: ${result.passed ? '#16a34a' : '#dc2626'};">
              ${result.passed ? '✓ PASSED' : '✗ FAILED'}
            </h2>
            <p style="font-size: 32px; font-weight: bold; margin: 10px 0; color: ${result.passed ? '#16a34a' : '#dc2626'};">
              ${Number(result.score).toFixed(2)}%
            </p>
            <p style="margin: 5px 0;">Score: ${Math.round(result.obtainedScore)} / ${result.maxScore} points</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0;">Timing</h3>
            <p style="margin: 5px 0;"><strong>Started:</strong> ${result.startedAt ? format(new Date(result.startedAt), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Completed:</strong> ${result.completedAt ? format(new Date(result.completedAt), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0;">Proctoring Summary</h3>
            <p style="margin: 5px 0;"><strong>Tab Switches:</strong> ${result.tabSwitchCount || 0}</p>
            <p style="margin: 5px 0;"><strong>Warnings:</strong> ${result.warningsCount || 0}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          
          <div style="white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</div>
        </div>
      `;

      // Call the organization send-email endpoint (uses tenant SMTP settings)
      const response = await apiClient.post('/api/v1/organization/send-email', {
        to: recipientEmail,
        subject,
        html: htmlContent,
        message: message,
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to send email');
      }

      toast.success('Report sent successfully!');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to send report:', error);
      toast.error('Failed to send report. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Assessment Report</DialogTitle>
          <DialogDescription>
            Send the assessment result report via email
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Email *</Label>
            <Input
              id="recipient"
              type="email"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cc">CC (optional)</Label>
            <Input
              id="cc"
              type="email"
              placeholder="cc@example.com"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Additional Message</Label>
            <Textarea
              id="message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ResultDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const resultId = params.id as string;
  const printRef = useRef<HTMLDivElement>(null);
  const autoPrintTriggered = useRef(false);
  
  const [result, setResult] = useState<ResultData | null>(null);
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [organization, setOrganization] = useState<{ name: string; logo?: string; reportLogo?: string } | null>(null);

  // Fetch organization data for the logo
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const response = await apiClient.get<{ name: string; logo?: string; reportLogo?: string }>('/api/v1/organization');
        if (response.success && response.data) {
          setOrganization(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch organization:', err);
      }
    };
    fetchOrg();
  }, []);

  // Handle PDF export using print
  const handleExportPDF = useCallback(() => {
    // Expand all answers before printing
    if (result?.answers) {
      const allAnswerIds = result.answers.map((a: any) => a.id);
      setExpandedAnswers(new Set(allAnswerIds));
    }
    
    // Small delay to allow state update, then print
    setTimeout(() => {
      window.print();
    }, 100);
  }, [result]);

  // Fetch result data
  const fetchResult = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await assessmentApi.getResultDetailsForHR(resultId);
      setResult(data as ResultData);
    } catch (err: any) {
      console.error('Failed to fetch result:', err);
      setError(err.message || 'Failed to load result details');
      toast.error('Failed to load result details');
    } finally {
      setIsLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    if (resultId) {
      fetchResult();
    }
  }, [resultId, fetchResult]);

  // Auto-print when print=true query param is present (from Download Report action)
  useEffect(() => {
    const shouldPrint = searchParams.get('print') === 'true';
    if (shouldPrint && result && !autoPrintTriggered.current) {
      autoPrintTriggered.current = true;
      // Expand all answers before printing
      if (result.answers) {
        const allAnswerIds = result.answers.map((a: any) => a.id);
        setExpandedAnswers(new Set(allAnswerIds));
      }
      // Small delay to allow state update, then print
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [searchParams, result]);

  // Transform API answers to the format expected by AnswerCard
  const transformedAnswers = result?.answers?.map((answer: any, index: number) => ({
    id: answer.id,
    questionNumber: index + 1,
    question: answer.question?.question || '',
    type: answer.question?.type || 'unknown',
    difficulty: answer.question?.difficulty || 'MEDIUM',
    points: answer.question?.points || 0,
    earnedPoints: answer.pointsEarned ?? 0,
    isCorrect: answer.isCorrect,
    candidateAnswer: answer.selectedOptions?.length ? answer.selectedOptions : answer.answer,
    correctAnswer: answer.question?.correctAnswer,
    options: answer.question?.options || [],
    timeSpent: answer.timeSpent,
    questionData: answer.question,
  })) || [];

  const toggleAnswer = (id: string) => {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllAnswers = () => {
    if (showAllAnswers) {
      setExpandedAnswers(new Set());
    } else {
      setExpandedAnswers(new Set(transformedAnswers.map((a: any) => a.id)));
    }
    setShowAllAnswers(!showAllAnswers);
  };

  // Error state
  if (error && !result) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load Result</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  // Skeleton Loading UI
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <div className="flex items-center gap-3 mb-1">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score Card Skeleton */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-6 text-center">
                  {[...Array(3)].map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-10 w-16 mx-auto mb-2" />
                      <Skeleton className="h-4 w-20 mx-auto" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Section Scores Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Answers Header Skeleton */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-9 w-32" />
            </div>

            {/* Answer Cards Skeleton */}
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Skeleton className="h-5 w-5 rounded" />
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                        <Skeleton className="h-4 w-72" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Skeleton className="h-5 w-12 mb-1" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-5 w-5" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            {/* Candidate Info Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-28 mb-1" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
                <Skeleton className="h-px w-full" />
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Test Info Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Proctoring Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-8" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Helper to calculate stats from transformed answers
  const correctCount = transformedAnswers.filter((a: any) => a.isCorrect === true || a.earnedPoints === a.points).length;
  const wrongCount = transformedAnswers.filter((a: any) => a.isCorrect === false || (a.earnedPoints === 0 && a.points > 0)).length;
  const partialCount = transformedAnswers.filter((a: any) => a.earnedPoints > 0 && a.earnedPoints < a.points && a.isCorrect !== true).length;
  const passingScore = result?.invitation?.test?.passingScore || 70;

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Result Not Found</h2>
        <p className="text-muted-foreground mb-4">Unable to load result details</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Print-only Header with Organization Logo - Outside main container to not affect screen layout */}
      <div className="hidden print:block print:mb-6">
        <div className="flex items-center justify-between border-b-2 border-gray-300 pb-4 mb-4">
          {/* Left: Organization Logo */}
          <div className="flex items-center gap-4">
            {(organization?.reportLogo || organization?.logo) && (
              <img 
                src={organization.reportLogo || organization.logo} 
                alt={organization.name || 'Organization'} 
                className="h-14 w-auto object-contain"
                style={{ maxWidth: '180px' }}
              />
            )}
            {!organization?.reportLogo && !organization?.logo && organization?.name && (
              <div className="text-xl font-bold text-gray-900">{organization.name}</div>
            )}
          </div>
          
          {/* Right: Candidate Name with Status */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{result.candidateName}</h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${result.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {result.passed ? '✓ PASSED' : '✗ FAILED'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Assessment Report</p>
            <p className="text-sm text-gray-600">{result.testName}</p>
          </div>
        </div>
        
        {/* Generated timestamp */}
        <p className="text-xs text-gray-400 text-right mb-2">Generated on {format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}</p>
      </div>

      <div className="space-y-6 print:space-y-4 print:p-0 print:m-0">
        {/* Screen Header - Hidden on Print */}
        <div className="flex items-start justify-between print:hidden">
          <div>
            <Button
              variant="ghost"
              className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => router.push('/hr/assessments')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assessments
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Assessment Report</h1>
              {result.passed ? (
                <Badge className="bg-green-100 text-green-700 text-sm">
                  <CheckCircle className="h-4 w-4 mr-1" /> Passed
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 text-sm">
                  <XCircle className="h-4 w-4 mr-1" /> Failed
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-2">{result.testName} • Completed {result.completedAt ? format(new Date(result.completedAt), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
          </div>
          <div className="flex gap-2 no-print">
            <Button 
              variant="outline"
              onClick={handleExportPDF}
              className="no-print"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print / PDF
            </Button>
            <Button
              onClick={() => setShowSendDialog(true)}
              className="no-print"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Report
            </Button>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <svg className="w-32 h-32 transform -rotate-90" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      strokeWidth="12"
                      fill="none"
                      style={{ stroke: '#e5e7eb' }}
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - result.score / 100)}`}
                      style={{ stroke: result.passed ? '#22c55e' : '#ef4444' }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{Number(result.score).toFixed(2)}%</span>
                    <span className="text-sm text-muted-foreground">Score</span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                    <p className="text-sm text-muted-foreground">Correct</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">{wrongCount}</p>
                    <p className="text-sm text-muted-foreground">Wrong</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-600">{partialCount}</p>
                    <p className="text-sm text-muted-foreground">Partial</p>
                  </div>
                </div>
              </div>
              
              {/* Points and Time Summary */}
              <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{Math.round(result.obtainedScore)}/{result.maxScore}</p>
                  <p className="text-sm text-muted-foreground">Points Earned</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{result.timeTaken || 0} min</p>
                  <p className="text-sm text-muted-foreground">Time Taken</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{result.totalQuestions}</p>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Answers */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Detailed Answers ({transformedAnswers.length})</h2>
              <Button variant="outline" size="sm" onClick={toggleAllAnswers}>
                {showAllAnswers ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Expand All
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-4">
              {transformedAnswers.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No answer details available</p>
                  </CardContent>
                </Card>
              ) : (
                transformedAnswers.map((answer: any, idx: number) => (
                  <AnswerCard
                    key={answer.id}
                    answer={answer}
                    index={idx}
                    isExpanded={expandedAnswers.has(answer.id)}
                    onToggle={() => toggleAnswer(answer.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Candidate Info */}
          <Card>
            <CardHeader>
              <CardTitle>Candidate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className={`${getAvatarColor((result.candidateEmail || '') + (result.candidateName || '')).className} text-xl font-semibold`}>
                    {(result.candidateName || 'C').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{result.candidateName}</p>
                  <p className="text-sm text-muted-foreground">{result.candidateEmail}</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started At</span>
                  <span>{result.startedAt ? format(new Date(result.startedAt), 'MMM d, h:mm a') : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed At</span>
                  <span>{result.completedAt ? format(new Date(result.completedAt), 'MMM d, h:mm a') : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{result.timeTaken || 0} minutes</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Details */}
          <Card>
            <CardHeader>
              <CardTitle>Test Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Test Name</span>
                <span className="font-medium">{result.testName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Questions</span>
                <span>{result.totalQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Score</span>
                <span>{result.maxScore} points</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Passing Score</span>
                <span>{passingScore}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={result.status === 'COMPLETED' ? 'default' : 'secondary'}>
                  {result.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Proctoring Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Proctoring Report
                {(result.tabSwitchCount || 0) > 0 || (result.warningsCount || 0) > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tab Switches</span>
                <Badge variant={(result.tabSwitchCount || 0) > 0 ? 'destructive' : 'secondary'}>
                  {result.tabSwitchCount || 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Warnings</span>
                <Badge variant={(result.warningsCount || 0) > 0 ? 'destructive' : 'secondary'}>
                  {result.warningsCount || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Actions - Hidden on Print */}
          <Card className="print:hidden">
            <CardContent className="pt-6 space-y-3">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => {
                  // Navigate to candidate profile if candidateId and jobId are available
                  const candidateId = result.invitation?.candidateId;
                  const jobId = result.invitation?.candidateJobId;
                  if (candidateId && jobId) {
                    router.push(`/hr/candidates/${jobId}/${candidateId}`);
                  } else if (candidateId) {
                    toast.info('Candidate job not linked - cannot navigate to profile');
                  } else {
                    toast.info('Candidate profile not linked to recruitment');
                  }
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Candidate Profile
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => {
                  // Navigate to test details
                  const testId = result.testId || result.invitation?.test?.id;
                  if (testId) {
                    router.push(`/hr/assessments/tests/${testId}`);
                  } else {
                    toast.error('Test not found');
                  }
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Test
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Report Dialog */}
      {result && (
        <SendReportDialog
          open={showSendDialog}
          onOpenChange={setShowSendDialog}
          result={result}
        />
      )}

      {/* Print Styles - Comprehensive PDF styling */}
      <style jsx global>{`
        @media print {
          /* Page setup - minimal margins */
          @page {
            size: A4;
            margin: 8mm;
          }
          
          /* Reset everything */
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* HIDE SIDEBAR - the aside element */
          aside,
          aside.w-64,
          aside.w-16,
          .w-64.border-r,
          .w-16.border-r,
          div.flex.h-screen > aside {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            min-width: 0 !important;
            max-width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            left: -9999px !important;
          }
          
          /* HIDE HEADER - the header element */
          header,
          header.sticky,
          header.h-16,
          .sticky.top-0.z-40,
          .h-16.border-b,
          div.flex.flex-1.flex-col > header {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            left: -9999px !important;
          }
          
          /* HIDE buttons and other elements */
          nav, 
          .print\\:hidden,
          .no-print,
          button,
          [data-radix-popper-content-wrapper],
          [role="dialog"],
          .toast,
          [data-sonner-toaster] {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          
          /* Reset the main layout container */
          .flex.h-screen,
          .flex.h-screen.overflow-hidden {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          .flex.flex-1.flex-col,
          .flex.flex-1.flex-col.overflow-hidden {
            display: block !important;
            width: 100% !important;
            margin-left: 0 !important;
            padding-left: 0 !important;
            overflow: visible !important;
          }
          
          /* Main content area */
          main,
          main.flex-1,
          main.overflow-y-auto {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            position: static !important;
            background: white !important;
          }
          
          /* Body reset - remove all margins/paddings */
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11px !important;
            line-height: 1.4 !important;
            width: 100% !important;
            overflow: visible !important;
          }
          
          /* Remove all layout containers padding/margin */
          body > div,
          body > div > div,
          [class*="container"],
          [class*="layout"],
          [class*="Layout"] {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            margin-left: 0 !important;
            padding-left: 0 !important;
            display: block !important;
            position: static !important;
          }
          
          /* Main content area - the report itself */
          .space-y-6,
          .space-y-4 {
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Hide screen header (back button, buttons) */
          .flex.items-start.gap-4.print\\:hidden {
            display: none !important;
          }
          
          /* Grid layout - make it flow better for print */
          .grid.grid-cols-1.lg\\:grid-cols-3 {
            display: block !important;
          }
          
          .lg\\:col-span-2 {
            width: 100% !important;
          }
          
          /* Cards styling */
          [class*="Card"],
          .card {
            border: 1px solid #d1d5db !important;
            border-radius: 8px !important;
            box-shadow: none !important;
            margin-bottom: 15px !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          [class*="CardHeader"] {
            padding: 12px 16px !important;
            border-bottom: 1px solid #e5e7eb !important;
          }
          
          [class*="CardContent"] {
            padding: 12px 16px !important;
          }
          
          [class*="CardTitle"] {
            font-size: 14px !important;
            font-weight: 600 !important;
            color: #374151 !important;
          }
          
          /* Score circle - preserve visual */
          svg circle {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Badges - preserve colors */
          [class*="Badge"],
          .badge {
            display: inline-flex !important;
            align-items: center !important;
            padding: 2px 8px !important;
            border-radius: 9999px !important;
            font-size: 11px !important;
            font-weight: 500 !important;
          }
          
          .bg-green-100 {
            background-color: #dcfce7 !important;
          }
          .text-green-700, .text-green-600 {
            color: #15803d !important;
          }
          
          .bg-red-100 {
            background-color: #fee2e2 !important;
          }
          .text-red-700, .text-red-600 {
            color: #b91c1c !important;
          }
          
          .bg-yellow-100 {
            background-color: #fef3c7 !important;
          }
          .text-yellow-700, .text-yellow-600 {
            color: #a16207 !important;
          }
          
          .bg-blue-100 {
            background-color: #dbeafe !important;
          }
          .text-blue-700, .text-blue-600 {
            color: #1d4ed8 !important;
          }
          
          .bg-gray-100, .bg-slate-100, .bg-muted {
            background-color: #f3f4f6 !important;
          }
          
          /* Progress bars */
          [role="progressbar"],
          .progress {
            height: 8px !important;
            border-radius: 4px !important;
            background-color: #e5e7eb !important;
          }
          
          [role="progressbar"] > div,
          .progress > div {
            border-radius: 4px !important;
          }
          
          /* Collapsible content - expand all for print */
          [data-state="closed"] > div,
          [data-state="closed"] [class*="Content"] {
            display: block !important;
            height: auto !important;
            opacity: 1 !important;
            visibility: visible !important;
            overflow: visible !important;
          }
          
          /* Answer cards specific */
          .answer-card,
          [class*="Collapsible"] {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Code blocks */
          pre, code {
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 4px !important;
            font-size: 10px !important;
            white-space: pre-wrap !important;
            word-break: break-word !important;
          }
          
          /* Text colors */
          .text-muted-foreground {
            color: #6b7280 !important;
          }
          
          p, span, div {
            color: #374151 !important;
          }
          
          /* Icons - make them visible */
          svg {
            color: currentColor !important;
            fill: currentColor !important;
          }
          
          /* Separator */
          [class*="Separator"],
          hr {
            border-color: #e5e7eb !important;
            margin: 10px 0 !important;
          }
          
          /* Answer options list */
          .space-y-2 > div {
            margin-bottom: 6px !important;
          }
          
          /* Flex layouts */
          .flex {
            display: flex !important;
          }
          
          .items-center {
            align-items: center !important;
          }
          
          .justify-between {
            justify-content: space-between !important;
          }
          
          .gap-2 {
            gap: 8px !important;
          }
          
          .gap-4 {
            gap: 16px !important;
          }
          
          /* Avatars */
          [class*="Avatar"] {
            border-radius: 50% !important;
            overflow: hidden !important;
          }
          
          /* Print-specific layout for sidebar cards */
          .lg\\:col-span-2 + div {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 15px !important;
            margin-top: 20px !important;
          }
          
          /* Question number circles */
          .rounded-full {
            border-radius: 9999px !important;
          }
          
          /* Ensure bg colors print */
          .bg-primary, [class*="bg-primary"] {
            background-color: #2563eb !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          .text-primary-foreground {
            color: white !important;
          }
          
          /* Score percentage text */
          .text-4xl, .text-3xl, .text-2xl {
            font-weight: bold !important;
          }
          
          /* Remove any transforms that might affect print */
          .transform {
            transform: none !important;
          }
          
          /* Chevron icons - hide in print */
          [class*="Chevron"],
          .lucide-chevron-up,
          .lucide-chevron-down {
            display: none !important;
          }
          
          /* Print-only header */
          .print\\:block {
            display: block !important;
          }
          
          .hidden.print\\:block {
            display: block !important;
          }
          
          /* Hide screen header on print */
          .print\\:hidden {
            display: none !important;
          }
          
          /* Grid for print summary */
          .grid-cols-4 {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
          }
          
          /* Print bg colors */
          .bg-gray-50 {
            background-color: #f9fafb !important;
          }
          
          .text-gray-900 {
            color: #111827 !important;
          }
          
          .text-gray-600, .text-gray-500 {
            color: #6b7280 !important;
          }
          
          .border-gray-300 {
            border-color: #d1d5db !important;
          }
          
          /* Answer sections title */
          .text-lg {
            font-size: 16px !important;
            font-weight: 600 !important;
          }
        }
      `}</style>
      </div>
    </>
  );
}
