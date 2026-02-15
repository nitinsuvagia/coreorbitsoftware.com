'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { assessmentApi } from '@/lib/api/assessments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileQuestion,
  Award,
  Home,
  Trophy,
  Target,
  TrendingUp,
} from 'lucide-react';

interface ResultData {
  id: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  timeTaken: number;
  completedAt: string;
  test: {
    name: string;
    passingScore: number;
    duration: number;
    showResults?: boolean;
    showAnswers?: boolean;
  };
}

export default function AssessmentResultPage() {
  const params = useParams();
  const resultId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResult = async () => {
      try {
        setIsLoading(true);
        const data = await assessmentApi.getResultById(resultId);
        setResult(data as unknown as ResultData);
      } catch (err: any) {
        console.error('Failed to load result:', err);
        setError(err.message || 'Failed to load result');
      } finally {
        setIsLoading(false);
      }
    };

    if (resultId) {
      loadResult();
    }
  }, [resultId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center space-y-4">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <Skeleton className="h-8 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-1/3 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-24" />
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 p-4 rounded-full bg-red-100">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <CardTitle>Error Loading Result</CardTitle>
            <CardDescription>{error || 'Result not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/assessment/start'}>
              <Home className="h-4 w-4 mr-2" />
              Go to Start Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showScore = result.test?.showResults !== false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Result Header */}
        <Card className="overflow-hidden">
          <div className={`py-8 px-6 text-center ${result.passed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}>
            <div className="mx-auto mb-4 p-4 rounded-full bg-white/20 w-fit">
              {result.passed ? (
                <Trophy className="h-12 w-12 text-white" />
              ) : (
                <Target className="h-12 w-12 text-white" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {result.passed ? 'Congratulations!' : 'Assessment Completed'}
            </h1>
            <p className="text-white/90 text-lg">
              {result.passed
                ? 'You have successfully passed the assessment!'
                : 'Unfortunately, you did not meet the passing criteria.'}
            </p>
          </div>

          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-center mb-6">{result.test?.name}</h2>

            {showScore ? (
              <>
                {/* Score Display */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-slate-100">
                    <div>
                      <span className={`text-4xl font-bold ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {Number(result.score).toFixed(2)}%
                      </span>
                      <p className="text-sm text-muted-foreground">Your Score</p>
                    </div>
                  </div>
                </div>

                {/* Score Progress */}
                <div className="mb-8">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Your Score: {Number(result.score).toFixed(2)}%</span>
                    <span>Passing Score: {result.test?.passingScore}%</span>
                  </div>
                  <div className="relative">
                    <Progress value={result.score} className="h-4" />
                    <div
                      className="absolute top-0 h-full border-l-2 border-dashed border-slate-600"
                      style={{ left: `${result.test?.passingScore}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-green-700">{result.correctAnswers}</p>
                    <p className="text-sm text-green-600">Correct</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
                    <p className="text-2xl font-bold text-red-700">{result.incorrectAnswers}</p>
                    <p className="text-sm text-red-600">Incorrect</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <FileQuestion className="h-6 w-6 mx-auto mb-2 text-slate-600" />
                    <p className="text-2xl font-bold text-slate-700">{result.skippedQuestions || 0}</p>
                    <p className="text-sm text-slate-600">Skipped</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold text-blue-700">{result.timeTaken || 0}</p>
                    <p className="text-sm text-blue-600">Minutes</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto mb-4 p-4 rounded-full bg-slate-100 w-fit">
                  <Award className="h-8 w-8 text-slate-600" />
                </div>
                <p className="text-muted-foreground">
                  Your results have been recorded and will be reviewed by the HR team.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  You will be notified about the outcome.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Completed At</span>
              <span className="font-medium">
                {result.completedAt ? format(new Date(result.completedAt), 'PPP p') : '-'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Time Allowed</span>
              <span className="font-medium">{result.test?.duration} minutes</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Time Taken</span>
              <span className="font-medium">{result.timeTaken || 0} minutes</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Total Questions</span>
              <span className="font-medium">{result.totalQuestions}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Result</span>
              <Badge className={result.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {result.passed ? 'PASSED' : 'FAILED'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Thank you for completing the assessment. You may close this window.
          </p>
          <Button variant="outline" onClick={() => {
            // Try to close, if fails redirect to a safe page
            try {
              window.close();
              // If window.close() didn't work (not opened by script), show message
              setTimeout(() => {
                window.location.href = '/assessment/start';
              }, 100);
            } catch (e) {
              window.location.href = '/assessment/start';
            }
          }}>
            Close Window
          </Button>
        </div>
      </div>
    </div>
  );
}
