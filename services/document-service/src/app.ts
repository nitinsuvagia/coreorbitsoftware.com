/**
 * Document Service - Express Application
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('helmet');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');
import { ZodError } from 'zod';
import { logger } from './utils/logger';
import { config } from './config';
import documentRoutes from './routes/document.routes';
import onboardingRoutes from './routes/onboarding.routes';
import tenantContextMiddleware from './middleware/tenant-context';
import * as storageService from './services/storage.service';

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Compression
app.use(compression());

// Body parsing (for non-multipart requests)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      tenantSlug: req.headers['x-tenant-slug'],
    }, 'Request completed');
  });
  
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'document-service',
    timestamp: new Date().toISOString(),
  });
});

// Readiness check
app.get('/ready', (req: Request, res: Response) => {
  res.json({
    status: 'ready',
    service: 'document-service',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// PUBLIC ROUTES (No tenant context required)
// ============================================================================

// Public file download by storage key (for local storage)
// The storage key contains tenant info, so no tenant header needed
app.get('/api/documents/files/download', async (req: Request, res: Response) => {
  const key = req.query.key as string;
  const inline = req.query.inline === 'true';
  
  if (!key) {
    return res.status(400).json({ success: false, error: 'Storage key is required' });
  }
  
  try {
    const { body, contentType, contentLength, metadata } = await storageService.downloadFile(key);
    
    // Set appropriate headers
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
    // Set content disposition
    const filename = metadata?.originalName || key.split('/').pop() || 'download';
    res.setHeader(
      'Content-Disposition',
      inline ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`
    );
    
    // Enable caching for file content
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    // Allow embedding in iframes (for preview)
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Pipe the file stream to response
    body.pipe(res);
  } catch (error: any) {
    logger.error({ error, key }, 'File download failed');
    if (error.code === 'ENOENT') {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    return res.status(500).json({ success: false, error: 'Failed to download file' });
  }
});

// API routes (require tenant context)
app.use('/api/documents', tenantContextMiddleware, documentRoutes);

// Onboarding routes (require tenant context)
app.use('/api/v1/onboarding', tenantContextMiddleware, onboardingRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path,
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  }, 'Unhandled error');
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }
  
  // Handle Prisma errors
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Record not found',
    });
  }
  
  // Handle known errors
  if (err.message) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
  
  // Unknown errors
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

export default app;
