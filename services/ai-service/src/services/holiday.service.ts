/**
 * Holiday Generation Service
 * AI-powered holiday generation for any country
 */

import { chatCompletion, parseAIJsonResponse } from './openai.service';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedHoliday {
  name: string;
  date: string; // YYYY-MM-DD
  type: 'public' | 'optional' | 'restricted';
  description: string;
  isRecurring: boolean;
}

export interface GenerateHolidaysRequest {
  country: string;
  year: number;
  includeOptional?: boolean;
}

export interface Country {
  code: string;
  name: string;
}

// ============================================================================
// POPULAR COUNTRIES
// ============================================================================

export const popularCountries: Country[] = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
];

// ============================================================================
// HOLIDAY GENERATION
// ============================================================================

/**
 * Generate holidays for a country using AI
 */
export async function generateHolidays(
  tenantSlug: string,
  request: GenerateHolidaysRequest
): Promise<GeneratedHoliday[]> {
  const { country, year, includeOptional = true } = request;
  
  const systemPrompt = `You are an expert in international holidays and cultural observances. Generate accurate, real holidays for the specified country and year.

Rules:
1. Only include REAL holidays that are actually observed in the country
2. Include national/public holidays
3. ${includeOptional ? 'Include important religious and cultural observances as optional/restricted holidays' : 'Focus primarily on official public holidays'}
4. Dates must be accurate for the specified year (accounting for lunar calendars, moveable feasts, etc.)
5. Use the actual local name of the holiday if commonly known, or the English name
6. Return ONLY valid JSON, no markdown, no code blocks
7. Do not make up holidays - only include real, verifiable holidays`;

  const userPrompt = `Generate a comprehensive list of holidays for ${country} for the year ${year}.

Return as a JSON array with the following structure:

[
  {
    "name": "Holiday Name",
    "date": "YYYY-MM-DD",
    "type": "public" | "optional" | "restricted",
    "description": "Brief description of the holiday (1-2 sentences)",
    "isRecurring": true/false (true if same date every year, false for lunar/moveable dates)
  }
]

Type definitions:
- "public": Official national holidays where most businesses are closed
- "optional": Religious/cultural holidays that some employees may observe
- "restricted": Regional or sector-specific holidays

Include at least 10-15 holidays if available for the country. Generate the list now:`;

  try {
    logger.info({ country, year }, 'Generating holidays with AI');
    
    const content = await chatCompletion(tenantSlug, {
      systemPrompt,
      userPrompt,
      temperature: 0.3, // Lower temperature for more factual responses
    });
    
    const holidays = parseAIJsonResponse<GeneratedHoliday[]>(content);
    
    // Validate response
    if (!Array.isArray(holidays)) {
      throw new Error('Invalid response format - expected array');
    }
    
    // Validate and filter holidays
    const validHolidays = holidays.filter(h => {
      return h.name && h.date && h.type && 
             /^\d{4}-\d{2}-\d{2}$/.test(h.date) &&
             ['public', 'optional', 'restricted'].includes(h.type);
    });
    
    logger.info({ 
      country, 
      year, 
      holidaysGenerated: validHolidays.length 
    }, 'Holidays generated successfully');
    
    return validHolidays;
  } catch (error: any) {
    logger.error({ error: error.message, country, year }, 'Failed to generate holidays');
    throw error;
  }
}
