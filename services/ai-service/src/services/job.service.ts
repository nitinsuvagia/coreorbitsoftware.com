/**
 * Job Description Generation Service
 * AI-powered job description content generation
 */

import { chatCompletion, parseAIJsonResponse } from './openai.service';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateJobContentRequest {
  title: string;
  department?: string;
  employmentType?: string;
  experienceMin?: number;
  experienceMax?: number;
}

export interface GeneratedJobContent {
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  techStack: string[];
}

// ============================================================================
// JOB DESCRIPTION GENERATION
// ============================================================================

/**
 * Generate job description content using AI
 */
export async function generateJobContent(
  tenantSlug: string,
  request: GenerateJobContentRequest
): Promise<GeneratedJobContent> {
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
    logger.info({ title, department }, 'Generating job description with AI');
    
    const content = await chatCompletion(tenantSlug, {
      systemPrompt,
      userPrompt,
      temperature: 0.7,
    });
    
    const generatedContent = parseAIJsonResponse<GeneratedJobContent>(content);
    
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
    }, 'Job description generated successfully');
    
    return generatedContent;
  } catch (error: any) {
    logger.error({ error: error.message, title }, 'Failed to generate job description');
    throw error;
  }
}
