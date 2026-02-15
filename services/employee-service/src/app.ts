/**
 * Employee Service - Express App
 */

import express, { Request, Response, NextFunction } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('helmet');
import cors from 'cors';
import path from 'path';

import { config } from './config';
import { logger } from './utils/logger';
import { tenantContextMiddleware } from './middleware/tenant-context';
import employeeRoutes from './routes/employee.routes';
import departmentRoutes, { teamRouter } from './routes/department.routes';
import designationRoutes from './routes/designation.routes';
import jobRoutes from './routes/job.routes';
import candidateRoutes from './routes/candidate.routes';
import interviewRoutes from './routes/interview.routes';
import assessmentRoutes from './routes/assessment.routes';
import integrationRoutes from './routes/integration.routes';
import offerRoutes from './routes/offer.routes';
import { publicOnboardingRouter, protectedOnboardingRouter } from './routes/onboarding.routes';

// ============================================================================
// CREATE APP
// ============================================================================

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  logger.debug({
    requestId,
    method: req.method,
    path: req.path,
    tenantSlug: req.headers['x-tenant-slug'],
  }, 'Incoming request');
  next();
});

// ============================================================================
// HEALTH CHECKS
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'employee-service',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req: Request, res: Response) => {
  res.json({ 
    status: 'ready',
    service: 'employee-service',
  });
});

// ============================================================================
// ROUTES (with tenant context)
// ============================================================================

// Serve static files from uploads directory (supports both local and shared uploads)
// Local uploads (resumes, etc.)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
// Shared uploads (on-boarding documents stored at root level)
app.use('/uploads', express.static(path.join(process.cwd(), '../../uploads')));

// ============================================================================
// PUBLIC ROUTES (no authentication required)
// ============================================================================

// Public offer routes - candidates can view and respond to offers without login
app.use('/api/v1/public/offer', offerRoutes);

// Public onboarding routes - candidates can fill onboarding details
app.use('/api/v1/public/onboarding', publicOnboardingRouter);

// ============================================================================
// PROTECTED ROUTES (with tenant context)
// ============================================================================

// Apply tenant context middleware to all API routes
app.use('/api/v1', tenantContextMiddleware);

app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/teams', teamRouter);
app.use('/api/v1/designations', designationRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/jobs/:jobId/candidates', candidateRoutes);
app.use('/api/v1/candidates', candidateRoutes); // All candidates endpoint
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/assessments', assessmentRoutes);
app.use('/api/v1/organization/integrations', integrationRoutes);
app.use('/api/v1/onboarding', protectedOnboardingRouter);

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
