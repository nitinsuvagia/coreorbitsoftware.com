'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Code,
  FileText,
  ListChecks,
  ToggleLeft,
  Type,
  Clock,
  Tag,
  Star,
  FileQuestion,
} from 'lucide-react';
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
import { assessmentApi, BankQuestion } from '@/lib/api/assessments';
import { format } from 'date-fns';

// Question type configuration
const questionTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  'MULTIPLE_CHOICE': { label: 'Multiple Choice', icon: ListChecks, color: 'bg-blue-100 text-blue-700' },
  'MULTIPLE_SELECT': { label: 'Multi Select', icon: ListChecks, color: 'bg-purple-100 text-purple-700' },
  'TRUE_FALSE': { label: 'True/False', icon: ToggleLeft, color: 'bg-orange-100 text-orange-700' },
  'SHORT_ANSWER': { label: 'Short Answer', icon: Type, color: 'bg-green-100 text-green-700' },
  'ESSAY': { label: 'Long Answer', icon: FileText, color: 'bg-indigo-100 text-indigo-700' },
  'CODING': { label: 'Coding', icon: Code, color: 'bg-pink-100 text-pink-700' },
};

const difficultyColors: Record<string, string> = {
  EASY: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HARD: 'bg-red-100 text-red-700',
};

export default function ViewQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const questionId = params.id as string;
  
  const [question, setQuestion] = useState<BankQuestion | null>(null);
  const [allQuestions, setAllQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Find current question index and prev/next
  const currentIndex = allQuestions.findIndex(q => q.id === questionId);
  const prevQuestion = currentIndex > 0 ? allQuestions[currentIndex - 1] : null;
  const nextQuestion = currentIndex < allQuestions.length - 1 ? allQuestions[currentIndex + 1] : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch both current question and all questions in parallel
        const [questionData, questionsData] = await Promise.all([
          assessmentApi.getQuestionById(questionId),
          assessmentApi.getAllQuestions({ testId: 'bank' }),
        ]);
        setQuestion(questionData);
        setAllQuestions(questionsData);
      } catch (error) {
        console.error('Failed to fetch question:', error);
        toast.error('Failed to load question');
        router.push('/hr/assessments?tab=questions');
      } finally {
        setLoading(false);
      }
    };

    if (questionId) {
      fetchData();
    }
  }, [questionId, router]);

  const handleDelete = async () => {
    try {
      await assessmentApi.deleteQuestion(questionId);
      toast.success('Question deleted successfully');
      router.push('/hr/assessments?tab=questions');
    } catch (error) {
      console.error('Failed to delete question:', error);
      toast.error('Failed to delete question');
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl">
        <div className="mb-6">
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="container max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Question not found</h3>
            <p className="text-muted-foreground mb-4">The question you're looking for doesn't exist or has been deleted.</p>
            <Button onClick={() => router.push('/hr/assessments?tab=questions')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Question Bank
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeConfig = questionTypeConfig[question.type] || { label: question.type, icon: FileQuestion, color: 'bg-gray-100 text-gray-700' };
  const TypeIcon = typeConfig.icon;

  return (
    <div className="container max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Button
            variant="ghost"
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/hr/assessments?tab=questions')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Question Bank
          </Button>
          <h1 className="text-2xl font-bold">View Question</h1>
          <p className="text-muted-foreground">Question details and options</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/hr/assessments/questions/${questionId}/edit`)}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={typeConfig.color}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {typeConfig.label}
                </Badge>
                <Badge className={difficultyColors[question.difficulty || 'MEDIUM']}>
                  {question.difficulty || 'Medium'}
                </Badge>
                <Badge variant="secondary">
                  <Star className="h-3 w-3 mr-1" />
                  {question.points} pts
                </Badge>
              </div>
              <CardTitle className="text-xl">{question.question}</CardTitle>
              {question.category && (
                <CardDescription className="mt-2 flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {question.category}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Options (for MCQ/Multi-Select) */}
          {(question.type === 'MULTIPLE_CHOICE' || question.type === 'MULTIPLE_SELECT') && question.options && (
            <div>
              <h3 className="font-medium mb-3">Answer Options</h3>
              <div className="space-y-2">
                {question.options.map((option: any, index: number) => (
                  <div
                    key={option.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      option.isCorrect ? 'border-green-500 bg-green-50' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-sm font-medium">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="flex-1">{option.text}</span>
                    {option.isCorrect && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* True/False Answer */}
          {question.type === 'TRUE_FALSE' && question.correctAnswer && (
            <div>
              <h3 className="font-medium mb-3">Correct Answer</h3>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  question.correctAnswer === 'true' ? 'border-green-500 bg-green-50' : 'border-border'
                }`}>
                  {question.correctAnswer === 'true' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  True
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  question.correctAnswer === 'false' ? 'border-green-500 bg-green-50' : 'border-border'
                }`}>
                  {question.correctAnswer === 'false' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  False
                </div>
              </div>
            </div>
          )}

          {/* Code Template (for Coding) */}
          {question.type === 'CODING' && question.code && (
            <div>
              <h3 className="font-medium mb-3">Code Template</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{question.code}</pre>
              </div>
              {question.codeLanguage && (
                <p className="text-sm text-muted-foreground mt-2">Language: {question.codeLanguage}</p>
              )}
            </div>
          )}

          {/* Explanation */}
          {question.explanation && (
            <div>
              <h3 className="font-medium mb-3">Explanation</h3>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm">{question.explanation}</p>
              </div>
            </div>
          )}

          {/* Tags */}
          {question.tags && question.tags.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {question.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Metadata */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Created: {question.createdAt ? format(new Date(question.createdAt), 'MMM d, yyyy') : 'N/A'}
            </div>
            {question.updatedAt && question.updatedAt !== question.createdAt && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Updated: {format(new Date(question.updatedAt), 'MMM d, yyyy')}
              </div>
            )}
          </div>

          <Separator />

          {/* Previous/Next Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => prevQuestion && router.push(`/hr/assessments/questions/${prevQuestion.id}`)}
              disabled={!prevQuestion}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentIndex >= 0 ? `${currentIndex + 1} of ${allQuestions.length}` : ''}
            </span>
            <Button
              variant="outline"
              onClick={() => nextQuestion && router.push(`/hr/assessments/questions/${nextQuestion.id}`)}
              disabled={!nextQuestion}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question?
              <span className="block mt-2 font-medium text-foreground">
                "{question.question}"
              </span>
              <span className="block mt-2">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
