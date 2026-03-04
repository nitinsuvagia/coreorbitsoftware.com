/**
 * HR Dashboard API Client
 * Provides functions for fetching HR 360 dashboard data
 */

import { get } from './client';

// ============================================================================
// TYPES
// ============================================================================

export interface HRAlert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  category: string;
  title: string;
  description: string;
  timestamp: string;
  action?: string;
  actionUrl?: string;
}

export interface ProbationContractStatus {
  onProbation: number;
  contractExpiring: number;
  probationEnding: Array<{
    id: string;
    name: string;
    department: string;
    endDate: string;
    daysRemaining: number;
  }>;
  contractsEnding: Array<{
    id: string;
    name: string;
    department: string;
    endDate: string;
    daysRemaining: number;
  }>;
}

export interface LeaveRequestsSummary {
  leaveRequests: {
    pending: number;
    approved: number;
    rejected: number;
  };
  leaveBalance: Record<string, number>;
  recentPending: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    department: string;
    leaveType: string;
    fromDate: string;
    toDate: string;
    totalDays: number;
    reason: string;
    createdAt: string;
  }>;
}

export interface UpcomingEvents {
  birthdays: Array<{
    id: string;
    name: string;
    department: string;
    avatar?: string;
    date: string;
    daysUntil: number;
  }>;
  workAnniversaries: Array<{
    id: string;
    name: string;
    department: string;
    avatar?: string;
    date: string;
    years: number;
    daysUntil: number;
  }>;
  holidays: Array<{
    name: string;
    date: string;
    type: string;
    daysUntil: number;
  }>;
}

export interface RecentActivity {
  id: string;
  type: string;
  action: string;
  employee: string;
  entityType: string;
  entityId: string;
  details?: string;
  timestamp: string;
  createdAt: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get HR alerts and notifications
 */
export async function getHRAlerts(): Promise<HRAlert[]> {
  try {
    return await get<HRAlert[]>('/api/v1/employees/hr-alerts');
  } catch (error) {
    console.error('Error fetching HR alerts:', error);
    return [];
  }
}

/**
 * Get probation and contract status
 */
export async function getProbationContractStatus(): Promise<ProbationContractStatus> {
  try {
    return await get<ProbationContractStatus>('/api/v1/employees/probation-contract-status');
  } catch (error) {
    console.error('Error fetching probation/contract status:', error);
    return {
      onProbation: 0,
      contractExpiring: 0,
      probationEnding: [],
      contractsEnding: [],
    };
  }
}

/**
 * Get leave requests summary
 */
export async function getLeaveRequestsSummary(): Promise<LeaveRequestsSummary> {
  try {
    return await get<LeaveRequestsSummary>('/api/v1/employees/leave-requests-summary');
  } catch (error) {
    console.error('Error fetching leave requests summary:', error);
    return {
      leaveRequests: { pending: 0, approved: 0, rejected: 0 },
      leaveBalance: {},
      recentPending: [],
    };
  }
}

/**
 * Get upcoming events (birthdays, anniversaries, holidays)
 */
export async function getUpcomingEvents(): Promise<UpcomingEvents> {
  try {
    return await get<UpcomingEvents>('/api/v1/employees/upcoming-events');
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return {
      birthdays: [],
      workAnniversaries: [],
      holidays: [],
    };
  }
}

/**
 * Get recent HR activities
 */
export async function getRecentActivities(limit: number = 20): Promise<RecentActivity[]> {
  try {
    return await get<RecentActivity[]>(`/api/v1/employees/recent-activities?limit=${limit}`);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
}

/**
 * Get all HR 360 dashboard data in a single call
 * This is more efficient than calling each endpoint separately
 */
export async function getHRDashboardData(): Promise<{
  alerts: HRAlert[];
  probationStatus: ProbationContractStatus;
  leaveRequests: LeaveRequestsSummary;
  upcomingEvents: UpcomingEvents;
  recentActivities: RecentActivity[];
}> {
  const [alerts, probationStatus, leaveRequests, upcomingEvents, recentActivities] = await Promise.all([
    getHRAlerts(),
    getProbationContractStatus(),
    getLeaveRequestsSummary(),
    getUpcomingEvents(),
    getRecentActivities(),
  ]);

  return {
    alerts,
    probationStatus,
    leaveRequests,
    upcomingEvents,
    recentActivities,
  };
}

// ============================================================================
// NEW HR DASHBOARD TAB DATA APIs
// ============================================================================

export interface RecruitmentStats {
  openPositions: number;
  totalCandidates: number;
  interviewsScheduled: number;
  offersExtended: number;
  offerAcceptanceRate: number;
  avgTimeToHire: number;
  hiredThisMonth: number;
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
}

export interface OnboardingStats {
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
}

export interface ExitsStats {
  resignationsThisMonth: number;
  terminationsThisMonth: number;
  totalExits: number;
  turnoverRate: number;
  retentionRate: number;
  avgNoticePeriod: number;
  exitInterviewsCompleted: number;
  exitInterviewsPending: number;
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
}

export interface DiversityStats {
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
  locationDistribution: Array<{
    location: string;
    count: number;
  }>;
  departmentDiversity: Array<{
    department: string;
    diversityScore: number;
    malePercentage: number;
    femalePercentage: number;
  }>;
}

export interface ComplianceStats {
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
}

/**
 * Get recruitment statistics
 */
export async function getRecruitmentStats(): Promise<RecruitmentStats> {
  try {
    return await get<RecruitmentStats>('/api/v1/employees/recruitment-stats');
  } catch (error) {
    console.error('Error fetching recruitment stats:', error);
    return {
      openPositions: 0,
      totalCandidates: 0,
      interviewsScheduled: 0,
      offersExtended: 0,
      offerAcceptanceRate: 0,
      avgTimeToHire: 0,
      hiredThisMonth: 0,
      recruitmentPipeline: { applied: 0, screening: 0, interview: 0, offer: 0, hired: 0 },
      urgentPositions: [],
      hiringTrend: [],
    };
  }
}

/**
 * Get onboarding statistics
 */
export async function getOnboardingStats(): Promise<OnboardingStats> {
  try {
    return await get<OnboardingStats>('/api/v1/employees/onboarding-stats');
  } catch (error) {
    console.error('Error fetching onboarding stats:', error);
    return {
      newHiresThisMonth: 0,
      onboardingInProgress: 0,
      onboardingCompleted: 0,
      avgCompletionTime: 0,
      completionRate: 0,
      pendingTasks: [],
      checklistSummary: { documentsSubmitted: 0, itSetupComplete: 0, trainingAssigned: 0, mentorAssigned: 0, total: 0 },
    };
  }
}

/**
 * Get exits/attrition statistics
 */
export async function getExitsStats(): Promise<ExitsStats> {
  try {
    return await get<ExitsStats>('/api/v1/employees/exits-stats');
  } catch (error) {
    console.error('Error fetching exits stats:', error);
    return {
      resignationsThisMonth: 0,
      terminationsThisMonth: 0,
      totalExits: 0,
      turnoverRate: 0,
      retentionRate: 100,
      avgNoticePeriod: 30,
      exitInterviewsCompleted: 0,
      exitInterviewsPending: 0,
      topExitReasons: [],
      exitsByDepartment: [],
      attritionTrend: [],
    };
  }
}

/**
 * Get diversity statistics
 */
export async function getDiversityStats(): Promise<DiversityStats> {
  try {
    return await get<DiversityStats>('/api/v1/employees/diversity-stats');
  } catch (error) {
    console.error('Error fetching diversity stats:', error);
    return {
      genderRatio: { male: 0, female: 0, other: 0 },
      ageDistribution: [],
      tenureDistribution: [],
      locationDistribution: [],
      departmentDiversity: [],
    };
  }
}

/**
 * Get compliance statistics
 */
export async function getComplianceStats(): Promise<ComplianceStats> {
  try {
    return await get<ComplianceStats>('/api/v1/employees/compliance-stats');
  } catch (error) {
    console.error('Error fetching compliance stats:', error);
    return {
      documentsExpiring: 0,
      documentsPending: 0,
      complianceRate: 0,
      bgVerificationsPending: 0,
      bgVerificationsCompleted: 0,
      mandatoryTrainingOverdue: 0,
      policiesAcknowledged: 0,
      totalPolicies: 0,
      expiringDocuments: [],
      pendingVerifications: [],
    };
  }
}

// Performance stats interface and function
export interface PerformanceStats {
  avgScore: number;
  reviewsCompleted: number;
  reviewsPending: number;
  reviewsDue: number;
  topPerformers: Array<{
    id: string;
    name: string;
    department: string;
    avatar?: string;
    score: number;
  }>;
  needsImprovement: number;
  departmentScores: Array<{
    department: string;
    score: number;
  }>;
}

export async function getPerformanceStats(): Promise<PerformanceStats> {
  try {
    return await get<PerformanceStats>('/api/v1/employees/performance-stats');
  } catch (error) {
    console.error('Error fetching performance stats:', error);
    return {
      avgScore: 0,
      reviewsCompleted: 0,
      reviewsPending: 0,
      reviewsDue: 0,
      topPerformers: [],
      needsImprovement: 0,
      departmentScores: [],
    };
  }
}

// Compensation stats interface and function
export interface CompensationStats {
  totalPayroll: number;
  avgSalary: number;
  currency: string;
  employeesWithSalary: number;
  employeesWithoutSalary: number;
  salaryBands: Array<{
    range: string;
    count: number;
  }>;
  departmentSalaries: Array<{
    departmentId: string;
    department: string;
    totalSalary: number;
    employeeCount: number;
    avgSalary: number;
  }>;
}

export async function getCompensationStats(): Promise<CompensationStats> {
  try {
    return await get<CompensationStats>('/api/v1/employees/compensation-stats');
  } catch (error) {
    console.error('Error fetching compensation stats:', error);
    return {
      totalPayroll: 0,
      avgSalary: 0,
      currency: 'INR',
      employeesWithSalary: 0,
      employeesWithoutSalary: 0,
      salaryBands: [],
      departmentSalaries: [],
    };
  }
}

// Engagement stats interface and function
export interface EngagementStats {
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
}

export async function getEngagementStats(): Promise<EngagementStats> {
  try {
    return await get<EngagementStats>('/api/v1/employees/engagement-stats');
  } catch (error) {
    console.error('Error fetching engagement stats:', error);
    return {
      satisfactionScore: 0,
      engagementScore: 0,
      eNPS: 0,
      surveyResponseRate: 0,
      recognitionsThisMonth: 0,
      feedbackSubmitted: 0,
      oneOnOnesMeetings: 0,
      teamEvents: 0,
      pendingSurveys: 0,
      recentRecognitions: [],
    };
  }
}

// Skills stats interface and function
export interface SkillsStats {
  totalUniqueSkills: number;
  employeesWithSkills: number;
  avgSkillsPerEmployee: number;
  topSkills: Array<{
    skill: string;
    count: number;
  }>;
}

export async function getSkillsStats(): Promise<SkillsStats> {
  try {
    return await get<SkillsStats>('/api/v1/employees/skills-stats');
  } catch (error) {
    console.error('Error fetching skills stats:', error);
    return {
      totalUniqueSkills: 0,
      employeesWithSkills: 0,
      avgSkillsPerEmployee: 0,
      topSkills: [],
    };
  }
}

// Assets stats interface and function
export interface AssetsStats {
  totalAssigned: number;
  pendingReturns: number;
  pendingIssues: number;
  assetsByCategory: Array<{
    category: string;
    icon: string;
    assigned: number;
    available: number;
  }>;
  recentAssignments: Array<{
    id: string;
    employeeName: string;
    assetName: string;
    date: string;
    status: string;
  }>;
}

export async function getAssetsStats(): Promise<AssetsStats> {
  try {
    return await get<AssetsStats>('/api/v1/employees/assets-stats');
  } catch (error) {
    console.error('Error fetching assets stats:', error);
    return {
      totalAssigned: 0,
      pendingReturns: 0,
      pendingIssues: 0,
      assetsByCategory: [],
      recentAssignments: [],
    };
  }
}
