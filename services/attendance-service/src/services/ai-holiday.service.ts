/**
 * AI Holiday Generator Service
 * Uses OpenAI to generate country-specific holidays
 */

import { getMasterPrisma } from '@oms/database';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

interface OpenAISettings {
  enabled: boolean;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

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

// Cache for settings
const settingsCache = new Map<string, { data: any; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// GET OPENAI SETTINGS
// ============================================================================

/**
 * Get OpenAI settings from database for a tenant
 */
async function getTenantOpenAISettings(tenantSlug: string): Promise<OpenAISettings | undefined> {
  // Check cache first
  const cached = settingsCache.get(tenantSlug);
  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL) {
    return cached.data?.openai;
  }
  
  try {
    const prisma = getMasterPrisma();
    
    // Find tenant by slug and get integration settings
    const result = await prisma.$queryRaw<{ integration_settings: any }[]>`
      SELECT ts.integration_settings 
      FROM tenant_settings ts
      JOIN tenants t ON t.id = ts.tenant_id
      WHERE t.slug = ${tenantSlug}
    `;
    
    if (!result[0]?.integration_settings) {
      return undefined;
    }
    
    const settings = result[0].integration_settings;
    
    // Update cache
    settingsCache.set(tenantSlug, { data: settings, cachedAt: Date.now() });
    
    return settings?.openai;
  } catch (error: any) {
    logger.error({ error: error.message, tenantSlug }, 'Failed to get OpenAI settings');
    return cached?.data?.openai;
  }
}

// ============================================================================
// AI HOLIDAY GENERATION
// ============================================================================

/**
 * Check if OpenAI is configured for a tenant
 */
export async function isOpenAIConfiguredForHolidays(tenantSlug: string): Promise<boolean> {
  const settings = await getTenantOpenAISettings(tenantSlug);
  return !!(settings?.enabled && settings?.apiKey);
}

/**
 * Generate holidays for a country using AI
 */
export async function generateHolidaysWithAI(
  tenantSlug: string,
  request: GenerateHolidaysRequest
): Promise<GeneratedHoliday[]> {
  const settings = await getTenantOpenAISettings(tenantSlug);
  
  if (!settings?.enabled || !settings?.apiKey) {
    throw new Error('OpenAI integration is not configured. Please configure it in Organization > Integrations.');
  }
  
  const { country, year, includeOptional } = request;
  
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
    logger.info({ country, year, model: settings.model }, 'Generating holidays with AI');
    
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
        temperature: 0.3, // Lower temperature for more factual responses
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

    const holidays: GeneratedHoliday[] = JSON.parse(cleanContent);
    
    // Validate the response
    if (!Array.isArray(holidays)) {
      throw new Error('Invalid AI response format - expected array');
    }
    
    // Validate and clean each holiday
    const validHolidays = holidays
      .filter(h => h.name && h.date && h.type)
      .map(h => ({
        name: h.name.trim(),
        date: h.date,
        type: (['public', 'optional', 'restricted'].includes(h.type) ? h.type : 'public') as 'public' | 'optional' | 'restricted',
        description: h.description?.trim() || '',
        isRecurring: h.isRecurring ?? true,
      }));
    
    // Sort by date
    validHolidays.sort((a, b) => a.date.localeCompare(b.date));
    
    logger.info({ 
      country, 
      year,
      count: validHolidays.length,
    }, 'Successfully generated holidays with AI');
    
    return validHolidays;
  } catch (error: any) {
    logger.error({ error: error.message, country, year }, 'Failed to generate holidays with AI');
    throw error;
  }
}

// ============================================================================
// POPULAR COUNTRIES LIST
// ============================================================================

export const popularCountries = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'PH', name: 'Philippines' },
  { code: 'MY', name: 'Malaysia' },
];
