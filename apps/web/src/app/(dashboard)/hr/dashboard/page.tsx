'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { JobDescriptionForm } from '../jobs/_components/JobDescriptionForm';
import type { JobFormData } from '../jobs/_components/JobDescriptionForm';
import { ScheduleInterviewDialog } from '../interviews/_components/ScheduleInterviewDialog';
import { jobApi } from '@/lib/api/jobs';
import { interviewApi, type Interview } from '@/lib/api/interviews';
import { get } from '@/lib/api/client';
import {
  getHRAlerts,
  getProbationContractStatus,
  getLeaveRequestsSummary,
  getUpcomingEvents,
  getRecentActivities,
  getRecruitmentStats,
  getOnboardingStats,
  getExitsStats,
  getDiversityStats,
  getComplianceStats,
  type HRAlert,
  type ProbationContractStatus,
  type LeaveRequestsSummary,
  type UpcomingEvents,
  type RecentActivity,
  type RecruitmentStats,
  type OnboardingStats,
  type ExitsStats,
  type DiversityStats,
  type ComplianceStats,
} from '@/lib/api/hr-dashboard';
import { getInitials, getAvatarColor, cn } from '@/lib/utils';
import {
  Users,
  UserPlus,
  UserMinus,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Calendar,
  Clock,
  Award,
  Target,
  BookOpen,
  AlertCircle,
  CheckCircle,
  DollarSign,
  FileText,
  UserCheck,
  UserX,
  Activity,
  Download,
  RefreshCw,
  ChevronRight,
  GraduationCap,
  Heart,
  ThumbsUp,
  Building2,
  BarChart3,
  PieChart,
  Cake,
  Gift,
  PartyPopper,
  CalendarDays,
  FileWarning,
  Shield,
  AlertTriangle,
  Laptop,
  Monitor,
  Smartphone,
  Headphones,
  Car,
  Key,
  MessageSquareWarning,
  ClipboardCheck,
  UserCog,
  FileCheck,
  FileClock,
  Zap,
  ArrowRight,
  Star,
  MapPin,
  Mail,
  Phone,
  Plus,
  Eye,
  Edit,
  Settings,
  Bell,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Timer,
  Hourglass,
  CircleDot,
  BadgeCheck,
  Layers,
  Code,
  Palette,
  Megaphone,
  LineChart,
  Wrench,
  Package,
  Globe,
  Scale,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ============================================================================
// TYPES
// ============================================================================

interface HRDashboardData {
  // Quick Stats
  overview: {
    totalEmployees: number;
    totalEmployeesTrend: number;
    activeEmployees: number;
    activeEmployeesTrend: number;
    newHiresThisMonth: number;
    newHiresTrend: number;
    avgTenure: number;
    avgTenureTrend: number;
    onProbation: number;
    contractExpiring: number;
    remoteworkers: number;
    departmentCount: number;
  };

  // Today's Overview
  todayOverview: {
    presentToday: number;
    absentToday: number;
    onLeave: number;
    workFromHome: number;
    lateArrivals: number;
    interviewsToday: Array<{
      id: string;
      candidateName: string;
      position: string;
      time: string;
      interviewer: string;
      status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    }>;
    birthdaysToday: Array<{
      id: string;
      name: string;
      department: string;
      avatar?: string;
    }>;
    anniversariesToday: Array<{
      id: string;
      name: string;
      department: string;
      years: number;
      avatar?: string;
    }>;
    probationEnding: Array<{
      id: string;
      name: string;
      department: string;
      endDate: string;
      daysRemaining: number;
    }>;
  };

  // Upcoming Events
  upcomingEvents: {
    birthdays: Array<{
      id: string;
      name: string;
      department: string;
      date: string;
      daysUntil: number;
      avatar?: string;
    }>;
    workAnniversaries: Array<{
      id: string;
      name: string;
      department: string;
      date: string;
      years: number;
      daysUntil: number;
    }>;
    holidays: Array<{
      name: string;
      date: string;
      daysUntil: number;
      type: 'national' | 'company' | 'optional';
    }>;
  };

  // Department Overview
  departments: Array<{
    name: string;
    icon: string;
    headcount: number;
    activeProjects: number;
    avgPerformance: number;
    openPositions: number;
    onLeaveToday: number;
  }>;

  // Recruitment
  recruitment: {
    openPositions: number;
    totalCandidates: number;
    interviewsScheduled: number;
    offersExtended: number;
    offerAcceptanceRate: number;
    avgTimeToHire: number;
    recruitmentPipeline: {
      applied: number;
      screening: number;
      interview: number;
      offer: number;
      hired: number;
    };
    urgentPositions: Array<{
      title: string;
      department: string;
      daysOpen: number;
      applicants: number;
      priority: 'critical' | 'high' | 'medium' | 'low';
    }>;
    hiringTrend: Array<{
      month: string;
      hired: number;
      target: number;
    }>;
  };

  // Attendance
  attendance: {
    presentToday: number;
    presentRate: number;
    onLeave: number;
    lateArrivals: number;
    earlyDepartures: number;
    workFromHome: number;
    avgWorkHours: number;
    overtimeHours: number;
    leaveRequests: {
      pending: number;
      approved: number;
      rejected: number;
    };
    leaveBalance: {
      casual: number;
      sick: number;
      annual: number;
      maternity: number;
      paternity: number;
    };
    attendanceTrend: Array<{
      day: string;
      present: number;
      absent: number;
    }>;
  };

  // Performance
  performance: {
    avgPerformanceScore: number;
    reviewsCompleted: number;
    reviewsPending: number;
    reviewsDue: number;
    goalsAchieved: number;
    totalGoals: number;
    topPerformers: Array<{
      id: string;
      name: string;
      department: string;
      score: number;
      avatar?: string;
    }>;
    needsImprovement: Array<{
      id: string;
      name: string;
      department: string;
      score: number;
      areas: string[];
    }>;
    departmentScores: Array<{
      department: string;
      score: number;
      improvement: number;
    }>;
  };

  // Onboarding
  onboarding: {
    newHiresThisMonth: number;
    onboardingInProgress: number;
    onboardingCompleted: number;
    avgCompletionTime: number;
    completionRate: number;
    pendingTasks: Array<{
      id: string;
      employee: string;
      joinDate: string;
      daysElapsed: number;
      tasksCompleted: number;
      totalTasks: number;
      avatar?: string;
    }>;
    checklistSummary: {
      documentsSubmitted: number;
      itSetupComplete: number;
      trainingAssigned: number;
      mentorAssigned: number;
      total: number;
    };
  };

  // Exits & Attrition
  exits: {
    resignationsThisMonth: number;
    terminationsThisMonth: number;
    totalExits: number;
    turnoverRate: number;
    avgNoticePeriod: number;
    exitInterviewsCompleted: number;
    exitInterviewsPending: number;
    retentionRate: number;
    topExitReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
    exitsByDepartment: Array<{
      department: string;
      exits: number;
      rate: number;
    }>;
    attritionTrend: Array<{
      month: string;
      exits: number;
      hires: number;
    }>;
  };

  // Compensation & Benefits
  compensation: {
    totalPayroll: number;
    avgSalary: number;
    salaryIncreasesBudget: number;
    salaryIncreasesUsed: number;
    pendingIncrements: number;
    bonusesPaid: number;
    benefitsEnrollment: number;
    expenseClaimsPending: number;
    expenseClaimsAmount: number;
    topBenefits: Array<{
      benefit: string;
      enrolled: number;
      cost: number;
      icon: string;
    }>;
    salaryBands: Array<{
      band: string;
      count: number;
      percentage: number;
    }>;
  };

  // Diversity & Inclusion
  diversity: {
    genderRatio: {
      male: number;
      female: number;
      other: number;
    };
    ageDistribution: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    tenureDistribution: Array<{
      range: string;
      count: number;
    }>;
    departmentDiversity: Array<{
      department: string;
      diversityScore: number;
      malePercentage: number;
      femalePercentage: number;
    }>;
    locationDistribution: Array<{
      location: string;
      count: number;
    }>;
  };

  // Employee Engagement
  engagement: {
    satisfactionScore: number;
    engagementScore: number;
    eNPS: number;
    surveyResponseRate: number;
    recognitionsThisMonth: number;
    feedbackSubmitted: number;
    oneOnOnesMeetings: number;
    teamEvents: number;
    pendingSurveys: number;
    recentRecognitions: Array<{
      from: string;
      to: string;
      message: string;
      timestamp: string;
    }>;
  };

  // Compliance & Documents
  compliance: {
    documentsExpiring: number;
    documentsPending: number;
    complianceRate: number;
    bgVerificationsPending: number;
    bgVerificationsCompleted: number;
    mandatoryTrainingOverdue: number;
    policiesAcknowledged: number;
    totalPolicies: number;
    expiringDocuments: Array<{
      id: string;
      employeeName: string;
      documentType: string;
      expiryDate: string;
      daysUntil: number;
      status: 'expired' | 'expiring-soon' | 'valid';
    }>;
    pendingVerifications: Array<{
      id: string;
      employeeName: string;
      verificationType: string;
      submittedDate: string;
      status: 'pending' | 'in-progress' | 'completed' | 'failed';
    }>;
  };

  // Skills & Certifications
  skills: {
    totalSkills: number;
    totalCertifications: number;
    skillGaps: number;
    certificationsDue: number;
    topSkills: Array<{
      skill: string;
      count: number;
      level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    }>;
    skillsByDepartment: Array<{
      department: string;
      primarySkills: string[];
      gapAreas: string[];
    }>;
    upcomingCertifications: Array<{
      id: string;
      employeeName: string;
      certification: string;
      expiryDate: string;
      daysUntil: number;
    }>;
  };

  // Asset Management
  assets: {
    totalAssetsAssigned: number;
    pendingReturns: number;
    pendingIssues: number;
    assetsByCategory: Array<{
      category: string;
      icon: string;
      assigned: number;
      available: number;
      maintenance: number;
    }>;
    recentAssignments: Array<{
      id: string;
      employeeName: string;
      assetType: string;
      assetName: string;
      assignedDate: string;
      status: 'assigned' | 'pending-return' | 'returned' | 'lost';
    }>;
  };

  // Employee Lifecycle Pipeline
  employeeLifecycle: {
    recruitment: number;
    onboarding: number;
    active: number;
    offboarding: number;
    alumni: number;
  };

  // Alerts
  alerts: Array<{
    id: string;
    type: 'critical' | 'warning' | 'info' | 'success';
    title: string;
    description: string;
    timestamp: string;
    action?: string;
    actionUrl?: string;
  }>;

  // Recent Activity
  recentActivity: Array<{
    id: string;
    action: string;
    employee: string;
    timestamp: string;
    type: 'hire' | 'exit' | 'promotion' | 'training' | 'leave' | 'performance' | 'document' | 'grievance';
    details?: string;
  }>;

  // Quick Actions
  quickActions: Array<{
    id: string;
    label: string;
    icon: string;
    url: string;
    count?: number;
    color: string;
  }>;
}

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

const generateMockData = (): HRDashboardData => ({
  overview: {
    totalEmployees: 247,
    totalEmployeesTrend: 8.3,
    activeEmployees: 235,
    activeEmployeesTrend: 6.2,
    newHiresThisMonth: 12,
    newHiresTrend: 15.5,
    avgTenure: 3.4,
    avgTenureTrend: -2.1,
    onProbation: 18,
    contractExpiring: 5,
    remoteworkers: 42,
    departmentCount: 8,
  },

  todayOverview: {
    presentToday: 218,
    absentToday: 17,
    onLeave: 14,
    workFromHome: 31,
    lateArrivals: 6,
    interviewsToday: [
      { id: '1', candidateName: 'John Smith', position: 'Senior Developer', time: '10:00 AM', interviewer: 'Sarah Johnson', status: 'scheduled' },
      { id: '2', candidateName: 'Emily Chen', position: 'Product Manager', time: '11:30 AM', interviewer: 'Michael Brown', status: 'in-progress' },
      { id: '3', candidateName: 'Alex Kumar', position: 'UX Designer', time: '02:00 PM', interviewer: 'Lisa Anderson', status: 'scheduled' },
      { id: '4', candidateName: 'Maria Garcia', position: 'DevOps Engineer', time: '04:00 PM', interviewer: 'James Wilson', status: 'scheduled' },
    ],
    birthdaysToday: [
      { id: '1', name: 'David Kim', department: 'Engineering' },
      { id: '2', name: 'Rachel Green', department: 'Marketing' },
    ],
    anniversariesToday: [
      { id: '1', name: 'Michael Scott', department: 'Sales', years: 5 },
    ],
    probationEnding: [
      { id: '1', name: 'Tom Hardy', department: 'Engineering', endDate: '2026-02-01', daysRemaining: 4 },
      { id: '2', name: 'Emma Watson', department: 'Design', endDate: '2026-02-05', daysRemaining: 8 },
    ],
  },

  upcomingEvents: {
    birthdays: [
      { id: '1', name: 'Jessica Alba', department: 'HR', date: '2026-01-30', daysUntil: 2 },
      { id: '2', name: 'Chris Evans', department: 'Engineering', date: '2026-02-02', daysUntil: 5 },
      { id: '3', name: 'Natalie Portman', department: 'Finance', date: '2026-02-05', daysUntil: 8 },
      { id: '4', name: 'Robert Downey', department: 'Sales', date: '2026-02-10', daysUntil: 13 },
    ],
    workAnniversaries: [
      { id: '1', name: 'Mark Johnson', department: 'Engineering', date: '2026-01-31', years: 3, daysUntil: 3 },
      { id: '2', name: 'Sophie Turner', department: 'Marketing', date: '2026-02-03', years: 2, daysUntil: 6 },
      { id: '3', name: 'Daniel Craig', department: 'Operations', date: '2026-02-07', years: 5, daysUntil: 10 },
    ],
    holidays: [
      { name: 'Republic Day', date: '2026-01-26', daysUntil: 0, type: 'national' },
      { name: 'Company Foundation Day', date: '2026-02-15', daysUntil: 18, type: 'company' },
      { name: 'Holi', date: '2026-03-10', daysUntil: 41, type: 'optional' },
    ],
  },

  departments: [
    { name: 'Engineering', icon: 'Code', headcount: 85, activeProjects: 12, avgPerformance: 8.7, openPositions: 8, onLeaveToday: 3 },
    { name: 'Product', icon: 'Package', headcount: 24, activeProjects: 6, avgPerformance: 8.5, openPositions: 2, onLeaveToday: 1 },
    { name: 'Design', icon: 'Palette', headcount: 18, activeProjects: 8, avgPerformance: 8.4, openPositions: 2, onLeaveToday: 0 },
    { name: 'Sales', icon: 'TrendingUp', headcount: 32, activeProjects: 4, avgPerformance: 8.1, openPositions: 3, onLeaveToday: 2 },
    { name: 'Marketing', icon: 'Megaphone', headcount: 22, activeProjects: 5, avgPerformance: 7.9, openPositions: 1, onLeaveToday: 1 },
    { name: 'HR', icon: 'Users', headcount: 12, activeProjects: 3, avgPerformance: 8.3, openPositions: 1, onLeaveToday: 0 },
    { name: 'Finance', icon: 'DollarSign', headcount: 15, activeProjects: 2, avgPerformance: 8.2, openPositions: 0, onLeaveToday: 1 },
    { name: 'Operations', icon: 'Settings', headcount: 39, activeProjects: 7, avgPerformance: 7.8, openPositions: 1, onLeaveToday: 2 },
  ],

  recruitment: {
    openPositions: 18,
    totalCandidates: 142,
    interviewsScheduled: 24,
    offersExtended: 8,
    offerAcceptanceRate: 87.5,
    avgTimeToHire: 28,
    recruitmentPipeline: {
      applied: 142,
      screening: 68,
      interview: 34,
      offer: 12,
      hired: 8,
    },
    urgentPositions: [
      { title: 'Senior Full Stack Developer', department: 'Engineering', daysOpen: 45, applicants: 28, priority: 'critical' },
      { title: 'Product Manager', department: 'Product', daysOpen: 38, applicants: 19, priority: 'high' },
      { title: 'DevOps Engineer', department: 'Engineering', daysOpen: 32, applicants: 22, priority: 'high' },
      { title: 'UX Designer', department: 'Design', daysOpen: 28, applicants: 15, priority: 'medium' },
      { title: 'Sales Executive', department: 'Sales', daysOpen: 21, applicants: 34, priority: 'medium' },
    ],
    hiringTrend: [
      { month: 'Aug', hired: 8, target: 10 },
      { month: 'Sep', hired: 11, target: 10 },
      { month: 'Oct', hired: 9, target: 12 },
      { month: 'Nov', hired: 14, target: 12 },
      { month: 'Dec', hired: 6, target: 8 },
      { month: 'Jan', hired: 12, target: 15 },
    ],
  },

  attendance: {
    presentToday: 218,
    presentRate: 92.8,
    onLeave: 14,
    lateArrivals: 6,
    earlyDepartures: 3,
    workFromHome: 31,
    avgWorkHours: 8.3,
    overtimeHours: 156,
    leaveRequests: {
      pending: 8,
      approved: 42,
      rejected: 3,
    },
    leaveBalance: {
      casual: 156,
      sick: 234,
      annual: 892,
      maternity: 60,
      paternity: 30,
    },
    attendanceTrend: [
      { day: 'Mon', present: 228, absent: 7 },
      { day: 'Tue', present: 225, absent: 10 },
      { day: 'Wed', present: 218, absent: 17 },
      { day: 'Thu', present: 0, absent: 0 },
      { day: 'Fri', present: 0, absent: 0 },
    ],
  },

  performance: {
    avgPerformanceScore: 8.2,
    reviewsCompleted: 198,
    reviewsPending: 35,
    reviewsDue: 14,
    goalsAchieved: 456,
    totalGoals: 580,
    topPerformers: [
      { id: '1', name: 'Sarah Johnson', department: 'Engineering', score: 9.5 },
      { id: '2', name: 'Michael Chen', department: 'Product', score: 9.3 },
      { id: '3', name: 'Emily Davis', department: 'Design', score: 9.2 },
      { id: '4', name: 'James Wilson', department: 'Engineering', score: 9.1 },
      { id: '5', name: 'Lisa Anderson', department: 'Sales', score: 9.0 },
    ],
    needsImprovement: [
      { id: '1', name: 'John Doe', department: 'Support', score: 6.2, areas: ['Communication', 'Time Management'] },
      { id: '2', name: 'Jane Smith', department: 'Operations', score: 6.5, areas: ['Technical Skills', 'Leadership'] },
    ],
    departmentScores: [
      { department: 'Engineering', score: 8.7, improvement: 5.2 },
      { department: 'Product', score: 8.5, improvement: 3.8 },
      { department: 'Design', score: 8.4, improvement: 4.1 },
      { department: 'Sales', score: 8.1, improvement: 6.5 },
      { department: 'Marketing', score: 7.9, improvement: 2.3 },
      { department: 'Support', score: 7.6, improvement: -1.2 },
    ],
  },

  onboarding: {
    newHiresThisMonth: 12,
    onboardingInProgress: 8,
    onboardingCompleted: 4,
    avgCompletionTime: 14,
    completionRate: 85.3,
    pendingTasks: [
      { id: '1', employee: 'Alex Thompson', joinDate: '2026-01-15', daysElapsed: 13, tasksCompleted: 18, totalTasks: 25 },
      { id: '2', employee: 'Maria Garcia', joinDate: '2026-01-19', daysElapsed: 9, tasksCompleted: 12, totalTasks: 25 },
      { id: '3', employee: 'David Kim', joinDate: '2026-01-22', daysElapsed: 6, tasksCompleted: 8, totalTasks: 25 },
    ],
    checklistSummary: {
      documentsSubmitted: 10,
      itSetupComplete: 8,
      trainingAssigned: 12,
      mentorAssigned: 11,
      total: 12,
    },
  },

  exits: {
    resignationsThisMonth: 5,
    terminationsThisMonth: 1,
    totalExits: 6,
    turnoverRate: 2.4,
    avgNoticePeriod: 28,
    exitInterviewsCompleted: 4,
    exitInterviewsPending: 2,
    retentionRate: 94.5,
    topExitReasons: [
      { reason: 'Better Opportunity', count: 15, percentage: 42.8 },
      { reason: 'Career Growth', count: 9, percentage: 25.7 },
      { reason: 'Relocation', count: 6, percentage: 17.1 },
      { reason: 'Work-Life Balance', count: 3, percentage: 8.6 },
      { reason: 'Compensation', count: 2, percentage: 5.8 },
    ],
    exitsByDepartment: [
      { department: 'Engineering', exits: 2, rate: 2.1 },
      { department: 'Sales', exits: 2, rate: 4.5 },
      { department: 'Support', exits: 1, rate: 3.8 },
      { department: 'Operations', exits: 1, rate: 2.9 },
    ],
    attritionTrend: [
      { month: 'Aug', exits: 4, hires: 8 },
      { month: 'Sep', exits: 3, hires: 11 },
      { month: 'Oct', exits: 5, hires: 9 },
      { month: 'Nov', exits: 2, hires: 14 },
      { month: 'Dec', exits: 4, hires: 6 },
      { month: 'Jan', exits: 6, hires: 12 },
    ],
  },

  compensation: {
    totalPayroll: 2450000,
    avgSalary: 85200,
    salaryIncreasesBudget: 245000,
    salaryIncreasesUsed: 156000,
    pendingIncrements: 18,
    bonusesPaid: 328000,
    benefitsEnrollment: 94.5,
    expenseClaimsPending: 23,
    expenseClaimsAmount: 45600,
    topBenefits: [
      { benefit: 'Health Insurance', enrolled: 235, cost: 45000, icon: 'Heart' },
      { benefit: 'Retirement Plan', enrolled: 198, cost: 89000, icon: 'Target' },
      { benefit: 'Flexible Hours', enrolled: 214, cost: 0, icon: 'Clock' },
      { benefit: 'Remote Work', enrolled: 156, cost: 0, icon: 'Building2' },
      { benefit: 'Gym Membership', enrolled: 89, cost: 12000, icon: 'Activity' },
    ],
    salaryBands: [
      { band: '< $50K', count: 28, percentage: 11.3 },
      { band: '$50K - $75K', count: 65, percentage: 26.3 },
      { band: '$75K - $100K', count: 89, percentage: 36.0 },
      { band: '$100K - $150K', count: 52, percentage: 21.1 },
      { band: '> $150K', count: 13, percentage: 5.3 },
    ],
  },

  diversity: {
    genderRatio: {
      male: 145,
      female: 98,
      other: 4,
    },
    ageDistribution: [
      { range: '18-25', count: 32, percentage: 13.0 },
      { range: '26-35', count: 128, percentage: 51.8 },
      { range: '36-45', count: 65, percentage: 26.3 },
      { range: '46-55', count: 18, percentage: 7.3 },
      { range: '56+', count: 4, percentage: 1.6 },
    ],
    tenureDistribution: [
      { range: '< 1 year', count: 45 },
      { range: '1-2 years', count: 78 },
      { range: '2-5 years', count: 89 },
      { range: '5-10 years', count: 28 },
      { range: '> 10 years', count: 7 },
    ],
    departmentDiversity: [
      { department: 'Engineering', diversityScore: 72, malePercentage: 68, femalePercentage: 32 },
      { department: 'Product', diversityScore: 85, malePercentage: 52, femalePercentage: 48 },
      { department: 'Design', diversityScore: 78, malePercentage: 44, femalePercentage: 56 },
      { department: 'Sales', diversityScore: 68, malePercentage: 62, femalePercentage: 38 },
      { department: 'Marketing', diversityScore: 82, malePercentage: 45, femalePercentage: 55 },
    ],
    locationDistribution: [
      { location: 'New York', count: 85 },
      { location: 'San Francisco', count: 62 },
      { location: 'London', count: 45 },
      { location: 'Singapore', count: 32 },
      { location: 'Remote', count: 23 },
    ],
  },

  engagement: {
    satisfactionScore: 8.4,
    engagementScore: 8.1,
    eNPS: 42,
    surveyResponseRate: 87.5,
    recognitionsThisMonth: 45,
    feedbackSubmitted: 128,
    oneOnOnesMeetings: 189,
    teamEvents: 8,
    pendingSurveys: 3,
    recentRecognitions: [
      { from: 'Sarah Johnson', to: 'Michael Chen', message: 'Great work on the product launch!', timestamp: '2 hours ago' },
      { from: 'James Wilson', to: 'Emily Davis', message: 'Amazing design work on the new UI!', timestamp: '5 hours ago' },
      { from: 'Lisa Anderson', to: 'Team Alpha', message: 'Excellent Q4 performance!', timestamp: '1 day ago' },
    ],
  },

  compliance: {
    documentsExpiring: 12,
    documentsPending: 8,
    complianceRate: 96.5,
    bgVerificationsPending: 5,
    bgVerificationsCompleted: 7,
    mandatoryTrainingOverdue: 15,
    policiesAcknowledged: 228,
    totalPolicies: 235,
    expiringDocuments: [
      { id: '1', employeeName: 'John Smith', documentType: 'Work Visa', expiryDate: '2026-02-15', daysUntil: 18, status: 'expiring-soon' },
      { id: '2', employeeName: 'Maria Garcia', documentType: 'ID Card', expiryDate: '2026-02-01', daysUntil: 4, status: 'expiring-soon' },
      { id: '3', employeeName: 'David Kim', documentType: 'Health Certificate', expiryDate: '2026-01-25', daysUntil: -3, status: 'expired' },
      { id: '4', employeeName: 'Emily Chen', documentType: 'Driver License', expiryDate: '2026-03-10', daysUntil: 41, status: 'valid' },
    ],
    pendingVerifications: [
      { id: '1', employeeName: 'Alex Thompson', verificationType: 'Background Check', submittedDate: '2026-01-15', status: 'in-progress' },
      { id: '2', employeeName: 'Jennifer Lee', verificationType: 'Education', submittedDate: '2026-01-18', status: 'pending' },
      { id: '3', employeeName: 'Robert Brown', verificationType: 'Employment History', submittedDate: '2026-01-20', status: 'pending' },
    ],
  },

  skills: {
    totalSkills: 156,
    totalCertifications: 342,
    skillGaps: 24,
    certificationsDue: 12,
    topSkills: [
      { skill: 'JavaScript/TypeScript', count: 82, level: 'advanced' },
      { skill: 'React', count: 78, level: 'advanced' },
      { skill: 'Python', count: 45, level: 'intermediate' },
      { skill: 'AWS', count: 38, level: 'intermediate' },
      { skill: 'Node.js', count: 65, level: 'advanced' },
      { skill: 'SQL', count: 92, level: 'advanced' },
      { skill: 'Project Management', count: 34, level: 'intermediate' },
      { skill: 'UI/UX Design', count: 22, level: 'advanced' },
    ],
    skillsByDepartment: [
      { department: 'Engineering', primarySkills: ['JavaScript', 'React', 'Node.js', 'AWS'], gapAreas: ['Kubernetes', 'AI/ML'] },
      { department: 'Product', primarySkills: ['Product Strategy', 'Agile', 'Analytics'], gapAreas: ['Technical Writing'] },
      { department: 'Design', primarySkills: ['Figma', 'Adobe Suite', 'UX Research'], gapAreas: ['Motion Design'] },
    ],
    upcomingCertifications: [
      { id: '1', employeeName: 'John Smith', certification: 'AWS Solutions Architect', expiryDate: '2026-02-15', daysUntil: 18 },
      { id: '2', employeeName: 'Sarah Johnson', certification: 'PMP', expiryDate: '2026-02-20', daysUntil: 23 },
      { id: '3', employeeName: 'Michael Chen', certification: 'Scrum Master', expiryDate: '2026-03-01', daysUntil: 32 },
    ],
  },

  assets: {
    totalAssetsAssigned: 512,
    pendingReturns: 8,
    pendingIssues: 12,
    assetsByCategory: [
      { category: 'Laptops', icon: 'Laptop', assigned: 235, available: 15, maintenance: 5 },
      { category: 'Monitors', icon: 'Monitor', assigned: 312, available: 28, maintenance: 3 },
      { category: 'Mobile Devices', icon: 'Smartphone', assigned: 156, available: 22, maintenance: 2 },
      { category: 'Headsets', icon: 'Headphones', assigned: 189, available: 35, maintenance: 8 },
      { category: 'Access Cards', icon: 'Key', assigned: 247, available: 12, maintenance: 0 },
    ],
    recentAssignments: [
      { id: '1', employeeName: 'Alex Thompson', assetType: 'Laptop', assetName: 'MacBook Pro 16"', assignedDate: '2026-01-15', status: 'assigned' },
      { id: '2', employeeName: 'Maria Garcia', assetType: 'Monitor', assetName: 'Dell UltraSharp 27"', assignedDate: '2026-01-18', status: 'assigned' },
      { id: '3', employeeName: 'Robert Johnson', assetType: 'Laptop', assetName: 'MacBook Pro 14"', assignedDate: '2026-01-10', status: 'pending-return' },
    ],
  },

  employeeLifecycle: {
    recruitment: 142,
    onboarding: 12,
    active: 235,
    offboarding: 6,
    alumni: 89,
  },

  alerts: [
    { id: '1', type: 'critical', title: 'Compliance Training Overdue', description: '15 employees have overdue mandatory compliance training', timestamp: '2 hours ago', action: 'View Details', actionUrl: '/hr/training' },
    { id: '2', type: 'warning', title: 'High Turnover in Sales', description: 'Sales department showing 4.5% turnover rate this quarter', timestamp: '5 hours ago', action: 'Analyze', actionUrl: '/hr/reports' },
    { id: '3', type: 'warning', title: 'Documents Expiring Soon', description: '3 employee documents will expire within 7 days', timestamp: '1 day ago', action: 'Review', actionUrl: '/hr/compliance' },
    { id: '4', type: 'info', title: 'Performance Reviews Due', description: '14 performance reviews are due this week', timestamp: '1 day ago', action: 'View List', actionUrl: '/hr/performance' },
    { id: '5', type: 'success', title: 'Onboarding Milestone', description: '4 new hires completed onboarding successfully', timestamp: '2 days ago' },
  ],

  recentActivity: [
    { id: '1', action: 'New hire onboarded', employee: 'Alex Thompson', timestamp: '2 hours ago', type: 'hire', details: 'Engineering Department' },
    { id: '2', action: 'Exit interview completed', employee: 'Robert Johnson', timestamp: '4 hours ago', type: 'exit' },
    { id: '3', action: 'Promoted to Senior Engineer', employee: 'Sarah Chen', timestamp: '1 day ago', type: 'promotion' },
    { id: '4', action: 'Completed Leadership Training', employee: 'Michael Brown', timestamp: '1 day ago', type: 'training' },
    { id: '5', action: 'Leave request approved', employee: 'Emily Davis', timestamp: '2 days ago', type: 'leave' },
    { id: '6', action: 'Performance review submitted', employee: 'James Wilson', timestamp: '2 days ago', type: 'performance' },
    { id: '7', action: 'Document uploaded', employee: 'Lisa Anderson', timestamp: '3 days ago', type: 'document' },
    { id: '8', action: 'Grievance resolved', employee: 'Anonymous', timestamp: '3 days ago', type: 'grievance' },
  ],

  quickActions: [
    { id: '1', label: 'Add Employee', icon: 'UserPlus', url: '/employees/new', color: 'bg-blue-500' },
    { id: '2', label: 'Post Job', icon: 'Briefcase', url: '/hr/jobs', color: 'bg-green-500' },
    { id: '3', label: 'Approve Leaves', icon: 'Calendar', url: '/hr/leave-management', count: 8, color: 'bg-orange-500' },
    { id: '4', label: 'Schedule Interview', icon: 'CalendarDays', url: '/hr/interviews', color: 'bg-purple-500' },
    { id: '5', label: 'Manage Billing', icon: 'DollarSign', url: '/billing', color: 'bg-emerald-500' },
    { id: '6', label: 'Notifications', icon: 'Bell', url: '/notifications', color: 'bg-pink-500' },
  ],
});

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const iconColorClasses: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  primary: 'bg-primary/10 text-primary',
};

const MetricCard = ({
  title,
  value,
  trend,
  icon: Icon,
  iconColor = 'primary',
  suffix = '',
  prefix = '',
  description,
  compact = false,
}: {
  title: string;
  value: number | string;
  trend?: number;
  icon: any;
  iconColor?: string;
  suffix?: string;
  prefix?: string;
  description?: string;
  compact?: boolean;
}) => (
  <Card className={compact ? 'shadow-sm' : ''}>
    <CardContent className={compact ? 'p-4' : 'p-6'}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`font-medium text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className={`font-bold ${compact ? 'text-2xl' : 'text-3xl'}`}>
              {prefix}
              {value}
              {suffix}
            </h3>
            {trend !== undefined && (
              <span className={`flex items-center text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className={`rounded-full ${iconColorClasses[iconColor]} ${compact ? 'p-2.5' : 'p-4'}`}>
          <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const MiniStatCard = ({
  title,
  value,
  icon: Icon,
  iconColor = 'primary',
  suffix = '',
}: {
  title: string;
  value: number | string;
  icon: any;
  iconColor?: string;
  suffix?: string;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
    <div className={`rounded-full p-2 ${iconColorClasses[iconColor]}`}>
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold">{value}{suffix}</p>
    </div>
  </div>
);

const QuickActionButton = ({
  label,
  icon: Icon,
  url,
  count,
  color,
  onClick,
}: {
  label: string;
  icon: any;
  url?: string;
  count?: number;
  color: string;
  onClick?: () => void;
}) => {
  if (onClick) {
    return (
      <Button
        variant="outline"
        className="h-auto flex flex-col items-center gap-2 p-4 relative hover:border-primary"
        onClick={onClick}
      >
        <div className={`rounded-full p-2.5 ${color} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium">{label}</span>
        {count !== undefined && count > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 text-xs">
            {count}
          </Badge>
        )}
      </Button>
    );
  }
  
  return (
    <Button
      variant="outline"
      className="h-auto flex flex-col items-center gap-2 p-4 relative hover:border-primary"
      asChild
    >
      <a href={url}>
        <div className={`rounded-full p-2.5 ${color} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium">{label}</span>
        {count !== undefined && count > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 text-xs">
            {count}
          </Badge>
        )}
      </a>
    </Button>
  );
};

const getIcon = (iconName: string) => {
  const icons: Record<string, any> = {
    Code, Palette, Megaphone, Users, DollarSign, Settings, Package, TrendingUp,
    UserPlus, Briefcase, Calendar, CalendarDays, Bell, Laptop, Monitor, Smartphone,
    Headphones, Key, Heart, Target, Clock, Building2, Activity, Shield, Scale,
  };
  return icons[iconName] || Users;
};

// Celebrations types
interface Birthday {
  id: string;
  name: string;
  avatar?: string | null;
  department: string;
}

interface Anniversary {
  id: string;
  name: string;
  avatar?: string | null;
  years: number;
  department: string;
}

interface CelebrationsData {
  birthdaysToday: Birthday[];
  anniversariesToday: Anniversary[];
}

// Attendance overview type
interface AttendanceOverview {
  totalEmployees: number;
  present: number;
  absent: number;
  onLeave: number;
  late: number;
  workFromHome: number;
  presentRate: number;
}

// HR Dashboard Stats from API
interface HRDashboardStats {
  overview: {
    totalEmployees: number;
    totalEmployeesTrend: number;
    activeEmployees: number;
    newHiresThisMonth: number;
    newHiresTrend: number;
    onProbation: number;
    contractExpiring: number;
    remoteWorkers: number;
    departmentCount: number;
  };
  recruitment: {
    openPositions: number;
    totalCandidates: number;
  };
  onboarding: {
    onboardingInProgress: number;
  };
  exits: {
    exitedThisMonth: number;
    turnoverRate: number;
    retentionRate: number;
  };
  lifecycle: {
    candidates: number;
    offerAccepted: number;
    onboarding: number;
    active: number;
    offboarding: number;
    alumni: number;
  };
}

// Department overview from API
interface DepartmentOverviewItem {
  id: string;
  name: string;
  code: string;
  icon: string;
  headcount: number;
  openPositions: number;
  onLeaveToday: number;
  activeProjects: number;
  avgPerformance: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HRDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<HRDashboardData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const pageRef = useRef<HTMLDivElement>(null);
  
  // Dialog states
  const [showJobForm, setShowJobForm] = useState(false);
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  
  // Real data states
  const [todaysInterviews, setTodaysInterviews] = useState<Interview[]>([]);
  const [interviewsLoading, setInterviewsLoading] = useState(true);
  const [celebrations, setCelebrations] = useState<CelebrationsData>({ birthdaysToday: [], anniversariesToday: [] });
  const [celebrationsLoading, setCelebrationsLoading] = useState(true);
  const [attendanceOverview, setAttendanceOverview] = useState<AttendanceOverview | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [hrStats, setHrStats] = useState<HRDashboardStats | null>(null);
  const [hrStatsLoading, setHrStatsLoading] = useState(true);
  const [departmentOverview, setDepartmentOverview] = useState<DepartmentOverviewItem[]>([]);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  
  // HR 360 Dashboard Real Data States
  const [hrAlerts, setHrAlerts] = useState<HRAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [probationStatus, setProbationStatus] = useState<ProbationContractStatus | null>(null);
  const [probationLoading, setProbationLoading] = useState(true);
  const [leaveRequestsSummary, setLeaveRequestsSummary] = useState<LeaveRequestsSummary | null>(null);
  const [leaveRequestsLoading, setLeaveRequestsLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvents | null>(null);
  const [upcomingEventsLoading, setUpcomingEventsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // HR 360 Tab-specific Real Data States
  const [recruitmentStats, setRecruitmentStats] = useState<RecruitmentStats | null>(null);
  const [recruitmentLoading, setRecruitmentLoading] = useState(true);
  const [onboardingStats, setOnboardingStats] = useState<OnboardingStats | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [exitsStats, setExitsStats] = useState<ExitsStats | null>(null);
  const [exitsLoading, setExitsLoading] = useState(true);
  const [diversityStats, setDiversityStats] = useState<DiversityStats | null>(null);
  const [diversityLoading, setDiversityLoading] = useState(true);
  const [complianceStats, setComplianceStats] = useState<ComplianceStats | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(true);

  // Fetch today's attendance overview from API
  const loadAttendanceOverview = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const data = await get<AttendanceOverview>('/api/v1/attendance/overview/today');
      setAttendanceOverview(data);
    } catch (error) {
      console.error('Error fetching attendance overview:', error);
      setAttendanceOverview(null);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  // Fetch today's celebrations from API
  const loadCelebrations = useCallback(async () => {
    setCelebrationsLoading(true);
    try {
      const data = await get<CelebrationsData>('/api/v1/employees/celebrations/today');
      setCelebrations(data);
    } catch (error) {
      console.error('Error fetching celebrations:', error);
      setCelebrations({ birthdaysToday: [], anniversariesToday: [] });
    } finally {
      setCelebrationsLoading(false);
    }
  }, []);

  // Fetch HR dashboard stats from API
  const loadHRStats = useCallback(async () => {
    setHrStatsLoading(true);
    try {
      const data = await get<HRDashboardStats>('/api/v1/employees/hr-dashboard-stats');
      setHrStats(data);
    } catch (error) {
      console.error('Error fetching HR dashboard stats:', error);
      setHrStats(null);
    } finally {
      setHrStatsLoading(false);
    }
  }, []);

  // Fetch department overview from API
  const loadDepartmentOverview = useCallback(async () => {
    setDepartmentLoading(true);
    try {
      const data = await get<DepartmentOverviewItem[]>('/api/v1/employees/department-overview');
      setDepartmentOverview(data);
    } catch (error) {
      console.error('Error fetching department overview:', error);
      setDepartmentOverview([]);
    } finally {
      setDepartmentLoading(false);
    }
  }, []);

  // Fetch HR alerts and notifications from API
  const loadHRAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const alerts = await getHRAlerts();
      setHrAlerts(alerts);
    } catch (error) {
      console.error('Error fetching HR alerts:', error);
      setHrAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  // Fetch probation and contract status from API
  const loadProbationStatus = useCallback(async () => {
    setProbationLoading(true);
    try {
      const status = await getProbationContractStatus();
      setProbationStatus(status);
    } catch (error) {
      console.error('Error fetching probation status:', error);
      setProbationStatus(null);
    } finally {
      setProbationLoading(false);
    }
  }, []);

  // Fetch leave requests summary from API
  const loadLeaveRequestsSummary = useCallback(async () => {
    setLeaveRequestsLoading(true);
    try {
      const summary = await getLeaveRequestsSummary();
      setLeaveRequestsSummary(summary);
    } catch (error) {
      console.error('Error fetching leave requests summary:', error);
      setLeaveRequestsSummary(null);
    } finally {
      setLeaveRequestsLoading(false);
    }
  }, []);

  // Fetch upcoming events from API
  const loadUpcomingEvents = useCallback(async () => {
    setUpcomingEventsLoading(true);
    try {
      const events = await getUpcomingEvents();
      setUpcomingEvents(events);
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      setUpcomingEvents(null);
    } finally {
      setUpcomingEventsLoading(false);
    }
  }, []);

  // Fetch recent activities from API
  const loadRecentActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const activities = await getRecentActivities(20);
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setRecentActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  // Fetch recruitment stats from API
  const loadRecruitmentStats = useCallback(async () => {
    setRecruitmentLoading(true);
    try {
      const stats = await getRecruitmentStats();
      setRecruitmentStats(stats);
    } catch (error) {
      console.error('Error fetching recruitment stats:', error);
      setRecruitmentStats(null);
    } finally {
      setRecruitmentLoading(false);
    }
  }, []);

  // Fetch onboarding stats from API
  const loadOnboardingStats = useCallback(async () => {
    setOnboardingLoading(true);
    try {
      const stats = await getOnboardingStats();
      setOnboardingStats(stats);
    } catch (error) {
      console.error('Error fetching onboarding stats:', error);
      setOnboardingStats(null);
    } finally {
      setOnboardingLoading(false);
    }
  }, []);

  // Fetch exits stats from API
  const loadExitsStats = useCallback(async () => {
    setExitsLoading(true);
    try {
      const stats = await getExitsStats();
      setExitsStats(stats);
    } catch (error) {
      console.error('Error fetching exits stats:', error);
      setExitsStats(null);
    } finally {
      setExitsLoading(false);
    }
  }, []);

  // Fetch diversity stats from API
  const loadDiversityStats = useCallback(async () => {
    setDiversityLoading(true);
    try {
      const stats = await getDiversityStats();
      setDiversityStats(stats);
    } catch (error) {
      console.error('Error fetching diversity stats:', error);
      setDiversityStats(null);
    } finally {
      setDiversityLoading(false);
    }
  }, []);

  // Fetch compliance stats from API
  const loadComplianceStats = useCallback(async () => {
    setComplianceLoading(true);
    try {
      const stats = await getComplianceStats();
      setComplianceStats(stats);
    } catch (error) {
      console.error('Error fetching compliance stats:', error);
      setComplianceStats(null);
    } finally {
      setComplianceLoading(false);
    }
  }, []);

  // Fetch today's interviews from API
  const loadTodaysInterviews = useCallback(async () => {
    setInterviewsLoading(true);
    try {
      const today = new Date();
      const interviews = await interviewApi.getInterviews({
        dateFrom: format(startOfDay(today), 'yyyy-MM-dd'),
        dateTo: format(endOfDay(today), 'yyyy-MM-dd'),
      });
      setTodaysInterviews(interviews);
    } catch (error) {
      console.error('Error fetching today\'s interviews:', error);
      setTodaysInterviews([]);
    } finally {
      setInterviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadTodaysInterviews();
    loadCelebrations();
    loadAttendanceOverview();
    loadHRStats();
    loadDepartmentOverview();
    // Load HR 360 real data
    loadHRAlerts();
    loadProbationStatus();
    loadLeaveRequestsSummary();
    loadUpcomingEvents();
    loadRecentActivities();
    // Load tab-specific real data
    loadRecruitmentStats();
    loadOnboardingStats();
    loadExitsStats();
    loadDiversityStats();
    loadComplianceStats();
  }, [loadTodaysInterviews, loadCelebrations, loadAttendanceOverview, loadHRStats, loadDepartmentOverview, loadHRAlerts, loadProbationStatus, loadLeaveRequestsSummary, loadUpcomingEvents, loadRecentActivities, loadRecruitmentStats, loadOnboardingStats, loadExitsStats, loadDiversityStats, loadComplianceStats]);

  const loadDashboardData = () => {
    setTimeout(() => {
      setData(generateMockData());
    }, 500);
  };

  const handleDownloadPDF = async () => {
    if (!pageRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(pageRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      pdf.addImage(imgData, 'PNG', imgX, 0, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`HR-360-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle job form submission
  const handleJobSubmit = async (formData: JobFormData) => {
    try {
      await jobApi.createJob({
        title: formData.title,
        department: formData.department,
        location: formData.location,
        employmentType: formData.employmentType,
        salaryMin: formData.salaryMin,
        salaryMax: formData.salaryMax,
        currency: formData.currency,
        status: formData.status,
        closingDate: formData.closingDate,
        openings: formData.openings,
        experienceMin: formData.experienceMin,
        experienceMax: formData.experienceMax,
        description: formData.description,
        requirements: formData.requirements,
        responsibilities: formData.responsibilities,
        benefits: formData.benefits,
        techStack: formData.techStack,
      });
      toast.success('Job Created Successfully', {
        description: 'The new job opening has been created and is now active.',
      });
      setShowJobForm(false);
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error('Failed to create job');
    }
  };

  // Handle interview scheduling
  const handleInterviewScheduled = () => {
    setShowInterviewDialog(false);
    // Refresh today's interviews data
    loadTodaysInterviews();
  };

  if (!data) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-8 w-24 mb-1" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <Skeleton className="h-14 w-14 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">HR 360°</h1>
              <p className="text-muted-foreground">
                Comprehensive view of all HR operations • Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isDownloading && (
            <>
              <Button variant="outline" size="sm" onClick={loadDashboardData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <QuickActionButton
              label="Add Employee"
              icon={UserPlus}
              color="bg-blue-500"
              onClick={() => router.push('/employees/new')}
            />
            <QuickActionButton
              label="Post Job"
              icon={Briefcase}
              color="bg-green-500"
              onClick={() => setShowJobForm(true)}
            />
            <QuickActionButton
              label="Approve Leaves"
              icon={Calendar}
              url="/hr/leave-management"
              count={data.attendance.leaveRequests.pending}
              color="bg-orange-500"
            />
            <QuickActionButton
              label="Schedule Interview"
              icon={CalendarDays}
              color="bg-purple-500"
              onClick={() => setShowInterviewDialog(true)}
            />
            <QuickActionButton
              label="Manage Billing"
              icon={DollarSign}
              url="/billing"
              color="bg-emerald-500"
            />
            <QuickActionButton
              label="Notifications"
              icon={Bell}
              url="/notifications"
              color="bg-pink-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Job Form Dialog */}
      <JobDescriptionForm
        open={showJobForm}
        onOpenChange={setShowJobForm}
        onSubmit={handleJobSubmit}
        mode="create"
      />

      {/* Schedule Interview Dialog */}
      <ScheduleInterviewDialog
        open={showInterviewDialog}
        onOpenChange={setShowInterviewDialog}
        onSuccess={handleInterviewScheduled}
      />

      {/* Today's Overview Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today's Stats */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendanceLoading ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-3 rounded-lg border">
                      <Skeleton className="h-3 w-12 mb-2" />
                      <Skeleton className="h-6 w-8" />
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ) : attendanceOverview ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStatCard title="Present" value={attendanceOverview.present} icon={UserCheck} iconColor="green" />
                  <MiniStatCard title="On Leave" value={attendanceOverview.onLeave} icon={Calendar} iconColor="orange" />
                  <MiniStatCard title="WFH" value={attendanceOverview.workFromHome} icon={Building2} iconColor="blue" />
                  <MiniStatCard title="Late" value={attendanceOverview.late} icon={Clock} iconColor="red" />
                </div>
                <div className="pt-2">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Attendance Rate</span>
                    <span className="font-medium">{attendanceOverview.presentRate}%</span>
                  </div>
                  <Progress value={attendanceOverview.presentRate} className="h-2" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <CalendarDays className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Unable to load attendance data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Interviews */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-purple-500" />
                Today's Interviews
              </CardTitle>
              <Badge variant="secondary">{todaysInterviews.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              {interviewsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg border">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-16 mb-1" />
                        <Skeleton className="h-5 w-14" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : todaysInterviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <CalendarDays className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No interviews scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaysInterviews.map((interview) => {
                    const candidateName = interview.candidate 
                      ? `${interview.candidate.firstName} ${interview.candidate.lastName}`
                      : 'Unknown Candidate';
                    const position = interview.job?.title || 'Unknown Position';
                    const time = format(new Date(interview.scheduledAt), 'hh:mm a');
                    const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
                      'SCHEDULED': 'secondary',
                      'CONFIRMED': 'secondary',
                      'IN_PROGRESS': 'default',
                      'COMPLETED': 'outline',
                      'CANCELLED': 'destructive',
                      'RESCHEDULED': 'secondary',
                      'NO_SHOW': 'destructive',
                    };
                    const statusLabel = interview.status === 'IN_PROGRESS' ? 'Live' : interview.status.toLowerCase().replace('_', ' ');
                    
                    return (
                      <div
                        key={interview.id}
                        className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/hr/interviews/${interview.id}`)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-purple-100 text-purple-600 text-xs">
                            {candidateName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{candidateName}</p>
                          <p className="text-xs text-muted-foreground truncate">{position}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{time}</p>
                          <Badge
                            variant={statusMap[interview.status] || 'secondary'}
                            className="text-xs capitalize"
                          >
                            {statusLabel}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Celebrations & Events */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-pink-500" />
              Celebrations Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              {celebrationsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg border">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {celebrations.birthdaysToday.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Cake className="h-3 w-3" /> Birthdays
                      </p>
                      {celebrations.birthdaysToday.map((person) => {
                        const nameParts = person.name.split(' ');
                        const firstName = nameParts[0] || '';
                        const lastName = nameParts.slice(1).join(' ') || '';
                        const avatarColor = getAvatarColor(person.id);
                        return (
                          <div
                            key={person.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-pink-50 dark:bg-pink-950/30 cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-950/50 transition-colors"
                            onClick={() => router.push(`/employees/${person.id}`)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={person.avatar || undefined} alt={person.name} />
                              <AvatarFallback className={cn(avatarColor.className, "text-xs font-semibold")}>
                                {getInitials(firstName, lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{person.name}</p>
                              <p className="text-xs text-muted-foreground">{person.department}</p>
                            </div>
                            <Cake className="h-4 w-4 text-pink-500 ml-auto" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {celebrations.anniversariesToday.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Award className="h-3 w-3" /> Work Anniversaries
                      </p>
                      {celebrations.anniversariesToday.map((person) => {
                        const nameParts = person.name.split(' ');
                        const firstName = nameParts[0] || '';
                        const lastName = nameParts.slice(1).join(' ') || '';
                        const avatarColor = getAvatarColor(person.id);
                        return (
                          <div
                            key={person.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                            onClick={() => router.push(`/employees/${person.id}`)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={person.avatar || undefined} alt={person.name} />
                              <AvatarFallback className={cn(avatarColor.className, "text-xs font-semibold")}>
                                {getInitials(firstName, lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{person.name}</p>
                              <p className="text-xs text-muted-foreground">{person.years} year{person.years > 1 ? 's' : ''}!</p>
                            </div>
                            <Award className="h-4 w-4 text-amber-500 ml-auto" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {celebrations.birthdaysToday.length === 0 && celebrations.anniversariesToday.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                      <PartyPopper className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No celebrations today</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Employees"
          value={hrStats?.overview.totalEmployees ?? data.overview.totalEmployees}
          trend={hrStats?.overview.totalEmployeesTrend ?? data.overview.totalEmployeesTrend}
          icon={Users}
          iconColor="blue"
          description={`${hrStats?.overview.activeEmployees ?? data.overview.activeEmployees} active`}
        />
        <MetricCard
          title="Open Positions"
          value={hrStats?.recruitment.openPositions ?? data.recruitment.openPositions}
          icon={Briefcase}
          iconColor="purple"
          description={`${hrStats?.recruitment.totalCandidates ?? data.recruitment.totalCandidates} candidates`}
        />
        <MetricCard
          title="New Hires (MTD)"
          value={hrStats?.overview.newHiresThisMonth ?? data.overview.newHiresThisMonth}
          trend={hrStats?.overview.newHiresTrend ?? data.overview.newHiresTrend}
          icon={UserPlus}
          iconColor="green"
          description={`${hrStats?.onboarding.onboardingInProgress ?? data.onboarding.onboardingInProgress} onboarding`}
        />
        <MetricCard
          title="Turnover Rate"
          value={hrStats?.exits.turnoverRate ?? data.exits.turnoverRate}
          suffix="%"
          icon={TrendingDown}
          iconColor="red"
          description={`${hrStats?.exits.retentionRate ?? data.exits.retentionRate}% retention`}
        />
      </div>

      {/* Employee Lifecycle Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-500" />
            Employee Lifecycle Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            {[
              { label: 'Candidates', value: hrStats?.lifecycle.candidates ?? data.employeeLifecycle.recruitment, color: 'bg-blue-500', icon: Users },
              { label: 'Offer Accepted', value: hrStats?.lifecycle.offerAccepted ?? 0, color: 'bg-purple-500', icon: CheckCircle },
              { label: 'Onboarding', value: hrStats?.lifecycle.onboarding ?? data.employeeLifecycle.onboarding, color: 'bg-green-500', icon: UserPlus },
              { label: 'Active', value: hrStats?.lifecycle.active ?? data.employeeLifecycle.active, color: 'bg-emerald-500', icon: UserCheck },
              { label: 'Offboarding', value: hrStats?.lifecycle.offboarding ?? data.employeeLifecycle.offboarding, color: 'bg-orange-500', icon: UserMinus },
              { label: 'Alumni', value: hrStats?.lifecycle.alumni ?? data.employeeLifecycle.alumni, color: 'bg-gray-500', icon: Users },
            ].map((stage, index) => (
              <div key={stage.label} className="flex-1 flex items-center">
                <div className="flex-1 text-center">
                  <div className={`mx-auto w-14 h-14 rounded-full ${stage.color} flex items-center justify-center text-white mb-2`}>
                    <stage.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xl font-bold">{stage.value}</p>
                  <p className="text-xs text-muted-foreground">{stage.label}</p>
                </div>
                {index < 5 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-0.5 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts & Probation Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Critical Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Alerts & Notifications
              </CardTitle>
              <Badge variant="destructive">
                {alertsLoading ? '...' : (hrAlerts.length > 0 ? hrAlerts.filter(a => a.type === 'critical').length : data.alerts.filter(a => a.type === 'critical').length)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {alertsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-lg border-l-4 border-gray-200">
                      <Skeleton className="h-4 w-40 mb-2" />
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(hrAlerts.length > 0 ? hrAlerts : data.alerts).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        alert.type === 'critical'
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                          : alert.type === 'warning'
                          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30'
                          : alert.type === 'success'
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                          : 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
                        </div>
                        {alert.action && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                            <a href={alert.actionUrl}>{alert.action}</a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {hrAlerts.length === 0 && data.alerts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">No alerts or notifications</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Probation & Contract Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Hourglass className="h-4 w-4 text-orange-500" />
              Probation & Contract Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {probationLoading ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <MiniStatCard 
                    title="On Probation" 
                    value={probationStatus?.onProbation ?? data.overview.onProbation} 
                    icon={Timer} 
                    iconColor="orange" 
                  />
                  <MiniStatCard 
                    title="Contract Expiring" 
                    value={probationStatus?.contractExpiring ?? data.overview.contractExpiring} 
                    icon={FileClock} 
                    iconColor="red" 
                  />
                </div>
                <ScrollArea className="h-[120px]">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Probation Ending Soon</p>
                    {(probationStatus?.probationEnding ?? data.todayOverview.probationEnding).length > 0 ? (
                      (probationStatus?.probationEnding ?? data.todayOverview.probationEnding).map((emp) => (
                        <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg border">
                          <div>
                            <p className="text-sm font-medium">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.department}</p>
                          </div>
                          <Badge variant={emp.daysRemaining <= 7 ? 'destructive' : 'secondary'}>
                            {emp.daysRemaining} days
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-xs">No employees ending probation soon</p>
                      </div>
                    )}
                    
                    {(probationStatus?.contractsEnding ?? []).length > 0 && (
                      <>
                        <p className="text-xs font-medium text-muted-foreground mt-3">Contracts Expiring Soon</p>
                        {probationStatus?.contractsEnding.map((emp) => (
                          <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg border">
                            <div>
                              <p className="text-sm font-medium">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.department}</p>
                            </div>
                            <Badge variant={emp.daysRemaining <= 7 ? 'destructive' : 'secondary'}>
                              {emp.daysRemaining} days
                            </Badge>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-500" />
              Department Overview
            </CardTitle>
            <Badge variant="secondary">
              {(departmentOverview.length > 0 ? departmentOverview : data.departments).length} departments
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
          {departmentLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border">
                  <Skeleton className="h-10 w-10 rounded-xl mb-3" />
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {(departmentOverview.length > 0 ? departmentOverview : data.departments).map((dept, index) => {
                const DeptIcon = getIcon(dept.icon);
                const iconColors = [
                  'text-blue-500',
                  'text-purple-500',
                  'text-pink-500',
                  'text-amber-500',
                  'text-green-500',
                  'text-cyan-500',
                  'text-rose-500',
                  'text-indigo-500',
                  'text-teal-500',
                  'text-orange-500',
                ];
                return (
                  <div 
                    key={dept.name} 
                    className="group p-4 rounded-lg border bg-card hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <DeptIcon className={`h-5 w-5 ${iconColors[index % iconColors.length]}`} />
                      </div>
                      {dept.onLeaveToday > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                          {dept.onLeaveToday} on leave
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate mb-1">{dept.name}</p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <p className="text-2xl font-bold">{dept.headcount}</p>
                      <span className="text-xs text-muted-foreground">employees</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {dept.openPositions > 0 ? (
                        <div className="flex items-center gap-1 text-xs">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          <span className="text-green-600 dark:text-green-400 font-medium">{dept.openPositions} open</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3" />
                          <span>Fully staffed</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="recruitment" className="text-xs">Recruitment</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
          <TabsTrigger value="onboarding" className="text-xs">Onboarding</TabsTrigger>
          <TabsTrigger value="exits" className="text-xs">Attrition</TabsTrigger>
          <TabsTrigger value="compensation" className="text-xs">Compensation</TabsTrigger>
          <TabsTrigger value="diversity" className="text-xs">Diversity</TabsTrigger>
          <TabsTrigger value="engagement" className="text-xs">Engagement</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs">Compliance</TabsTrigger>
          <TabsTrigger value="skills" className="text-xs">Skills</TabsTrigger>
          <TabsTrigger value="assets" className="text-xs">Assets</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Leave Requests */}
            <Card className="flex flex-col min-h-[420px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  Leave Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 flex-1">
                {leaveRequestsLoading ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                      ))}
                    </div>
                    <Skeleton className="h-px w-full my-3" />
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-8 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status Cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 rounded-lg border text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                        <p className="text-2xl font-bold">
                          {leaveRequestsSummary?.leaveRequests.pending ?? data.attendance.leaveRequests.pending}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground">Pending</p>
                      </div>
                      <div className="p-3 rounded-lg border text-center">
                        <div className="flex items-center justify-center mb-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <p className="text-2xl font-bold">
                          {leaveRequestsSummary?.leaveRequests.approved ?? data.attendance.leaveRequests.approved}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground">Approved</p>
                      </div>
                      <div className="p-3 rounded-lg border text-center">
                        <div className="flex items-center justify-center mb-1">
                          <XCircle className="h-4 w-4 text-red-500" />
                        </div>
                        <p className="text-2xl font-bold">
                          {leaveRequestsSummary?.leaveRequests.rejected ?? data.attendance.leaveRequests.rejected}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground">Rejected</p>
                      </div>
                    </div>

                    {/* Leave Balance Section */}
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground">Leave Balance (Company-wide)</p>
                      </div>
                      <ScrollArea className="h-[180px] pr-2">
                        <div className="space-y-2">
                          {Object.entries(leaveRequestsSummary?.leaveBalance ?? data.attendance.leaveBalance).map(([type, count]) => {
                            return (
                              <div key={type} className="flex items-center gap-3 p-2 rounded-lg border">
                                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-xs font-medium">
                                  {String(type).charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</p>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {count} days
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="flex flex-col min-h-[420px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-pink-500" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 flex-1">
                <ScrollArea className="h-[330px] pr-3">
                  {upcomingEventsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((section) => (
                        <div key={section} className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          {[1, 2].map((item) => (
                            <Skeleton key={item} className="h-14 w-full rounded-xl" />
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Birthdays Section */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Cake className="h-3.5 w-3.5 text-pink-500" />
                          <p className="text-sm font-medium">Birthdays</p>
                          <Badge variant="secondary" className="ml-auto text-xs h-5">
                            {(upcomingEvents?.birthdays ?? data.upcomingEvents.birthdays).length}
                          </Badge>
                        </div>
                        {(upcomingEvents?.birthdays ?? data.upcomingEvents.birthdays).slice(0, 3).length > 0 ? (
                          <div className="space-y-2">
                            {(upcomingEvents?.birthdays ?? data.upcomingEvents.birthdays).slice(0, 3).map((person) => (
                              <div key={person.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400">
                                    {person.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{person.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{person.department}</p>
                                </div>
                                <Badge 
                                  variant={person.daysUntil === 0 ? 'default' : 'outline'} 
                                  className="text-xs shrink-0"
                                >
                                  {person.daysUntil === 0 ? '🎂 Today!' : person.daysUntil === 1 ? 'Tomorrow' : `${person.daysUntil} days`}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 text-center rounded-lg border border-dashed">
                            <Cake className="h-6 w-6 text-muted-foreground/50 mb-2" />
                            <p className="text-xs text-muted-foreground">No upcoming birthdays in the next 30 days</p>
                          </div>
                        )}
                      </div>

                      {/* Work Anniversaries Section */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="h-3.5 w-3.5 text-amber-500" />
                          <p className="text-sm font-medium">Work Anniversaries</p>
                          <Badge variant="secondary" className="ml-auto text-xs h-5">
                            {(upcomingEvents?.workAnniversaries ?? data.upcomingEvents.workAnniversaries).length}
                          </Badge>
                        </div>
                        {(upcomingEvents?.workAnniversaries ?? data.upcomingEvents.workAnniversaries).slice(0, 3).length > 0 ? (
                          <div className="space-y-2">
                            {(upcomingEvents?.workAnniversaries ?? data.upcomingEvents.workAnniversaries).slice(0, 3).map((person) => (
                              <div key={person.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-sm">
                                  {person.years}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{person.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{person.years} year{person.years > 1 ? 's' : ''} at company</p>
                                </div>
                                <Badge 
                                  variant={person.daysUntil === 0 ? 'default' : 'outline'} 
                                  className="text-xs shrink-0"
                                >
                                  {person.daysUntil === 0 ? '🎉 Today!' : person.daysUntil === 1 ? 'Tomorrow' : `${person.daysUntil} days`}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 text-center rounded-lg border border-dashed">
                            <Award className="h-6 w-6 text-muted-foreground/50 mb-2" />
                            <p className="text-xs text-muted-foreground">No upcoming anniversaries in the next 30 days</p>
                          </div>
                        )}
                      </div>

                      {/* Holidays Section */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-3.5 w-3.5 text-blue-500" />
                          <p className="text-sm font-medium">Holidays</p>
                          <Badge variant="secondary" className="ml-auto text-xs h-5">
                            {(upcomingEvents?.holidays ?? data.upcomingEvents.holidays).length}
                          </Badge>
                        </div>
                        {(upcomingEvents?.holidays ?? data.upcomingEvents.holidays).length > 0 ? (
                          <div className="space-y-2">
                            {(upcomingEvents?.holidays ?? data.upcomingEvents.holidays).slice(0, 3).map((holiday, i) => (
                              <div key={i} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                                <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex flex-col items-center justify-center text-blue-700 dark:text-blue-400">
                                  <span className="text-[9px] font-medium leading-none">{new Date(holiday.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
                                  <span className="text-xs font-bold leading-none">{new Date(holiday.date).getDate()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{holiday.name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{holiday.type} holiday</p>
                                </div>
                                <Badge 
                                  variant={holiday.daysUntil === 0 ? 'default' : 'outline'} 
                                  className="text-xs shrink-0"
                                >
                                  {holiday.daysUntil === 0 ? 'Today' : holiday.daysUntil === 1 ? 'Tomorrow' : `${holiday.daysUntil} days`}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 text-center rounded-lg border border-dashed">
                            <Calendar className="h-6 w-6 text-muted-foreground/50 mb-2" />
                            <p className="text-xs text-muted-foreground">No upcoming holidays in the next 30 days</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="flex flex-col min-h-[420px]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-500" />
                    Recent Activity
                  </CardTitle>
                  <Badge variant="secondary">
                    {(recentActivities.length > 0 ? recentActivities : data.recentActivity).length} events
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-4 flex-1">
                <ScrollArea className="h-[330px] pr-3">
                  {activitiesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-start gap-3 p-2">
                          <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-40 mb-2" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(recentActivities.length > 0 ? recentActivities : data.recentActivity).map((activity) => {
                        const activityType = 'type' in activity ? activity.type : '';
                        const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
                          'hire': { icon: UserPlus, color: 'text-green-500', label: 'New Hire' },
                          'HIRE': { icon: UserPlus, color: 'text-green-500', label: 'New Hire' },
                          'exit': { icon: UserMinus, color: 'text-red-500', label: 'Exit' },
                          'EXIT': { icon: UserMinus, color: 'text-red-500', label: 'Exit' },
                          'promotion': { icon: TrendingUp, color: 'text-purple-500', label: 'Promotion' },
                          'PROMOTION': { icon: TrendingUp, color: 'text-purple-500', label: 'Promotion' },
                          'training': { icon: GraduationCap, color: 'text-blue-500', label: 'Training' },
                          'TRAINING': { icon: GraduationCap, color: 'text-blue-500', label: 'Training' },
                          'leave': { icon: Calendar, color: 'text-amber-500', label: 'Leave' },
                          'LEAVE': { icon: Calendar, color: 'text-amber-500', label: 'Leave' },
                          'performance': { icon: Target, color: 'text-cyan-500', label: 'Performance' },
                          'PERFORMANCE': { icon: Target, color: 'text-cyan-500', label: 'Performance' },
                          'document': { icon: FileText, color: 'text-slate-500', label: 'Document' },
                          'DOCUMENT': { icon: FileText, color: 'text-slate-500', label: 'Document' },
                          'grievance': { icon: MessageSquareWarning, color: 'text-orange-500', label: 'Grievance' },
                          'GRIEVANCE': { icon: MessageSquareWarning, color: 'text-orange-500', label: 'Grievance' },
                          'interview': { icon: CalendarDays, color: 'text-indigo-500', label: 'Interview' },
                          'INTERVIEW': { icon: CalendarDays, color: 'text-indigo-500', label: 'Interview' },
                        };
                        const config = typeConfig[activityType] || { icon: Activity, color: 'text-muted-foreground', label: 'Activity' };
                        const IconComponent = config.icon;
                        
                        return (
                          <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                            <div className="p-2 rounded-md bg-muted flex-shrink-0">
                              <IconComponent className={`h-4 w-4 ${config.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium leading-tight">{activity.action}</p>
                                <Badge variant="outline" className="text-[10px] shrink-0 h-5">
                                  {config.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span>{activity.employee}</span>
                                <span>•</span>
                                <span>{activity.timestamp}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {recentActivities.length === 0 && data.recentActivity.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Activity className="h-8 w-8 text-muted-foreground/50 mb-3" />
                          <p className="text-sm text-muted-foreground">No recent activity</p>
                          <p className="text-xs text-muted-foreground mt-1">Activities will appear here as they happen</p>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recruitment Tab */}
        <TabsContent value="recruitment" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Open Positions" value={recruitmentStats?.openPositions ?? data.recruitment.openPositions} icon={Briefcase} compact />
            <MetricCard title="Total Candidates" value={recruitmentStats?.totalCandidates ?? data.recruitment.totalCandidates} icon={Users} compact />
            <MetricCard title="Interviews Scheduled" value={recruitmentStats?.interviewsScheduled ?? data.recruitment.interviewsScheduled} icon={Calendar} compact />
            <MetricCard title="Offers Extended" value={recruitmentStats?.offersExtended ?? data.recruitment.offersExtended} icon={FileText} compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recruitment Pipeline</CardTitle>
                <CardDescription>Candidate progression through stages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(recruitmentStats?.recruitmentPipeline ?? data.recruitment.recruitmentPipeline).map(([stage, count]) => (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize font-medium">{stage}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <Progress value={(count / Math.max((recruitmentStats?.totalCandidates ?? data.recruitment.totalCandidates), 1)) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recruitment Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Offer Acceptance Rate</p>
                    <p className="text-2xl font-bold">{recruitmentStats?.offerAcceptanceRate ?? data.recruitment.offerAcceptanceRate}%</p>
                  </div>
                  <Award className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Avg Time to Hire</p>
                    <p className="text-2xl font-bold">{recruitmentStats?.avgTimeToHire ?? data.recruitment.avgTimeToHire} days</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Urgent Open Positions</CardTitle>
              <CardDescription>Positions requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(recruitmentStats?.urgentPositions ?? data.recruitment.urgentPositions).map((position, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{position.title}</p>
                        <Badge variant={
                          position.priority === 'critical' ? 'destructive' :
                          position.priority === 'high' ? 'default' : 'secondary'
                        } className="text-xs">
                          {position.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{position.department}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="text-muted-foreground">Open for</p>
                        <p className="font-medium">{position.daysOpen} days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Applicants</p>
                        <p className="font-medium">{position.applicants}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        View <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Avg Performance Score" value={data.performance.avgPerformanceScore} suffix="/10" icon={Target} compact />
            <MetricCard title="Reviews Completed" value={data.performance.reviewsCompleted} icon={CheckCircle} iconColor="green" compact />
            <MetricCard title="Reviews Pending" value={data.performance.reviewsPending} icon={Clock} iconColor="orange" compact />
            <MetricCard title="Goals Achieved" value={`${data.performance.goalsAchieved}/${data.performance.totalGoals}`} icon={Target} iconColor="blue" compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Performers</CardTitle>
                <CardDescription>Highest scoring employees this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.performance.topPerformers.map((performer, index) => (
                    <div key={performer.id} className="flex items-center gap-4">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                        #{index + 1}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{performer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{performer.name}</p>
                        <p className="text-sm text-muted-foreground">{performer.department}</p>
                      </div>
                      <Badge variant="secondary" className="font-bold">{performer.score}/10</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Department Performance</CardTitle>
                <CardDescription>Average scores by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.performance.departmentScores.map((dept) => (
                    <div key={dept.department} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{dept.department}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{dept.score}/10</span>
                          <Badge variant="secondary" className={dept.improvement >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {dept.improvement >= 0 ? '+' : ''}{dept.improvement}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={dept.score * 10} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="New Hires (MTD)" value={onboardingStats?.newHiresThisMonth ?? data.onboarding.newHiresThisMonth} icon={UserPlus} compact />
            <MetricCard title="In Progress" value={onboardingStats?.onboardingInProgress ?? data.onboarding.onboardingInProgress} icon={Activity} iconColor="blue" compact />
            <MetricCard title="Completed" value={onboardingStats?.onboardingCompleted ?? data.onboarding.onboardingCompleted} icon={CheckCircle} iconColor="green" compact />
            <MetricCard title="Avg Completion" value={onboardingStats?.avgCompletionTime ?? data.onboarding.avgCompletionTime} suffix=" days" icon={Clock} compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Onboarding Checklist Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'Documents Submitted', value: onboardingStats?.checklistSummary.documentsSubmitted ?? data.onboarding.checklistSummary.documentsSubmitted, total: onboardingStats?.checklistSummary.total ?? data.onboarding.checklistSummary.total, icon: FileCheck },
                    { label: 'IT Setup Complete', value: onboardingStats?.checklistSummary.itSetupComplete ?? data.onboarding.checklistSummary.itSetupComplete, total: onboardingStats?.checklistSummary.total ?? data.onboarding.checklistSummary.total, icon: Laptop },
                    { label: 'Training Assigned', value: onboardingStats?.checklistSummary.trainingAssigned ?? data.onboarding.checklistSummary.trainingAssigned, total: onboardingStats?.checklistSummary.total ?? data.onboarding.checklistSummary.total, icon: BookOpen },
                    { label: 'Mentor Assigned', value: onboardingStats?.checklistSummary.mentorAssigned ?? data.onboarding.checklistSummary.mentorAssigned, total: onboardingStats?.checklistSummary.total ?? data.onboarding.checklistSummary.total, icon: Users },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                          <span>{item.label}</span>
                        </div>
                        <span className="font-medium">{item.value}/{item.total}</span>
                      </div>
                      <Progress value={item.total > 0 ? (item.value / item.total) * 100 : 0} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Onboarding Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(onboardingStats?.pendingTasks ?? data.onboarding.pendingTasks).map((task) => (
                    <div key={task.id} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {task.employee.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{task.employee}</p>
                            <p className="text-xs text-muted-foreground">Day {task.daysElapsed}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{task.tasksCompleted}/{task.totalTasks}</Badge>
                      </div>
                      <Progress value={(task.tasksCompleted / task.totalTasks) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Exits Tab */}
        <TabsContent value="exits" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Resignations (MTD)" value={exitsStats?.resignationsThisMonth ?? data.exits.resignationsThisMonth} icon={UserMinus} iconColor="red" compact />
            <MetricCard title="Turnover Rate" value={exitsStats?.turnoverRate ?? data.exits.turnoverRate} suffix="%" icon={TrendingDown} iconColor="orange" compact />
            <MetricCard title="Retention Rate" value={exitsStats?.retentionRate ?? data.exits.retentionRate} suffix="%" icon={UserCheck} iconColor="green" compact />
            <MetricCard title="Exit Interviews Pending" value={exitsStats?.exitInterviewsPending ?? data.exits.exitInterviewsPending} icon={ClipboardCheck} compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Exit Reasons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(exitsStats?.topExitReasons ?? data.exits.topExitReasons).map((reason) => (
                    <div key={reason.reason} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{reason.reason}</span>
                        <span className="text-muted-foreground">{reason.count} ({reason.percentage}%)</span>
                      </div>
                      <Progress value={reason.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exits by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(exitsStats?.exitsByDepartment ?? data.exits.exitsByDepartment).map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{dept.department}</p>
                        <p className="text-sm text-muted-foreground">{dept.exits} employees</p>
                      </div>
                      <Badge variant={dept.rate > 3 ? 'destructive' : 'secondary'} className="font-bold">
                        {dept.rate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compensation Tab */}
        <TabsContent value="compensation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Payroll" value={`${(data.compensation.totalPayroll / 1000000).toFixed(1)}M`} prefix="$" icon={DollarSign} compact />
            <MetricCard title="Avg Salary" value={`${(data.compensation.avgSalary / 1000).toFixed(0)}K`} prefix="$" icon={DollarSign} compact />
            <MetricCard title="Expense Claims" value={data.compensation.expenseClaimsPending} icon={FileText} iconColor="orange" compact description={`$${(data.compensation.expenseClaimsAmount / 1000).toFixed(0)}K pending`} />
            <MetricCard title="Benefits Enrollment" value={data.compensation.benefitsEnrollment} suffix="%" icon={Heart} iconColor="red" compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Salary Increase Budget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Budget Used</span>
                    <span className="font-medium">
                      ${(data.compensation.salaryIncreasesUsed / 1000).toFixed(0)}K / ${(data.compensation.salaryIncreasesBudget / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <Progress value={(data.compensation.salaryIncreasesUsed / data.compensation.salaryIncreasesBudget) * 100} className="h-2" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm font-medium">Pending Increments</span>
                  <Badge variant="secondary">{data.compensation.pendingIncrements}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.compensation.topBenefits.map((benefit) => {
                    const BenefitIcon = getIcon(benefit.icon);
                    return (
                      <div key={benefit.benefit} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            <BenefitIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{benefit.benefit}</p>
                            <p className="text-sm text-muted-foreground">{benefit.enrolled} enrolled</p>
                          </div>
                        </div>
                        {benefit.cost > 0 && (
                          <span className="text-sm font-medium">${(benefit.cost / 1000).toFixed(0)}K/mo</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Diversity Tab */}
        <TabsContent value="diversity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Male', value: diversityStats?.genderRatio.male ?? data.diversity.genderRatio.male, color: 'bg-blue-500' },
                    { label: 'Female', value: diversityStats?.genderRatio.female ?? data.diversity.genderRatio.female, color: 'bg-pink-500' },
                    { label: 'Other', value: diversityStats?.genderRatio.other ?? data.diversity.genderRatio.other, color: 'bg-purple-500' },
                  ].map((item) => {
                    const totalEmps = (diversityStats?.genderRatio.male ?? 0) + (diversityStats?.genderRatio.female ?? 0) + (diversityStats?.genderRatio.other ?? 0) || data.overview.totalEmployees;
                    return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${item.color}`} />
                          <span>{item.label}</span>
                        </div>
                        <span className="font-medium">{item.value} ({totalEmps > 0 ? ((item.value / totalEmps) * 100).toFixed(1) : 0}%)</span>
                      </div>
                      <Progress value={totalEmps > 0 ? (item.value / totalEmps) * 100 : 0} className="h-2" />
                    </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Age Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(diversityStats?.ageDistribution ?? data.diversity.ageDistribution).map((age) => (
                    <div key={age.range} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{age.range}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={age.percentage} className="w-20 h-2" />
                        <Badge variant="secondary">{age.count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Location Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(diversityStats?.locationDistribution ?? data.diversity.locationDistribution).map((loc) => (
                    <div key={loc.location} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{loc.location}</span>
                      </div>
                      <Badge variant="secondary">{loc.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Satisfaction Score" value={data.engagement.satisfactionScore} suffix="/10" icon={ThumbsUp} iconColor="green" compact />
            <MetricCard title="Engagement Score" value={data.engagement.engagementScore} suffix="/10" icon={Heart} iconColor="red" compact />
            <MetricCard title="eNPS" value={data.engagement.eNPS} icon={Target} iconColor="blue" compact />
            <MetricCard title="Survey Response" value={data.engagement.surveyResponseRate} suffix="%" icon={BarChart3} iconColor="purple" compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <MiniStatCard title="Recognitions" value={data.engagement.recognitionsThisMonth} icon={Award} iconColor="yellow" />
                  <MiniStatCard title="Feedback" value={data.engagement.feedbackSubmitted} icon={MessageSquareWarning} iconColor="blue" />
                  <MiniStatCard title="1-on-1s" value={data.engagement.oneOnOnesMeetings} icon={Users} iconColor="green" />
                  <MiniStatCard title="Team Events" value={data.engagement.teamEvents} icon={PartyPopper} iconColor="pink" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Recognitions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.engagement.recentRecognitions.map((rec, i) => (
                    <div key={i} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">{rec.from}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{rec.to}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.timestamp}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Compliance Rate" value={complianceStats?.complianceRate ?? data.compliance.complianceRate} suffix="%" icon={Shield} iconColor="green" compact />
            <MetricCard title="Documents Expiring" value={complianceStats?.documentsExpiring ?? data.compliance.documentsExpiring} icon={FileWarning} iconColor="orange" compact />
            <MetricCard title="Training Overdue" value={complianceStats?.mandatoryTrainingOverdue ?? data.compliance.mandatoryTrainingOverdue} icon={AlertTriangle} iconColor="red" compact />
            <MetricCard title="BG Verifications" value={`${complianceStats?.bgVerificationsCompleted ?? data.compliance.bgVerificationsCompleted}/${(complianceStats?.bgVerificationsCompleted ?? data.compliance.bgVerificationsCompleted) + (complianceStats?.bgVerificationsPending ?? data.compliance.bgVerificationsPending)}`} icon={ClipboardCheck} compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expiring Documents</CardTitle>
                <CardDescription>Documents requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(complianceStats?.expiringDocuments ?? data.compliance.expiringDocuments).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{doc.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{doc.documentType}</p>
                      </div>
                      <Badge variant={
                        doc.status === 'expired' ? 'destructive' :
                        doc.status === 'expiring-soon' ? 'default' : 'secondary'
                      }>
                        {doc.daysUntil < 0 ? 'Expired' : `${doc.daysUntil} days`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending Verifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(complianceStats?.pendingVerifications ?? data.compliance.pendingVerifications).map((ver) => (
                    <div key={ver.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{ver.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{ver.verificationType}</p>
                      </div>
                      <Badge variant={
                        ver.status === 'in-progress' ? 'default' :
                        ver.status === 'pending' ? 'secondary' : 'outline'
                      }>
                        {ver.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Skills" value={data.skills.totalSkills} icon={Code} compact />
            <MetricCard title="Certifications" value={data.skills.totalCertifications} icon={BadgeCheck} iconColor="green" compact />
            <MetricCard title="Skill Gaps" value={data.skills.skillGaps} icon={AlertCircle} iconColor="orange" compact />
            <MetricCard title="Certs Expiring" value={data.skills.certificationsDue} icon={FileClock} iconColor="red" compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {data.skills.topSkills.map((skill) => (
                    <Badge key={skill.skill} variant="outline" className="text-sm py-1.5 px-3">
                      {skill.skill}
                      <span className="ml-2 text-xs text-muted-foreground">{skill.count}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expiring Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.skills.upcomingCertifications.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{cert.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{cert.certification}</p>
                      </div>
                      <Badge variant="secondary">{cert.daysUntil} days</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Assigned" value={data.assets.totalAssetsAssigned} icon={Laptop} compact />
            <MetricCard title="Pending Returns" value={data.assets.pendingReturns} icon={Package} iconColor="orange" compact />
            <MetricCard title="Pending Issues" value={data.assets.pendingIssues} icon={AlertCircle} iconColor="yellow" compact />
            <MetricCard title="Categories" value={data.assets.assetsByCategory.length} icon={Layers} compact />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assets by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.assets.assetsByCategory.map((asset) => {
                    const AssetIcon = getIcon(asset.icon);
                    return (
                      <div key={asset.category} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            <AssetIcon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{asset.category}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-600">{asset.assigned} assigned</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-blue-600">{asset.available} available</span>
                          {asset.maintenance > 0 && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-orange-600">{asset.maintenance} maintenance</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.assets.recentAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{assignment.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{assignment.assetName}</p>
                      </div>
                      <Badge variant={
                        assignment.status === 'assigned' ? 'default' :
                        assignment.status === 'pending-return' ? 'secondary' : 'outline'
                      }>
                        {assignment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
