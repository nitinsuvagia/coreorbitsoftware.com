/**
 * API Gateway - Main Application
 */

import express, { Request, Response, NextFunction } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('helmet');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { v4 as uuidv4 } from 'uuid';
import { getTenantDbManager } from '@oms/tenant-db-manager';

import { config } from './config';
import { logger } from './utils/logger';
import {
  domainResolverMiddleware,
  domainAccessGuard,
  authMiddleware,
  tenantContextMiddleware,
  requireAuth,
  requireTenantContext,
  requireMainDomain,
  requirePlatformAdmin,
  TenantContextRequest,
  tenantRateLimiter,
  maintenanceModeMiddleware,
  getMaintenanceStatusHandler,
} from './middleware';
import tenantRoutes from './routes/tenant.routes';
import organizationRoutes from './routes/organization.routes';
import platformSettingsRoutes from './routes/platform-settings.routes';
import pricingPlansRoutes from './routes/pricing-plans.routes';
import platformSubscriptionsRoutes from './routes/platform-subscriptions.routes';
import platformReportsRoutes from './routes/platform-reports.routes';

// ============================================================================
// CREATE APP
// ============================================================================

const app = express();

// ============================================================================
// BASIC MIDDLEWARE
// ============================================================================

// Request ID
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', (req as any).id);
  next();
});

// Security headers
app.use(helmet());

// Manual CORS headers for all responses
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  
  // Always set a specific origin for CORS (never use * with credentials)
  // If origin header exists, use it. Otherwise, default to localhost:3000 for development
  const allowedOrigin = origin || 'http://localhost:3000';
  
  // Check if the origin is allowed
  // Allow all localhost origins (including subdomains like softqube.localhost:3000)
  const isLocalhost = allowedOrigin.includes('localhost') || allowedOrigin.includes('127.0.0.1');
  const isWildcard = config.corsOrigins.length === 1 && config.corsOrigins[0] === '*';
  const isExplicitlyAllowed = config.corsOrigins.includes(allowedOrigin);
  
  const isAllowed = isWildcard || isLocalhost || isExplicitlyAllowed;
  
  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Tenant-ID, X-Tenant-Slug');
  res.setHeader('Vary', 'Origin');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  next();
});

// Compression
app.use(compression());

// Body parsing - skip for proxy routes to allow direct streaming
const skipBodyParserPaths = [
  '/api/v1/assessments',
  '/api/v1/interviews',
  '/api/v1/candidates',
  '/api/v1/jobs',
  '/api/v1/employees',
  '/api/v1/departments',
  '/api/v1/designations',
  '/api/v1/leaves',
  '/api/v1/attendance',
  '/api/v1/onboarding',
  '/api/v1/documents',
  '/api/v1/projects',
  '/api/v1/tasks',
  '/api/v1/billing',
  '/api/v1/notifications',
  '/api/v1/reports',
];

app.use((req: Request, res: Response, next: NextFunction) => {
  const shouldSkip = skipBodyParserPaths.some(path => req.path.startsWith(path));
  if (shouldSkip) {
    return next();
  }
  return express.json({ limit: '10mb' })(req, res, next);
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const shouldSkip = skipBodyParserPaths.some(path => req.path.startsWith(path));
  if (shouldSkip) {
    return next();
  }
  return express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ============================================================================
// DOMAIN RESOLUTION (CRITICAL)
// ============================================================================

// Resolve domain FIRST - determines main vs tenant subdomain
app.use(domainResolverMiddleware);

// ============================================================================
// HEALTH CHECKS (No auth required)
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req: Request, res: Response) => {
  res.json({ 
    status: 'ready',
    service: 'api-gateway',
  });
});

// Internal endpoint to invalidate tenant cache (used by auth-service after reactivation)
app.post('/internal/invalidate-tenant-cache', (req: Request, res: Response) => {
  const { tenantSlug, internalSecret } = req.body;
  
  // Simple security check - only allow internal calls
  if (internalSecret !== (process.env.INTERNAL_SECRET || 'internal-api-secret')) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  
  if (!tenantSlug) {
    return res.status(400).json({ success: false, error: 'tenantSlug required' });
  }
  
  try {
    const dbManager = getTenantDbManager();
    dbManager.invalidateTenantCache(tenantSlug);
    logger.info({ tenantSlug }, 'Tenant cache invalidated');
    res.json({ success: true, message: `Cache invalidated for tenant: ${tenantSlug}` });
  } catch (error) {
    logger.error({ error, tenantSlug }, 'Failed to invalidate tenant cache');
    res.status(500).json({ success: false, error: 'Failed to invalidate cache' });
  }
});

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

// Parse JWT token (doesn't require auth, just parses if present)
app.use(authMiddleware);

// Enforce domain access rules for authenticated users
app.use(domainAccessGuard);

// Set up tenant database context for tenant domains
app.use(tenantContextMiddleware);

// Rate limiting disabled - uncomment to enable
// app.use(tenantRateLimiter());

// Maintenance mode check (blocks tenant access during maintenance)
app.use(maintenanceModeMiddleware);

// Endpoint to check maintenance status (for frontend)
app.get('/api/maintenance-status', getMaintenanceStatusHandler);

// ============================================================================
// PUBLIC ROUTES (No auth required)
// ============================================================================

// Login context - returns branding and SSO config for login page
app.get('/api/v1/auth/login-context', (req: Request, res: Response) => {
  const ctxReq = req as TenantContextRequest;
  const { domainResolution, tenantContext } = ctxReq;
  
  res.json({
    success: true,
    data: {
      domainType: domainResolution.type,
      isMainDomain: domainResolution.isMainDomain,
      tenant: tenantContext ? {
        name: tenantContext.tenantName,
        slug: tenantContext.tenantSlug,
        // TODO: Add branding from tenant settings
      } : null,
      allowedUserTypes: domainResolution.allowedUserTypes,
      loginTitle: domainResolution.isMainDomain 
        ? 'Platform Admin Login' 
        : `${tenantContext?.tenantName || 'Organization'} Login`,
    },
  });
});

// Public tenant registration endpoint
app.post('/api/v1/tenants/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { getMasterPrisma } = await import('@oms/database');
    const { getTenantDbManager } = await import('@oms/tenant-db-manager');
    const bcrypt = await import('bcryptjs');
    const { v4: uuidv4 } = await import('uuid');
    
    const registerSchema = (await import('zod')).z.object({
      name: (await import('zod')).z.string().min(2).max(100),
      slug: (await import('zod')).z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
      email: (await import('zod')).z.string().email(),
      phone: (await import('zod')).z.string().optional(),
      legalName: (await import('zod')).z.string().optional(),
      adminEmail: (await import('zod')).z.string().email(),
      adminPassword: (await import('zod')).z.string().min(8),
      adminFirstName: (await import('zod')).z.string().min(1),
      adminLastName: (await import('zod')).z.string().min(1),
      addressLine1: (await import('zod')).z.string().optional(),
      city: (await import('zod')).z.string().optional(),
      state: (await import('zod')).z.string().optional(),
      country: (await import('zod')).z.string().optional(),
      postalCode: (await import('zod')).z.string().optional(),
      trialDays: (await import('zod')).z.number().min(0).max(90).default(14),
    });

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
    }

    const data = parsed.data;
    const prisma = getMasterPrisma();

    // Check if slug exists
    const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'SLUG_EXISTS', message: 'This subdomain is already taken' },
      });
    }

    const tenantId = uuidv4();
    const databaseName = `oms_tenant_${data.slug}`;

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: data.name,
        slug: data.slug,
        legalName: data.legalName,
        email: data.email,
        phone: data.phone,
        databaseName,
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + (data.trialDays || 14) * 24 * 60 * 60 * 1000),
        addressLine1: data.addressLine1,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
      },
    });

    // Create database and seed
    await prisma.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
    const dbManager = getTenantDbManager();
    await dbManager.migrateTenantDatabase(data.slug);
    
    const hashedPassword = await bcrypt.default.hash(data.adminPassword, 10);
    await dbManager.seedTenantDatabase(data.slug, {
      adminEmail: data.adminEmail,
      adminPasswordHash: hashedPassword,
      adminFirstName: data.adminFirstName,
      adminLastName: data.adminLastName,
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { activatedAt: new Date() },
    });

    logger.info({ tenantId, slug: data.slug }, 'Tenant registered via public signup');

    res.status(201).json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        trialEndsAt: tenant.trialEndsAt,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Public tenant registration error');
    next(error);
  }
});

// ============================================================================
// PUBLIC OFFER ROUTES (No auth required)
// Allows candidates to view and respond to job offers
// ============================================================================

app.use('/api/v1/public/offer',
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/public/offer': '/api/v1/public/offer' },
    onProxyReq: fixRequestBody,
    onError: (err, req, res) => {
      logger.error({ error: err.message, path: req.url }, 'Public offer proxy error');
      (res as Response).status(502).json({
        success: false,
        error: { code: 'PROXY_ERROR', message: 'Service unavailable' },
      });
    },
  })
);

// ============================================================================
// PUBLIC ONBOARDING ROUTES (No auth required)
// Allows candidates to fill onboarding details with temp credentials
// ============================================================================

app.use('/api/v1/public/onboarding',
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/public/onboarding': '/api/v1/public/onboarding' },
    onProxyReq: fixRequestBody,
    onError: (err, req, res) => {
      logger.error({ error: err.message, path: req.url }, 'Public onboarding proxy error');
      (res as Response).status(502).json({
        success: false,
        error: { code: 'PROXY_ERROR', message: 'Service unavailable' },
      });
    },
  })
);

// ============================================================================
// GLOBAL SEARCH ENDPOINT
// ============================================================================

/**
 * Global search endpoint - searches across employees, projects, tasks, documents
 * This runs in the gateway to aggregate results from multiple services
 */
app.get('/api/v1/search',
  requireAuth,
  requireTenantContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tcReq = req as TenantContextRequest;
      const { q, limit = '20' } = req.query;
      
      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.json({ results: [], total: 0 });
      }
      
      const searchQuery = q.toLowerCase();
      const maxResults = Math.min(parseInt(limit as string, 10) || 20, 50);
      
      // Get the tenant database connection
      const tenantDb = getTenantDbManager();
      const prisma = await tenantDb.getClientBySlug(tcReq.tenantContext!.tenantSlug);
      
      const results: Array<{
        id: string;
        type: 'employee' | 'project' | 'task' | 'document' | 'leave' | 'attendance' | 'invoice';
        title: string;
        subtitle?: string;
        url: string;
      }> = [];
      
      // Search employees
      try {
        const employees = await prisma.employee.findMany({
          where: {
            OR: [
              { firstName: { contains: searchQuery, mode: 'insensitive' } },
              { lastName: { contains: searchQuery, mode: 'insensitive' } },
              { email: { contains: searchQuery, mode: 'insensitive' } },
              { employeeCode: { contains: searchQuery, mode: 'insensitive' } },
            ],
          },
          take: 5,
          orderBy: { employeeCode: 'asc' },
          include: {
            department: { select: { name: true } },
            designation: { select: { name: true } },
          },
        });
        
        employees.forEach((emp: any) => {
          results.push({
            id: emp.id,
            type: 'employee',
            title: `${emp.firstName} ${emp.lastName}`,
            subtitle: `${emp.designation?.name || 'Employee'} • ${emp.department?.name || 'No department'}`,
            url: `/employees/${emp.id}`,
          });
        });
      } catch (e) {
        logger.warn({ error: e }, 'Employee search failed');
      }
      
      // Search projects
      try {
        const projects = await prisma.project.findMany({
          where: {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { description: { contains: searchQuery, mode: 'insensitive' } },
            ],
          },
          take: 5,
        });
        
        projects.forEach((proj: any) => {
          results.push({
            id: proj.id,
            type: 'project',
            title: proj.name,
            subtitle: `${proj.status} • ${proj.priority} priority`,
            url: `/projects/${proj.id}`,
          });
        });
      } catch (e) {
        logger.warn({ error: e }, 'Project search failed');
      }
      
      // Search tasks
      try {
        const tasks = await prisma.task.findMany({
          where: {
            OR: [
              { title: { contains: searchQuery, mode: 'insensitive' } },
              { description: { contains: searchQuery, mode: 'insensitive' } },
            ],
          },
          take: 5,
          include: {
            project: { select: { name: true } },
          },
        });
        
        tasks.forEach((task: any) => {
          results.push({
            id: task.id,
            type: 'task',
            title: task.title,
            subtitle: `${task.project?.name || 'No project'} • ${task.status}`,
            url: `/tasks/${task.id}`,
          });
        });
      } catch (e) {
        logger.warn({ error: e }, 'Task search failed');
      }
      
      // Search documents
      try {
        const documents = await prisma.document.findMany({
          where: {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { description: { contains: searchQuery, mode: 'insensitive' } },
            ],
          },
          take: 5,
        });
        
        documents.forEach((doc: any) => {
          results.push({
            id: doc.id,
            type: 'document',
            title: doc.name,
            subtitle: doc.category || 'Document',
            url: `/documents/${doc.id}`,
          });
        });
      } catch (e) {
        logger.warn({ error: e }, 'Document search failed');
      }
      
      // Trim to max results
      const trimmedResults = results.slice(0, maxResults);
      
      res.json({
        results: trimmedResults,
        total: results.length,
      });
    } catch (error) {
      logger.error({ error }, 'Global search error');
      next(error);
    }
  }
);

// ============================================================================
// CALENDAR API
// ============================================================================

/**
 * Get calendar events for a date range
 */
app.get('/api/v1/calendar/events',
  requireAuth,
  requireTenantContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tcReq = req as TenantContextRequest;
      const { start, end, userId: filterUserId } = req.query;
      
      const tenantDb = getTenantDbManager();
      const prisma = await tenantDb.getClientBySlug(tcReq.tenantContext!.tenantSlug);
      
      const startDate = start ? new Date(start as string) : new Date();
      const endDate = end ? new Date(end as string) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // Build where clause
      const where: any = {
        OR: [
          { startTime: { gte: startDate, lte: endDate } },
          { endTime: { gte: startDate, lte: endDate } },
          { AND: [{ startTime: { lte: startDate } }, { endTime: { gte: endDate } }] },
        ],
      };
      
      // If user filter, only show events they created or are attending
      if (filterUserId) {
        where.OR = [
          { createdById: filterUserId },
          { attendees: { some: { userId: filterUserId } } },
        ];
      }
      
      const events = await prisma.calendarEvent.findMany({
        where,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          attendees: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      });
      
      res.json({
        success: true,
        data: events.map((event: any) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          start: event.startTime,
          end: event.endTime,
          allDay: event.allDay,
          location: event.location,
          meetingUrl: event.meetingUrl,
          type: event.type,
          status: event.status,
          color: event.color,
          isPrivate: event.isPrivate,
          createdBy: event.createdBy,
          attendees: event.attendees.map((a: any) => ({
            id: a.id,
            user: a.user,
            status: a.status,
            isOrganizer: a.isOrganizer,
          })),
        })),
      });
    } catch (error) {
      logger.error({ error }, 'Get calendar events error');
      next(error);
    }
  }
);

/**
 * Create calendar event
 */
app.post('/api/v1/calendar/events',
  requireAuth,
  requireTenantContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tcReq = req as TenantContextRequest;
      const { z } = await import('zod');
      
      const createEventSchema = z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        allDay: z.boolean().optional(),
        location: z.string().optional(),
        meetingUrl: z.string().url().optional(),
        type: z.enum(['MEETING', 'TASK', 'REMINDER', 'LEAVE', 'HOLIDAY', 'BIRTHDAY', 'OTHER']).optional(),
        color: z.string().optional(),
        isPrivate: z.boolean().optional(),
        attendeeIds: z.array(z.string()).optional(),
        reminders: z.array(z.number()).optional(),
      });
      
      const parsed = createEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
        });
      }
      
      const tenantDb = getTenantDbManager();
      const prisma = await tenantDb.getClientBySlug(tcReq.tenantContext!.tenantSlug);
      
      const { attendeeIds, ...eventData } = parsed.data;
      
      const event = await prisma.calendarEvent.create({
        data: {
          ...eventData,
          startTime: new Date(eventData.startTime),
          endTime: new Date(eventData.endTime),
          createdById: tcReq.user!.id,
          attendees: attendeeIds ? {
            create: [
              { userId: tcReq.user!.id, status: 'ACCEPTED', isOrganizer: true },
              ...attendeeIds.filter((id: string) => id !== tcReq.user!.id).map((id: string) => ({
                userId: id,
                status: 'PENDING' as const,
              })),
            ],
          } : {
            create: [{ userId: tcReq.user!.id, status: 'ACCEPTED', isOrganizer: true }],
          },
        },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          attendees: {
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      });
      
      res.status(201).json({ success: true, data: event });
    } catch (error) {
      logger.error({ error }, 'Create calendar event error');
      next(error);
    }
  }
);

/**
 * Update calendar event
 */
app.put('/api/v1/calendar/events/:eventId',
  requireAuth,
  requireTenantContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tcReq = req as TenantContextRequest;
      const { eventId } = req.params;
      
      const tenantDb = getTenantDbManager();
      const prisma = await tenantDb.getClientBySlug(tcReq.tenantContext!.tenantSlug);
      
      // Check ownership
      const existing = await prisma.calendarEvent.findUnique({
        where: { id: eventId },
      });
      
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Event not found' },
        });
      }
      
      if (existing.createdById !== tcReq.user!.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not authorized to update this event' },
        });
      }
      
      const { startTime, endTime, ...updateData } = req.body;
      
      const event = await prisma.calendarEvent.update({
        where: { id: eventId },
        data: {
          ...updateData,
          ...(startTime && { startTime: new Date(startTime) }),
          ...(endTime && { endTime: new Date(endTime) }),
        },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          attendees: {
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      });
      
      res.json({ success: true, data: event });
    } catch (error) {
      logger.error({ error }, 'Update calendar event error');
      next(error);
    }
  }
);

/**
 * Delete calendar event
 */
app.delete('/api/v1/calendar/events/:eventId',
  requireAuth,
  requireTenantContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tcReq = req as TenantContextRequest;
      const { eventId } = req.params;
      
      const tenantDb = getTenantDbManager();
      const prisma = await tenantDb.getClientBySlug(tcReq.tenantContext!.tenantSlug);
      
      // Check ownership
      const existing = await prisma.calendarEvent.findUnique({
        where: { id: eventId },
      });
      
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Event not found' },
        });
      }
      
      if (existing.createdById !== tcReq.user!.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not authorized to delete this event' },
        });
      }
      
      await prisma.calendarEvent.delete({
        where: { id: eventId },
      });
      
      res.json({ success: true, data: { message: 'Event deleted' } });
    } catch (error) {
      logger.error({ error }, 'Delete calendar event error');
      next(error);
    }
  }
);

/**
 * Respond to event invitation
 */
app.post('/api/v1/calendar/events/:eventId/respond',
  requireAuth,
  requireTenantContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tcReq = req as TenantContextRequest;
      const { eventId } = req.params;
      const { status } = req.body;
      
      if (!['ACCEPTED', 'DECLINED', 'TENTATIVE'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Status must be ACCEPTED, DECLINED, or TENTATIVE' },
        });
      }
      
      const tenantDb = getTenantDbManager();
      const prisma = await tenantDb.getClientBySlug(tcReq.tenantContext!.tenantSlug);
      
      const attendee = await prisma.calendarAttendee.updateMany({
        where: {
          eventId,
          userId: tcReq.user!.id,
        },
        data: {
          status,
          respondedAt: new Date(),
        },
      });
      
      if (attendee.count === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'You are not an attendee of this event' },
        });
      }
      
      res.json({ success: true, data: { message: `Response recorded: ${status}` } });
    } catch (error) {
      logger.error({ error }, 'Respond to event error');
      next(error);
    }
  }
);

// ============================================================================
// SERVICE PROXIES
// ============================================================================

// Auth service proxy
app.use('/api/v1/auth', createProxyMiddleware({
  target: config.authServiceUrl,
  changeOrigin: true,
  pathRewrite: { '^/api/v1/auth': '/api/v1' },
  onProxyReq: (proxyReq, req) => {
    addTenantHeaders(proxyReq, req as TenantContextRequest);
  },
  onProxyRes: (proxyRes, req, res) => {
    const origin = req.headers.origin;
    // Debug log for CORS origin
    if (origin) {
      // Remove any existing CORS headers from backend
      delete proxyRes.headers['access-control-allow-origin'];
      delete proxyRes.headers['access-control-allow-credentials'];
      delete proxyRes.headers['access-control-allow-methods'];
      delete proxyRes.headers['access-control-allow-headers'];
      // Set correct CORS headers
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-ID,X-Tenant-ID,X-Tenant-Slug');
    }
  },
}));

// User profile proxy (auth service)
app.use('/api/v1/users',
  requireAuth,
  createProxyMiddleware({
    target: config.authServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/users': '/api/v1/users' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
    onProxyRes: (proxyRes, req, res) => {
      const origin = req.headers.origin;
      if (origin) {
        delete proxyRes.headers['access-control-allow-origin'];
        delete proxyRes.headers['access-control-allow-credentials'];
        delete proxyRes.headers['access-control-allow-methods'];
        delete proxyRes.headers['access-control-allow-headers'];
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-ID,X-Tenant-ID,X-Tenant-Slug');
      }
    },
  })
);

// Employee service proxy (requires tenant context)
app.use('/api/v1/employees', 
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/employees': '/api/v1/employees' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
    onProxyRes: (proxyRes, req) => {
      // Ensure CORS headers from gateway are preserved
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

// Department service proxy (employee-service)
app.use('/api/v1/departments', 
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/departments': '/api/v1/departments' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
    onProxyRes: (proxyRes, req) => {
      // Ensure CORS headers from gateway are preserved
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

// Designation service proxy (employee-service)
app.use('/api/v1/designations', 
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/designations': '/api/v1/designations' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
    onProxyRes: (proxyRes, req) => {
      // Ensure CORS headers from gateway are preserved
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

// Teams service proxy (employee-service)
app.use('/api/v1/teams', 
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/teams': '/api/v1/teams' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
  })
);

// Jobs service proxy (employee-service)
app.use('/api/v1/jobs', 
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/jobs': '/api/v1/jobs' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
    onProxyRes: (proxyRes, req) => {
      // Ensure CORS headers from gateway are preserved
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

// Candidates service proxy (employee-service) - All candidates across jobs
app.use('/api/v1/candidates',
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/candidates': '/api/v1/candidates' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
    onProxyRes: (proxyRes, req) => {
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

// Interviews service proxy (employee-service)
app.use('/api/v1/interviews',
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/interviews': '/api/v1/interviews' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
    onProxyRes: (proxyRes, req) => {
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

// Onboarding service proxy (employee-service) - HR onboarding management
app.use('/api/v1/onboarding',
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/onboarding': '/api/v1/onboarding' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
      fixRequestBody(proxyReq, req);
    },
    onProxyRes: (proxyRes, req) => {
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

// Assessments service proxy (employee-service)
// Public routes for candidates (no auth required)
app.use('/api/v1/assessments/invitations/code',
  requireTenantContext,
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    timeout: 60000,
    proxyTimeout: 60000,
    pathRewrite: { '^/api/v1/assessments': '/api/v1/assessments' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
      // Body is streamed directly since body-parser is skipped for this route
    },
    onProxyRes: (proxyRes, req) => {
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

app.use('/api/v1/assessments/start',
  requireTenantContext,
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    timeout: 60000,
    proxyTimeout: 60000,
    pathRewrite: { '^/api/v1/assessments': '/api/v1/assessments' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
      // Body is streamed directly since body-parser is skipped for this route
    },
    onProxyRes: (proxyRes, req) => {
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

app.use('/api/v1/assessments/results',
  requireTenantContext,
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    timeout: 60000, // 60 second timeout
    proxyTimeout: 60000,
    pathRewrite: { '^/api/v1/assessments': '/api/v1/assessments' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
      // Body is streamed directly since body-parser is skipped for this route
    },
    onProxyRes: (proxyRes, req) => {
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
    onError: (err, req, res) => {
      logger.error({ error: err.message, url: req.url }, 'Proxy error for assessments/results');
      (res as Response).status(502).json({
        success: false,
        error: 'Failed to connect to assessment service',
      });
    },
  })
);

// Protected assessments routes (require auth)
app.use('/api/v1/assessments',
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.employeeServiceUrl,
    changeOrigin: true,
    timeout: 60000,
    proxyTimeout: 60000,
    pathRewrite: { '^/api/v1/assessments': '/api/v1/assessments' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
      // Fix request body for POST/PUT/PATCH
      fixRequestBody(proxyReq, req);
    },
    onProxyRes: (proxyRes, req) => {
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
    onError: (err, req, res) => {
      logger.error({ error: err.message, path: req.url }, 'Error proxying to assessments service');
      (res as any).status(502).json({
        success: false,
        error: 'Failed to connect to assessment service',
      });
    },
  })
);

// Organization settings (current tenant) - handled locally
app.use('/api/v1/organization',
  requireAuth,
  requireTenantContext,
  organizationRoutes
);

// Holidays proxy (attendance service)
app.use('/api/v1/holidays',
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.attendanceServiceUrl,
    changeOrigin: true,
    // No pathRewrite - attendance service expects /api/v1/holidays/...
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
    onProxyRes: (proxyRes, req) => {
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

// Attendance service proxy
app.use('/api/v1/attendance',
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.attendanceServiceUrl,
    changeOrigin: true,
    // No pathRewrite - attendance service expects /api/v1/attendance/...
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
    onProxyRes: (proxyRes, req) => {
      // Ensure CORS headers from gateway are preserved
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

// Leaves service proxy (also handled by attendance service)
app.use('/api/v1/leaves',
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.attendanceServiceUrl,
    changeOrigin: true,
    // No pathRewrite - attendance service expects /api/v1/leaves/...
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
    onProxyRes: (proxyRes, req) => {
      // Ensure CORS headers from gateway are preserved
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

// Billing service proxy
app.use('/api/v1/billing',
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.billingServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/billing': '/api/billing' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
    onProxyRes: (proxyRes, req) => {
      // Ensure CORS headers from gateway are preserved
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

// Notification service proxy
app.use('/api/v1/notifications',
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.notificationServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/notifications': '/api/notifications' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
      // Re-stream body for POST/PUT/PATCH
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const bodyData = JSON.stringify((req as any).body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes, req) => {
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
  })
);

// Project service proxy
app.use('/api/v1/projects',
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.projectServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/projects': '/api/v1' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
  })
);

// Task service proxy
app.use('/api/v1/tasks',
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.taskServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/tasks': '/api/v1' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
  })
);

// Client service proxy
app.use('/api/v1/clients',
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.clientServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/clients': '/api/v1' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
  })
);

// Document service proxy
app.use('/api/documents',
  requireAuth,
  requireTenantContext,
  createProxyMiddleware({
    target: config.documentServiceUrl || 'http://localhost:3007',
    changeOrigin: true,
    pathRewrite: { '^/api/documents': '/api/documents' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
  })
);

// ============================================================================
// PLATFORM ADMIN ROUTES (Main domain only)
// ============================================================================

// Tenants management (platform admin only) - handled locally
app.use('/api/v1/platform/tenants',
  requireAuth,
  requireMainDomain,
  requirePlatformAdmin(['SUPER_ADMIN', 'SUB_ADMIN']),
  tenantRoutes
);

// Platform admin users (super admin only)
app.use('/api/v1/platform/admins',
  requireAuth,
  requireMainDomain,
  requirePlatformAdmin(['SUPER_ADMIN']),
  createProxyMiddleware({
    target: config.authServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/platform/admins': '/api/v1/platform-admins' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
  })
);

// Platform analytics
app.use('/api/v1/platform/analytics',
  requireAuth,
  requireMainDomain,
  requirePlatformAdmin(),
  createProxyMiddleware({
    target: config.reportServiceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/platform/analytics': '/api/v1/platform' },
    onProxyReq: (proxyReq, req) => {
      addTenantHeaders(proxyReq, req as TenantContextRequest);
    },
  })
);

// Platform settings (super admin only)
app.use('/api/v1/platform/settings',
  requireAuth,
  requireMainDomain,
  requirePlatformAdmin(['SUPER_ADMIN']),
  platformSettingsRoutes
);

// Pricing plans (platform admin)
app.use('/api/v1/platform/plans',
  requireAuth,
  requireMainDomain,
  requirePlatformAdmin(['SUPER_ADMIN', 'BILLING_ADMIN']),
  pricingPlansRoutes
);

// Platform subscriptions management
app.use('/api/v1/platform/subscriptions',
  requireAuth,
  requireMainDomain,
  requirePlatformAdmin(['SUPER_ADMIN', 'SUB_ADMIN', 'BILLING_ADMIN']),
  platformSubscriptionsRoutes
);

// Platform reports and analytics
app.use('/api/v1/platform/reports',
  requireAuth,
  requireMainDomain,
  requirePlatformAdmin(['SUPER_ADMIN', 'SUB_ADMIN', 'BILLING_ADMIN']),
  platformReportsRoutes
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Add tenant context headers to proxied requests
 * Also re-streams the body since express.json() already consumed it
 */
function addTenantHeaders(proxyReq: any, req: TenantContextRequest): void {
  // Add request ID
  if ((req as any).id) {
    proxyReq.setHeader('X-Request-ID', (req as any).id);
  }
  
  // Add tenant context
  if (req.tenantContext) {
    proxyReq.setHeader('X-Tenant-ID', req.tenantContext.tenantId);
    proxyReq.setHeader('X-Tenant-Slug', req.tenantContext.tenantSlug);
  } else if (req.user?.tenantId || req.user?.tenantSlug) {
    // Fall back to tenant claims from the token when context isn't populated (e.g. localhost)
    if (req.user?.tenantId) {
      proxyReq.setHeader('X-Tenant-ID', req.user.tenantId);
    }
    if (req.user?.tenantSlug) {
      proxyReq.setHeader('X-Tenant-Slug', req.user.tenantSlug);
    }
  } else if (req.domainResolution?.tenantSlug) {
    // Forward tenant slug from domain resolution even if full context not loaded
    proxyReq.setHeader('X-Tenant-Slug', req.domainResolution.tenantSlug);
  }
  
  // Add user context
  if (req.user) {
    proxyReq.setHeader('X-User-ID', req.user.id);
    proxyReq.setHeader('X-User-Type', req.user.type);
    if (req.user.roles) {
      proxyReq.setHeader('X-User-Roles', req.user.roles.join(','));
    }
  }
  
  // Forward domain type
  proxyReq.setHeader('X-Domain-Type', req.domainResolution?.type || 'unknown');
  
  // Re-stream body since express.json() already consumed the raw stream
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
}

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
    method: req.method,
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

// ============================================================================
// EXPORT
// ============================================================================

export default app;
