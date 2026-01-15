/**
 * Auth Service - Express App
 */

import express, { Request, Response, NextFunction } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('helmet');
import cors from 'cors';

import { config } from './config';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import platformAdminRoutes from './routes/platform-admin.routes';
import securityRoutes from './routes/security.routes';

// ============================================================================
// CREATE APP
// ============================================================================

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    // or from localhost for development
    if (!origin || origin.startsWith('http://localhost')) {
      callback(null, origin || 'http://localhost:3000');
    } else {
      callback(null, origin);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Tenant-ID', 'X-Tenant-Slug'],
}));
app.use(express.json({ limit: '5mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  logger.debug({
    requestId,
    method: req.method,
    path: req.path,
    tenantSlug: req.headers['x-tenant-slug'],
    domainType: req.headers['x-domain-type'],
  }, 'Incoming request');
  next();
});

// ============================================================================
// HEALTH CHECKS
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req: Request, res: Response) => {
  res.json({ 
    status: 'ready',
    service: 'auth-service',
  });
});

// ============================================================================
// ROUTES
// ============================================================================

app.use('/api/v1', authRoutes);
app.use('/api/v1', securityRoutes);
app.use('/api/v1/platform-admins', platformAdminRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ 
    error: err.message, 
    stack: err.stack,
    path: req.path,
  }, 'Unhandled error');
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
    },
  });
});

export default app;
