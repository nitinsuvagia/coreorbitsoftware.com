'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertCircle,
  CheckCircle,
  Circle,
  Eye,
  FileQuestion,
  Monitor,
  Camera,
  X,
  BookOpen,
  Timer,
  Send,
  Bookmark,
  SkipForward,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Question {
  id: string;
  question: string;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  points: number;
  tags: string[];
  options?: { id: string; text: string }[];
}

interface Section {
  id: string;
  category: string;
  selectionMode: 'random' | 'fixed';
  randomCount: number;
  selectedQuestions: Question[];
  weightage: number;
  shuffleQuestions: boolean;
}

interface TestData {
  name: string;
  description: string;
  instructions: string;
  duration: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showScore: boolean;
  showAnswers: boolean;
  enableProctoring: boolean;
  preventTabSwitch: boolean;
  preventCopyPaste: boolean;
  webcamRequired: boolean;
  sections: Section[];
}

interface PreviewTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testData: TestData | null;
}

// ============================================================================
// MOCK QUESTION OPTIONS FOR DEMO
// ============================================================================

const generateMockOptions = (questionId: string) => {
  const optionSets: Record<string, { id: string; text: string }[]> = {
    '1': [
      { id: 'a', text: 'O(1)' },
      { id: 'b', text: 'O(n)' },
      { id: 'c', text: 'O(log n)' },
      { id: 'd', text: 'O(n²)' },
    ],
    '4': [
      { id: 'a', text: 'True' },
      { id: 'b', text: 'False' },
    ],
    '5': [
      { id: 'a', text: 'GET' },
      { id: 'b', text: 'POST' },
      { id: 'c', text: 'FETCH' },
      { id: 'd', text: 'DELETE' },
    ],
  };
  return optionSets[questionId] || [
    { id: 'a', text: 'Option A' },
    { id: 'b', text: 'Option B' },
    { id: 'c', text: 'Option C' },
    { id: 'd', text: 'Option D' },
  ];
};

// ============================================================================
// PREVIEW TEST DIALOG
// ============================================================================

export function PreviewTestDialog({ open, onOpenChange, testData }: PreviewTestDialogProps) {
  const [currentView, setCurrentView] = useState<'instructions' | 'test' | 'summary'>('instructions');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Loading effect
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 600);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Flatten all questions from sections
  const allQuestions: (Question & { sectionName: string })[] = testData?.sections.flatMap(
    (section) =>
      section.selectedQuestions.map((q) => ({
        ...q,
        sectionName: section.category,
        options: generateMockOptions(q.id),
      }))
  ) || [];

  const currentQuestion = allQuestions[currentQuestionIndex];
  const totalQuestions = allQuestions.length;

  useEffect(() => {
    if (testData) {
      setTimeRemaining(testData.duration * 60); // Convert to seconds
    }
  }, [testData]);

  // Timer effect (just for demo display, doesn't actually count down)
  useEffect(() => {
    if (currentView === 'test' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentView, timeRemaining]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const getQuestionStatus = (questionId: string) => {
    if (answers[questionId]) return 'answered';
    if (flaggedQuestions.has(questionId)) return 'flagged';
    return 'unanswered';
  };

  const resetPreview = () => {
    setCurrentView('instructions');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setFlaggedQuestions(new Set());
    if (testData) {
      setTimeRemaining(testData.duration * 60);
    }
  };

  const handleClose = () => {
    resetPreview();
    onOpenChange(false);
  };

  if (!testData) return null;

  // Skeleton Loading for Dialog
  const DialogSkeleton = () => (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="text-center pb-4 border-b">
        <Skeleton className="h-8 w-8 mx-auto mb-2 rounded" />
        <Skeleton className="h-7 w-64 mx-auto mb-2" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>

      {/* Test Info Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4 text-center">
              <Skeleton className="h-6 w-6 mx-auto mb-2 rounded" />
              <Skeleton className="h-8 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>

      {/* Footer Skeleton */}
      <div className="flex justify-between pt-4 border-t">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );

  // ============================================================================
  // INSTRUCTIONS VIEW
  // ============================================================================

  const InstructionsView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b">
        <div className="flex items-center justify-center gap-2 mb-2">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{testData.name || 'Untitled Test'}</h2>
        {testData.description ? (
          <div 
            className="text-muted-foreground mt-2 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: testData.description }}
          />
        ) : (
          <p className="text-muted-foreground mt-2">No description provided</p>
        )}
      </div>

      {/* Test Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Timer className="h-6 w-6 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{testData.duration}</p>
            <p className="text-xs text-muted-foreground">Minutes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <FileQuestion className="h-6 w-6 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{totalQuestions}</p>
            <p className="text-xs text-muted-foreground">Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto text-orange-600 mb-2" />
            <p className="text-2xl font-bold">{testData.passingScore}%</p>
            <p className="text-xs text-muted-foreground">Passing Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Monitor className="h-6 w-6 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">{testData.sections.length}</p>
            <p className="text-xs text-muted-foreground">Sections</p>
          </CardContent>
        </Card>
      </div>

      {/* Proctoring Notice */}
      {testData.enableProctoring && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Proctoring Enabled</h4>
              <ul className="text-sm text-amber-700 mt-1 space-y-1">
                {testData.webcamRequired && <li>• Webcam access is required</li>}
                {testData.preventTabSwitch && <li>• Tab switching will be monitored</li>}
                {testData.preventCopyPaste && <li>• Copy/paste is disabled</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {testData.instructions ? (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: testData.instructions }}
            />
          ) : (
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Read each question carefully before answering.</li>
              <li>• You can navigate between questions using the navigation panel.</li>
              <li>• Flag questions you want to review later.</li>
              <li>• Make sure to submit before the timer runs out.</li>
              <li>• Once submitted, you cannot modify your answers.</li>
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Sections Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Sections Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {testData.sections.map((section, index) => (
              <div
                key={section.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{section.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {section.selectionMode === 'random'
                        ? `${section.randomCount} random questions`
                        : `${section.selectedQuestions.length} questions`}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{section.weightage}%</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={() => setCurrentView('test')} disabled={totalQuestions === 0}>
          <Eye className="h-4 w-4 mr-2" />
          Start Preview
        </Button>
      </div>
    </div>
  );

  // ============================================================================
  // TEST VIEW
  // ============================================================================

  const TestView = () => (
    <div className="flex h-[70vh]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Timer Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-base px-3 py-1">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </Badge>
            <Badge variant="secondary">{currentQuestion?.sectionName}</Badge>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold",
            timeRemaining < 300 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          )}>
            <Clock className="h-5 w-5" />
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* Question Content */}
        <ScrollArea className="flex-1 p-6">
          {currentQuestion && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        currentQuestion.difficulty === 'easy' && 'border-green-500 text-green-600',
                        currentQuestion.difficulty === 'medium' && 'border-yellow-500 text-yellow-600',
                        currentQuestion.difficulty === 'hard' && 'border-red-500 text-red-600'
                      )}
                    >
                      {currentQuestion.difficulty}
                    </Badge>
                    <Badge variant="secondary">{currentQuestion.points} points</Badge>
                    <Badge variant="outline">{currentQuestion.type.replace('_', ' ')}</Badge>
                  </div>
                  <h3 className="text-lg font-medium">{currentQuestion.question}</h3>
                </div>
                <Button
                  variant={flaggedQuestions.has(currentQuestion.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={cn(
                    flaggedQuestions.has(currentQuestion.id) && 'bg-orange-500 hover:bg-orange-600'
                  )}
                >
                  <Flag className="h-4 w-4" />
                </Button>
              </div>

              {/* Answer Options based on question type */}
              <div className="space-y-3">
                {(currentQuestion.type === 'mcq' || currentQuestion.type === 'true_false') && (
                  <RadioGroup
                    value={answers[currentQuestion.id] as string || ''}
                    onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
                  >
                    {currentQuestion.options?.map((option) => (
                      <div
                        key={option.id}
                        className={cn(
                          "flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors",
                          answers[currentQuestion.id] === option.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => handleAnswer(currentQuestion.id, option.id)}
                      >
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {currentQuestion.type === 'multi_select' && (
                  <div className="space-y-2">
                    {currentQuestion.options?.map((option) => {
                      const selectedAnswers = (answers[currentQuestion.id] as string[]) || [];
                      const isSelected = selectedAnswers.includes(option.id);
                      return (
                        <div
                          key={option.id}
                          className={cn(
                            "flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors",
                            isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          )}
                          onClick={() => {
                            const newAnswers = isSelected
                              ? selectedAnswers.filter((a) => a !== option.id)
                              : [...selectedAnswers, option.id];
                            handleAnswer(currentQuestion.id, newAnswers);
                          }}
                        >
                          <Checkbox checked={isSelected} />
                          <Label className="flex-1 cursor-pointer">{option.text}</Label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(currentQuestion.type === 'short_text' || currentQuestion.type === 'long_text') && (
                  <Textarea
                    placeholder="Type your answer here..."
                    value={(answers[currentQuestion.id] as string) || ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                    className={currentQuestion.type === 'long_text' ? 'min-h-[200px]' : 'min-h-[100px]'}
                  />
                )}

                {currentQuestion.type === 'code' && (
                  <div className="space-y-2">
                    <Label>Write your code:</Label>
                    <Textarea
                      placeholder="// Write your code here..."
                      value={(answers[currentQuestion.id] as string) || ''}
                      onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-background">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              disabled={currentQuestionIndex === totalQuestions - 1}
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Skip
            </Button>
            {currentQuestionIndex === totalQuestions - 1 ? (
              <Button onClick={() => setCurrentView('summary')}>
                <Send className="h-4 w-4 mr-2" />
                Review & Submit
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Question Navigator Sidebar */}
      <div className="w-64 border-l bg-muted/30 p-4">
        <h4 className="font-medium mb-4">Question Navigator</h4>
        <div className="grid grid-cols-5 gap-2">
          {allQuestions.map((q, index) => {
            const status = getQuestionStatus(q.id);
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={cn(
                  "w-10 h-10 rounded-lg text-sm font-medium transition-all",
                  index === currentQuestionIndex && "ring-2 ring-primary ring-offset-2",
                  status === 'answered' && "bg-green-500 text-white",
                  status === 'flagged' && "bg-orange-500 text-white",
                  status === 'unanswered' && "bg-background border hover:bg-muted"
                )}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-muted-foreground">Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500" />
            <span className="text-muted-foreground">Flagged</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border bg-background" />
            <span className="text-muted-foreground">Not Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-primary" />
            <span className="text-muted-foreground">Current</span>
          </div>
        </div>

        {/* Stats */}
        <Separator className="my-4" />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Answered:</span>
            <span className="font-medium">{Object.keys(answers).length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Flagged:</span>
            <span className="font-medium">{flaggedQuestions.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Remaining:</span>
            <span className="font-medium">{totalQuestions - Object.keys(answers).length}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // SUMMARY VIEW
  // ============================================================================

  const SummaryView = () => {
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = totalQuestions - answeredCount;
    const flaggedCount = flaggedQuestions.size;

    return (
      <div className="space-y-6 p-6">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
          <h2 className="text-2xl font-bold">Review Your Submission</h2>
          <p className="text-muted-foreground mt-2">
            Please review your answers before final submission
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-green-600">{answeredCount}</p>
              <p className="text-sm text-muted-foreground">Answered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-gray-600">{unansweredCount}</p>
              <p className="text-sm text-muted-foreground">Unanswered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-orange-600">{flaggedCount}</p>
              <p className="text-sm text-muted-foreground">Flagged</p>
            </CardContent>
          </Card>
        </div>

        {/* Section-wise breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Section-wise Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testData.sections.map((section) => {
                const sectionQuestions = allQuestions.filter((q) => q.sectionName === section.category);
                const sectionAnswered = sectionQuestions.filter((q) => answers[q.id]).length;
                const progress = (sectionAnswered / sectionQuestions.length) * 100;

                return (
                  <div key={section.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{section.category}</span>
                      <span className="text-muted-foreground">
                        {sectionAnswered} / {sectionQuestions.length} answered
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Warning for unanswered */}
        {unansweredCount > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">
                  You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  You can go back and answer them before submitting.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-4">
          <Button variant="outline" onClick={() => setCurrentView('test')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Test
          </Button>
          <Button onClick={handleClose}>
            <Send className="h-4 w-4 mr-2" />
            End Preview
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Test Preview Mode
            </DialogTitle>
            <Badge variant="secondary" className="mr-8">Preview Only</Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {isLoading ? (
              <DialogSkeleton />
            ) : (
              <>
                {currentView === 'instructions' && <InstructionsView />}
                {currentView === 'test' && <TestView />}
                {currentView === 'summary' && <SummaryView />}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
