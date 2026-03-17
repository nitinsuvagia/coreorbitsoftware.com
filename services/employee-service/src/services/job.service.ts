/**
 * Job Description Service
 */

import { getTenantPrismaBySlug } from '../utils/database';
import { logger } from '../utils/logger';
import { getEventBus, SNS_TOPICS } from '@oms/event-bus';

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
   * Get all job descriptions for a tenant with candidate statistics
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
      include: {
        _count: {
          select: { candidates: true },
        },
        candidates: {
          select: { status: true },
        },
      },
      orderBy: { postedDate: 'desc' },
    });

    // Map jobs with calculated candidate statistics
    const jobsWithStats = jobs.map((job: any) => {
      const candidates = job.candidates || [];
      const totalApplied = candidates.length;
      const shortlisted = candidates.filter((c: any) => c.status === 'SHORTLISTED').length;
      const interviewed = candidates.filter((c: any) => c.status === 'INTERVIEWED').length;
      const hired = candidates.filter((c: any) => c.status === 'HIRED').length;
      
      // Remove candidates array from response, keep only stats
      const { candidates: _, _count, ...jobData } = job;
      
      return {
        ...jobData,
        totalApplied,
        shortlisted,
        interviewed,
        hired,
      };
    });

    logger.debug({ count: jobsWithStats.length }, 'Retrieved jobs with stats');
    return jobsWithStats;
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
    
    // Publish event for notifications
    try {
      const eventBus = getEventBus('employee-service');
      await eventBus.publishToTopic('job-description-created', 'job.created', {
        jobId: job.id,
        title: job.title,
        department: job.department,
        location: job.location,
        employmentType: job.employmentType,
        openings: job.openings,
        closingDate: job.closingDate,
        createdBy: userId,
      }, { tenantId: '', tenantSlug });
    } catch (error) {
      logger.warn({ error }, 'Failed to publish job-description-created event');
    }
    
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

// ============================================================================
// AI JD GENERATION SERVICE
// ============================================================================

import { getTenantOpenAISettings } from './ai-question-generator.service';

export interface AIGeneratedJobContent {
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  techStack: string[];
}

export interface GenerateJobContentRequest {
  title: string;
  department?: string;
  employmentType?: string;
  experienceMin?: number;
  experienceMax?: number;
}

/**
 * Check if OpenAI is configured for a tenant
 */
export async function isOpenAIConfiguredForJD(tenantSlug: string): Promise<boolean> {
  const settings = await getTenantOpenAISettings(tenantSlug);
  return !!(settings?.enabled && settings?.apiKey);
}

/**
 * Generate job description content using AI
 */
export async function generateJobContentWithAI(
  tenantSlug: string,
  request: GenerateJobContentRequest
): Promise<AIGeneratedJobContent> {
  const settings = await getTenantOpenAISettings(tenantSlug);
  
  if (!settings?.enabled || !settings?.apiKey) {
    throw new Error('OpenAI integration is not configured. Please configure it in Organization > Integrations.');
  }
  
  const { title, department, employmentType, experienceMin, experienceMax } = request;
  
  const systemPrompt = `You are an expert HR professional and technical recruiter. Generate comprehensive, professional job description content based on the job title provided.

Rules:
1. Be specific and detailed, tailored to the job title
2. Use professional language suitable for job postings
3. Include industry-standard requirements and responsibilities
4. Be realistic about requirements - don't over-inflate
5. Benefits should be competitive and relevant
6. Tech stack should be appropriate for the role
7. Return ONLY valid JSON, no markdown, no code blocks`;

  const experienceText = experienceMin !== undefined || experienceMax !== undefined
    ? `Experience level: ${experienceMin || 0}-${experienceMax || 10}+ years`
    : '';
    
  const userPrompt = `Generate job description content for the following position:

Job Title: ${title}
${department ? `Department: ${department}` : ''}
${employmentType ? `Employment Type: ${employmentType.replace('_', ' ')}` : ''}
${experienceText}

Generate a comprehensive job description with the following structure. Return as JSON:

{
  "description": "A 2-3 paragraph professional job description/overview explaining the role, its importance, and what the ideal candidate will do. Be specific to the job title.",
  "requirements": [
    "8-12 specific requirements/qualifications as array of strings",
    "Include both technical skills and soft skills",
    "Be realistic and relevant to the position"
  ],
  "responsibilities": [
    "8-12 key responsibilities as array of strings",
    "Be specific about day-to-day duties",
    "Include collaboration and reporting aspects"
  ],
  "benefits": [
    "6-10 attractive benefits as array of strings",
    "Include standard and competitive perks",
    "Be realistic for the industry"
  ],
  "techStack": [
    "5-10 relevant technologies/tools as array of strings",
    "Include primary technologies for the role",
    "Only include if relevant to the position"
  ]
}

For non-technical roles, techStack can be empty array or include relevant software tools they'd use.

Generate the content now:`;

  try {
    logger.info({ title, department, model: settings.model }, 'Generating job description with AI');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: settings.maxTokens || 2000,
        temperature: settings.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as any;
      logger.error({ status: response.status, error }, 'OpenAI API error');
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the JSON response - clean up markdown if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    const generatedContent: AIGeneratedJobContent = JSON.parse(cleanContent);
    
    // Validate the response has required fields
    if (!generatedContent.description || !Array.isArray(generatedContent.requirements) ||
        !Array.isArray(generatedContent.responsibilities) || !Array.isArray(generatedContent.benefits)) {
      throw new Error('Invalid AI response format');
    }
    
    // Ensure techStack is an array
    if (!Array.isArray(generatedContent.techStack)) {
      generatedContent.techStack = [];
    }
    
    logger.info({ 
      title, 
      requirementsCount: generatedContent.requirements.length,
      responsibilitiesCount: generatedContent.responsibilities.length,
    }, 'Successfully generated job description with AI');
    
    return generatedContent;
  } catch (error: any) {
    logger.error({ error: error.message, title }, 'Failed to generate job description with AI');
    throw error;
  }
}