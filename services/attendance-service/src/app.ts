/**
 * Attendance Service - Express Application Setup
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('helmet');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');
import { pinoHttp } from 'pino-http';
import { config } from './config';
import { logger } from './utils/logger';

// Import routes
import attendanceRoutes from './routes/attendance.routes';
import leaveRoutes from './routes/leave.routes';
import holidayRoutes from './routes/holiday.routes';

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

// Disable ETag caching to prevent 304 responses with stale data
app.set('etag', false);

// Add cache-control headers to prevent browser caching
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

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
// TENANT CONTEXT EXTRACTION (from API Gateway headers)
// ============================================================================

app.use((req: Request, res: Response, next: NextFunction) => {
  // Extract tenant context set by API Gateway
  const tenantId = req.headers['x-tenant-id'] as string;
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  
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
  
  next();
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'attendance-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req: Request, res: Response) => {
  res.json({
    status: 'ready',
    service: 'attendance-service',
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// Mount holidays under attendance for frontend compatibility - MUST be before generic attendance routes
app.use('/api/v1/attendance/holidays', holidayRoutes);
app.use('/api/v1/attendance/leaves', leaveRoutes);
app.use('/api/v1/attendance/leave-types', leaveRoutes);  // Map /attendance/leave-types/* to leave routes
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/holidays', holidayRoutes);

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
