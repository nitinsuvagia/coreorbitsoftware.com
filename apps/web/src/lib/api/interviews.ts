/**
 * Interviews API Client
 * Frontend Types & Mock API for Interview Module
 */

import { api } from './client';

// ============================================================================
// ENUMS
// ============================================================================

export type InterviewType = 
  | 'PHONE_SCREEN' 
  | 'TECHNICAL' 
  | 'HR' 
  | 'MANAGER' 
  | 'FINAL' 
  | 'ASSIGNMENT'
  | 'ASSESSMENT';

export type InterviewStatus = 
  | 'SCHEDULED' 
  | 'CONFIRMED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'RESCHEDULED' 
  | 'NO_SHOW';

export type InterviewMode = 'VIDEO' | 'PHONE' | 'IN_PERSON';

export type Recommendation = 
  | 'STRONG_HIRE' 
  | 'HIRE' 
  | 'MAYBE' 
  | 'NO_HIRE' 
  | 'STRONG_NO_HIRE';

// ============================================================================
// INTERFACES
// ============================================================================

export interface InterviewPanelist {
  id: string;
  interviewId: string;
  employeeId: string;
  isLead: boolean;
  joinedAt?: string;
  feedbackSubmitted: boolean;
  // Populated fields
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    designation?: string;
    department?: string;
  };
}

export interface InterviewFeedback {
  id: string;
  interviewId: string;
  interviewerId: string;
  // Ratings (1-5)
  technicalRating?: number;
  problemSolvingRating?: number;
  communicationRating?: number;
  culturalFitRating?: number;
  leadershipRating?: number;
  overallRating: number;
  // Text feedback
  strengths?: string;
  weaknesses?: string;
  comments?: string;
  // Recommendation
  recommendation: Recommendation;
  isDraft: boolean;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Populated
  interviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface Interview {
  id: string;
  candidateId: string;
  jobId: string;
  // Interview Details
  type: InterviewType;
  roundNumber: number;
  totalRounds: number;
  scheduledAt: string;
  duration: number; // minutes
  mode: InterviewMode;
  meetingLink?: string;
  location?: string;
  instructions?: string;
  status: InterviewStatus;
  // Timestamps
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  // Populated Relations
  candidate?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    resumeUrl?: string;
    currentCompany?: string;
    currentRole?: string;
  };
  job?: {
    id: string;
    title: string;
    department: string;
  };
  panelists?: InterviewPanelist[];
  feedback?: InterviewFeedback[];
}

export interface CreateInterviewDto {
  candidateId: string;
  jobId: string;
  type: InterviewType;
  roundNumber: number;
  scheduledAt: string;
  duration: number;
  mode: InterviewMode;
  meetingLink?: string;
  location?: string;
  instructions?: string;
  panelistIds: string[];
  sendCalendarInvite?: boolean;
  sendEmailNotification?: boolean;
}

export interface UpdateInterviewDto {
  scheduledAt?: string;
  duration?: number;
  mode?: InterviewMode;
  meetingLink?: string;
  location?: string;
  instructions?: string;
  status?: InterviewStatus;
  panelistIds?: string[];
}

export interface SubmitFeedbackDto {
  technicalRating?: number;
  problemSolvingRating?: number;
  communicationRating?: number;
  culturalFitRating?: number;
  leadershipRating?: number;
  overallRating: number;
  strengths?: string;
  weaknesses?: string;
  comments?: string;
  recommendation: Recommendation;
  isDraft?: boolean;
  interviewerId?: string;
}

export interface InterviewFilters {
  status?: InterviewStatus | 'all';
  type?: InterviewType | 'all';
  jobId?: string;
  candidateId?: string;
  interviewerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface InterviewStats {
  totalScheduled: number;
  totalCompleted: number;
  totalCancelled: number;
  totalNoShow: number;
  passRate: number;
  avgFeedbackTime: number; // hours
  upcomingToday: number;
  upcomingWeek: number;
  upcomingAll: number;
  upcomingExcludingToday: number;
}

export interface InterviewAnalytics {
  overview: {
    totalScheduled: number;
    totalCompleted: number;
    totalCancelled: number;
    totalNoShow: number;
    avgTimeToHire: number | null;
    passRate: number;
    upcomingToday: number;
    upcomingWeek: number;
  };
  trends: {
    scheduledChange: number;
    completedChange: number;
    cancelledChange: number;
    passRateChange: number;
  };
  interviewsByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  passRateByRound: Array<{
    round: string;
    passRate: number;
    total: number;
    passed: number;
  }>;
  topInterviewers: Array<{
    id: string;
    name: string;
    avatar?: string;
    designation: string;
    interviews: number;
    avgRating: number;
    feedbackTime: number;
  }>;
  hiresByDepartment: Array<{
    department: string;
    hires: number;
    interviews: number;
    rate: number;
  }>;
  recentActivity: Array<{
    candidate: string;
    action: string;
    time: string;
    result: string | null;
  }>;
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

export const interviewTypeLabels: Record<InterviewType, string> = {
  PHONE_SCREEN: 'Phone Screen',
  TECHNICAL: 'Technical Interview',
  HR: 'HR Round',
  MANAGER: 'Manager Round',
  FINAL: 'Final Round',
  ASSIGNMENT: 'Assignment Review',
  ASSESSMENT: 'Online Assessment',
};

export const interviewTypeColors: Record<InterviewType, string> = {
  PHONE_SCREEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  TECHNICAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  HR: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  MANAGER: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  FINAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  ASSIGNMENT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  ASSESSMENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export const interviewStatusLabels: Record<InterviewStatus, string> = {
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  RESCHEDULED: 'Rescheduled',
  NO_SHOW: 'No Show',
};

export const interviewStatusColors: Record<InterviewStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLETED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  RESCHEDULED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  NO_SHOW: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const interviewModeLabels: Record<InterviewMode, string> = {
  VIDEO: 'Video Call',
  PHONE: 'Phone Call',
  IN_PERSON: 'In-Person',
};

export const interviewModeIcons: Record<InterviewMode, string> = {
  VIDEO: 'Video',
  PHONE: 'Phone',
  IN_PERSON: 'MapPin',
};

export const recommendationLabels: Record<Recommendation, string> = {
  STRONG_HIRE: 'Strong Hire',
  HIRE: 'Hire',
  MAYBE: 'Maybe',
  NO_HIRE: 'No Hire',
  STRONG_NO_HIRE: 'Strong No Hire',
};

export const recommendationColors: Record<Recommendation, string> = {
  STRONG_HIRE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  HIRE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  MAYBE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  NO_HIRE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  STRONG_NO_HIRE: 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300',
};

export const recommendationIcons: Record<Recommendation, string> = {
  STRONG_HIRE: '👍👍',
  HIRE: '👍',
  MAYBE: '🤔',
  NO_HIRE: '👎',
  STRONG_NO_HIRE: '👎👎',
};

// ============================================================================
// API METHODS - Real API calls to employee-service
// ============================================================================

const API_BASE = '/api/v1/interviews';

// Helper to check if it's a "no data" error (404, service unavailable, etc.)
const isNoDataError = (error: unknown): boolean => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number } };
    const status = axiosError.response?.status;
    // Return true for 404 (not found), 502/503 (service unavailable), or network errors
    return status === 404 || status === 502 || status === 503;
  }
  // Network errors (service not running)
  return true;
};

export const interviewApi = {
  /**
   * Get all interviews with optional filters
   */
  getInterviews: async (filters?: InterviewFilters): Promise<Interview[]> => {
    try {
      const params = new URLSearchParams();
      
      // Add cache-busting timestamp to prevent 304 Not Modified responses
      params.append('_t', Date.now().toString());
      
      if (filters?.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters?.type && filters.type !== 'all') {
        params.append('type', filters.type);
      }
      if (filters?.jobId) {
        params.append('jobId', filters.jobId);
      }
      if (filters?.candidateId) {
        params.append('candidateId', filters.candidateId);
      }
      if (filters?.interviewerId) {
        params.append('interviewerId', filters.interviewerId);
      }
      if (filters?.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters?.dateTo) {
        params.append('dateTo', filters.dateTo);
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }

      const queryString = params.toString();
      const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;
      
      const response = await api.get<Interview[]>(url);
      return response.data;
    } catch (error) {
      // Return empty array for "no data" scenarios (404, service unavailable)
      if (isNoDataError(error)) {
        return [];
      }
      throw error;
    }
  },

  /**
   * Get a single interview by ID
   */
  getInterview: async (id: string): Promise<Interview> => {
    const response = await api.get<Interview>(`${API_BASE}/${id}`);
    return response.data;
  },

  /**
   * Get today's interviews
   */
  getTodayInterviews: async (): Promise<Interview[]> => {
    try {
      const response = await api.get<Interview[]>(`${API_BASE}/today`);
      return response.data;
    } catch (error) {
      if (isNoDataError(error)) {
        return [];
      }
      throw error;
    }
  },

  /**
   * Get all upcoming interviews (excluding today)
   * Includes both SCHEDULED and RESCHEDULED statuses
   */
  getUpcomingInterviews: async (): Promise<Interview[]> => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      // Fetch both scheduled and rescheduled interviews
      const [scheduledResponse, rescheduledResponse] = await Promise.all([
        api.get<Interview[]>(`${API_BASE}?dateFrom=${tomorrow.toISOString()}&status=SCHEDULED`).catch(() => ({ data: [] })),
        api.get<Interview[]>(`${API_BASE}?dateFrom=${tomorrow.toISOString()}&status=RESCHEDULED`).catch(() => ({ data: [] })),
      ]);
      
      // Combine and sort by scheduled date
      const combined = [...scheduledResponse.data, ...rescheduledResponse.data];
      return combined.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    } catch (error) {
      if (isNoDataError(error)) {
        return [];
      }
      throw error;
    }
  },

  /**
   * Get past interviews
   */
  getPastInterviews: async (): Promise<Interview[]> => {
    try {
      const response = await api.get<Interview[]>(`${API_BASE}?status=COMPLETED`);
      return response.data;
    } catch (error) {
      if (isNoDataError(error)) {
        return [];
      }
      throw error;
    }
  },

  /**
   * Get interviews for a specific candidate
   */
  getCandidateInterviews: async (candidateId: string): Promise<Interview[]> => {
    try {
      const response = await api.get<Interview[]>(`${API_BASE}/candidate/${candidateId}`);
      return response.data;
    } catch (error) {
      if (isNoDataError(error)) {
        return [];
      }
      throw error;
    }
  },

  /**
   * Get interview statistics
   */
  getStats: async (filters?: { dateFrom?: string; dateTo?: string }): Promise<InterviewStats> => {
    try {
      const params = new URLSearchParams();
      if (filters?.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters?.dateTo) {
        params.append('dateTo', filters.dateTo);
      }
      
      const queryString = params.toString();
      const url = queryString ? `${API_BASE}/stats?${queryString}` : `${API_BASE}/stats`;
      
      const response = await api.get<InterviewStats>(url);
      return response.data;
    } catch (error) {
      // Return default empty stats when API is unavailable
      if (isNoDataError(error)) {
        return {
          totalScheduled: 0,
          totalCompleted: 0,
          totalCancelled: 0,
          totalNoShow: 0,
          passRate: 0,
          avgFeedbackTime: 0,
          upcomingToday: 0,
          upcomingWeek: 0,
          upcomingAll: 0,
          upcomingExcludingToday: 0,
        };
      }
      throw error;
    }
  },

  /**
   * Get comprehensive interview analytics
   */
  getAnalytics: async (filters?: { dateFrom?: string; dateTo?: string }): Promise<InterviewAnalytics> => {
    try {
      const params = new URLSearchParams();
      if (filters?.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters?.dateTo) {
        params.append('dateTo', filters.dateTo);
      }
      
      const queryString = params.toString();
      const url = queryString ? `${API_BASE}/analytics?${queryString}` : `${API_BASE}/analytics`;
      
      const response = await api.get<InterviewAnalytics>(url);
      return response.data;
    } catch (error) {
      // Return default empty analytics when API is unavailable
      if (isNoDataError(error)) {
        return {
          overview: {
            totalScheduled: 0,
            totalCompleted: 0,
            totalCancelled: 0,
            totalNoShow: 0,
            avgTimeToHire: 0,
            passRate: 0,
            upcomingToday: 0,
            upcomingWeek: 0,
          },
          trends: {
            scheduledChange: 0,
            completedChange: 0,
            cancelledChange: 0,
            passRateChange: 0,
          },
          interviewsByType: [],
          passRateByRound: [],
          topInterviewers: [],
          hiresByDepartment: [],
          recentActivity: [],
        };
      }
      throw error;
    }
  },

  /**
   * Create a new interview
   */
  createInterview: async (data: CreateInterviewDto): Promise<Interview> => {
    const response = await api.post<Interview>(API_BASE, data);
    return response.data;
  },

  /**
   * Update an interview
   */
  updateInterview: async (id: string, data: UpdateInterviewDto): Promise<Interview> => {
    const response = await api.put<Interview>(`${API_BASE}/${id}`, data);
    return response.data;
  },

  /**
   * Cancel an interview
   */
  cancelInterview: async (id: string, reason?: string): Promise<void> => {
    await api.post(`${API_BASE}/${id}/cancel`, { reason });
  },

  /**
   * Mark interview as complete
   */
  completeInterview: async (id: string): Promise<Interview> => {
    const response = await api.post<Interview>(`${API_BASE}/${id}/complete`);
    return response.data;
  },

  /**
   * Reschedule an interview
   */
  rescheduleInterview: async (id: string, newDate: string, duration?: number): Promise<Interview> => {
    const response = await api.post<Interview>(`${API_BASE}/${id}/reschedule`, {
      scheduledAt: newDate,
      duration,
    });
    return response.data;
  },

  /**
   * Submit or update feedback for an interview
   */
  submitFeedback: async (interviewId: string, data: SubmitFeedbackDto): Promise<InterviewFeedback> => {
    const response = await api.post<InterviewFeedback>(`${API_BASE}/${interviewId}/feedback`, data);
    return response.data;
  },

  /**
   * Delete an interview
   */
  deleteInterview: async (id: string): Promise<void> => {
    await api.delete(`${API_BASE}/${id}`);
  },
};

export default interviewApi;
