/**
 * Job Description Service
 */

import { getTenantPrismaBySlug } from '../utils/database';
import { logger } from '../utils/logger';

export interface CreateJobDto {
  title: string;
  department: string;
  location: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  salaryMin: number;
  salaryMax: number;
  currency?: string;
  status?: 'OPEN' | 'ON_HOLD' | 'CLOSED' | 'COMPLETED';
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

export interface UpdateJobDto extends Partial<CreateJobDto> {
  totalApplied?: number;
  shortlisted?: number;
  interviewed?: number;
  hired?: number;
}

export class JobService {
  /**
   * Get all job descriptions for a tenant
   */
  static async getAllJobs(tenantSlug: string, filters?: {
    status?: string;
    department?: string;
    search?: string;
  }) {
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    const where: any = {
      deletedAt: null,
    };

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status.toUpperCase().replace('-', '_');
    }

    if (filters?.department && filters.department !== 'all') {
      where.department = filters.department;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { department: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const jobs = await db.jobDescription.findMany({
      where,
      orderBy: { postedDate: 'desc' },
    });

    logger.debug({ count: jobs.length }, 'Retrieved jobs');
    return jobs;
  }

  /**
   * Get a single job description by ID
   */
  static async getJobById(tenantSlug: string, jobId: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    const job = await db.jobDescription.findUnique({
      where: { id: jobId },
    });

    if (!job || job.deletedAt) {
      throw new Error('Job not found');
    }

    return job;
  }

  /**
   * Create a new job description
   */
  static async createJob(tenantSlug: string, data: CreateJobDto, userId?: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    const job = await db.jobDescription.create({
      data: {
        ...data,
        employmentType: data.employmentType || 'FULL_TIME',
        currency: data.currency || 'USD',
        status: data.status || 'OPEN',
        openings: data.openings || 1,
        experienceMin: data.experienceMin || 0,
        experienceMax: data.experienceMax || 0,
        requirements: data.requirements || [],
        responsibilities: data.responsibilities || [],
        benefits: data.benefits || [],
        techStack: data.techStack || [],
        closingDate: new Date(data.closingDate),
        createdBy: userId,
        updatedBy: userId,
      },
    });

    logger.info({ jobId: job.id }, 'Created job description');
    return job;
  }

  /**
   * Update a job description
   */
  static async updateJob(
    tenantSlug: string,
    jobId: string,
    data: UpdateJobDto,
    userId?: string
  ) {
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    // Check if job exists
    const existingJob = await db.jobDescription.findUnique({
      where: { id: jobId },
    });

    if (!existingJob || existingJob.deletedAt) {
      throw new Error('Job not found');
    }

    const updateData: any = { ...data };
    if (data.closingDate) {
      updateData.closingDate = new Date(data.closingDate);
    }
    updateData.updatedBy = userId;

    const job = await db.jobDescription.update({
      where: { id: jobId },
      data: updateData,
    });

    logger.info({ jobId }, 'Updated job description');
    return job;
  }

  /**
   * Delete a job description (soft delete)
   */
  static async deleteJob(tenantSlug: string, jobId: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    const job = await db.jobDescription.update({
      where: { id: jobId },
      data: { deletedAt: new Date() },
    });

    logger.info({ jobId }, 'Deleted job description');
    return job;
  }

  /**
   * Update job statistics (for completed jobs)
   */
  static async updateJobStatistics(
    tenantSlug: string,
    jobId: string,
    statistics: {
      totalApplied?: number;
      shortlisted?: number;
      interviewed?: number;
      hired?: number;
    }
  ) {
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    const job = await db.jobDescription.update({
      where: { id: jobId },
      data: statistics,
    });

    logger.info({ jobId }, 'Updated job statistics');
    return job;
  }
}
