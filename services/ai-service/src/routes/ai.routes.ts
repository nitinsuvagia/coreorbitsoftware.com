/**
 * AI Routes
 * Centralized API endpoints for all AI features
 */

import express, { Request, Response } from 'express';
import { isOpenAIConfigured, getOpenAIStatus } from '../services/openai.service';
import { generateHolidays, popularCountries, GenerateHolidaysRequest } from '../services/holiday.service';
import { generateJobContent, GenerateJobContentRequest } from '../services/job.service';
import { chat, chatStream, getConversations, getConversation, deleteConversation } from '../services/chat.service';
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

// ============================================================================
// CHAT ENDPOINTS
// ============================================================================

/**
 * Helper to extract chat context from request headers
 */
function getChatContext(req: Request) {
  return {
    tenantSlug: (req as any).tenantSlug as string,
    tenantId: req.headers['x-tenant-id'] as string || '',
    userId: req.headers['x-user-id'] as string || '',
    userRoles: req.headers['x-user-roles'] as string || '',
  };
}

/**
 * POST /ai/chat
 * Send a message and get a response (non-streaming)
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const ctx = getChatContext(req);
    if (!ctx.userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const { message, conversationId } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await chat(ctx, message.trim(), conversationId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Chat error');
    res.status(500).json({ error: error.message || 'Chat failed' });
  }
});

/**
 * POST /ai/chat/stream
 * Send a message and get a streaming response (SSE)
 */
router.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const ctx = getChatContext(req);
    if (!ctx.userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const { message, conversationId } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    await chatStream(
      ctx,
      message.trim(),
      conversationId,
      // onChunk
      (chunk) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      },
      // onToolCall
      (toolName, status) => {
        res.write(`data: ${JSON.stringify({ type: 'tool', name: toolName, status })}\n\n`);
      },
      // onDone
      (result) => {
        res.write(`data: ${JSON.stringify({ type: 'done', ...result })}\n\n`);
        res.end();
      },
      // onError
      (error) => {
        res.write(`data: ${JSON.stringify({ type: 'error', error })}\n\n`);
        res.end();
      }
    );
  } catch (error: any) {
    logger.error({ error: error.message }, 'Chat stream error');
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Stream failed' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * GET /ai/conversations
 * List user's conversations
 */
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const ctx = getChatContext(req);
    if (!ctx.userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const conversations = await getConversations(ctx);
    res.json({ success: true, data: conversations });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to list conversations');
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

/**
 * GET /ai/conversations/:id
 * Get a conversation with messages
 */
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const ctx = getChatContext(req);
    if (!ctx.userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const conversation = await getConversation(ctx, req.params.id);
    res.json({ success: true, data: conversation });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get conversation');
    res.status(error.message === 'Conversation not found' ? 404 : 500).json({ error: error.message });
  }
});

/**
 * DELETE /ai/conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const ctx = getChatContext(req);
    if (!ctx.userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    await deleteConversation(ctx, req.params.id);
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to delete conversation');
    res.status(error.message === 'Conversation not found' ? 404 : 500).json({ error: error.message });
  }
});

export { router as aiRoutes };
