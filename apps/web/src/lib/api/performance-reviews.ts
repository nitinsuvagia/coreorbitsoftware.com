/**
 * Performance Reviews API Client
 */

import { apiClient } from './client';

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string | null;
  reviewPeriod: string;
  reviewType: 'monthly' | 'quarterly' | 'annual' | '360' | 'probation';
  communicationRating: number | null;
  technicalSkillsRating: number | null;
  teamworkRating: number | null;
  problemSolvingRating: number | null;
  punctualityRating: number | null;
  initiativeRating: number | null;
  overallRating: number | null;
  strengths: string | null;
  areasForImprovement: string | null;
  goalsNextPeriod: string | null;
  additionalComments: string | null;
  status: 'draft' | 'submitted' | 'acknowledged';
  submittedAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeCode: string;
  };
  reviewer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
}

export interface PerformanceReviewStats {
  totalReviews: number;
  reviewsSubmitted: number;
  reviewsDraft: number;
  reviewsAcknowledged: number;
  avgOverallRating: number;
  employeesReviewed: number;
  uniqueReviewers: number;
}

export interface PerformanceSummary {
  scores: {
    communication: number;
    technicalSkills: number;
    teamwork: number;
    problemSolving: number;
    punctuality: number;
    initiative: number;
  };
  overallRating: number;
  totalReviews: number;
  latestReviewPeriod: string | null;
  latestReviewDate: string | null;
  trend: 'up' | 'down' | 'neutral';
  percentile: number;
}

export interface CreateReviewInput {
  employeeId: string;
  reviewPeriod: string;
  reviewType?: 'monthly' | 'quarterly' | 'annual' | '360' | 'probation';
  communicationRating?: number;
  technicalSkillsRating?: number;
  teamworkRating?: number;
  problemSolvingRating?: number;
  punctualityRating?: number;
  initiativeRating?: number;
  overallRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  goalsNextPeriod?: string;
  additionalComments?: string;
  status?: 'draft' | 'submitted';
}

export interface UpdateReviewInput {
  reviewPeriod?: string;
  reviewType?: 'monthly' | 'quarterly' | 'annual' | '360' | 'probation';
  communicationRating?: number;
  technicalSkillsRating?: number;
  teamworkRating?: number;
  problemSolvingRating?: number;
  punctualityRating?: number;
  initiativeRating?: number;
  overallRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  goalsNextPeriod?: string;
  additionalComments?: string;
  status?: 'draft' | 'submitted';
}

export interface ReviewListParams {
  employeeId?: string;
  reviewerId?: string;
  status?: string;
  reviewType?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

export async function listPerformanceReviews(params?: ReviewListParams): Promise<{ data: PerformanceReview[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
  const searchParams = new URLSearchParams();
  if (params?.employeeId) searchParams.set('employeeId', params.employeeId);
  if (params?.reviewerId) searchParams.set('reviewerId', params.reviewerId);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.reviewType) searchParams.set('reviewType', params.reviewType);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  
  const qs = searchParams.toString();
  const url = `/api/v1/performance-reviews${qs ? `?${qs}` : ''}`;
  const response = await apiClient.get(url);
  const pg = (response as any).pagination;
  // Return { data: reviews[], pagination } so the page can use both
  return { 
    data: Array.isArray(response.data) ? response.data : [], 
    pagination: pg
      ? { page: pg.page, pageSize: pg.pageSize || pg.limit || 20, total: pg.total, totalPages: pg.totalPages }
      : { page: 1, pageSize: 20, total: 0, totalPages: 0 }
  };
}

export async function getPerformanceReview(id: string) {
  const { data } = await apiClient.get(`/api/v1/performance-reviews/${id}`);
  return data as PerformanceReview;
}

export async function getPerformanceReviewStats() {
  const { data } = await apiClient.get('/api/v1/performance-reviews/stats');
  return data as PerformanceReviewStats;
}

export async function getEmployeePerformanceSummary(employeeId: string) {
  const { data } = await apiClient.get(`/api/v1/performance-reviews/summary/${employeeId}`);
  return data as PerformanceSummary;
}

export async function getEmployeeReviews(employeeId: string) {
  const { data } = await apiClient.get(`/api/v1/performance-reviews/employee/${employeeId}`);
  return data as PerformanceReview[];
}

export async function createPerformanceReview(input: CreateReviewInput): Promise<{ success: boolean; message?: string; data?: PerformanceReview }> {
  const response = await apiClient.post('/api/v1/performance-reviews', input);
  return response.data as { success: boolean; message?: string; data?: PerformanceReview };
}

export async function updatePerformanceReview(id: string, input: UpdateReviewInput): Promise<{ success: boolean; message?: string; data?: PerformanceReview }> {
  const response = await apiClient.put(`/api/v1/performance-reviews/${id}`, input);
  return response.data as { success: boolean; message?: string; data?: PerformanceReview };
}

export async function deletePerformanceReview(id: string) {
  const { data } = await apiClient.delete(`/api/v1/performance-reviews/${id}`);
  return data;
}

export async function acknowledgeReview(id: string) {
  const { data } = await apiClient.put(`/api/v1/performance-reviews/${id}/acknowledge`);
  return data;
}

export async function getPendingReviewsCount() {
  const { data } = await apiClient.get('/api/v1/performance-reviews/pending/count');
  return data as { count: number };
}
