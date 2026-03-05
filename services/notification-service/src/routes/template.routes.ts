/**
 * Email Template Routes - API endpoints for managing email templates
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantPrisma } from '@oms/database';
import { renderTemplate, renderTemplateFromDb, clearTemplateCache } from '../services/template.service';
import { sendEmail } from '../services/email.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Name must be lowercase alphanumeric with hyphens'),
  displayName: z.string().min(1).max(200),
  category: z.enum(['SYSTEM', 'HR', 'RECRUITMENT', 'ATTENDANCE', 'PROJECT', 'CUSTOM']),
  description: z.string().max(500).optional(),
  subject: z.string().min(1).max(500),
  htmlContent: z.string().min(1),
  textContent: z.string().optional(),
  variables: z.array(z.object({
    name: z.string(),
    description: z.string(),
    required: z.boolean().optional(),
    example: z.string().optional(),
  })).optional(),
  isActive: z.boolean().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial().omit({ name: true });

const previewTemplateSchema = z.object({
  subject: z.string().min(1),
  htmlContent: z.string().min(1),
  data: z.record(z.any()).optional(),
});

const sendTestEmailSchema = z.object({
  to: z.string().email(),
  data: z.record(z.any()).optional(),
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Require tenant context
 */
function requireTenant(req: Request, res: Response, next: NextFunction) {
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  if (!tenantSlug) {
    return res.status(400).json({
      success: false,
      error: 'Tenant slug is required',
    });
  }
  (req as any).tenantSlug = tenantSlug;
  next();
}

/**
 * Check permission for template management
 */
function requirePermission(req: Request, res: Response, next: NextFunction) {
  // Permission check would be done by API Gateway
  // Here we just ensure the user has the right headers
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }
  (req as any).userId = userId;
  next();
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /templates - List all email templates
 */
router.get('/', requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const { category, isActive } = req.query;
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    const where: any = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        displayName: true,
        category: true,
        description: true,
        subject: true,
        isActive: true,
        isDefault: true,
        variables: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /templates/categories - Get template categories with counts
 */
router.get('/categories', requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const prisma = await getTenantPrisma(tenantSlug);
    
    const categories = await prisma.emailTemplate.groupBy({
      by: ['category'],
      _count: { id: true },
    });
    
    const categoryInfo = [
      { value: 'SYSTEM', label: 'System', description: 'System notifications (welcome, password reset)' },
      { value: 'HR', label: 'HR', description: 'HR related (onboarding, offboarding)' },
      { value: 'RECRUITMENT', label: 'Recruitment', description: 'Recruitment (job offer, interview invite)' },
      { value: 'ATTENDANCE', label: 'Attendance', description: 'Attendance (check-in reminder, leave approval)' },
      { value: 'PROJECT', label: 'Project', description: 'Project related (task assigned, deadline reminder)' },
      { value: 'CUSTOM', label: 'Custom', description: 'Custom templates' },
    ];
    
    const result = categoryInfo.map(cat => ({
      ...cat,
      count: categories.find(c => c.category === cat.value)?._count.id || 0,
    }));
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /templates/variables - Get available template variables
 */
router.get('/variables', (req: Request, res: Response) => {
  const variables = {
    common: [
      { name: 'companyName', description: 'Organization name', example: 'Innovatelab Inc' },
      { name: 'companyLogo', description: 'Organization logo URL', example: 'https://...' },
      { name: 'portalUrl', description: 'Portal login URL', example: 'https://portal...' },
      { name: 'supportEmail', description: 'Support email address', example: 'support@...' },
      { name: 'year', description: 'Current year', example: '2026' },
    ],
    user: [
      { name: 'userName', description: 'Full name of the user', example: 'John Doe' },
      { name: 'userFirstName', description: 'First name', example: 'John' },
      { name: 'userLastName', description: 'Last name', example: 'Doe' },
      { name: 'userEmail', description: 'User email address', example: 'john@...' },
    ],
    employee: [
      { name: 'employeeCode', description: 'Employee code', example: 'EMP-001' },
      { name: 'department', description: 'Department name', example: 'Engineering' },
      { name: 'designation', description: 'Job title', example: 'Software Engineer' },
      { name: 'manager', description: 'Manager name', example: 'Jane Smith' },
    ],
    recruitment: [
      { name: 'candidateName', description: 'Candidate full name', example: 'John Doe' },
      { name: 'position', description: 'Job position', example: 'Software Engineer' },
      { name: 'offerAmount', description: 'Salary offer', example: '$75,000' },
      { name: 'startDate', description: 'Proposed start date', example: 'March 15, 2026' },
      { name: 'offerLink', description: 'Link to view/accept offer', example: 'https://...' },
    ],
    attendance: [
      { name: 'date', description: 'Date', example: 'March 4, 2026' },
      { name: 'checkInTime', description: 'Check-in time', example: '9:00 AM' },
      { name: 'checkOutTime', description: 'Check-out time', example: '6:00 PM' },
      { name: 'leaveType', description: 'Type of leave', example: 'Annual Leave' },
      { name: 'leaveDays', description: 'Number of leave days', example: '3' },
    ],
    project: [
      { name: 'projectName', description: 'Project name', example: 'Website Redesign' },
      { name: 'taskTitle', description: 'Task title', example: 'Design homepage' },
      { name: 'taskDueDate', description: 'Task due date', example: 'March 10, 2026' },
      { name: 'assignedBy', description: 'Person who assigned', example: 'Jane Smith' },
    ],
  };
  
  res.json({
    success: true,
    data: variables,
  });
});

/**
 * GET /templates/:id - Get single template with full content
 */
router.get('/:id', requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const { id } = req.params;
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /templates - Create new email template
 */
router.post('/', requireTenant, requirePermission, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const userId = (req as any).userId;
    
    const data = createTemplateSchema.parse(req.body);
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    // Check if name already exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: data.name },
    });
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Template with this name already exists',
      });
    }
    
    const template = await prisma.emailTemplate.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        category: data.category,
        description: data.description,
        subject: data.subject,
        htmlContent: data.htmlContent,
        textContent: data.textContent,
        variables: data.variables || [],
        isActive: data.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    
    // Clear cache for this tenant
    clearTemplateCache(tenantSlug);
    
    logger.info({ templateId: template.id, tenantSlug }, 'Email template created');
    
    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * PUT /templates/:id - Update email template
 */
router.put('/:id', requireTenant, requirePermission, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const userId = (req as any).userId;
    const { id } = req.params;
    
    const data = updateTemplateSchema.parse(req.body);
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    // Check if template exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
      },
    });
    
    // Clear cache for this tenant
    clearTemplateCache(tenantSlug);
    
    logger.info({ templateId: id, tenantSlug }, 'Email template updated');
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * DELETE /templates/:id - Delete email template
 */
router.delete('/:id', requireTenant, requirePermission, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const { id } = req.params;
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    // Check if template exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    // Don't allow deleting default templates
    if (existing.isDefault) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete default system templates',
      });
    }
    
    await prisma.emailTemplate.delete({
      where: { id },
    });
    
    // Clear cache for this tenant
    clearTemplateCache(tenantSlug);
    
    logger.info({ templateId: id, tenantSlug }, 'Email template deleted');
    
    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /templates/:id/duplicate - Duplicate a template
 */
router.post('/:id/duplicate', requireTenant, requirePermission, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const userId = (req as any).userId;
    const { id } = req.params;
    const { name, displayName } = req.body;
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    // Get source template
    const source = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    // Create new name if not provided
    const newName = name || `${source.name}-copy`;
    const newDisplayName = displayName || `${source.displayName} (Copy)`;
    
    // Check if name already exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: newName },
    });
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Template with this name already exists',
      });
    }
    
    const template = await prisma.emailTemplate.create({
      data: {
        name: newName,
        displayName: newDisplayName,
        category: source.category,
        description: source.description,
        subject: source.subject,
        htmlContent: source.htmlContent,
        textContent: source.textContent,
        variables: source.variables || [],
        isActive: false, // Start as inactive
        isDefault: false,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    
    logger.info({ templateId: template.id, sourceId: id, tenantSlug }, 'Email template duplicated');
    
    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /templates/preview - Preview template with sample data
 */
router.post('/preview', requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = previewTemplateSchema.parse(req.body);
    
    // Sample data for preview
    const sampleData = {
      companyName: 'Innovatelab Inc',
      companyLogo: 'https://via.placeholder.com/200x50?text=Logo',
      portalUrl: 'https://portal.example.com',
      supportEmail: 'support@example.com',
      year: new Date().getFullYear(),
      userName: 'John Doe',
      userFirstName: 'John',
      userLastName: 'Doe',
      userEmail: 'john.doe@example.com',
      ...data.data,
    };
    
    const result = renderTemplateFromDb(
      data.subject,
      data.htmlContent,
      sampleData
    );
    
    res.json({
      success: true,
      data: {
        subject: result.subject,
        html: result.html,
        text: result.text,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * POST /templates/:id/test - Send test email
 */
router.post('/:id/test', requireTenant, requirePermission, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const { id } = req.params;
    
    const { to, data: testData } = sendTestEmailSchema.parse(req.body);
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    // Get template
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    // Sample data for test
    const sampleData = {
      companyName: 'Innovatelab Inc',
      companyLogo: 'https://via.placeholder.com/200x50?text=Logo',
      portalUrl: 'https://portal.example.com',
      supportEmail: 'support@example.com',
      year: new Date().getFullYear(),
      userName: 'Test User',
      userFirstName: 'Test',
      userLastName: 'User',
      userEmail: to,
      ...testData,
    };
    
    const rendered = renderTemplateFromDb(
      template.subject,
      template.htmlContent,
      sampleData
    );
    
    // Send test email
    await sendEmail({
      to: { email: to },
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
      emailType: 'tenant',
    });
    
    logger.info({ templateId: id, to, tenantSlug }, 'Test email sent');
    
    res.json({
      success: true,
      message: `Test email sent to ${to}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * POST /templates/:id/reset - Reset template to default
 */
router.post('/:id/reset', requireTenant, requirePermission, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const userId = (req as any).userId;
    const { id } = req.params;
    
    const prisma = await getTenantPrisma(tenantSlug);
    
    // Get current template
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    // Try to load the default template from file system
    const defaultTemplate = renderTemplate(template.name, {}, 'tenant');
    
    if (!defaultTemplate) {
      return res.status(404).json({
        success: false,
        error: 'No default template found for this template type',
      });
    }
    
    // This is a simplified reset - in production you'd want to store
    // the original template content somewhere
    logger.info({ templateId: id, tenantSlug }, 'Template reset requested (manual action needed)');
    
    res.json({
      success: true,
      message: 'Template reset functionality requires manual restoration from defaults',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
