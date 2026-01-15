/**
 * Task Service - Express Application
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
import taskRoutes from './routes/task.routes';

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

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    service: 'task-service',
    timestamp: new Date().toISOString(),
  });
});

// Readiness check
app.get('/ready', (req: Request, res: Response) => {
  res.json({
    status: 'ready',
    service: 'task-service',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/tasks', taskRoutes);

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
  
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'Record already exists',
      fields: err.meta?.target,
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
