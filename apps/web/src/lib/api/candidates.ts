/**
 * Candidates API Client
 */

import { api } from './client';

export interface JobCandidate {
  id: string;
  jobId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  status: 'APPLIED' | 'SCREENING' | 'SHORTLISTED' | 'INTERVIEWED' | 'OFFERED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';
  stage: 'APPLICATION' | 'PHONE_SCREEN' | 'TECHNICAL_INTERVIEW' | 'HR_INTERVIEW' | 'FINAL_INTERVIEW' | 'OFFER' | 'ONBOARDING';
  rating?: number;
  currentCompany?: string;
  currentRole?: string;
  experienceYears?: number;
  expectedSalary?: number;
  noticePeriod?: string;
  skills?: string[];
  notes?: string;
  interviewNotes?: string;
  appliedAt: string;
  screenedAt?: string;
  interviewedAt?: string;
  offeredAt?: string;
  hiredAt?: string;
  rejectedAt?: string;
  source?: string;
  job?: {
    id: string;
    title: string;
    department: string;
  };
}

export interface CreateCandidateDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  resumeData?: {
    filename: string;
    content: string; // base64 encoded
    mimeType: string;
  };
  coverLetter?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentCompany?: string;
  currentRole?: string;
  experienceYears?: number;
  expectedSalary?: number;
  noticePeriod?: string;
  skills?: string[];
  notes?: string;
  source?: string;
  jobId?: string;
}

export interface UpdateCandidateDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  stage?: string;
  rating?: number;
  notes?: string;
  interviewNotes?: string;
  resumeData?: {
    filename: string;
    content: string; // base64 encoded
    mimeType: string;
  };
}

export const candidateApi = {
  /**
   * Get all candidates across all jobs
   */
  async getAllCandidates(filters?: { status?: string; search?: string; jobId?: string }): Promise<JobCandidate[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.jobId && filters.jobId !== 'all') {
      params.append('job', filters.jobId);
    }

    const queryString = params.toString();
    const url = `/api/v1/candidates${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Get all candidates for a job
   */
  async getCandidates(jobId: string, filters?: { status?: string; search?: string }): Promise<JobCandidate[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }

    const queryString = params.toString();
    const url = `/api/v1/jobs/${jobId}/candidates${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Get a single candidate
   */
  async getCandidate(jobId: string, candidateId: string): Promise<JobCandidate> {
    const response = await api.get(`/api/v1/jobs/${jobId}/candidates/${candidateId}`);
    return response.data;
  },

  /**
   * Create a new candidate
   */
  async createCandidate(jobId: string, data: CreateCandidateDto): Promise<JobCandidate> {
    const response = await api.post(`/api/v1/jobs/${jobId}/candidates`, data);
    return response.data;
  },

  /**
   * Update a candidate
   */
  async updateCandidate(jobId: string, candidateId: string, data: UpdateCandidateDto): Promise<JobCandidate> {
    const response = await api.put(`/api/v1/jobs/${jobId}/candidates/${candidateId}`, data);
    return response.data;
  },

  /**
   * Delete a candidate
   */
  async deleteCandidate(jobId: string, candidateId: string): Promise<void> {
    await api.delete(`/api/v1/jobs/${jobId}/candidates/${candidateId}`);
  },
};

export default candidateApi;
