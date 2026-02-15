/**
 * Organization Integration Routes - API endpoints for managing integrations
 */
import { Router, Request, Response } from 'express';
import { 
  setTenantOpenAISettings, 
  getTenantOpenAISettings,
  clearTenantOpenAISettings 
} from '../services/ai-question-generator.service';

const router = Router();

// OpenAI settings interface
interface OpenAISettings {
  apiKey: string;
  model: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo';
  enabled: boolean;
  maxTokens: number;
  temperature: number;
}

/**
 * GET /organization/integrations
 * Get all integrations for the tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || (req as any).tenantSlug || req.headers['x-tenant-slug'] || 'default';
    
    const openaiSettings = await getTenantOpenAISettings(tenantId as string);
    
    // Return integration status without exposing full API key
    const response = {
      integrations: openaiSettings?.enabled ? ['openai'] : [],
      openai: openaiSettings ? {
        ...openaiSettings,
        apiKey: openaiSettings.apiKey ? '********' : undefined,
      } : undefined,
    };
    
    res.json(response);
  } catch (error: any) {
    console.error('Failed to get integrations:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to fetch integrations' } 
    });
  }
});

/**
 * POST /organization/integrations/openai
 * Save OpenAI integration settings
 */
router.post('/openai', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || (req as any).tenantSlug || req.headers['x-tenant-slug'] || 'default';
    const { apiKey, model, enabled, maxTokens, temperature } = req.body;
    
    // Get existing settings
    const existing = await getTenantOpenAISettings(tenantId as string);
    
    // Update OpenAI settings
    const openaiSettings: OpenAISettings = {
      apiKey: apiKey || existing?.apiKey || '',
      model: model || existing?.model || 'gpt-3.5-turbo',
      enabled: enabled !== undefined ? enabled : (existing?.enabled ?? true),
      maxTokens: maxTokens || existing?.maxTokens || 2000,
      temperature: temperature !== undefined ? temperature : (existing?.temperature ?? 0.7),
    };
    
    // Save to database (used by AI question generator)
    await setTenantOpenAISettings(tenantId as string, openaiSettings);
    
    res.json({ 
      success: true, 
      message: 'OpenAI settings saved successfully',
      data: {
        ...openaiSettings,
        apiKey: openaiSettings.apiKey ? '********' : undefined,
      }
    });
  } catch (error: any) {
    console.error('Failed to save OpenAI settings:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to save OpenAI settings' } 
    });
  }
});

/**
 * POST /organization/integrations/openai/test
 * Test OpenAI API connection
 */
router.post('/openai/test', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'API key is required' 
      });
    }
    
    // Test the OpenAI API key by making a simple request
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (response.ok) {
      res.json({ 
        success: true, 
        message: 'Connection successful! OpenAI API key is valid.' 
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      res.json({ 
        success: false, 
        message: errorData.error?.message || 'Invalid API key or connection failed' 
      });
    }
  } catch (error: any) {
    console.error('[OpenAI Test] Exception:', error.message);
    res.json({ 
      success: false, 
      message: error.message || 'Connection test failed' 
    });
  }
});

/**
 * POST /organization/integrations/openai/disable
 * Disable OpenAI integration
 */
router.post('/openai/disable', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || (req as any).tenantSlug || req.headers['x-tenant-slug'] || 'default';
    
    // Clear settings from database and cache
    await clearTenantOpenAISettings(tenantId as string);
    
    res.json({ 
      success: true, 
      message: 'OpenAI integration disabled' 
    });
  } catch (error: any) {
    console.error('Failed to disable OpenAI:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to disable OpenAI integration' } 
    });
  }
});

/**
 * GET /organization/integrations/openai/settings
 * Get OpenAI settings for AI question generation
 * (Internal use - includes API key for service calls)
 */
router.get('/openai/settings', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || (req as any).tenantSlug || req.headers['x-tenant-slug'] || 'default';
    
    const openaiSettings = await getTenantOpenAISettings(tenantId as string);
    
    if (!openaiSettings?.enabled || !openaiSettings?.apiKey) {
      return res.json({ 
        success: false, 
        configured: false,
        message: 'OpenAI is not configured' 
      });
    }
    
    res.json({ 
      success: true,
      configured: true,
      settings: openaiSettings,
    });
  } catch (error: any) {
    console.error('Failed to get OpenAI settings:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to fetch OpenAI settings' } 
    });
  }
});

export default router;
