/**
 * OpenAI Service
 * Centralized OpenAI integration for all AI features
 */

import { getMasterPrisma } from '@oms/database';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface OpenAISettings {
  enabled: boolean;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface ChatCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

// ============================================================================
// CACHE
// ============================================================================

const settingsCache = new Map<string, { data: any; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear settings cache for a tenant
 */
export function clearSettingsCache(tenantSlug?: string) {
  if (tenantSlug) {
    settingsCache.delete(tenantSlug);
  } else {
    settingsCache.clear();
  }
}

// ============================================================================
// GET OPENAI SETTINGS
// ============================================================================

/**
 * Get OpenAI settings from database for a tenant
 */
export async function getTenantOpenAISettings(tenantSlug: string): Promise<OpenAISettings | undefined> {
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

/**
 * Check if OpenAI is configured for a tenant
 */
export async function isOpenAIConfigured(tenantSlug: string): Promise<boolean> {
  const settings = await getTenantOpenAISettings(tenantSlug);
  return !!(settings?.enabled && settings?.apiKey);
}

/**
 * Get OpenAI status with details
 */
export async function getOpenAIStatus(tenantSlug: string): Promise<{
  configured: boolean;
  model?: string;
  message: string;
}> {
  const settings = await getTenantOpenAISettings(tenantSlug);
  const configured = !!(settings?.enabled && settings?.apiKey);
  
  return {
    configured,
    model: configured ? settings?.model : undefined,
    message: configured
      ? `AI is configured with model: ${settings?.model}. You can use AI-powered features.`
      : 'AI is not configured. Configure OpenAI in Organization > Integrations to enable AI-powered features.',
  };
}

// ============================================================================
// OPENAI API CALLS
// ============================================================================

/**
 * Make a chat completion request to OpenAI
 */
export async function chatCompletion(
  tenantSlug: string,
  request: ChatCompletionRequest
): Promise<string> {
  const settings = await getTenantOpenAISettings(tenantSlug);
  
  if (!settings?.enabled || !settings?.apiKey) {
    throw new Error('OpenAI integration is not configured. Please configure it in Organization > Integrations.');
  }
  
  const { systemPrompt, userPrompt, maxTokens, temperature } = request;
  
  try {
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
        max_tokens: maxTokens ?? settings.maxTokens ?? 2000,
        temperature: temperature ?? settings.temperature ?? 0.7,
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

    return content;
  } catch (error: any) {
    logger.error({ error: error.message, tenantSlug }, 'OpenAI chat completion failed');
    throw error;
  }
}

/**
 * Parse JSON from OpenAI response (handles markdown code blocks)
 */
export function parseAIJsonResponse<T>(content: string): T {
  let cleanContent = content.trim();
  
  // Remove markdown code blocks if present
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.slice(7);
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.slice(3);
  }
  if (cleanContent.endsWith('```')) {
    cleanContent = cleanContent.slice(0, -3);
  }
  cleanContent = cleanContent.trim();

  return JSON.parse(cleanContent);
}
