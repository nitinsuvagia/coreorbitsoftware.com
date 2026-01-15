/**
 * Project Service - Express Application Setup
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('helmet');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pinoHttp = require('pino-http');
import { config } from './config';
import { logger } from './utils/logger';

// Import routes
import clientRoutes from './routes/client.routes';
import projectRoutes from './routes/project.routes';
import timeEntryRoutes from './routes/time-entry.routes';

// ============================================================================
// APP INITIALIZATION
// ============================================================================

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Request logging
app.use(pinoHttp({
  logger,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      tenantId: (req as any).tenantId,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
}));

// ============================================================================
// HEALTH CHECK (before tenant middleware)
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'project-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req: Request, res: Response) => {
  res.json({
    status: 'ready',
    service: 'project-service',
  });
});

// ============================================================================
// TENANT CONTEXT EXTRACTION (from API Gateway headers)
// ============================================================================

app.use((req: Request, res: Response, next: NextFunction) => {
  // Extract tenant context set by API Gateway
  const tenantId = req.headers['x-tenant-id'] as string;
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  const employeeId = req.headers['x-employee-id'] as string;
  
  if (!tenantId || !tenantSlug) {
    return res.status(400).json({
      error: 'Missing tenant context',
    });
  }
  
  // Attach to request for use in routes
  (req as any).tenantId = tenantId;
  (req as any).tenantSlug = tenantSlug;
  (req as any).userId = userId;
  (req as any).userRole = userRole;
  (req as any).employeeId = employeeId;
  
  next();
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/time-entries', timeEntryRoutes);

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  }, 'Unhandled error');
  
  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        error: 'Resource not found',
      });
    }
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        error: 'Resource already exists',
        field: prismaError.meta?.target,
      });
    }
  }
  
  // Handle validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: (err as any).errors,
    });
  }
  
  // Default error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
  });
});

export { app };
