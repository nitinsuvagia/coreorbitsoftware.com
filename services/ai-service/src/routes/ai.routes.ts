/**
 * AI Routes
 * Centralized API endpoints for all AI features
 */

import express, { Request, Response } from 'express';
import { isOpenAIConfigured, getOpenAIStatus } from '../services/openai.service';
import { generateHolidays, popularCountries, GenerateHolidaysRequest } from '../services/holiday.service';
import { generateJobContent, GenerateJobContentRequest } from '../services/job.service';
import { logger } from '../utils/logger';

const router = express.Router();

// ============================================================================
// MIDDLEWARE - Extract tenant slug
// ============================================================================

router.use((req: Request, res: Response, next) => {
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  if (!tenantSlug) {
    return res.status(400).json({ error: 'Tenant slug required (x-tenant-slug header)' });
  }
  (req as any).tenantSlug = tenantSlug;
  next();
});

// ============================================================================
// STATUS ENDPOINTS
// ============================================================================

/**
 * GET /ai/status
 * Check if OpenAI is configured for the tenant
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const status = await getOpenAIStatus(tenantSlug);
    
    res.json({
      success: true,
      data: {
        aiEnabled: status.configured,
        configured: status.configured,
        model: status.model,
        message: status.message,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error checking AI status');
    res.status(500).json({ error: 'Failed to check AI status' });
  }
});

// ============================================================================
// HOLIDAY ENDPOINTS
// ============================================================================

/**
 * GET /ai/holidays/countries
 * Get list of popular countries for holiday generation
 */
router.get('/holidays/countries', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { countries: popularCountries },
  });
});

/**
 * POST /ai/holidays/generate
 * Generate holidays for a country using AI
 */
router.post('/holidays/generate', async (req: Request, res: Response) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const { country, year, includeOptional } = req.body;

    if (!country || typeof country !== 'string') {
      return res.status(400).json({ error: 'Country is required' });
    }
    
    if (!year || typeof year !== 'number' || year < 2020 || year > 2050) {
      return res.status(400).json({ error: 'Valid year is required (2020-2050)' });
    }

    const request: GenerateHolidaysRequest = {
      country,
      year,
      includeOptional: includeOptional !== false,
    };

    const holidays = await generateHolidays(tenantSlug, request);
    
    // Get country name from our list
    const countryInfo = popularCountries.find(c => c.code === country || c.name.toLowerCase() === country.toLowerCase());
    
    res.json({
      success: true,
      data: {
        holidays,
        country: countryInfo?.name || country,
        year,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to generate holidays');
    res.status(500).json({ error: error.message || 'Failed to generate holidays' });
  }
});

// ============================================================================
// JOB DESCRIPTION ENDPOINTS
// ============================================================================

/**
 * POST /ai/jobs/generate
 * Generate job description content using AI
 */
router.post('/jobs/generate', async (req: Request, res: Response) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const { title, department, employmentType, experienceMin, experienceMax } = req.body;
    
    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Job title is required and must be at least 2 characters' 
      });
    }

    const request: GenerateJobContentRequest = {
      title: title.trim(),
      department,
      employmentType,
      experienceMin,
      experienceMax,
    };

    const content = await generateJobContent(tenantSlug, request);
    
    res.json({
      success: true,
      data: content,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to generate job description');
    res.status(500).json({ error: error.message || 'Failed to generate job description' });
  }
});

export { router as aiRoutes };
