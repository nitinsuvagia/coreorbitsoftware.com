'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { assessmentApi, AssessmentResult, AssessmentQuestion } from '@/lib/api/assessments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { cn } from '@/lib/utils';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle,
  Circle,
  AlertTriangle,
  Send,
  Loader2,
  Code,
  Monitor,
  Eye,
  Maximize,
} from 'lucide-react';

interface TestQuestion extends AssessmentQuestion {
  sectionName?: string;
}

interface TestData {
  id: string;
  testId: string;
  status: string;
  startedAt: string;
  tabSwitchCount?: number;
  test: {
    id: string;
    name: string;
    duration: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    fullscreen?: boolean;
    proctoring?: boolean;
    tabSwitchLimit?: number;
    questions?: AssessmentQuestion[];
    sections?: {
      id: string;
      name: string;
      questions?: AssessmentQuestion[];
    }[];
  };
  answers?: {
    questionId: string;
    answer?: string;
    selectedOptions?: string[];
  }[];
}

export default function TakeAssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const resultId = params.id as string;

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);

  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(Date.now());

  // Load test data
  useEffect(() => {
    const loadTestData = async () => {
      try {
        setIsLoading(true);
        const result = await assessmentApi.getResultById(resultId);
        setTestData(result as unknown as TestData);

        // Flatten questions from sections
        const allQuestions: TestQuestion[] = [];
        if (result.test?.questions) {
          allQuestions.push(...result.test.questions);
        }
        if (result.test?.sections) {
          result.test.sections.forEach(section => {
            if (section.questions) {
              section.questions.forEach(q => {
                allQuestions.push({ ...q, sectionName: section.name });
              });
            }
          });
        }

        // Shuffle questions if needed
        if (result.test?.shuffleQuestions) {
          allQuestions.sort(() => Math.random() - 0.5);
        }

        // Shuffle options if needed (preserves option IDs so answer checking still works)
        if (result.test?.shuffleOptions) {
          allQuestions.forEach(q => {
            if (q.options && Array.isArray(q.options)) {
              q.options = [...q.options].sort(() => Math.random() - 0.5);
            }
          });
        }

        setQuestions(allQuestions);

        // Restore saved answers
        if (result.answers) {
          const savedAnswers: Record<string, string | string[]> = {};
          result.answers.forEach((a: any) => {
            if (a.selectedOptions) {
              savedAnswers[a.questionId] = a.selectedOptions;
            } else if (a.answer) {
              savedAnswers[a.questionId] = a.answer;
            }
          });
          setAnswers(savedAnswers);
        }

        // Calculate remaining time
        const startTime = new Date(result.startedAt).getTime();
        const duration = result.test?.duration || 60;
        const endTime = startTime + duration * 60 * 1000;
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        setTimeRemaining(remaining);
      } catch (error: any) {
        console.error('Failed to load test:', error);
        toast.error(error.message || 'Failed to load assessment');
        router.push('/assessment/start');
      } finally {
        setIsLoading(false);
      }
    };

    if (resultId) {
      loadTestData();
    }
  }, [resultId, router]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 || isLoading) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleSubmit(true);
          return 0;
        }
        if (prev === 300) {
          // 5-minute warning
          setShowTimeWarning(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining, isLoading]);

  // Fullscreen mode enforcement
  useEffect(() => {
    if (isLoading || !testData?.test?.fullscreen) return;

    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch (error) {
        console.error('Failed to enter fullscreen:', error);
      }
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen && testData?.test?.fullscreen && !isSubmitting) {
        setShowFullscreenWarning(true);
      }
    };

    // Enter fullscreen on mount
    enterFullscreen();

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      // Exit fullscreen on unmount
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isLoading, testData?.test?.fullscreen, isSubmitting]);

  // Tab switch detection
  useEffect(() => {
    if (isLoading || !testData?.test?.proctoring) return;

    const tabSwitchLimit = testData.test.tabSwitchLimit || 3;

    const handleVisibilityChange = async () => {
      if (document.hidden && !isSubmitting) {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);
        
        // Record tab switch on server
        try {
          const response = await assessmentApi.recordTabSwitch(resultId);
          if (response.terminated) {
            toast.error('Assessment terminated due to too many tab switches');
            router.push(`/assessment/result/${resultId}`);
            return;
          }
        } catch (error) {
          console.error('Failed to record tab switch:', error);
        }

        // Show warning
        if (newCount < tabSwitchLimit) {
          setShowTabWarning(true);
          toast.warning(
            `Warning: Tab switch detected! (${newCount}/${tabSwitchLimit})`,
            { duration: 5000 }
          );
        }
      }
    };

    const handleWindowBlur = () => {
      // Also track when window loses focus (e.g., switching apps)
      if (!isSubmitting && testData?.test?.proctoring) {
        handleVisibilityChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isLoading, testData?.test?.proctoring, testData?.test?.tabSwitchLimit, tabSwitchCount, resultId, isSubmitting, router]);

  // Initialize tab switch count from test data
  useEffect(() => {
    if (testData?.tabSwitchCount) {
      setTabSwitchCount(testData.tabSwitchCount);
    }
  }, [testData?.tabSwitchCount]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Current question
  const currentQuestion = questions[currentIndex];

  // Handle answer change
  const handleAnswerChange = async (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

    // Auto-save every 10 seconds
    if (Date.now() - lastSaveRef.current > 10000) {
      try {
        const answer = Array.isArray(value)
          ? { selectedOptions: value }
          : { answer: value };
        await assessmentApi.submitAnswer(resultId, questionId, answer);
        lastSaveRef.current = Date.now();
      } catch (error) {
        console.error('Failed to auto-save answer:', error);
      }
    }
  };

  // Save current question's answer to server
  const saveCurrentAnswer = async () => {
    if (!currentQuestion) return;
    
    const value = answers[currentQuestion.id];
    if (value === undefined) return;
    
    // Check if there's actually an answer to save
    const hasAnswer = Array.isArray(value) ? value.length > 0 : (value && value.toString().trim() !== '');
    if (!hasAnswer) return;
    
    try {
      const answer = Array.isArray(value)
        ? { selectedOptions: value }
        : { answer: value };
      await assessmentApi.submitAnswer(resultId, currentQuestion.id, answer);
    } catch (error) {
      console.error('Failed to save answer:', error);
    }
  };

  // Toggle flag
  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // Navigate questions - save current answer before navigating
  const goToQuestion = async (index: number) => {
    if (index >= 0 && index < questions.length) {
      // Save current answer before navigating
      await saveCurrentAnswer();
      setCurrentIndex(index);
    }
  };

  // Handle submit
  const handleSubmit = async (autoSubmit = false) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setShowSubmitDialog(false); // Close dialog immediately to show loading state on main page
    
    try {
      // Save all unsaved answers before completing
      for (const questionId of Object.keys(answers)) {
        const value = answers[questionId];
        const hasAnswer = Array.isArray(value) ? value.length > 0 : (value && value.toString().trim() !== '');
        if (hasAnswer) {
          try {
            const answer = Array.isArray(value)
              ? { selectedOptions: value }
              : { answer: value };
            await assessmentApi.submitAnswer(resultId, questionId, answer);
          } catch (err) {
            // Silent fail - continue with submission
          }
        }
      }
      
      await assessmentApi.completeAssessment(resultId);
      
      toast.success(autoSubmit ? 'Time\'s up! Assessment submitted.' : 'Assessment submitted successfully!');
      
      // Navigate to result page
      router.push(`/assessment/result/${resultId}`);
    } catch (error: any) {
      console.error('[Assessment] Failed to submit assessment:', error);
      const errorMessage = error?.response?.data?.error || error.message || 'Failed to submit assessment';
      toast.error(errorMessage);
      setIsSubmitting(false);
      // Re-open dialog on error so user can try again
      if (!autoSubmit) {
        setShowSubmitDialog(true);
      }
    }
  };

  // Count answered questions
  const answeredCount = Object.keys(answers).filter((id) => {
    const answer = answers[id];
    if (Array.isArray(answer)) return answer.length > 0;
    return answer && answer.trim() !== '';
  }).length;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-9">
              <Skeleton className="h-96" />
            </div>
            <div className="col-span-3">
              <Skeleton className="h-96" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Submitting overlay
  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md text-center p-8">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold mb-2">Submitting Assessment...</h2>
          <p className="text-muted-foreground">Please wait while we save your answers.</p>
        </Card>
      </div>
    );
  }

  if (!testData || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md text-center p-8">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Questions Found</h2>
          <p className="text-muted-foreground">This assessment has no questions.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg">{testData.test?.name}</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Proctoring Status */}
            {testData.test?.proctoring && (
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                  tabSwitchCount > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                )}>
                  <Eye className="h-3 w-3" />
                  {tabSwitchCount}/{testData.test.tabSwitchLimit || 3}
                </div>
              </div>
            )}
            {testData.test?.fullscreen && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                isFullscreen ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              )}>
                <Maximize className="h-3 w-3" />
                {isFullscreen ? 'Fullscreen' : 'Exit FS'}
              </div>
            )}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold",
              timeRemaining <= 300 ? "bg-red-100 text-red-700" : "bg-slate-100"
            )}>
              <Clock className="h-5 w-5" />
              {formatTime(timeRemaining)}
            </div>
            <Button variant="destructive" onClick={() => setShowSubmitDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Submit
            </Button>
          </div>
        </div>
        <Progress value={(answeredCount / questions.length) * 100} className="h-1" />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-12 gap-4">
        {/* Question Area */}
        <div className="col-span-12 lg:col-span-9">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  Q{currentIndex + 1}
                </Badge>
                {currentQuestion.sectionName && (
                  <Badge variant="secondary">{currentQuestion.sectionName}</Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFlag(currentQuestion.id)}
                className={flaggedQuestions.has(currentQuestion.id) ? "text-amber-600" : ""}
              >
                <Flag className="h-4 w-4 mr-1" />
                {flaggedQuestions.has(currentQuestion.id) ? "Flagged" : "Flag"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question Text */}
              <div 
                className="text-lg font-medium prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
              />

              {/* Code Block if present */}
              {currentQuestion.code && (
                <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Code className="h-4 w-4" />
                    {currentQuestion.codeLanguage || 'Code'}
                  </div>
                  <pre>{currentQuestion.code}</pre>
                </div>
              )}

              {/* Answer Input Based on Type */}
              {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
                <RadioGroup
                  value={answers[currentQuestion.id] as string || ''}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option, idx) => (
                    <div
                      key={option.id}
                      className={cn(
                        "flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer",
                        answers[currentQuestion.id] === option.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-slate-50"
                      )}
                      onClick={() => handleAnswerChange(currentQuestion.id, option.id)}
                    >
                      <RadioGroupItem value={option.id} id={option.id} className="pointer-events-none" />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer pointer-events-none">
                        <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                        <span dangerouslySetInnerHTML={{ __html: option.text }} />
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.type === 'MULTIPLE_SELECT' && currentQuestion.options && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Select all that apply</p>
                  {currentQuestion.options.map((option, idx) => {
                    const selected = (answers[currentQuestion.id] as string[] || []).includes(option.id);
                    return (
                      <div
                        key={option.id}
                        className={cn(
                          "flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer",
                          selected ? "border-primary bg-primary/5" : "hover:bg-slate-50"
                        )}
                        onClick={() => {
                          const current = (answers[currentQuestion.id] as string[]) || [];
                          const updated = selected
                            ? current.filter((id) => id !== option.id)
                            : [...current, option.id];
                          handleAnswerChange(currentQuestion.id, updated);
                        }}
                      >
                        <Checkbox checked={selected} className="pointer-events-none" />
                        <Label className="flex-1 cursor-pointer pointer-events-none">
                          <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                          <span dangerouslySetInnerHTML={{ __html: option.text }} />
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === 'TRUE_FALSE' && (
                <RadioGroup
                  value={answers[currentQuestion.id] as string || ''}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {['True', 'False'].map((option) => (
                    <div
                      key={option}
                      className={cn(
                        "flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer",
                        answers[currentQuestion.id] === option.toLowerCase()
                          ? "border-primary bg-primary/5"
                          : "hover:bg-slate-50"
                      )}
                      onClick={() => handleAnswerChange(currentQuestion.id, option.toLowerCase())}
                    >
                      <RadioGroupItem value={option.toLowerCase()} id={option} className="pointer-events-none" />
                      <Label htmlFor={option} className="flex-1 cursor-pointer pointer-events-none font-medium">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {(currentQuestion.type === 'SHORT_ANSWER' || currentQuestion.type === 'ESSAY') && (
                <Textarea
                  placeholder="Type your answer here..."
                  value={answers[currentQuestion.id] as string || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  rows={currentQuestion.type === 'ESSAY' ? 8 : 3}
                  className="resize-none"
                />
              )}

              {currentQuestion.type === 'CODING' && (
                <Textarea
                  placeholder="Write your code here..."
                  value={answers[currentQuestion.id] as string || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  rows={12}
                  className="resize-none font-mono text-sm"
                />
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => goToQuestion(currentIndex - 1)}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  {answeredCount} of {questions.length} answered
                </div>
                <Button
                  onClick={() => goToQuestion(currentIndex + 1)}
                  disabled={currentIndex === questions.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question Navigator */}
        <div className="col-span-12 lg:col-span-3">
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Question Navigator</span>
                <Badge variant="outline" className="font-normal">
                  {answeredCount}/{questions.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
                </div>
                <Progress value={(answeredCount / questions.length) * 100} className="h-2" />
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-green-50 rounded-lg">
                  <div className="text-lg font-semibold text-green-700">{answeredCount}</div>
                  <div className="text-xs text-green-600">Answered</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="text-lg font-semibold text-slate-700">{questions.length - answeredCount}</div>
                  <div className="text-xs text-slate-600">Remaining</div>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <div className="text-lg font-semibold text-amber-700">{flaggedQuestions.size}</div>
                  <div className="text-xs text-amber-600">Flagged</div>
                </div>
              </div>

              {/* Question Grid */}
              <ScrollArea className="h-[280px]">
                <div className="grid grid-cols-5 gap-2 p-2">
                  {questions.map((q, idx) => {
                    const isAnswered = (() => {
                      const answer = answers[q.id];
                      if (Array.isArray(answer)) return answer.length > 0;
                      return answer && answer.trim() !== '';
                    })();
                    const isFlagged = flaggedQuestions.has(q.id);
                    const isCurrent = idx === currentIndex;

                    return (
                      <button
                        key={q.id}
                        onClick={() => goToQuestion(idx)}
                        title={`Question ${idx + 1}${isFlagged ? ' (Flagged)' : ''}${isAnswered ? ' - Answered' : ' - Not answered'}`}
                        className={cn(
                          "relative w-full aspect-square rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center",
                          isCurrent 
                            ? "bg-primary text-white shadow-md scale-105" 
                            : isAnswered
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-slate-200 text-slate-700 hover:bg-slate-300",
                          isFlagged && !isCurrent && "ring-2 ring-amber-400 ring-offset-1"
                        )}
                      >
                        {idx + 1}
                        {isFlagged && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Legend */}
              <div className="pt-3 border-t space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-2">Legend</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-primary" />
                    <span>Current</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-slate-200" />
                    <span>Unanswered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-amber-500" />
                    <span>Flagged</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              {flaggedQuestions.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-amber-600 border-amber-200 hover:bg-amber-50"
                  onClick={() => {
                    const flaggedIdx = questions.findIndex(q => flaggedQuestions.has(q.id));
                    if (flaggedIdx >= 0) goToQuestion(flaggedIdx);
                  }}
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Go to Flagged Question
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={(open) => {
        // Only allow closing if not currently submitting
        if (!isSubmitting) {
          setShowSubmitDialog(open);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} out of {questions.length} questions.
              {questions.length - answeredCount > 0 && (
                <span className="block mt-2 text-amber-600">
                  Warning: {questions.length - answeredCount} questions are unanswered.
                </span>
              )}
              {flaggedQuestions.size > 0 && (
                <span className="block mt-1 text-amber-600">
                  You have {flaggedQuestions.size} flagged question(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Review Answers</AlertDialogCancel>
            <Button
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Assessment'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time Warning Dialog */}
      <AlertDialog open={showTimeWarning} onOpenChange={setShowTimeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              5 Minutes Remaining!
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have 5 minutes left to complete your assessment. Make sure to review and submit before time runs out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowTimeWarning(false)}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tab Switch Warning Dialog */}
      <AlertDialog open={showTabWarning} onOpenChange={setShowTabWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Tab Switch Detected!
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p>Switching tabs or windows during the assessment is not allowed.</p>
              <p className="mt-2 font-medium text-red-600">
                Warning {tabSwitchCount} of {testData?.test?.tabSwitchLimit || 3}
              </p>
              <p className="mt-2 text-sm">
                If you exceed the limit, your assessment will be automatically terminated.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowTabWarning(false)}>
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fullscreen Warning Dialog */}
      <AlertDialog open={showFullscreenWarning} onOpenChange={setShowFullscreenWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Fullscreen Mode Required
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p>This assessment must be taken in fullscreen mode.</p>
              <p className="mt-2 text-sm">
                Please click the button below to return to fullscreen mode and continue your assessment.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={async () => {
                setShowFullscreenWarning(false);
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                    setIsFullscreen(true);
                  }
                } catch (error) {
                  console.error('Failed to enter fullscreen:', error);
                  toast.error('Please enable fullscreen mode to continue');
                }
              }}
            >
              Enter Fullscreen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
