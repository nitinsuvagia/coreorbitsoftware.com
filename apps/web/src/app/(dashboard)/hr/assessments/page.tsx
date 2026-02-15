'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { getAvatarColor } from '@/lib/format';
import { assessmentApi, BankQuestion, AssessmentQuestionType, AssessmentDifficulty, questionTypeLabels, difficultyLabels, AssessmentInvitation } from '@/lib/api/assessments';
import { apiClient } from '@/lib/api/client';
import { AIImportDialog } from '@/components/assessments/ai-import-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ClipboardList,
  FileText,
  Users,
  BarChart3,
  Plus,
  PlusCircle,
  Search,
  MoreVertical,
  MoreHorizontal,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Copy,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileQuestion,
  Code,
  ListChecks,
  Type,
  Upload,
  ToggleLeft,
  Filter,
  Download,
  Mail,
  RefreshCw,
  TrendingUp,
  Award,
  Timer,
  Brain,
  Calendar,
  CalendarClock,
  Play,
  UserPlus,
  Sunrise,
  Sun,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================

// Question Types - using API enum values
const questionTypes = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: ListChecks },
  { value: 'MULTIPLE_SELECT', label: 'Multi Select', icon: ListChecks },
  { value: 'TRUE_FALSE', label: 'True/False', icon: ToggleLeft },
  { value: 'SHORT_ANSWER', label: 'Short Answer', icon: Type },
  { value: 'ESSAY', label: 'Long Answer', icon: FileText },
  { value: 'CODING', label: 'Coding', icon: Code },
];

const difficultyColors: Record<string, string> = {
  EASY: 'bg-green-100 text-green-700',
  easy: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  medium: 'bg-yellow-100 text-yellow-700',
  HARD: 'bg-red-100 text-red-700',
  hard: 'bg-red-100 text-red-700',
  EXPERT: 'bg-purple-100 text-purple-700',
};

// Mock Tests
const mockTests = [
  {
    id: '1',
    name: 'Frontend Developer Assessment',
    description: 'Comprehensive test for React and JavaScript skills',
    type: 'Technical',
    status: 'published',
    duration: 60,
    totalQuestions: 25,
    totalPoints: 100,
    passingScore: 70,
    attempts: 45,
    avgScore: 72,
    createdAt: new Date('2024-01-01'),
    createdBy: 'John Doe',
  },
  {
    id: '2',
    name: 'Backend Developer Assessment',
    description: 'Node.js, databases, and API design',
    type: 'Technical',
    status: 'published',
    duration: 90,
    totalQuestions: 30,
    totalPoints: 150,
    passingScore: 65,
    attempts: 32,
    avgScore: 68,
    createdAt: new Date('2024-01-05'),
    createdBy: 'Jane Smith',
  },
  {
    id: '3',
    name: 'General Aptitude Test',
    description: 'Logical reasoning and problem-solving',
    type: 'Aptitude',
    status: 'draft',
    duration: 45,
    totalQuestions: 40,
    totalPoints: 80,
    passingScore: 60,
    attempts: 0,
    avgScore: 0,
    createdAt: new Date('2024-01-10'),
    createdBy: 'John Doe',
  },
  {
    id: '4',
    name: 'DevOps Engineer Assessment',
    description: 'CI/CD, Docker, Kubernetes, and cloud services',
    type: 'Technical',
    status: 'published',
    duration: 75,
    totalQuestions: 20,
    totalPoints: 100,
    passingScore: 70,
    attempts: 18,
    avgScore: 65,
    createdAt: new Date('2024-01-08'),
    createdBy: 'Mike Johnson',
  },
];

// Mock Invitations
const mockInvitations = [
  {
    id: '1',
    candidateName: 'Alice Johnson',
    candidateEmail: 'alice@example.com',
    testName: 'Frontend Developer Assessment',
    status: 'completed',
    invitedAt: new Date('2024-01-10'),
    startedAt: new Date('2024-01-11T10:00:00'),
    submittedAt: new Date('2024-01-11T10:55:00'),
    expiresAt: new Date('2024-01-17'),
    score: 85,
    passed: true,
    assessmentCode: 'A3K9X2M7P1B4',
  },
  {
    id: '2',
    candidateName: 'Bob Smith',
    candidateEmail: 'bob@example.com',
    testName: 'Backend Developer Assessment',
    status: 'in_progress',
    invitedAt: new Date('2024-01-12'),
    startedAt: new Date('2024-01-13T14:30:00'),
    submittedAt: null,
    expiresAt: new Date('2024-01-19'),
    score: null,
    passed: null,
    assessmentCode: 'B7N2L5Q8R3V1',
  },
  {
    id: '3',
    candidateName: 'Carol Davis',
    candidateEmail: 'carol@example.com',
    testName: 'Frontend Developer Assessment',
    status: 'invited',
    invitedAt: new Date('2024-01-14'),
    startedAt: null,
    submittedAt: null,
    expiresAt: new Date('2024-01-21'),
    score: null,
    passed: null,
    assessmentCode: 'C4W8Y1Z6H9J2',
  },
  {
    id: '4',
    candidateName: 'David Wilson',
    candidateEmail: 'david@example.com',
    testName: 'DevOps Engineer Assessment',
    status: 'expired',
    invitedAt: new Date('2024-01-01'),
    startedAt: null,
    submittedAt: null,
    expiresAt: new Date('2024-01-08'),
    score: null,
    passed: null,
    assessmentCode: 'D6T3U9F2G5K8',
  },
  {
    id: '5',
    candidateName: 'Emma Brown',
    candidateEmail: 'emma@example.com',
    testName: 'General Aptitude Test',
    status: 'completed',
    invitedAt: new Date('2024-01-08'),
    startedAt: new Date('2024-01-09T09:00:00'),
    submittedAt: new Date('2024-01-09T09:42:00'),
    expiresAt: new Date('2024-01-15'),
    score: 55,
    passed: false,
    assessmentCode: 'E1P4S7T2M8X3',
  },
];

// Mock Scheduled Tests for Today & Tomorrow
const today = new Date();
const tomorrow = addDays(today, 1);

const mockScheduledTests = [
  // Today's tests
  {
    id: 's1',
    testName: 'Frontend Developer Assessment',
    testId: '1',
    candidateName: 'John Miller',
    candidateEmail: 'john.miller@example.com',
    position: 'Senior Frontend Developer',
    scheduledDate: today,
    scheduledTime: '09:00 AM',
    duration: 60,
    status: 'completed',
    score: 82,
    passed: true,
    isToday: true,
    assessmentCode: 'F2H5K8L1N4Q7',
  },
  {
    id: 's2',
    testName: 'React Skills Test',
    testId: '1',
    candidateName: 'Sarah Connor',
    candidateEmail: 'sarah.c@example.com',
    position: 'React Developer',
    scheduledDate: today,
    scheduledTime: '10:30 AM',
    duration: 45,
    status: 'running',
    startedAt: new Date(today.setHours(10, 30, 0, 0)),
    timeRemaining: 23,
    isToday: true,
    assessmentCode: 'G3J6M9P2R5T8',
  },
  {
    id: 's3',
    testName: 'Backend Developer Assessment',
    testId: '2',
    candidateName: 'Mike Johnson',
    candidateEmail: 'mike.j@example.com',
    position: 'Node.js Developer',
    scheduledDate: today,
    scheduledTime: '02:00 PM',
    duration: 90,
    status: 'scheduled',
    isToday: true,
    assessmentCode: 'H4L7N1Q3S6V9',
  },
  {
    id: 's4',
    testName: 'DevOps Engineer Assessment',
    testId: '4',
    candidateName: 'Lisa Wang',
    candidateEmail: 'lisa.wang@example.com',
    position: 'DevOps Engineer',
    scheduledDate: today,
    scheduledTime: '03:30 PM',
    duration: 75,
    status: 'invited',
    invitedAt: new Date(),
    isToday: true,
    assessmentCode: 'J5M8P2R4T7W1',
  },
  {
    id: 's5',
    testName: 'General Aptitude Test',
    testId: '3',
    candidateName: 'Tom Anderson',
    candidateEmail: 'tom.a@example.com',
    position: 'Graduate Trainee',
    scheduledDate: today,
    scheduledTime: '04:30 PM',
    duration: 45,
    status: 'scheduled',
    isToday: true,
    assessmentCode: 'K6N9Q3S5U8X2',
  },
  // Tomorrow's tests
  {
    id: 's6',
    testName: 'Frontend Developer Assessment',
    testId: '1',
    candidateName: 'Emily Chen',
    candidateEmail: 'emily.chen@example.com',
    position: 'Frontend Developer',
    scheduledDate: tomorrow,
    scheduledTime: '09:30 AM',
    duration: 60,
    status: 'scheduled',
    isToday: false,
    assessmentCode: 'L7P1R4T6V9Y3',
  },
  {
    id: 's7',
    testName: 'Backend Developer Assessment',
    testId: '2',
    candidateName: 'Alex Turner',
    candidateEmail: 'alex.t@example.com',
    position: 'Senior Backend Developer',
    scheduledDate: tomorrow,
    scheduledTime: '11:00 AM',
    duration: 90,
    status: 'invited',
    invitedAt: new Date(),
    isToday: false,
    assessmentCode: 'M8Q2S5U7W1Z4',
  },
  {
    id: 's8',
    testName: 'Full Stack Assessment',
    testId: '1',
    candidateName: 'Rachel Green',
    candidateEmail: 'rachel.g@example.com',
    position: 'Full Stack Developer',
    scheduledDate: tomorrow,
    scheduledTime: '02:00 PM',
    duration: 120,
    status: 'scheduled',
    isToday: false,
    assessmentCode: 'N9R3T6V8X2A5',
  },
  {
    id: 's9',
    testName: 'DevOps Engineer Assessment',
    testId: '4',
    candidateName: 'Chris Wilson',
    candidateEmail: 'chris.w@example.com',
    position: 'Cloud Engineer',
    scheduledDate: tomorrow,
    scheduledTime: '03:30 PM',
    duration: 75,
    status: 'invited',
    invitedAt: new Date(),
    isToday: false,
    assessmentCode: 'P1S4U7W9Y3B6',
  },
];

// ============================================================================
// STATS CARDS COMPONENT
// ============================================================================

function StatsCards() {
  const router = useRouter();
  const [stats, setStats] = useState({
    todaysTests: 0,
    runningNow: 0,
    pendingInvitations: 0,
    passRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const analytics = await assessmentApi.getOverallAnalytics();
        const current = await assessmentApi.getCurrentAssessments();
        const today = startOfDay(new Date());
        
        const todaysTests = current.filter(c => {
          const date = startOfDay(new Date(c.validFrom));
          return date.getTime() === today.getTime();
        }).length;
        
        const runningNow = current.filter(c => 
          c.status === 'STARTED' || c.result?.status === 'IN_PROGRESS'
        ).length;

        setStats({
          todaysTests,
          runningNow,
          pendingInvitations: analytics.pendingInvitations || 0,
          passRate: analytics.passRate || 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statItems = [
    { label: 'Today\'s Tests', value: loading ? '-' : stats.todaysTests, icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50', showInviteBtn: false },
    { label: 'Running Now', value: loading ? '-' : stats.runningNow, icon: Play, color: 'text-green-600', bgColor: 'bg-green-50', showInviteBtn: false },
    { label: 'Pending Invites', value: loading ? '-' : stats.pendingInvitations, icon: Mail, color: 'text-orange-600', bgColor: 'bg-orange-50', showInviteBtn: true },
    { label: 'Avg. Pass Rate', value: loading ? '-' : `${Math.round(stats.passRate)}%`, icon: TrendingUp, color: 'text-purple-600', bgColor: 'bg-purple-50', showInviteBtn: false },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statItems.map((stat) => (
        <Card key={stat.label} className={stat.showInviteBtn ? 'relative' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className="flex items-center gap-2">
                {stat.showInviteBtn && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 rounded-full hover:bg-orange-100"
                    onClick={() => router.push('/hr/assessments/invite')}
                    title="Invite Candidates"
                  >
                    <PlusCircle className="h-6 w-6 text-orange-600" />
                  </Button>
                )}
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// ASSESSMENT CODE DISPLAY COMPONENT
// ============================================================================

function AssessmentCodeDisplay({ code }: { code: string }) {
  const [isVisible, setIsVisible] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 rounded-md border text-sm font-mono">
      <span className="text-muted-foreground">Code:</span>
      <span className="flex-1 tracking-wider">
        {isVisible ? code : '••••••••••••'}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setIsVisible(!isVisible)}
        title={isVisible ? 'Hide code' : 'Show code'}
      >
        {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleCopy}
        title="Copy code"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ============================================================================
// CURRENT TAB (Today & Tomorrow)
// ============================================================================

import { MonitorDialog } from './_components/MonitorDialog';
import { 
  SendReminderDialog, 
  EditScheduleDialog, 
  ResendInvitationDialog, 
  CopyLinkButton 
} from './_components/ScheduleActionsDialogs';

// Type for displayed current assessments - matching ScheduledTest for dialog compatibility
interface CurrentTestDisplay {
  id: string;
  testId: string;
  testName: string;
  candidateName: string;
  candidateEmail: string;
  position: string;
  scheduledDate: Date;
  scheduledTime: string;
  duration: number;
  status: string;
  score?: number;
  passed?: boolean;
  isToday: boolean;
  assessmentCode: string;
  timeRemaining?: number;
  startedAt?: Date;
  invitedAt?: Date;
  resultId?: string;
}

function CurrentTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<CurrentTestDisplay[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [monitorDialogOpen, setMonitorDialogOpen] = useState(false);
  const [selectedTestForMonitor, setSelectedTestForMonitor] = useState<CurrentTestDisplay | null>(null);
  
  // Dialog states for scheduled tests
  const [sendReminderOpen, setSendReminderOpen] = useState(false);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);
  const [selectedTestForReminder, setSelectedTestForReminder] = useState<CurrentTestDisplay | null>(null);
  const [selectedTestForEdit, setSelectedTestForEdit] = useState<CurrentTestDisplay | null>(null);
  
  // Dialog states for invited tests
  const [resendInvitationOpen, setResendInvitationOpen] = useState(false);
  const [selectedTestForResend, setSelectedTestForResend] = useState<CurrentTestDisplay | null>(null);

  // Fetch current assessments from API
  const fetchCurrentAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await assessmentApi.getCurrentAssessments();
      const today = startOfDay(new Date());
      const tomorrowDate = addDays(today, 1);
      
      // Transform API data to display format
      const transformed: CurrentTestDisplay[] = data.map((item) => {
        const validFrom = new Date(item.validFrom);
        const isToday = startOfDay(validFrom).getTime() === today.getTime();
        const isTomorrow = startOfDay(validFrom).getTime() === tomorrowDate.getTime();
        
        // Calculate status
        let status: 'scheduled' | 'running' | 'invited' | 'completed' = 'invited';
        let timeRemaining: number | undefined;
        
        // Check for completed status (including TERMINATED and TIMED_OUT)
        if (
          item.status === 'COMPLETED' || 
          item.result?.status === 'COMPLETED' ||
          item.result?.status === 'TERMINATED' ||
          item.result?.status === 'TIMED_OUT'
        ) {
          status = 'completed';
        } else if (item.status === 'STARTED' || item.result?.status === 'IN_PROGRESS') {
          status = 'running';
          // Calculate time remaining with decimal precision
          if (item.result?.startedAt) {
            const startTime = new Date(item.result.startedAt);
            const elapsedMinutes = (Date.now() - startTime.getTime()) / 60000;
            timeRemaining = Math.max(0, item.test.duration - elapsedMinutes);
          }
        } else if (item.status === 'PENDING' || item.status === 'SENT') {
          status = validFrom > new Date() ? 'scheduled' : 'invited';
        }
        
        return {
          id: item.id,
          testId: item.testId,
          testName: item.test.name,
          candidateName: item.candidateName,
          candidateEmail: item.candidateEmail,
          position: item.candidate?.job?.title || 'Candidate',
          scheduledDate: validFrom,
          scheduledTime: format(validFrom, 'hh:mm a'),
          duration: item.test.duration,
          status,
          score: item.result?.score,
          passed: item.result?.passed,
          isToday: isToday || isTomorrow,
          assessmentCode: item.assessmentCode,
          timeRemaining,
          startedAt: item.result?.startedAt ? new Date(item.result.startedAt) : undefined,
          invitedAt: item.emailSentAt ? new Date(item.emailSentAt) : new Date(item.createdAt),
          resultId: item.result?.id,
        };
      });
      
      // Filter to show only today and tomorrow
      const filtered = transformed.filter((t) => {
        const testDate = startOfDay(t.scheduledDate);
        return testDate.getTime() === today.getTime() || testDate.getTime() === tomorrowDate.getTime();
      });
      
      setAssessments(filtered);
    } catch (error) {
      console.error('Failed to fetch current assessments:', error);
      toast.error('Failed to load current assessments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentAssessments();
    
    // Refresh every 30 seconds to get updated data
    const refreshInterval = setInterval(() => {
      fetchCurrentAssessments();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [fetchCurrentAssessments]);

  // Update remaining times every second for running tests
  useEffect(() => {
    const timer = setInterval(() => {
      setAssessments(prev => prev.map(test => {
        if (test.status === 'running' && test.startedAt) {
          const elapsedMinutes = (Date.now() - test.startedAt.getTime()) / 60000;
          const newTimeRemaining = Math.max(0, test.duration - elapsedMinutes);
          return { ...test, timeRemaining: newTimeRemaining };
        }
        return test;
      }));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Filter assessments
  const filteredTests = assessments.filter((test) => {
    if (statusFilter !== 'all' && test.status !== statusFilter) return false;
    return true;
  });

  const todayTests = filteredTests.filter((t) => {
    const testDate = startOfDay(t.scheduledDate);
    return testDate.getTime() === startOfDay(new Date()).getTime();
  });
  
  const tomorrowTests = filteredTests.filter((t) => {
    const testDate = startOfDay(t.scheduledDate);
    return testDate.getTime() === startOfDay(addDays(new Date(), 1)).getTime();
  });

  // Status counts
  const statusCounts = {
    scheduled: assessments.filter((t) => t.status === 'scheduled').length,
    running: assessments.filter((t) => t.status === 'running').length,
    invited: assessments.filter((t) => t.status === 'invited').length,
    completed: assessments.filter((t) => t.status === 'completed').length,
  };

  const getStatusBadge = (status: string, timeRemaining?: number) => {
    switch (status) {
      case 'scheduled':
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <CalendarClock className="h-3 w-3 mr-1" /> Scheduled
          </Badge>
        );
      case 'running':
        const mins = Math.floor(timeRemaining || 0);
        return (
          <Badge className="bg-orange-100 text-orange-700 animate-pulse">
            <Play className="h-3 w-3 mr-1" /> Running {mins > 0 && `(${mins}m left)`}
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" /> Completed
          </Badge>
        );
      case 'invited':
        return (
          <Badge className="bg-purple-100 text-purple-700">
            <Mail className="h-3 w-3 mr-1" /> Invited
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const TestCard = ({ test }: { test: CurrentTestDisplay }) => (
    <Card className={`hover:shadow-md transition-shadow ${test.status === 'running' ? 'border-orange-300 bg-orange-50/30' : ''}`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={`${getAvatarColor((test.candidateEmail || '') + (test.candidateName || '')).className} font-semibold`}>
                {(test.candidateName || 'C').split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{test.candidateName}</p>
              <p className="text-sm text-muted-foreground">{test.position}</p>
            </div>
          </div>
          {getStatusBadge(test.status, test.timeRemaining)}
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{test.testName}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {test.scheduledTime}
            </div>
            <div className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {test.duration} min
            </div>
          </div>
        </div>

        {/* Assessment Code */}
        <div className="mb-3">
          <AssessmentCodeDisplay code={test.assessmentCode} />
        </div>

        {test.status === 'completed' && test.score !== undefined && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/50">
            <Progress value={test.score} className="h-2 flex-1" />
            <span className={`text-sm font-semibold ${test.passed ? 'text-green-600' : 'text-red-600'}`}>
              {Number(test.score).toFixed(2)}%
            </span>
            {test.passed ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
          </div>
        )}

        {test.status === 'running' && (
          <div className="mb-3 p-2 rounded-lg bg-orange-100/50">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-orange-700">In Progress</span>
              <span className="font-medium text-orange-700">
                {Math.floor(test.timeRemaining || 0)}m {Math.floor(((test.timeRemaining || 0) % 1) * 60)}s remaining
              </span>
            </div>
            <Progress value={100 - ((test.timeRemaining || 0) / test.duration) * 100} className="h-2" />
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          {test.status === 'completed' && test.resultId && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => router.push(`/hr/assessments/results/${test.resultId}`)}
            >
              <Eye className="h-4 w-4 mr-1" /> View Results
            </Button>
          )}
          {test.status === 'running' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => {
                setSelectedTestForMonitor(test);
                setMonitorDialogOpen(true);
              }}
            >
              <Eye className="h-4 w-4 mr-1" /> Monitor
            </Button>
          )}
          {test.status === 'scheduled' && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => {
                  setSelectedTestForReminder(test);
                  setSendReminderOpen(true);
                }}
              >
                <Mail className="h-4 w-4 mr-1" /> Send Reminder
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSelectedTestForEdit(test);
                  setEditScheduleOpen(true);
                }}
                title="Edit schedule"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </>
          )}
          {test.status === 'invited' && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => {
                  setSelectedTestForResend(test);
                  setResendInvitationOpen(true);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" /> Resend
              </Button>
              <CopyLinkButton code={test.assessmentCode} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Status Quick Filters - Skeleton */}
      {loading ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg border-2 border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-6 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Today's Tests Skeleton */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-full rounded mb-3" />
                    <div className="flex gap-2 pt-3 border-t">
                      <Skeleton className="h-8 flex-1 rounded" />
                      <Skeleton className="h-8 flex-1 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Tomorrow's Tests Skeleton */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-full rounded mb-3" />
                    <div className="flex gap-2 pt-3 border-t">
                      <Skeleton className="h-8 flex-1 rounded" />
                      <Skeleton className="h-8 flex-1 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
      <>
      {/* Status Quick Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter(statusFilter === 'scheduled' ? 'all' : 'scheduled')}
          className={`p-4 rounded-lg border-2 transition-all ${
            statusFilter === 'scheduled' ? 'border-blue-500 bg-blue-50' : 'border-border hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className={`h-5 w-5 ${statusFilter === 'scheduled' ? 'text-blue-600' : 'text-muted-foreground'}`} />
              <span className="font-medium">Scheduled</span>
            </div>
            <Badge variant="secondary">{statusCounts.scheduled}</Badge>
          </div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'running' ? 'all' : 'running')}
          className={`p-4 rounded-lg border-2 transition-all ${
            statusFilter === 'running' ? 'border-orange-500 bg-orange-50' : 'border-border hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className={`h-5 w-5 ${statusFilter === 'running' ? 'text-orange-600' : 'text-muted-foreground'}`} />
              <span className="font-medium">Running</span>
            </div>
            <Badge variant="secondary" className={statusCounts.running > 0 ? 'bg-orange-100 text-orange-700' : ''}>
              {statusCounts.running}
            </Badge>
          </div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
          className={`p-4 rounded-lg border-2 transition-all ${
            statusFilter === 'completed' ? 'border-green-500 bg-green-50' : 'border-border hover:border-green-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-5 w-5 ${statusFilter === 'completed' ? 'text-green-600' : 'text-muted-foreground'}`} />
              <span className="font-medium">Completed</span>
            </div>
            <Badge variant="secondary">{statusCounts.completed}</Badge>
          </div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'invited' ? 'all' : 'invited')}
          className={`p-4 rounded-lg border-2 transition-all ${
            statusFilter === 'invited' ? 'border-purple-500 bg-purple-50' : 'border-border hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className={`h-5 w-5 ${statusFilter === 'invited' ? 'text-purple-600' : 'text-muted-foreground'}`} />
              <span className="font-medium">Invited</span>
            </div>
            <Badge variant="secondary">{statusCounts.invited}</Badge>
          </div>
        </button>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-4">
        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
            Clear filter
            <XCircle className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Today's Tests */}
      {todayTests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sun className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Today — {format(new Date(), 'EEEE, MMMM d')}</h2>
            <Badge variant="secondary">{todayTests.length} tests</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayTests.map((test) => (
              <TestCard key={test.id} test={test} />
            ))}
          </div>
        </div>
      )}

      {/* Tomorrow's Tests */}
      {tomorrowTests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sunrise className="h-5 w-5 text-orange-400" />
            <h2 className="text-lg font-semibold">Tomorrow — {format(addDays(new Date(), 1), 'EEEE, MMMM d')}</h2>
            <Badge variant="secondary">{tomorrowTests.length} tests</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tomorrowTests.map((test) => (
              <TestCard key={test.id} test={test} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No scheduled tests found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter !== 'all'
                ? 'Try clearing the status filter to see all tests'
                : 'Invite candidates to assessments to get started'}
            </p>
            <Button onClick={() => router.push('/hr/assessments/invite')}>
              <UserPlus className="h-4 w-4 mr-2" /> Invite Candidates
            </Button>
          </CardContent>
        </Card>
      )}
      </>
      )}

      {/* Monitor Dialog */}
      <MonitorDialog
        open={monitorDialogOpen}
        onOpenChange={setMonitorDialogOpen}
        test={selectedTestForMonitor}
      />

      {/* Send Reminder Dialog */}
      <SendReminderDialog
        open={sendReminderOpen}
        onOpenChange={setSendReminderOpen}
        test={selectedTestForReminder}
      />

      {/* Edit Schedule Dialog */}
      <EditScheduleDialog
        open={editScheduleOpen}
        onOpenChange={setEditScheduleOpen}
        test={selectedTestForEdit}
      />

      {/* Resend Invitation Dialog */}
      <ResendInvitationDialog
        open={resendInvitationOpen}
        onOpenChange={setResendInvitationOpen}
        test={selectedTestForResend}
      />
    </div>
  );
}

// ============================================================================
// QUESTION BANK TAB
// ============================================================================

function QuestionBankTab() {
  const router = useRouter();
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<BankQuestion | null>(null);
  const [aiImportDialogOpen, setAiImportDialogOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 20;

  // Fetch questions from API
  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const filters: Record<string, string> = {};
      // Always filter for Question Bank (testId = null) questions only
      filters.testId = 'bank';
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (difficultyFilter !== 'all') filters.difficulty = difficultyFilter.toUpperCase();
      if (categoryFilter !== 'all') filters.category = categoryFilter;
      if (searchQuery) filters.search = searchQuery;
      
      const data = await assessmentApi.getAllQuestions(filters);
      setQuestions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      toast.error('Failed to load questions');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, difficultyFilter, categoryFilter, searchQuery]);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    try {
      const cats = await assessmentApi.getQuestionCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchQuestions();
    fetchCategories();
  }, [fetchQuestions, fetchCategories]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, difficultyFilter, categoryFilter, searchQuery]);

  // Pagination calculations
  const totalQuestions = questions.length;
  const totalPages = Math.ceil(totalQuestions / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const paginatedQuestions = questions.slice(startIndex, endIndex);

  // Delete question handler
  const handleDeleteQuestion = (question: BankQuestion) => {
    setQuestionToDelete(question);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    
    try {
      await assessmentApi.deleteQuestion(questionToDelete.id);
      toast.success('Question deleted successfully');
      fetchQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
      toast.error('Failed to delete question');
    } finally {
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = questionTypes.find((t) => t.value === type);
    return typeConfig?.icon || FileQuestion;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {questionTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="EASY">Easy</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HARD">Hard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(categories || []).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setAiImportDialogOpen(true)}>
          <Brain className="h-4 w-4 mr-2" />
          AI Import
        </Button>
        <Button onClick={() => router.push('/hr/assessments/questions/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {/* AI Import Dialog */}
      <AIImportDialog
        open={aiImportDialogOpen}
        onOpenChange={setAiImportDialogOpen}
        onImportSuccess={() => {
          fetchQuestions();
          fetchCategories();
        }}
      />

      {/* Loading State - Skeleton Table */}
      {loading && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Question</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Difficulty</th>
                  <th className="text-left p-4 font-medium">Category</th>
                  <th className="text-left p-4 font-medium">Points</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-4">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-full max-w-[400px]" />
                          <div className="flex gap-1">
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-5 w-12 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-12 rounded-full" /></td>
                    <td className="p-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Questions Table */}
      {!loading && (questions || []).length > 0 && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium w-12">#</th>
                  <th className="text-left p-4 font-medium">Questions ({totalQuestions})</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Difficulty</th>
                  <th className="text-left p-4 font-medium">Category</th>
                  <th className="text-left p-4 font-medium">Points</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQuestions.map((question, index) => {
                  const TypeIcon = getTypeIcon(question.type);
                  const tags = question.tags || [];
                  const rowNumber = startIndex + index + 1;
                  return (
                    <tr 
                      key={question.id} 
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/hr/assessments/questions/${question.id}`)}
                    >
                      <td className="p-4 text-muted-foreground font-medium">
                        {rowNumber}
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-muted shrink-0">
                              <TypeIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium line-clamp-2">{question.question}</p>
                              {tags.length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {tags.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {questionTypes.find((t) => t.value === question.type)?.label || question.type}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={difficultyColors[question.difficulty || 'MEDIUM']}>
                          {question.difficulty || 'Medium'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-muted-foreground">{question.category || '-'}</span>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className="text-xs">
                          {question.points} pts
                        </Badge>
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); router.push(`/hr/assessments/questions/${question.id}`); }}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); router.push(`/hr/assessments/questions/${question.id}/edit`); }}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onSelect={(e) => { e.preventDefault(); handleDeleteQuestion(question); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, totalQuestions)} of {totalQuestions} questions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first, last, and pages around current
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, idx, arr) => (
                      <React.Fragment key={page}>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="px-1 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    ))
                  }
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {!loading && (questions || []).length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No questions found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || typeFilter !== 'all' || difficultyFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first question'}
            </p>
            <Button onClick={() => router.push('/hr/assessments/questions/new')}>
              <Plus className="h-4 w-4 mr-2" /> Add Question
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question?
              {questionToDelete && (
                <span className="block mt-2 font-medium text-foreground">
                  "{questionToDelete.question}"
                </span>
              )}
              <span className="block mt-2">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setQuestionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteQuestion} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// TESTS TAB
// ============================================================================

interface Test {
  id: string;
  name: string;
  description?: string;
  category?: string;
  status: string;
  difficulty: string;
  duration: number;
  passingScore: number;
  sectionsCount?: number;
  questionsCount?: number;
  invitationsCount?: number;
  createdAt: string;
  createdBy?: string;
}

function TestsTab() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<Test[]>([]);
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch tests from API
  const loadTests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await assessmentApi.getAllTests({
        status: statusFilter !== 'all' ? statusFilter.toUpperCase() as any : undefined,
        search: searchQuery || undefined,
      });
      setTests(data);
    } catch (error) {
      console.error('Failed to load tests:', error);
      toast.error('Failed to load tests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const handleDeleteClick = (test: Test) => {
    setTestToDelete(test);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!testToDelete) return;
    try {
      setIsDeleting(true);
      await assessmentApi.deleteTest(testToDelete.id);
      toast.success('Test deleted successfully');
      loadTests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete test');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setTestToDelete(null);
    }
  };

  const handleInviteClick = (testId: string) => {
    router.push(`/hr/assessments/invite?testId=${testId}`);
  };

  const handlePublishTest = async (testId: string) => {
    try {
      await assessmentApi.publishTest(testId);
      toast.success('Test published successfully');
      loadTests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish test');
    }
  };

  const filteredTests = tests.filter((t) => {
    // Only apply local search filter if needed (API already filters by status and search)
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PUBLISHED':
        return <Badge className="bg-green-100 text-green-700">Published</Badge>;
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-700">Draft</Badge>;
      case 'ARCHIVED':
        return <Badge className="bg-red-100 text-red-700">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => router.push('/hr/assessments/tests/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Test
        </Button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center border-t pt-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j}>
                      <Skeleton className="h-3 w-12 mx-auto mb-2" />
                      <Skeleton className="h-5 w-8 mx-auto" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded" />
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tests Grid */}
      {!loading && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTests.map((test) => (
          <Card 
            key={test.id} 
            className="hover:shadow-md transition-shadow cursor-pointer select-none"
            onClick={() => router.push(`/hr/assessments/tests/${test.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-1">{test.name}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">{test.description}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/hr/assessments/tests/${test.id}`); }}>
                      <Eye className="h-4 w-4 mr-2" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/hr/assessments/tests/${test.id}/edit`); }}>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    {test.status.toUpperCase() === 'DRAFT' && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePublishTest(test.id); }}>
                        <Send className="h-4 w-4 mr-2" /> Publish
                      </DropdownMenuItem>
                    )}
                    {test.status.toUpperCase() === 'PUBLISHED' && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleInviteClick(test.id); }}>
                        <UserPlus className="h-4 w-4 mr-2" /> Invite Candidates
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteClick(test); }}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex gap-2 mt-2">
                {getStatusBadge(test.status)}
                <Badge variant="outline">{test.category || 'General'}</Badge>
                {test.difficulty && (
                  <Badge className={difficultyColors[test.difficulty as keyof typeof difficultyColors] || 'bg-gray-100'}>
                    {test.difficulty}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center border-t pt-4">
                <div>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <FileQuestion className="h-3 w-3" />
                    <span className="text-xs">Questions</span>
                  </div>
                  <p className="font-semibold">{test.questionsCount || 0}</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">Duration</span>
                  </div>
                  <p className="font-semibold">{test.duration}m</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Award className="h-3 w-3" />
                    <span className="text-xs">Pass</span>
                  </div>
                  <p className="font-semibold">{test.passingScore}%</p>
                </div>
              </div>

              {(test.invitationsCount || 0) > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Invitations</span>
                    <span className="font-medium">{test.invitationsCount} sent</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
                <span>{test.category || 'General'}</span>
                <span>{format(new Date(test.createdAt), 'MMM d, yyyy')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {!loading && filteredTests.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No tests found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first test'}
          </p>
          <Button onClick={() => router.push('/hr/assessments/tests/new')}>
            <Plus className="h-4 w-4 mr-2" /> Create Test
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{testToDelete?.name}&quot;? This action cannot be undone.
              {(testToDelete?.invitationsCount || 0) > 0 && (
                <span className="block mt-2 text-red-500">
                  Warning: This test has {testToDelete?.invitationsCount} invitations.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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

// ============================================================================
// SCHEDULED TAB (Future Tests - Day After Tomorrow onwards)
// ============================================================================

import { ViewCandidateDialog } from './_components/ViewCandidateDialog';

function ScheduledTab() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<AssessmentInvitation[]>([]);
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<AssessmentInvitation | null>(null);

  // Fetch invitations from API
  useEffect(() => {
    const loadInvitations = async () => {
      try {
        setLoading(true);
        // Fetch only pending invitations (PENDING, SENT, OPENED, STARTED)
        const data = await assessmentApi.getAllInvitations();
        // Filter for pending/scheduled statuses
        const pendingStatuses = ['PENDING', 'SENT', 'OPENED', 'STARTED'];
        
        // Calculate the date threshold (day after tomorrow at midnight)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        
        const pendingInvitations = data.filter((inv) => {
          // Must have a pending status
          if (!pendingStatuses.includes(inv.status)) return false;
          
          // Must have validFrom date 2+ days in the future (not today or tomorrow)
          if (inv.validFrom) {
            const validFromDate = new Date(inv.validFrom);
            return validFromDate >= dayAfterTomorrow;
          }
          return false;
        });
        setInvitations(pendingInvitations);
      } catch (error) {
        console.error('Failed to load invitations:', error);
        toast.error('Failed to load scheduled tests');
      } finally {
        setLoading(false);
      }
    };
    loadInvitations();
  }, []);

  const filteredInvitations = invitations.filter((inv) => {
    if (
      searchQuery &&
      !inv.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !inv.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'invited' && !['SENT', 'PENDING'].includes(inv.status)) return false;
      if (statusFilter === 'in_progress' && inv.status !== 'STARTED') return false;
    }
    return true;
  });

  const handleViewCandidate = (invitation: AssessmentInvitation) => {
    setSelectedInvitation(invitation);
    setViewDialogOpen(true);
  };

  const handleResendInvitation = (invitation: AssessmentInvitation) => {
    setSelectedInvitation(invitation);
    setResendDialogOpen(true);
  };

  const handleCopyLink = async (code: string) => {
    try {
      const link = `${window.location.origin}/assessment/start?code=${code}`;
      await navigator.clipboard.writeText(link);
      toast.success('Assessment link copied!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  // Convert invitation to the format expected by dialogs
  const convertToDialogFormat = (inv: AssessmentInvitation | null) => {
    if (!inv) return null;
    return {
      id: inv.id,
      testId: inv.testId,
      testName: inv.test?.name || 'Unknown Test',
      candidateName: inv.candidateName,
      candidateEmail: inv.candidateEmail,
      position: inv.candidate?.job?.title || 'Candidate',
      scheduledDate: new Date(inv.validFrom),
      scheduledAt: new Date(inv.validFrom),
      scheduledTime: format(new Date(inv.validFrom), 'hh:mm a'),
      duration: inv.test?.duration || 60,
      status: inv.status.toLowerCase(),
      isToday: false,
      assessmentCode: inv.assessmentCode,
      invitedAt: new Date(inv.createdAt),
      expiresAt: new Date(inv.validUntil),
      score: inv.result?.score ?? undefined,
      passed: inv.result?.passed ?? undefined,
    };
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates, tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {statusFilter === 'all' ? 'All Status' : statusFilter === 'invited' ? 'Invited' : 'In Progress'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>All Status</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('invited')}>Invited</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('in_progress')}>In Progress</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="icon" title="Download">
          <Download className="h-4 w-4" />
        </Button>
        <Button onClick={() => router.push('/hr/assessments/invite')}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Candidates
        </Button>
      </div>

      {/* Loading Skeleton Table */}
      {loading && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Candidate</th>
                  <th className="text-left p-4 font-medium">Test</th>
                  <th className="text-left p-4 font-medium">Code</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Invited</th>
                  <th className="text-left p-4 font-medium">Expires</th>
                  <th className="w-[50px] p-4"></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-4"><Skeleton className="h-6 w-20 rounded" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </td>
                    <td className="p-4"><Skeleton className="h-8 w-8 rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!loading && (
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Candidate</th>
                <th className="text-left p-4 font-medium">Test</th>
                <th className="text-left p-4 font-medium">Code</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Assessment Date</th>
                <th className="text-left p-4 font-medium">Expires</th>
                <th className="w-[50px] p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No scheduled tests found
                  </td>
                </tr>
              ) : (
                filteredInvitations.map((invitation) => (
                  <tr
                    key={invitation.id}
                    className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleViewCandidate(invitation)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={`${getAvatarColor((invitation.candidateEmail || '') + (invitation.candidateName || '')).className} font-semibold`}>
                            {(invitation.candidateName || 'C').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{invitation.candidateName}</p>
                          <p className="text-sm text-muted-foreground">{invitation.candidateEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">{invitation.test?.name || 'Unknown Test'}</span>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <AssessmentCodeDisplay code={invitation.assessmentCode} />
                    </td>
                    <td className="p-4">
                      {invitation.status === 'SENT' || invitation.status === 'PENDING' ? (
                        <Badge className="bg-purple-100 text-purple-700">
                          <Mail className="h-3 w-3 mr-1" /> Invited
                        </Badge>
                      ) : invitation.status === 'OPENED' ? (
                        <Badge className="bg-blue-100 text-blue-700">
                          <Eye className="h-3 w-3 mr-1" /> Opened
                        </Badge>
                      ) : invitation.status === 'STARTED' ? (
                        <Badge className="bg-orange-100 text-orange-700 animate-pulse">
                          <Play className="h-3 w-3 mr-1" /> In Progress
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{invitation.status}</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm font-medium">{format(new Date(invitation.validFrom), 'dd/MM/yyyy')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(invitation.validFrom), 'hh:mm a')}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(invitation.validUntil), 'dd/MM/yyyy')}
                      </span>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewCandidate(invitation); }}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleResendInvitation(invitation); }}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Resend
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(invitation.assessmentCode); }}>
                            <Copy className="h-4 w-4 mr-2" /> Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); }}>
                            <Trash2 className="h-4 w-4 mr-2" /> Revoke
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      )}

      {/* View Candidate Dialog */}
      <ViewCandidateDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        invitation={convertToDialogFormat(selectedInvitation) as any}
        onResend={() => {
          setViewDialogOpen(false);
          setResendDialogOpen(true);
        }}
      />

      {/* Resend Invitation Dialog */}
      <ResendInvitationDialog
        open={resendDialogOpen}
        onOpenChange={setResendDialogOpen}
        test={convertToDialogFormat(selectedInvitation)}
      />
    </div>
  );
}

// ============================================================================
// RESULTS TAB
// ============================================================================

// Type for results display
interface ResultDisplay {
  id: string;
  candidateName: string;
  candidateEmail: string;
  testName: string;
  assessmentCode: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  startedAt: Date | null;
  submittedAt: Date | null;
  timeTaken: number;
  status: string;
}

function ResultsTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ResultDisplay[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'passed' | 'failed'>('all');
  
  // Send Report dialog state
  const [sendReportOpen, setSendReportOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ResultDisplay | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Handle Download Report - navigate to detail page and trigger print
  const handleDownloadReport = (result: ResultDisplay) => {
    // Open the detail page in a new tab with print parameter
    window.open(`/hr/assessments/results/${result.id}?print=true`, '_blank');
  };

  // Handle Send Report - open dialog
  const handleOpenSendReport = (result: ResultDisplay) => {
    setSelectedResult(result);
    setRecipientEmail('');
    setEmailSubject(`Assessment Result: ${result.candidateName} - ${result.testName}`);
    setEmailMessage(
      `Dear Hiring Manager,\n\nPlease find below the assessment result for ${result.candidateName}.\n\nTest: ${result.testName}\nScore: ${Number(result.percentage).toFixed(2)}%\nResult: ${result.passed ? 'PASSED' : 'FAILED'}\n\nCompleted on: ${result.submittedAt ? format(result.submittedAt, 'MMM d, yyyy h:mm a') : 'N/A'}\n\nBest regards,\nHR Team`
    );
    setSendReportOpen(true);
  };

  // Handle Send Email
  const handleSendReport = async () => {
    if (!selectedResult || !recipientEmail) {
      toast.error('Please enter a recipient email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Assessment Result Report</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0;">Candidate Information</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${selectedResult.candidateName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${selectedResult.candidateEmail}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0;">Test Details</h3>
            <p style="margin: 5px 0;"><strong>Test:</strong> ${selectedResult.testName}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${selectedResult.timeTaken} minutes</p>
          </div>
          
          <div style="background: ${selectedResult.passed ? '#dcfce7' : '#fee2e2'}; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h2 style="margin: 0; color: ${selectedResult.passed ? '#16a34a' : '#dc2626'};">
              ${selectedResult.passed ? '✓ PASSED' : '✗ FAILED'}
            </h2>
            <p style="font-size: 32px; font-weight: bold; margin: 10px 0; color: ${selectedResult.passed ? '#16a34a' : '#dc2626'};">
              ${Number(selectedResult.percentage).toFixed(2)}%
            </p>
            <p style="margin: 5px 0;">Score: ${selectedResult.score} / ${selectedResult.maxScore} points</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0;">Timing</h3>
            <p style="margin: 5px 0;"><strong>Started:</strong> ${selectedResult.startedAt ? format(selectedResult.startedAt, 'MMM d, yyyy h:mm a') : 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Completed:</strong> ${selectedResult.submittedAt ? format(selectedResult.submittedAt, 'MMM d, yyyy h:mm a') : 'N/A'}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          
          <div style="white-space: pre-wrap;">${emailMessage.replace(/\n/g, '<br>')}</div>
        </div>
      `;

      const response = await apiClient.post('/api/v1/organization/send-email', {
        to: recipientEmail,
        subject: emailSubject,
        html: htmlContent,
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to send email');
      }

      toast.success('Report sent successfully!');
      setSendReportOpen(false);
    } catch (error) {
      console.error('Failed to send report:', error);
      toast.error('Failed to send report. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Fetch results from API
  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const filters: { passed?: boolean; search?: string } = {};
      if (resultFilter === 'passed') filters.passed = true;
      if (resultFilter === 'failed') filters.passed = false;
      if (searchQuery) filters.search = searchQuery;
      
      const data = await assessmentApi.getAllResults(filters);
      
      // Transform to display format
      const transformed: ResultDisplay[] = data.map((r) => ({
        id: r.id,
        candidateName: r.candidateName,
        candidateEmail: r.candidateEmail,
        testName: r.testName,
        assessmentCode: r.invitationId, // Use invitationId as code fallback
        score: r.obtainedScore,
        maxScore: r.maxScore,
        percentage: r.score,
        passed: r.passed,
        startedAt: r.startedAt ? new Date(r.startedAt) : null,
        submittedAt: r.completedAt ? new Date(r.completedAt) : null,
        timeTaken: r.timeTaken ? Math.round(r.timeTaken / 60) : 0, // Convert seconds to minutes
        status: r.status,
      }));
      
      setResults(transformed);
    } catch (error) {
      console.error('Failed to fetch results:', error);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [resultFilter, searchQuery]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Stats from current results
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const avgScore = results.length > 0 
    ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / results.length)
    : 0;
  const passRate = results.length > 0
    ? Math.round((passedCount / results.length) * 100)
    : 0;

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Results Table Skeleton */}
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Candidate</th>
                  <th className="text-left p-4 font-medium">Test</th>
                  <th className="text-left p-4 font-medium">Score</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Completed</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-2 w-24 rounded" />
                        <Skeleton className="h-4 w-10" />
                      </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{passedCount}</p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{failedCount}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
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
              <div className="p-2 rounded-full bg-purple-100">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{passRate}%</p>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              {resultFilter === 'all' ? 'All Results' : resultFilter === 'passed' ? 'Passed' : 'Failed'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setResultFilter('all')}>All Results</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setResultFilter('passed')}>Passed</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setResultFilter('failed')}>Failed</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="icon">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Candidate</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Test</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Completed</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Duration</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Score</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Result</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No results yet</h3>
                    <p className="text-muted-foreground">Completed test results will appear here</p>
                  </td>
                </tr>
              ) : (
                results.map((result) => (
                  <tr 
                    key={result.id} 
                    className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/hr/assessments/results/${result.id}`)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={`${getAvatarColor((result.candidateEmail || '') + (result.candidateName || '')).className} font-semibold text-sm`}>
                            {(result.candidateName || 'C').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{result.candidateName}</p>
                          <p className="text-sm text-muted-foreground">{result.candidateEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">{result.testName}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-muted-foreground">
                        {result.submittedAt && format(result.submittedAt, 'MMM d, yyyy')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-muted-foreground">{result.timeTaken} min</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(result.percentage).toFixed(2)}%
                        </span>
                        <Progress value={result.percentage} className="h-2 w-16" />
                      </div>
                    </td>
                    <td className="p-4">
                      {result.passed ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" /> Passed
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">
                          <XCircle className="h-3 w-3 mr-1" /> Failed
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/hr/assessments/results/${result.id}`); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadReport(result); }}>
                            <Download className="h-4 w-4 mr-2" />
                            Download Report
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenSendReport(result); }}>
                            <Send className="h-4 w-4 mr-2" />
                            Send Report
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Send Report Dialog */}
      <Dialog open={sendReportOpen} onOpenChange={setSendReportOpen}>
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
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={6}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendReportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendReport} disabled={isSending}>
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
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AssessmentToolPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'current');

  // Sync activeTab with URL search params when navigating back
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    } else if (!tabFromUrl && activeTab !== 'current') {
      setActiveTab('current');
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/hr/assessments?tab=${value}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessment Tool</h1>
          <p className="text-muted-foreground mt-2">
            Manage online assessments, track candidates, and view results
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => router.push('/hr/assessments/analytics')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => router.push('/hr/assessments/invite')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Candidates
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsCards />

      {/* Tabs - Reordered for HR Manager workflow */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="current" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Current</span>
            <span className="sm:hidden">Current</span>
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Scheduled</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Results</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Tests</span>
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-2">
            <FileQuestion className="h-4 w-4" />
            <span className="hidden sm:inline">Question Bank</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="current" className="m-0">
            <CurrentTab />
          </TabsContent>
          <TabsContent value="scheduled" className="m-0">
            <ScheduledTab />
          </TabsContent>
          <TabsContent value="results" className="m-0">
            <ResultsTab />
          </TabsContent>
          <TabsContent value="tests" className="m-0">
            <TestsTab />
          </TabsContent>
          <TabsContent value="questions" className="m-0">
            <QuestionBankTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
