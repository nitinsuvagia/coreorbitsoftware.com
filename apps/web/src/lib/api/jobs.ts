/**
 * Job Description API Client
 */

import { api } from './client';

export interface JobDescription {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  status: 'open' | 'closed' | 'on-hold' | 'completed';
  postedDate: string;
  closingDate: string;
  openings: number;
  experience: {
    min: number;
    max: number;
  };
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  techStack?: string[];
  statistics?: {
    totalApplied: number;
    shortlisted: number;
    interviewed: number;
    hired: number;
  };
}

export interface CreateJobDto {
  title: string;
  department: string;
  location: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  salaryMin: number;
  salaryMax: number;
  currency?: string;
  status?: 'open' | 'on-hold' | 'closed' | 'completed';
  openings?: number;
  experienceMin?: number;
  experienceMax?: number;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  techStack?: string[];
  closingDate: string;
}

// Transform backend format to frontend format
function transformJobFromBackend(job: any): JobDescription {
  return {
    id: job.id,
    title: job.title,
    department: job.department,
    location: job.location,
    employmentType: job.employmentType.toLowerCase().replace('_', '-') as any,
    salaryRange: {
      min: job.salaryMin,
      max: job.salaryMax,
      currency: job.currency,
    },
    status: job.status.toLowerCase().replace('_', '-') as any,
    postedDate: job.postedDate.split('T')[0],
    closingDate: job.closingDate.split('T')[0],
    openings: job.openings,
    experience: {
      min: job.experienceMin,
      max: job.experienceMax,
    },
    description: job.description,
    requirements: job.requirements,
    responsibilities: job.responsibilities,
    benefits: job.benefits,
    techStack: job.techStack,
    statistics: job.totalApplied
      ? {
          totalApplied: job.totalApplied,
          shortlisted: job.shortlisted,
          interviewed: job.interviewed,
          hired: job.hired,
        }
      : undefined,
  };
}

// Transform frontend format to backend format
function transformJobToBackend(data: CreateJobDto): any {
  return {
    title: data.title,
    department: data.department,
    location: data.location,
    employmentType: data.employmentType?.toUpperCase().replace('-', '_'),
    salaryMin: data.salaryMin,
    salaryMax: data.salaryMax,
    currency: data.currency || 'USD',
    status: data.status ? data.status.toUpperCase().replace('-', '_') : 'OPEN',
    openings: data.openings || 1,
    experienceMin: data.experienceMin || 0,
    experienceMax: data.experienceMax || 0,
    description: data.description,
    requirements: data.requirements || [],
    responsibilities: data.responsibilities || [],
    benefits: data.benefits || [],
    techStack: data.techStack || [],
    closingDate: data.closingDate,
  };
}

// Transform partial update data for backend
function transformPartialJobToBackend(data: Partial<CreateJobDto>): any {
  const result: any = {};
  
  if (data.title !== undefined) result.title = data.title;
  if (data.department !== undefined) result.department = data.department;
  if (data.location !== undefined) result.location = data.location;
  if (data.employmentType !== undefined) result.employmentType = data.employmentType.toUpperCase().replace('-', '_');
  if (data.salaryMin !== undefined) result.salaryMin = data.salaryMin;
  if (data.salaryMax !== undefined) result.salaryMax = data.salaryMax;
  if (data.currency !== undefined) result.currency = data.currency;
  if (data.status !== undefined) result.status = data.status.toUpperCase().replace('-', '_');
  if (data.openings !== undefined) result.openings = data.openings;
  if (data.experienceMin !== undefined) result.experienceMin = data.experienceMin;
  if (data.experienceMax !== undefined) result.experienceMax = data.experienceMax;
  if (data.description !== undefined) result.description = data.description;
  if (data.requirements !== undefined) result.requirements = data.requirements;
  if (data.responsibilities !== undefined) result.responsibilities = data.responsibilities;
  if (data.benefits !== undefined) result.benefits = data.benefits;
  if (data.techStack !== undefined) result.techStack = data.techStack;
  if (data.closingDate !== undefined) result.closingDate = data.closingDate;
  
  return result;
}

export const jobApi = {
  /**
   * Get all jobs
   */
  async getJobs(filters?: {
    status?: string;
    department?: string;
    search?: string;
  }): Promise<JobDescription[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.search) params.append('search', filters.search);

    const url = `/api/v1/jobs${params.toString() ? `?${params}` : ''}`;
    const response = await api.get(url);
    return response.data.map(transformJobFromBackend);
  },

  /**
   * Get single job by ID
   */
  async getJob(id: string): Promise<JobDescription> {
    const response = await api.get(`/api/v1/jobs/${id}`);
    return transformJobFromBackend(response.data);
  },

  /**
   * Create new job
   */
  async createJob(data: CreateJobDto): Promise<JobDescription> {
    const response = await api.post('/api/v1/jobs', transformJobToBackend(data));
    return transformJobFromBackend(response.data);
  },

  /**
   * Update job
   */
  async updateJob(id: string, data: Partial<CreateJobDto>): Promise<JobDescription> {
    const response = await api.put(`/api/v1/jobs/${id}`, transformPartialJobToBackend(data));
    return transformJobFromBackend(response.data);
  },

  /**
   * Delete job
   */
  async deleteJob(id: string): Promise<void> {
    await api.delete(`/api/v1/jobs/${id}`);
  },

  /**
   * Update job statistics
   */
  async updateJobStatistics(
    id: string,
    statistics: {
      totalApplied?: number;
      shortlisted?: number;
      interviewed?: number;
      hired?: number;
    }
  ): Promise<JobDescription> {
    const response = await api.patch(`/api/v1/jobs/${id}/statistics`, statistics);
    return transformJobFromBackend(response.data);
  },
};
