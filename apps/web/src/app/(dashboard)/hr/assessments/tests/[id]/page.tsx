'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getAvatarColor } from '@/lib/format';
import { assessmentApi, AssessmentTest, AssessmentQuestion, AssessmentResult } from '@/lib/api/assessments';
import { PreviewTestDialog } from '../../_components/PreviewTestDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Edit,
  Copy,
  Trash2,
  Send,
  MoreVertical,
  Clock,
  FileQuestion,
  Users,
  TrendingUp,
  Award,
  CheckCircle,
  XCircle,
  Eye,
  ListChecks,
  Code,
  Type,
  FileText,
  ToggleLeft,
  Upload,
  BarChart3,
  Calendar,
  Settings,
  ExternalLink,
  Rocket,
}from 'lucide-react';

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  EASY: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
  HARD: 'bg-red-100 text-red-700',
  expert: 'bg-purple-100 text-purple-700',
  EXPERT: 'bg-purple-100 text-purple-700',
};

const typeIcons: Record<string, React.ElementType> = {
  mcq: ListChecks,
  MULTIPLE_CHOICE: ListChecks,
  multi_select: ListChecks,
  MULTIPLE_SELECT: ListChecks,
  true_false: ToggleLeft,
  TRUE_FALSE: ToggleLeft,
  short_text: Type,
  SHORT_ANSWER: Type,
  long_text: FileText,
  ESSAY: FileText,
  code: Code,
  CODING: Code,
  file_upload: Upload,
};

const typeLabels: Record<string, string> = {
  mcq: 'MCQ',
  MULTIPLE_CHOICE: 'Multiple Choice',
  multi_select: 'Multi Select',
  MULTIPLE_SELECT: 'Multiple Select',
  true_false: 'True/False',
  TRUE_FALSE: 'True/False',
  short_text: 'Short Text',
  SHORT_ANSWER: 'Short Answer',
  long_text: 'Long Text',
  ESSAY: 'Essay',
  code: 'Code',
  CODING: 'Coding',
};

// Type for attempts (mock for now until we have results API)
interface Attempt {
  id: string;
  candidateName: string;
  email: string;
  submittedAt: Date;
  duration: number;
  score: number;
  passed: boolean;
}

export default function TestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [test, setTest] = useState<AssessmentTest | null>(null);
  const [attempts, setAttempts] = useState<AssessmentResult[]>([]);
  
  // Dialog states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const loadTest = async () => {
    try {
      setIsLoading(true);
      // Load test data and results in parallel
      // Include answers for Question Performance analytics
      const [testData, resultsData] = await Promise.all([
        assessmentApi.getTestById(testId),
        assessmentApi.getAllResults({ testId, includeAnswers: true }),
      ]);
      setTest(testData);
      setAttempts(resultsData);
    } catch (error) {
      console.error('Failed to load test:', error);
      toast.error('Failed to load test');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };
    
  useEffect(() => {
    if (testId) {
      loadTest();
    }
  }, [testId]);

  // Handle publish test
  const handlePublishTest = async () => {
    if (!test) return;
    try {
      setIsPublishing(true);
      await assessmentApi.publishTest(testId);
      toast.success('Test published successfully!');
      loadTest(); // Reload to get updated status
    } catch (error: any) {
      console.error('Failed to publish test:', error);
      toast.error(error.message || 'Failed to publish test');
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle delete test
  const handleDeleteTest = async () => {
    try {
      setIsDeleting(true);
      await assessmentApi.deleteTest(testId);
      toast.success('Test deleted successfully!');
      router.push('/hr/assessments?tab=tests');
    } catch (error: any) {
      console.error('Failed to delete test:', error);
      toast.error(error.message || 'Failed to delete test');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Convert test to PreviewTestDialog format
  const getPreviewTestData = () => {
    if (!test) return null;
    const allQuestions = [
      ...(test.questions || []),
      ...(test.sections || []).flatMap(s => s.questions || [])
    ];
    
    // Calculate total points for fallback weightage calculation
    const totalPoints = (test.sections || []).reduce((sum, s) => 
      sum + (s.questions || []).reduce((qSum, q) => qSum + (q.points || 1), 0), 0
    );
    
    return {
      name: test.name,
      description: test.description || '',
      instructions: test.instructions || '',
      duration: test.duration,
      totalQuestions: allQuestions.length,
      passingScore: test.passingScore,
      shuffleQuestions: test.shuffleQuestions || false,
      shuffleOptions: test.shuffleOptions || false,
      showScore: test.showResults || false,
      showAnswers: false,
      enableProctoring: test.proctoring || false,
      preventTabSwitch: test.fullscreen || false,
      preventCopyPaste: test.preventCopyPaste || false,
      webcamRequired: test.webcamRequired || false,
      sections: test.sections?.map(s => {
        // Use stored weightage if available, otherwise calculate from points
        let weightage = s.weightage;
        if (weightage === undefined || weightage === null) {
          const sectionPoints = (s.questions || []).reduce((sum, q) => sum + (q.points || 1), 0);
          weightage = totalPoints > 0 ? Math.round((sectionPoints / totalPoints) * 100) : 0;
        }
        return {
          id: s.id,
          category: s.name || s.category || 'General',
          selectionMode: (s.selectionMode || 'fixed') as 'random' | 'fixed',
          randomCount: s.randomCount || 0,
          weightage,
          shuffleQuestions: s.shuffleQuestions || false,
          selectedQuestions: (s.questions || []).map(q => ({
            id: q.id,
            question: q.question,
            type: q.type,
            difficulty: (q.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
            category: s.name || s.category || 'General',
            points: q.points,
            tags: [] as string[],
          }))
        };
      }) || [],
    };
  };

  const passedCount = attempts.filter((a) => a.passed).length;
  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((acc, a) => acc + a.score, 0) / attempts.length)
    : 0;
  const avgDuration = attempts.length > 0
    ? Math.round(attempts.reduce((acc, a) => acc + (a.timeTaken || 0), 0) / attempts.length / 60)
    : 0;

  // Compute totals from test data - include questions from sections
  const sectionQuestionsCount = test?.sections?.reduce((acc, s) => acc + (s.questions?.length || 0), 0) || 0;
  const directQuestionsCount = test?.questions?.length || 0;
  const totalQuestions = sectionQuestionsCount + directQuestionsCount;
  
  // Calculate total points from all questions (sections + direct)
  const sectionPoints = test?.sections?.reduce((acc, s) => 
    acc + (s.questions?.reduce((qAcc, q) => qAcc + q.points, 0) || 0), 0) || 0;
  const directPoints = test?.questions?.reduce((acc, q) => acc + q.points, 0) || 0;
  const totalPoints = sectionPoints + directPoints;

  // Get all questions (from sections + direct)
  const allQuestions = [
    ...(test?.questions || []),
    ...(test?.sections?.flatMap(s => s.questions || []) || []),
  ];

  // Calculate question performance from attempts answers
  const questionPerformance = allQuestions.map((question, idx) => {
    // Count how many times this question was answered correctly across all attempts
    let correctCount = 0;
    let attemptedCount = 0;
    
    attempts.forEach(attempt => {
      if (attempt.answers) {
        const answer = attempt.answers.find(a => a.questionId === question.id);
        if (answer) {
          attemptedCount++;
          if (answer.isCorrect) {
            correctCount++;
          }
        }
      }
    });
    
    const successRate = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
    
    return {
      ...question,
      index: idx,
      successRate,
      attemptedCount,
      correctCount,
    };
  });

  // Skeleton Loading UI
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-9 w-72" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-6 w-12 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div>
          <Skeleton className="h-10 w-[400px] mb-6" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                        <Skeleton className="h-8 w-8 rounded" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-48 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Skeleton */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-28" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-5 w-10" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-28" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading if test is not yet loaded
  if (!test) {
    return null;
  }

  // Determine display values
  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PUBLISHED: 'bg-green-100 text-green-700',
    ARCHIVED: 'bg-yellow-100 text-yellow-700',
  };
  
  // Combine questions from test.questions and all sections
  const sectionQuestions = (test.sections || []).flatMap(s => s.questions || []);
  const directQuestions = test.questions || [];
  const questions = [...directQuestions, ...sectionQuestions];
  const sections = test.sections || [];

  // Get weightage for each section - use stored value or calculate fallback
  const getSectionWeightage = (section: typeof sections[0]) => {
    // Use stored weightage if available
    if (section.weightage !== undefined && section.weightage !== null) {
      return section.weightage;
    }
    // Fallback: calculate from points
    const totalPoints = sections.reduce((sum, s) => 
      sum + (s.questions || []).reduce((qSum, q) => qSum + (q.points || 1), 0), 0
    );
    const sectionPoints = (section.questions || []).reduce((sum, q) => sum + (q.points || 1), 0);
    return totalPoints > 0 ? Math.round((sectionPoints / totalPoints) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
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
            <h1 className="text-3xl font-bold tracking-tight">{test.name}</h1>
            <Badge className={statusColors[test.status] || 'bg-gray-100 text-gray-700'}>
              {test.status}
            </Badge>
            <Badge variant="outline">{test.category || 'General'}</Badge>
          </div>
          {test.description ? (
            <div 
              className="text-muted-foreground mt-2 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: test.description }}
            />
          ) : (
            <p className="text-muted-foreground mt-2">No description provided</p>
          )}
        </div>
        <div className="flex gap-2">
          {test.status === 'DRAFT' && (
            <Button 
              variant="outline" 
              onClick={handlePublishTest}
              disabled={isPublishing || totalQuestions === 0}
            >
              <Rocket className="h-4 w-4 mr-2" />
              {isPublishing ? 'Publishing...' : 'Publish'}
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push(`/hr/assessments/tests/${testId}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4 mr-2" /> Preview Test
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            onClick={() => router.push(`/hr/assessments/invite?testId=${testId}`)}
            disabled={test.status !== 'PUBLISHED'}
          >
            <Send className="h-4 w-4 mr-2" />
            Invite Candidates
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <FileQuestion className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalQuestions}</p>
                <p className="text-sm text-muted-foreground">Questions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{test.duration}</p>
                <p className="text-sm text-muted-foreground">Minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{test.invitationsCount || 0}</p>
                <p className="text-sm text-muted-foreground">Invitations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgScore}%</p>
                <p className="text-sm text-muted-foreground">Avg. Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100">
                <Award className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{attempts.length > 0 ? Math.round((passedCount / attempts.length) * 100) : 0}%</p>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="attempts">Attempts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* Overview Tab */}
          <TabsContent value="overview" className="m-0 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Test Info Card - Enhanced */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4 border-b bg-muted rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Test Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="h-4 w-4 text-blue-600" />
                        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Points</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{totalPoints}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Passing Score</p>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{test.passingScore}%</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-purple-600" />
                        <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Difficulty</p>
                      </div>
                      <p className="text-lg font-semibold text-purple-900">{test.difficulty}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Created On</p>
                      </div>
                      <p className="text-lg font-semibold text-orange-900">{format(new Date(test.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions Card - Enhanced */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4 border-b bg-muted rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <CardTitle className="text-lg">Instructions for Candidates</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  {test.instructions ? (
                    <div 
                      className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: test.instructions }}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">No instructions provided</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sections - Enhanced */}
            {sections.length > 0 && (
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4 border-b bg-muted rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-100">
                        <ListChecks className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Test Sections</CardTitle>
                        <CardDescription className="mt-1">This test is divided into {sections.length} sections</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0)} Total Questions
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="space-y-4">
                    {sections.map((section, index) => (
                      <div key={section.id} className="group relative flex items-center gap-4 p-5 border rounded-xl bg-gradient-to-r from-white to-slate-50 hover:from-primary/5 hover:to-primary/10 hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white font-bold text-lg shadow-md">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{section.name}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{section.description || 'No description'}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center px-4 py-2 rounded-lg bg-blue-50 border border-blue-100">
                            <p className="text-xl font-bold text-blue-700">{section.questions?.length || 0}</p>
                            <p className="text-xs text-blue-600 font-medium">Questions</p>
                          </div>
                          <div className="text-center px-4 py-2 rounded-lg bg-green-50 border border-green-100">
                            <p className="text-xl font-bold text-green-700">{getSectionWeightage(section)}%</p>
                            <p className="text-xs text-green-600 font-medium">Weightage</p>
                          </div>
                          {section.timeLimit && (
                            <div className="text-center px-4 py-2 rounded-lg bg-purple-50 border border-purple-100">
                              <p className="text-xl font-bold text-purple-700">{section.timeLimit}<span className="text-sm">m</span></p>
                              <p className="text-xs text-purple-600 font-medium">Duration</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Attempts - Enhanced */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b bg-muted rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-100">
                    <Users className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Recent Attempts</CardTitle>
                    <CardDescription className="mt-1">Latest 5 test submissions</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('attempts')} className="gap-2">
                  View All
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Candidate</TableHead>
                      <TableHead className="font-semibold">Submitted</TableHead>
                      <TableHead className="font-semibold">Duration</TableHead>
                      <TableHead className="text-center font-semibold">Score</TableHead>
                      <TableHead className="text-center font-semibold">Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.slice(0, 5).map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className={`${getAvatarColor((attempt.candidateEmail || '') + (attempt.candidateName || '')).className} font-semibold`}>
                                {(attempt.candidateName || 'C').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{attempt.candidateName}</p>
                              <p className="text-sm text-muted-foreground">{attempt.candidateEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {attempt.completedAt ? format(new Date(attempt.completedAt), 'MMM d, h:mm a') : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">{Math.round((attempt.timeTaken || 0) / 60)} min</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={attempt.score} className="w-16 h-2" />
                            <span className="font-medium">{Number(attempt.score).toFixed(2)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {attempt.passed ? (
                            <Badge className="bg-green-100 text-green-700">Passed</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">Failed</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questions Tab - Enhanced */}
          <TabsContent value="questions" className="m-0">
            <Card className="shadow-sm">
              <CardHeader className="pb-4 border-b bg-muted rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-100">
                      <FileQuestion className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Questions ({questions.length})</CardTitle>
                      <CardDescription className="mt-1">All questions included in this test</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Easy: {questions.filter(q => q.difficulty === 'EASY').length}
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      Medium: {questions.filter(q => q.difficulty === 'MEDIUM').length}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Hard: {questions.filter(q => q.difficulty === 'HARD').length}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {questions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No questions added yet</p>
                    <p className="text-sm">Add questions to this test via the Edit page</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.map((question, index) => {
                      const TypeIcon = typeIcons[question.type] || FileQuestion;
                      return (
                        <div key={question.id} className="group flex items-center gap-4 p-4 border rounded-xl bg-white hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent hover:border-primary/30 transition-all">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold">
                            {index + 1}
                          </div>
                          <div className="p-2.5 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 border">
                            <TypeIcon className="h-4 w-4 text-slate-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{question.question}</p>
                            <p className="text-xs text-muted-foreground mt-1">{typeLabels[question.type] || question.type}</p>
                          </div>
                          <div className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                            {question.points} pts
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => router.push(`/hr/assessments/questions/${question.id}`)}
                            title="View question details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attempts Tab - Enhanced */}
          <TabsContent value="attempts" className="m-0">
            <Card className="shadow-sm">
              <CardHeader className="pb-4 border-b bg-muted rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-100">
                      <Users className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">All Attempts ({attempts.length})</CardTitle>
                      <CardDescription className="mt-1">Complete list of test submissions</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" /> Passed: {passedCount}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      <XCircle className="h-3 w-3 mr-1" /> Failed: {attempts.length - passedCount}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Candidate</TableHead>
                      <TableHead className="font-semibold">Submitted</TableHead>
                      <TableHead className="font-semibold">Duration</TableHead>
                      <TableHead className="text-center font-semibold">Score</TableHead>
                      <TableHead className="text-center font-semibold">Result</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((attempt) => (
                      <TableRow key={attempt.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                              <AvatarFallback className={`${getAvatarColor((attempt.candidateEmail || '') + (attempt.candidateName || '')).className} font-semibold`}>
                                {(attempt.candidateName || 'C').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{attempt.candidateName}</p>
                              <p className="text-sm text-muted-foreground">{attempt.candidateEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {attempt.completedAt ? format(new Date(attempt.completedAt), 'MMM d, yyyy h:mm a') : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {Math.round((attempt.timeTaken || 0) / 60)} min
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <div className="relative w-20 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`absolute left-0 top-0 h-full rounded-full ${attempt.score >= 70 ? 'bg-green-500' : attempt.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${attempt.score}%` }}
                              />
                            </div>
                            <span className={`font-semibold ${attempt.score >= 70 ? 'text-green-600' : attempt.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{Number(attempt.score).toFixed(2)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {attempt.passed ? (
                            <Badge className="bg-green-100 text-green-700 border-0 gap-1">
                              <CheckCircle className="h-3 w-3" /> Passed
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border-0 gap-1">
                              <XCircle className="h-3 w-3" /> Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/hr/assessments/results/${attempt.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab - Enhanced */}
          <TabsContent value="analytics" className="m-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Score Distribution Card */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4 border-b bg-muted rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <BarChart3 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <CardTitle className="text-lg">Score Distribution</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  {attempts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No attempts yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { range: '90-100%', count: attempts.filter(a => a.score >= 90).length, color: 'from-green-500 to-green-400', bg: 'bg-green-50' },
                        { range: '80-89%', count: attempts.filter(a => a.score >= 80 && a.score < 90).length, color: 'from-emerald-500 to-emerald-400', bg: 'bg-emerald-50' },
                        { range: '70-79%', count: attempts.filter(a => a.score >= 70 && a.score < 80).length, color: 'from-yellow-500 to-yellow-400', bg: 'bg-yellow-50' },
                        { range: '60-69%', count: attempts.filter(a => a.score >= 60 && a.score < 70).length, color: 'from-orange-500 to-orange-400', bg: 'bg-orange-50' },
                        { range: '0-59%', count: attempts.filter(a => a.score < 60).length, color: 'from-red-500 to-red-400', bg: 'bg-red-50' },
                      ].map((item) => (
                        <div key={item.range} className="flex items-center gap-4">
                          <span className="w-20 text-sm font-medium text-gray-700">{item.range}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
                            <div
                              className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                              style={{ width: `${attempts.length > 0 ? Math.max((item.count / attempts.length) * 100, item.count > 0 ? 5 : 0) : 0}%` }}
                            />
                          </div>
                          <div className={`w-10 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                            <span className="text-sm font-bold text-gray-700">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Time Analysis Card */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4 border-b bg-muted rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Clock className="h-5 w-5 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">Time Analysis</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  {attempts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No attempt data yet</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100">
                          <div className="p-2 rounded-full bg-cyan-100 w-fit mx-auto mb-2">
                            <TrendingUp className="h-4 w-4 text-cyan-600" />
                          </div>
                          <p className="text-2xl font-bold text-cyan-700">{Math.round(Math.min(...attempts.map((a) => a.timeTaken || 0)) / 60)}m</p>
                          <p className="text-xs text-cyan-600 font-medium mt-1">Fastest</p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
                          <div className="p-2 rounded-full bg-purple-100 w-fit mx-auto mb-2">
                            <Clock className="h-4 w-4 text-purple-600" />
                          </div>
                          <p className="text-2xl font-bold text-purple-700">{avgDuration}m</p>
                          <p className="text-xs text-purple-600 font-medium mt-1">Average</p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100">
                          <div className="p-2 rounded-full bg-orange-100 w-fit mx-auto mb-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                          </div>
                          <p className="text-2xl font-bold text-orange-700">{Math.round(Math.max(...attempts.map((a) => a.timeTaken || 0)) / 60)}m</p>
                          <p className="text-xs text-orange-600 font-medium mt-1">Slowest</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Total Test Duration</p>
                        <p className="text-3xl font-bold text-primary">{test.duration} <span className="text-lg">minutes</span></p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Question Performance Card */}
              <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4 border-b bg-muted rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-rose-100">
                        <FileQuestion className="h-5 w-5 text-rose-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Question Performance</CardTitle>
                        <CardDescription className="mt-1">Success rate per question</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-muted-foreground">≥70%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-muted-foreground">50-69%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-muted-foreground">&lt;50%</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  {questionPerformance.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileQuestion className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No questions in this test</p>
                    </div>
                  ) : attempts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No attempts yet - data will appear after candidates complete the test</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {questionPerformance.map((qp) => {
                        const barColor = qp.successRate >= 70 ? 'from-green-500 to-green-400' : qp.successRate >= 50 ? 'from-yellow-500 to-yellow-400' : 'from-red-500 to-red-400';
                        const textColor = qp.successRate >= 70 ? 'text-green-600' : qp.successRate >= 50 ? 'text-yellow-600' : 'text-red-600';
                        const bgColor = qp.successRate >= 70 ? 'bg-green-50' : qp.successRate >= 50 ? 'bg-yellow-50' : 'bg-red-50';
                        return (
                          <div key={qp.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                              Q{qp.index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm line-clamp-1 font-medium">{qp.question}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                                    style={{ width: `${qp.successRate}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {qp.correctCount}/{qp.attemptedCount} correct
                                </span>
                              </div>
                            </div>
                            <div className={`px-3 py-1.5 rounded-lg ${bgColor}`}>
                              <span className={`text-sm font-bold ${textColor}`}>{qp.successRate}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab - Enhanced */}
          <TabsContent value="settings" className="m-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Display Settings */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4 border-b bg-muted rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Settings className="h-5 w-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">Display Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-1">
                  {[
                    { label: 'Shuffle Questions', value: test.shuffleQuestions, desc: 'Randomize question order' },
                    { label: 'Shuffle Options', value: test.shuffleOptions, desc: 'Randomize answer choices' },
                    { label: 'Show Results After Submission', value: test.showResults, desc: 'Display results to candidate' },
                    { label: 'Fullscreen Mode', value: test.fullscreen, desc: 'Require fullscreen during test' },
                  ].map((setting) => (
                    <div key={setting.label} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{setting.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{setting.desc}</p>
                      </div>
                      {setting.value ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-semibold text-green-700">Enabled</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
                          <XCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-500">Disabled</span>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Retake Settings */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4 border-b bg-muted rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100">
                      <Award className="h-5 w-5 text-amber-600" />
                    </div>
                    <CardTitle className="text-lg">Retake Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                      <div>
                        <p className="font-medium text-gray-900">Allow Retake</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Let candidates retry the test</p>
                      </div>
                      {test.maxAttempts > 1 ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-semibold text-green-700">Enabled</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
                          <XCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-500">Disabled</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-center">
                      <p className="text-sm text-muted-foreground mb-2">Maximum Attempts Allowed</p>
                      <p className="text-4xl font-bold text-blue-700">{test.maxAttempts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Proctoring Settings */}
              <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4 border-b bg-muted rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100">
                      <Eye className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Proctoring & Security</CardTitle>
                      <CardDescription className="mt-1">Anti-cheating measures enabled for this test</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Proctoring Enabled', value: test.proctoring, icon: Eye },
                      { label: 'Tab Switch Detection', value: test.tabSwitchLimit > 0, icon: ExternalLink },
                      { label: 'Fullscreen Required', value: test.fullscreen, icon: Copy },
                      { label: 'Webcam Required', value: test.webcamRequired, icon: Send },
                    ].map((setting) => (
                      <div
                        key={setting.label}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          setting.value
                            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className={`p-2.5 rounded-full w-fit mx-auto mb-3 ${
                          setting.value ? 'bg-green-100' : 'bg-gray-200'
                        }`}>
                          {setting.value ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <p className={`text-sm font-medium ${
                          setting.value ? 'text-green-800' : 'text-gray-500'
                        }`}>
                          {setting.label}
                        </p>
                        <p className={`text-xs mt-1 ${
                          setting.value ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {setting.value ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Preview Test Dialog */}
      <PreviewTestDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        testData={getPreviewTestData()}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{test.name}&quot;? This action cannot be undone.
              {(test.invitationsCount || 0) > 0 && (
                <span className="block mt-2 text-red-500">
                  Warning: This test has {test.invitationsCount} invitations. Tests with completed or in-progress assessments cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTest}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
