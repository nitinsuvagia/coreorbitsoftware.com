/**
 * Candidate Service
 */

import { getTenantPrismaBySlug } from '../utils/database';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ResumeData {
  filename: string;
  content: string; // base64 encoded
  mimeType: string;
}

export interface CreateCandidateDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  resumeData?: ResumeData;
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
  resumeData?: ResumeData;
  screenedAt?: Date;
  interviewedAt?: Date;
  offeredAt?: Date;
  hiredAt?: Date;
  rejectedAt?: Date;
}

export class CandidateService {
  /**
   * Get all candidates across all jobs
   */
  static async getAllCandidates(tenantSlug: string, filters?: {
    status?: string;
    search?: string;
    jobId?: string;
  }) {
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    const where: any = {};

    if (filters?.jobId) {
      where.jobId = filters.jobId;
    }

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const candidates = await db.jobCandidate.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    logger.debug({ count: candidates.length }, 'Retrieved all candidates');
    return candidates;
  }

  /**
   * Get all candidates for a job
   */
  static async getCandidates(tenantSlug: string, jobId: string, filters?: {
    status?: string;
    search?: string;
  }) {
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    const where: any = {
      jobId,
    };

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const candidates = await db.jobCandidate.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
    });

    logger.debug({ count: candidates.length, jobId }, 'Retrieved candidates');
    return candidates;
  }

  /**
   * Get a single candidate by ID
   */
  static async getCandidateById(tenantSlug: string, jobId: string, candidateId: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    const candidate = await db.jobCandidate.findFirst({
      where: { 
        id: candidateId,
        jobId,
      },
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    return candidate;
  }

  /**
   * Create a new candidate
   */
  static async createCandidate(tenantSlug: string, jobId: string, data: CreateCandidateDto) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Verify job exists
    const job = await db.jobDescription.findFirst({
      where: { id: jobId, deletedAt: null },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    // Handle resume file upload
    let resumeUrl = data.resumeUrl;
    if (data.resumeData) {
      try {
        // Create uploads directory - unified structure under documents/tenants/{tenant}/resumes/
        const baseDir = process.env.UPLOADS_DIR || path.join(process.cwd(), '../../uploads');
        const uploadsDir = path.join(baseDir, 'documents', 'tenants', tenantSlug, 'resumes');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const ext = path.extname(data.resumeData.filename);
        const uniqueFilename = `${uuidv4()}${ext}`;
        const filePath = path.join(uploadsDir, uniqueFilename);

        // Decode base64 and save file
        const fileBuffer = Buffer.from(data.resumeData.content, 'base64');
        fs.writeFileSync(filePath, fileBuffer);

        // Store relative path as URL (served via document-service)
        resumeUrl = `/uploads/documents/tenants/${tenantSlug}/resumes/${uniqueFilename}`;
        
        logger.info({ filename: data.resumeData.filename, path: resumeUrl }, 'Resume uploaded');
      } catch (error: any) {
        logger.error({ error: error.message }, 'Failed to save resume file');
        // Continue without resume if upload fails
      }
    }

    const candidate = await db.jobCandidate.create({
      data: {
        jobId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        resumeUrl: resumeUrl,
        coverLetter: data.coverLetter,
        linkedinUrl: data.linkedinUrl,
        portfolioUrl: data.portfolioUrl,
        currentCompany: data.currentCompany,
        currentRole: data.currentRole,
        experienceYears: data.experienceYears,
        expectedSalary: data.expectedSalary,
        noticePeriod: data.noticePeriod,
        skills: data.skills || [],
        notes: data.notes,
        source: data.source,
        status: 'APPLIED',
        stage: 'APPLICATION',
      },
    });

    // Update job statistics
    await db.jobDescription.update({
      where: { id: jobId },
      data: {
        totalApplied: { increment: 1 },
      },
    });

    logger.info({ candidateId: candidate.id, jobId }, 'Created candidate');
    return candidate;
  }

  /**
   * Update a candidate
   */
  static async updateCandidate(tenantSlug: string, jobId: string, candidateId: string, data: UpdateCandidateDto) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const existing = await db.jobCandidate.findFirst({
      where: { id: candidateId, jobId },
    });

    if (!existing) {
      throw new Error('Candidate not found');
    }

    // Track status change timestamps
    const updateData: any = { ...data };

    // Handle resume file upload if provided
    if (data.resumeData) {
      const { filename, content, mimeType } = data.resumeData;
      
      // Decode base64 content
      const buffer = Buffer.from(content, 'base64');
      
      // Generate unique filename
      const ext = filename.split('.').pop() || 'pdf';
      const uniqueFilename = `${crypto.randomUUID()}.${ext}`;
      
      // Create uploads directory - unified structure under documents/tenants/{tenant}/resumes/
      const baseDir = process.env.UPLOADS_DIR || path.join(process.cwd(), '../../uploads');
      const uploadDir = path.join(baseDir, 'documents', 'tenants', tenantSlug, 'resumes');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Save file
      const filePath = path.join(uploadDir, uniqueFilename);
      fs.writeFileSync(filePath, buffer);
      
      // Update resumeUrl in updateData (served via document-service)
      updateData.resumeUrl = `/uploads/documents/tenants/${tenantSlug}/resumes/${uniqueFilename}`;
      
      // Remove resumeData from updateData as it's not a database field
      delete updateData.resumeData;
      
      logger.info({ candidateId, filename: uniqueFilename }, 'Updated candidate resume');
    }
    
    if (data.status && data.status !== existing.status) {
      switch (data.status) {
        case 'SCREENING':
          updateData.screenedAt = new Date();
          break;
        case 'INTERVIEWED':
          updateData.interviewedAt = new Date();
          break;
        case 'OFFERED':
          updateData.offeredAt = new Date();
          break;
        case 'HIRED':
          updateData.hiredAt = new Date();
          // Update job hired count
          await db.jobDescription.update({
            where: { id: jobId },
            data: { hired: { increment: 1 } },
          });
          break;
        case 'REJECTED':
          updateData.rejectedAt = new Date();
          break;
      }

      // Update stage based on status
      const statusToStage: Record<string, string> = {
        'SCREENING': 'PHONE_SCREEN',
        'SHORTLISTED': 'TECHNICAL_INTERVIEW',
        'INTERVIEWED': 'HR_INTERVIEW',
        'OFFERED': 'OFFER',
        'HIRED': 'ONBOARDING',
      };
      
      if (statusToStage[data.status]) {
        updateData.stage = statusToStage[data.status];
      }

      // Update job statistics
      if (data.status === 'SHORTLISTED') {
        await db.jobDescription.update({
          where: { id: jobId },
          data: { shortlisted: { increment: 1 } },
        });
      } else if (data.status === 'INTERVIEWED') {
        await db.jobDescription.update({
          where: { id: jobId },
          data: { interviewed: { increment: 1 } },
        });
      }
    }

    const candidate = await db.jobCandidate.update({
      where: { id: candidateId },
      data: updateData,
    });

    // Cascade email/name updates to related records
    const emailChanged = data.email && data.email !== existing.email;
    const nameChanged = (data.firstName && data.firstName !== existing.firstName) || 
                        (data.lastName && data.lastName !== existing.lastName);
    
    if (emailChanged || nameChanged) {
      const updatedName = `${data.firstName || existing.firstName} ${data.lastName || existing.lastName}`;
      const updatedEmail = data.email || existing.email;
      
      // Update AssessmentInvitation records
      await db.assessmentInvitation.updateMany({
        where: { candidateId },
        data: {
          ...(emailChanged && { candidateEmail: updatedEmail }),
          ...(nameChanged && { candidateName: updatedName }),
        },
      });
      
      // Get invitation IDs for this candidate to update results
      const invitations = await db.assessmentInvitation.findMany({
        where: { candidateId },
        select: { id: true },
      });
      
      if (invitations.length > 0) {
        // Update AssessmentResult records through invitation relationship
        await db.assessmentResult.updateMany({
          where: { invitationId: { in: invitations.map(i => i.id) } },
          data: {
            ...(emailChanged && { candidateEmail: updatedEmail }),
            ...(nameChanged && { candidateName: updatedName }),
          },
        });
      }
      
      logger.info({ candidateId, emailChanged, nameChanged }, 'Cascaded candidate updates to related records');
    }

    logger.info({ candidateId, jobId }, 'Updated candidate');
    return candidate;
  }

  /**
   * Delete a candidate
   */
  static async deleteCandidate(tenantSlug: string, jobId: string, candidateId: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const existing = await db.jobCandidate.findFirst({
      where: { id: candidateId, jobId },
    });

    if (!existing) {
      throw new Error('Candidate not found');
    }

    await db.jobCandidate.delete({
      where: { id: candidateId },
    });

    // Update job statistics
    await db.jobDescription.update({
      where: { id: jobId },
      data: { totalApplied: { decrement: 1 } },
    });

    logger.info({ candidateId, jobId }, 'Deleted candidate');
  }

  /**
   * Update candidate status by ID only (no jobId required)
   * Used for quick status updates from interview detail page
   */
  static async updateCandidateStatus(tenantSlug: string, candidateId: string, status: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const existing = await db.jobCandidate.findUnique({
      where: { id: candidateId },
    });

    if (!existing) {
      throw new Error('Candidate not found');
    }

    const updateData: any = { status };

    // Track status change timestamps
    switch (status) {
      case 'SCREENING':
        updateData.screenedAt = new Date();
        break;
      case 'INTERVIEWED':
        updateData.interviewedAt = new Date();
        break;
      case 'OFFERED':
        updateData.offeredAt = new Date();
        break;
      case 'HIRED':
        updateData.hiredAt = new Date();
        // Update job hired count
        await db.jobDescription.update({
          where: { id: existing.jobId },
          data: { hired: { increment: 1 } },
        });
        break;
      case 'REJECTED':
        updateData.rejectedAt = new Date();
        break;
    }

    // Update stage based on status
    const statusToStage: Record<string, string> = {
      'SCREENING': 'PHONE_SCREEN',
      'SHORTLISTED': 'TECHNICAL_INTERVIEW',
      'INTERVIEWED': 'HR_INTERVIEW',
      'OFFERED': 'OFFER',
      'HIRED': 'ONBOARDING',
    };

    if (statusToStage[status]) {
      updateData.stage = statusToStage[status];
    }

    // Update job statistics
    if (status === 'SHORTLISTED') {
      await db.jobDescription.update({
        where: { id: existing.jobId },
        data: { shortlisted: { increment: 1 } },
      });
    } else if (status === 'INTERVIEWED') {
      await db.jobDescription.update({
        where: { id: existing.jobId },
        data: { interviewed: { increment: 1 } },
      });
    }

    const candidate = await db.jobCandidate.update({
      where: { id: candidateId },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
      },
    });

    logger.info({ candidateId, status }, 'Updated candidate status');
    return candidate;
  }

  /**
   * Bulk delete candidates
   */
  static async bulkDeleteCandidates(tenantSlug: string, candidates: { id: string; jobId: string }[]) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Group candidates by jobId to update job statistics efficiently
    const jobCounts: Record<string, number> = {};
    const candidateIds = candidates.map(c => {
      jobCounts[c.jobId] = (jobCounts[c.jobId] || 0) + 1;
      return c.id;
    });

    // Delete all candidates
    await db.jobCandidate.deleteMany({
      where: { id: { in: candidateIds } },
    });

    // Update job statistics for each affected job
    for (const [jobId, count] of Object.entries(jobCounts)) {
      await db.jobDescription.update({
        where: { id: jobId },
        data: { totalApplied: { decrement: count } },
      });
    }

    logger.info({ count: candidates.length }, 'Bulk deleted candidates');
    return { deleted: candidates.length };
  }
}
