'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { toast } from 'sonner';
import { assessmentApi } from '@/lib/api/assessments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock,
  FileQuestion,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Monitor,
  Camera,
  Copy,
  Timer,
  ArrowRight,
  ShieldCheck,
  Info,
  Loader2,
} from 'lucide-react';

interface TestSection {
  id: string;
  name: string;
  questions: Array<{ id: string }>;
}

interface InvitationData {
  id: string;
  testId: string;
  candidateName: string;
  candidateEmail: string;
  assessmentCode: string;
  validFrom: string;
  validUntil: string;
  status: string;
  test: {
    id: string;
    name: string;
    description?: string;
    instructions?: string;
    duration: number;
    passingScore: number;
    questionsCount?: number;
    totalQuestions?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    proctoring?: boolean;
    fullscreen?: boolean;
    webcamRequired?: boolean;
    preventCopyPaste?: boolean;
    sections?: TestSection[];
    questions?: Array<{ id: string }>;
  };
  tenantBranding?: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    faviconUrl?: string;
    tenantName?: string;
  } | null;
}

function AssessmentStartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    code?: string;
    scheduledAt?: string;
    expiredAt?: string;
    candidateName?: string;
    testName?: string;
  } | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (code) {
      loadInvitation(code);
    } else {
      setIsLoading(false);
    }
  }, [code]);

  // Apply tenant branding when invitation loads
  useEffect(() => {
    if (invitation?.tenantBranding?.primaryColor) {
      // Convert hex color to HSL for CSS variable
      const hexToHsl = (hex: string): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return '221.2 83.2% 53.3%'; // Default blue
        
        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;
        
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        
        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      };
      
      const primaryHsl = hexToHsl(invitation.tenantBranding.primaryColor);
      document.documentElement.style.setProperty('--primary', primaryHsl);
      
      // Also set accent color attribute for components that use it
      const colorMap: { [key: string]: string } = {
        '#3B82F6': 'blue',
        '#8B5CF6': 'purple', 
        '#22C55E': 'green',
        '#F97316': 'orange',
        '#EF4444': 'red',
        '#EC4899': 'pink',
        '#14B8A6': 'teal',
        '#6366F1': 'indigo',
      };
      const accentColor = colorMap[invitation.tenantBranding.primaryColor.toUpperCase()] || 'blue';
      document.documentElement.setAttribute('data-accent-color', accentColor);
      
      // Store branding in sessionStorage for other assessment pages
      sessionStorage.setItem('assessment-tenant-branding', JSON.stringify(invitation.tenantBranding));
    }
  }, [invitation]);

  const loadInvitation = async (assessmentCode: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setErrorDetails(null);
      const data = await assessmentApi.getInvitationByCode(assessmentCode);
      setInvitation(data as InvitationData);
    } catch (err: any) {
      console.error('Failed to load invitation:', err);
      // Extract error details from axios response
      const errorResponse = err.response?.data;
      if (errorResponse) {
        // Handle error as string or object (gateway middleware returns object format)
        let errorMessage = 'Invalid or expired assessment code';
        if (typeof errorResponse.error === 'string') {
          errorMessage = errorResponse.error;
        } else if (typeof errorResponse.error === 'object' && errorResponse.error?.message) {
          errorMessage = errorResponse.error.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
        setErrorDetails({
          code: typeof errorResponse.error === 'object' ? errorResponse.error?.code : errorResponse.code,
          scheduledAt: errorResponse.scheduledAt,
          expiredAt: errorResponse.expiredAt,
          candidateName: errorResponse.candidateName,
          testName: errorResponse.testName,
        });
      } else {
        setError(err.message || 'Invalid or expired assessment code');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = () => {
    if (manualCode.trim()) {
      router.push(`/assessment/start?code=${manualCode.trim().toUpperCase()}`);
    }
  };

  const handleStartAssessment = async () => {
    if (!invitation || !acceptedTerms) return;

    try {
      setIsStarting(true);
      const browserInfo = navigator.userAgent;
      const result = await assessmentApi.startAssessment(invitation.id, browserInfo);
      
      // Navigate to the test-taking page
      router.push(`/assessment/take/${result.id}`);
    } catch (err: any) {
      console.error('Failed to start assessment:', err);
      toast.error(err.message || 'Failed to start assessment');
      setIsStarting(false);
    }
  };

  // Check if invitation is valid
  const isExpired = invitation ? isPast(new Date(invitation.validUntil)) : false;
  const isNotYetValid = invitation ? new Date(invitation.validFrom) > new Date() : false;
  const isCompleted = invitation?.status === 'COMPLETED';
  const isInProgress = invitation?.status === 'IN_PROGRESS';
  const isCancelled = invitation?.status === 'CANCELLED';
  const canStart = invitation && !isExpired && !isNotYetValid && !isCompleted && !isCancelled && acceptedTerms;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-32" />
            <Skeleton className="h-12" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // No code provided - show code entry form
  if (!code && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
              <FileQuestion className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Enter Assessment Code</CardTitle>
            <CardDescription>
              Enter the assessment code provided to you to begin your test
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Assessment Code</Label>
              <Input
                id="code"
                placeholder="Enter your code (e.g., XEVFSJVN)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                className="text-center text-lg font-mono tracking-widest"
              />
            </div>
            <Button 
              onClick={handleCodeSubmit} 
              className="w-full"
              disabled={!manualCode.trim()}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    // Determine error type and display appropriate message
    const isNotYetAvailable = errorDetails?.code === 'ASSESSMENT_NOT_STARTED';
    const isExpiredError = errorDetails?.code === 'ASSESSMENT_EXPIRED';
    const isCancelledError = errorDetails?.code === 'ASSESSMENT_CANCELLED';
    const isCompletedError = errorDetails?.code === 'ASSESSMENT_COMPLETED';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {isNotYetAvailable ? (
              <>
                <div className="mx-auto mb-4 p-4 rounded-full bg-blue-100">
                  <Clock className="h-12 w-12 text-blue-600" />
                </div>
                <CardTitle className="text-2xl text-blue-700">Assessment Not Yet Available</CardTitle>
                <CardDescription className="text-gray-600 space-y-2">
                  <p>
                    Hello{errorDetails?.candidateName ? ` ${errorDetails.candidateName}` : ''}! Your assessment 
                    {errorDetails?.testName ? ` "${errorDetails.testName}"` : ''} is scheduled to begin on:
                  </p>
                  {errorDetails?.scheduledAt && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-lg font-semibold text-blue-800">
                        {format(new Date(errorDetails.scheduledAt), 'EEEE, MMMM do, yyyy')}
                      </p>
                      <p className="text-xl font-bold text-blue-900">
                        {format(new Date(errorDetails.scheduledAt), 'hh:mm a')}
                      </p>
                      <p className="text-sm text-blue-600 mt-2">
                        You can access this page 5 minutes before the scheduled time.
                      </p>
                    </div>
                  )}
                </CardDescription>
              </>
            ) : isExpiredError ? (
              <>
                <div className="mx-auto mb-4 p-4 rounded-full bg-orange-100">
                  <AlertTriangle className="h-12 w-12 text-orange-600" />
                </div>
                <CardTitle className="text-2xl text-orange-700">Assessment Expired</CardTitle>
                <CardDescription className="text-gray-600">
                  <p>This assessment has expired and is no longer available.</p>
                  {errorDetails?.expiredAt && (
                    <p className="mt-2 text-sm">
                      Expired on: {format(new Date(errorDetails.expiredAt), 'PPP')}
                    </p>
                  )}
                  <p className="mt-4">Please contact HR for assistance or to request a new assessment.</p>
                </CardDescription>
              </>
            ) : isCancelledError ? (
              <>
                <div className="mx-auto mb-4 p-4 rounded-full bg-gray-100">
                  <XCircle className="h-12 w-12 text-gray-600" />
                </div>
                <CardTitle className="text-2xl text-gray-700">Assessment Cancelled</CardTitle>
                <CardDescription className="text-gray-600">
                  <p>This assessment has been cancelled.</p>
                  <p className="mt-4">Please contact HR for more information.</p>
                </CardDescription>
              </>
            ) : isCompletedError ? (
              <>
                <div className="mx-auto mb-4 p-4 rounded-full bg-green-100">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-700">Assessment Already Completed</CardTitle>
                <CardDescription className="text-gray-600">
                  <p>You have already completed this assessment.</p>
                  <p className="mt-4">Your results have been submitted. Please contact HR if you have any questions.</p>
                </CardDescription>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 p-4 rounded-full bg-red-100">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
                <CardTitle className="text-2xl text-red-700">Invalid Code</CardTitle>
                <CardDescription className="text-red-600">
                  {error}
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!isCompletedError && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="retry-code">Have a different code?</Label>
                  <Input
                    id="retry-code"
                    placeholder="Enter your code"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                    className="text-center text-lg font-mono tracking-widest"
                  />
                </div>
                <Button onClick={handleCodeSubmit} className="w-full" disabled={!manualCode.trim()}>
                  Try Another Code
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invitation loaded
  if (!invitation) return null;

  const test = invitation.test;
  
  // Calculate total questions from sections if available
  const questionsFromSections = test.sections?.reduce(
    (total, section) => total + (section.questions?.length || 0), 
    0
  ) || 0;
  const questionsFromTopLevel = test.questions?.length || 0;
  const totalQuestions = test.questionsCount || test.totalQuestions || questionsFromSections || questionsFromTopLevel || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{test.name}</h1>
          <p className="text-muted-foreground">
            Welcome, <span className="font-semibold">{invitation.candidateName}</span>
          </p>
        </div>

        {/* Status Alerts */}
        {isExpired && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-700">
                <XCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Assessment Expired</p>
                  <p className="text-sm">This assessment link expired on {format(new Date(invitation.validUntil), 'PPP')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isNotYetValid && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-yellow-700">
                <AlertTriangle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Assessment Not Yet Available</p>
                  <p className="text-sm">This assessment will be available from {format(new Date(invitation.validFrom), 'PPP p')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isCompleted && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-700">
                <CheckCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Assessment Completed</p>
                  <p className="text-sm">You have already completed this assessment</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isCancelled && (
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-gray-700">
                <XCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Assessment Cancelled</p>
                  <p className="text-sm">This assessment invitation has been cancelled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isInProgress && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-blue-700">
                <Timer className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Assessment In Progress</p>
                  <p className="text-sm">You have an ongoing assessment. Click continue to resume.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Details</CardTitle>
            {test.description && (
              <CardDescription dangerouslySetInnerHTML={{ __html: test.description }} />
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <FileQuestion className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold text-blue-700">{totalQuestions}</p>
                <p className="text-sm text-blue-600">Questions</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Clock className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <p className="text-2xl font-bold text-purple-700">{test.duration}</p>
                <p className="text-sm text-purple-600">Minutes</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Award className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold text-green-700">{test.passingScore}%</p>
                <p className="text-sm text-green-600">Passing Score</p>
              </div>
            </div>

            {/* Validity */}
            <div className="flex items-center justify-between p-4 bg-slate-100 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Valid Until</p>
                <p className="font-medium text-slate-900">{format(new Date(invitation.validUntil), 'PPP p')}</p>
              </div>
              <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                {isExpired ? 'Expired' : formatDistanceToNow(new Date(invitation.validUntil), { addSuffix: true })}
              </Badge>
            </div>

            {/* Proctoring Info */}
            {(test.proctoring || test.webcamRequired || test.fullscreen || test.preventCopyPaste) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-600" />
                    Proctoring & Security
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {test.webcamRequired && (
                      <div className="flex items-center gap-2 text-sm">
                        <Camera className="h-4 w-4 text-muted-foreground" />
                        <span>Webcam Required</span>
                      </div>
                    )}
                    {test.fullscreen && (
                      <div className="flex items-center gap-2 text-sm">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span>Fullscreen Mode</span>
                      </div>
                    )}
                    {test.preventCopyPaste && (
                      <div className="flex items-center gap-2 text-sm">
                        <Copy className="h-4 w-4 text-muted-foreground" />
                        <span>Copy/Paste Disabled</span>
                      </div>
                    )}
                    {test.proctoring && (
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        <span>Tab Switch Detection</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Instructions */}
            {test.instructions && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Instructions
                  </h3>
                  <div 
                    className="p-4 bg-slate-100 rounded-lg text-sm text-slate-700 prose prose-sm prose-slate max-w-none"
                    dangerouslySetInnerHTML={{ __html: test.instructions }}
                  />
                </div>
              </>
            )}

            {/* Terms & Start */}
            {!isExpired && !isNotYetValid && !isCompleted && !isCancelled && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    />
                    <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                      I understand that once I start the assessment, the timer will begin and I must complete it within the allotted time.
                      I agree to complete this assessment honestly and without any unauthorized assistance.
                    </label>
                  </div>

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleStartAssessment}
                    disabled={!canStart || isStarting}
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Starting Assessment...
                      </>
                    ) : isInProgress ? (
                      <>
                        Continue Assessment
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    ) : (
                      <>
                        Start Assessment
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Assessment Code: <span className="font-mono font-semibold">{invitation.assessmentCode}</span>
        </p>
      </div>
    </div>
  );
}

export default function AssessmentStartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-32" />
            <Skeleton className="h-12" />
          </CardContent>
        </Card>
      </div>
    }>
      <AssessmentStartContent />
    </Suspense>
  );
}
