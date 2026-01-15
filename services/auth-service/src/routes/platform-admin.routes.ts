/**
 * Platform Admin Management Routes
 * These routes are protected by api-gateway (platform admin only).
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { getMasterPrisma } from '../utils/database';
import { logger } from '../utils/logger';
import { forgotPasswordPlatformAdmin } from '../services/password-reset.service';
import { config } from '../config';
import { createAuditLog, getRequestContext } from '../utils/audit';

const router = Router();

const roleEnum = z.enum([
  'SUPER_ADMIN',
  'SUB_ADMIN',
  'ADMIN_USER',
  'BILLING_ADMIN',
  'SUPPORT_AGENT',
]);

const statusEnum = z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'LOCKED', 'SUSPENDED']);

const createAdminSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: roleEnum,
  password: z.string().min(8),
  phone: z.string().optional(),
  status: statusEnum.optional(),
  username: z.string().optional(),
});

const updateAdminSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  displayName: z.string().optional(),
  role: roleEnum.optional(),
  status: statusEnum.optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
});

const sendEmailSchema = z.object({
  subject: z.string().min(1),
  message: z.string().min(1),
});

const sendBulkEmailSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
  subject: z.string().min(1).max(200),
  message: z.string().min(1),
});

const buildUniqueUsername = async (base: string, prisma: ReturnType<typeof getMasterPrisma>) => {
  const cleaned = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');

  if (!cleaned) {
    return `admin_${Date.now()}`;
  }

  let candidate = cleaned;
  let suffix = 1;

  while (true) {
    const existing = await prisma.platformAdmin.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
    candidate = `${cleaned}${suffix}`;
    suffix += 1;
  }
};

// ============================================================================
// LIST PLATFORM ADMINS
// ============================================================================

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getMasterPrisma();
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const role = (req.query.role as string) || '';

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (role) {
      where.role = role;
    }

    const [admins, total, statusCounts] = await Promise.all([
      prisma.platformAdmin.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatar: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      prisma.platformAdmin.count({ where }),
      prisma.platformAdmin.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
    ]);

    const stats = statusCounts.reduce((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: admins,
      stats: {
        total: statusCounts.reduce((sum, row) => sum + row._count._all, 0),
        active: stats.ACTIVE || 0,
        inactive: stats.INACTIVE || 0,
        suspended: stats.SUSPENDED || 0,
        pending: stats.PENDING || 0,
        locked: stats.LOCKED || 0,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error({ error }, 'List platform admins error');
    next(error);
  }
});

// ============================================================================
// CREATE PLATFORM ADMIN
// ============================================================================

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
    }

    const prisma = getMasterPrisma();
    const data = parsed.data;

    const existing = await prisma.platformAdmin.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'An admin with this email already exists' },
      });
    }

    const username = data.username
      ? data.username.toLowerCase()
      : await buildUniqueUsername(data.email.split('@')[0], prisma);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const displayName = `${data.firstName} ${data.lastName}`.trim();

    const admin = await prisma.platformAdmin.create({
      data: {
        email: data.email.toLowerCase(),
        username,
        passwordHash,
        role: data.role,
        status: data.status ?? 'ACTIVE',
        firstName: data.firstName,
        lastName: data.lastName,
        displayName,
        phone: data.phone,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Create audit log
    const context = getRequestContext(req);
    await createAuditLog({
      ...context,
      action: 'CREATE',
      resource: 'PlatformAdmin',
      resourceId: admin.id,
      description: `Created platform admin: ${admin.email} with role ${admin.role}`,
      metadata: { email: admin.email, role: admin.role, status: admin.status },
    });

    res.status(201).json({ success: true, data: admin });
  } catch (error) {
    logger.error({ error }, 'Create platform admin error');
    next(error);
  }
});

// ============================================================================
// UPDATE PLATFORM ADMIN
// ============================================================================

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
    }

    const prisma = getMasterPrisma();
    const data = parsed.data;

    // Get old values for audit log
    const oldAdmin = await prisma.platformAdmin.findUnique({
      where: { id: req.params.id },
      select: { role: true, status: true, email: true },
    });

    const admin = await prisma.platformAdmin.update({
      where: { id: req.params.id },
      data: {
        ...data,
        email: data.email ? data.email.toLowerCase() : undefined,
        displayName:
          data.displayName ??
          (data.firstName || data.lastName
            ? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim()
            : undefined),
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    // Create audit log for significant changes
    const context = getRequestContext(req);
    const changes: string[] = [];
    
    if (oldAdmin) {
      if (data.role && data.role !== oldAdmin.role) {
        changes.push(`role changed from ${oldAdmin.role} to ${data.role}`);
        await createAuditLog({
          ...context,
          action: 'CHANGE_ROLE',
          resource: 'PlatformAdmin',
          resourceId: admin.id,
          description: `Changed role from ${oldAdmin.role} to ${data.role} for ${admin.email}`,
          metadata: { oldRole: oldAdmin.role, newRole: data.role, email: admin.email },
        });
      }
      
      if (data.status && data.status !== oldAdmin.status) {
        changes.push(`status changed from ${oldAdmin.status} to ${data.status}`);
        await createAuditLog({
          ...context,
          action: data.status === 'SUSPENDED' ? 'SUSPEND' : data.status === 'ACTIVE' ? 'ACTIVATE' : 'CHANGE_STATUS',
          resource: 'PlatformAdmin',
          resourceId: admin.id,
          description: `Changed status from ${oldAdmin.status} to ${data.status} for ${admin.email}`,
          metadata: { oldStatus: oldAdmin.status, newStatus: data.status, email: admin.email },
        });
      }
      
      if (changes.length === 0 && data.email) {
        await createAuditLog({
          ...context,
          action: 'UPDATE',
          resource: 'PlatformAdmin',
          resourceId: admin.id,
          description: `Updated platform admin: ${admin.email}`,
          metadata: { email: admin.email },
        });
      }
    }

    res.json({ success: true, data: admin });
  } catch (error) {
    logger.error({ error }, 'Update platform admin error');
    next(error);
  }
});

// ============================================================================
// DELETE PLATFORM ADMIN (SOFT DELETE)
// ============================================================================

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getMasterPrisma();
    
    // Check if admin exists
    const admin = await prisma.platformAdmin.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, role: true, deletedAt: true },
    });

    if (!admin || admin.deletedAt) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Admin not found' },
      });
    }

    // Prevent deleting yourself
    const requestingAdminId = req.headers['x-user-id'] as string;
    if (admin.id === requestingAdminId) {
      return res.status(400).json({
        success: false,
        error: { code: 'CANNOT_DELETE_SELF', message: 'You cannot delete your own account' },
      });
    }

    // Soft delete the admin
    await prisma.platformAdmin.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    // Create audit log
    const context = getRequestContext(req);
    await createAuditLog({
      ...context,
      action: 'DELETE',
      resource: 'PlatformAdmin',
      resourceId: admin.id,
      description: `Deleted platform admin: ${admin.email}`,
      metadata: { email: admin.email, role: admin.role },
    });

    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    logger.error({ error }, 'Delete platform admin error');
    next(error);
  }
});

// ============================================================================
// RESET PASSWORD (SEND EMAIL LINK)
// ============================================================================

router.post('/:id/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getMasterPrisma();
    const admin = await prisma.platformAdmin.findUnique({
      where: { id: req.params.id },
      select: { email: true },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Admin not found' },
      });
    }

    const result = await forgotPasswordPlatformAdmin(admin.email);
    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Reset platform admin password error');
    next(error);
  }
});

// ============================================================================
// SEND EMAIL (VIA NOTIFICATION SERVICE)
// ============================================================================

router.post('/:id/email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = sendEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
    }

    const prisma = getMasterPrisma();
    const admin = await prisma.platformAdmin.findUnique({
      where: { id: req.params.id },
      select: { email: true, displayName: true, firstName: true, lastName: true },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Admin not found' },
      });
    }

    // Call notification service to send email
    try {
      const emailResponse = await axios.post(
        `${config.notificationServiceUrl}/api/notifications/platform/email`,
        {
          to: admin.email,
          subject: parsed.data.subject,
          message: parsed.data.message,
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Create audit log
      const context = getRequestContext(req);
      await createAuditLog({
        ...context,
        action: 'SEND_EMAIL',
        resource: 'PlatformAdmin',
        resourceId: req.params.id,
        description: `Sent email to ${admin.email}: ${parsed.data.subject}`,
        metadata: { 
          to: admin.email, 
          subject: parsed.data.subject,
          success: emailResponse.data.success 
        },
      });

      res.json({
        success: true,
        message: 'Email sent successfully',
        data: emailResponse.data,
      });
    } catch (emailError: any) {
      logger.error({ error: emailError, to: admin.email }, 'Failed to send email via notification service');
      
      // Still create audit log for failed attempt
      const context = getRequestContext(req);
      await createAuditLog({
        ...context,
        action: 'SEND_EMAIL_FAILED',
        resource: 'PlatformAdmin',
        resourceId: req.params.id,
        description: `Failed to send email to ${admin.email}: ${parsed.data.subject}`,
        metadata: { 
          to: admin.email, 
          subject: parsed.data.subject,
          error: emailError.message 
        },
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send email. Please check notification service configuration.',
        },
      });
    }
  } catch (error) {
    logger.error({ error }, 'Send platform admin email error');
    next(error);
  }
});

// ============================================================================
// EXPORT PLATFORM ADMINS TO CSV
// ============================================================================

router.get('/export/csv', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getMasterPrisma();
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const role = (req.query.role as string) || '';

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (role) {
      where.role = role;
    }

    const admins = await prisma.platformAdmin.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
        status: true,
        phone: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    // Build CSV content
    const headers = [
      'ID',
      'Email',
      'Username',
      'First Name',
      'Last Name',
      'Display Name',
      'Role',
      'Status',
      'Phone',
      'Last Login',
      'Created At',
    ];

    const csvRows = [headers.join(',')];

    for (const admin of admins) {
      const row = [
        admin.id,
        admin.email,
        admin.username,
        admin.firstName,
        admin.lastName,
        admin.displayName || '',
        admin.role,
        admin.status,
        admin.phone || '',
        admin.lastLoginAt ? admin.lastLoginAt.toISOString() : '',
        admin.createdAt.toISOString(),
      ];
      // Escape and quote fields that might contain commas
      const escapedRow = row.map(field => 
        `"${String(field).replace(/"/g, '""')}"`
      );
      csvRows.push(escapedRow.join(','));
    }

    const csvContent = csvRows.join('\\n');

    // Create audit log
    const context = getRequestContext(req);
    await createAuditLog({
      ...context,
      action: 'EXPORT',
      resource: 'PlatformAdmin',
      description: `Exported ${admins.length} platform admins to CSV`,
      metadata: { count: admins.length, filters: { search, status, role } },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="platform-admins-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    logger.error({ error }, 'Export platform admins error');
    next(error);
  }
});

// ============================================================================
// SEND BULK EMAIL TO MULTIPLE ADMINS
// ============================================================================

router.post('/email/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = sendBulkEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
    }

    const prisma = getMasterPrisma();
    const { userIds, subject, message } = parsed.data;

    // Fetch all admins
    const admins = await prisma.platformAdmin.findMany({
      where: { 
        id: { in: userIds },
        deletedAt: null,
        status: 'ACTIVE', // Only send to active users
      },
      select: { id: true, email: true, displayName: true, firstName: true, lastName: true },
    });

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NO_RECIPIENTS', message: 'No active admins found with provided IDs' },
      });
    }

    // Call notification service bulk email endpoint
    try {
      const emailResponse = await axios.post(
        `${config.notificationServiceUrl}/api/notifications/platform/email/bulk`,
        {
          recipients: admins.map(a => a.email),
          subject,
          message,
        },
        {
          timeout: 30000, // 30 seconds for bulk
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Create audit log
      const context = getRequestContext(req);
      await createAuditLog({
        ...context,
        action: 'BULK_EMAIL',
        resource: 'PlatformAdmin',
        description: `Sent bulk email to ${admins.length} admins: ${subject}`,
        metadata: { 
          recipients: admins.map(a => a.email),
          subject,
          count: admins.length,
          result: emailResponse.data 
        },
      });

      res.json({
        success: true,
        message: `Email sent to ${admins.length} admins`,
        data: emailResponse.data,
      });
    } catch (emailError: any) {
      logger.error({ error: emailError }, 'Failed to send bulk email');
      
      // Create audit log for failed attempt
      const context = getRequestContext(req);
      await createAuditLog({
        ...context,
        action: 'BULK_EMAIL_FAILED',
        resource: 'PlatformAdmin',
        description: `Failed to send bulk email: ${subject}`,
        metadata: { 
          recipients: admins.map(a => a.email),
          subject,
          count: admins.length,
          error: emailError.message 
        },
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send bulk email. Please check notification service.',
        },
      });
    }
  } catch (error) {
    logger.error({ error }, 'Bulk email error');
    next(error);
  }
});

export default router;
