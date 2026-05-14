/**
 * Payroll / Salary Run Routes
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { PrismaClient } from '.prisma/tenant-client';
import { logger } from '../utils/logger';
import * as payrollService from '../services/payroll/payroll.service';
import { buildTemplateWorkbook } from '../services/payroll/payroll-excel.service';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
  },
});

function getPrisma(req: Request): PrismaClient {
  const p = (req as any).prisma as PrismaClient;
  if (!p) throw new Error('Prisma client not found on request');
  return p;
}

function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) || 'system';
}

function getTenantSlug(req: Request): string {
  const slug = req.headers['x-tenant-slug'] as string;
  if (!slug) throw new Error('Missing X-Tenant-Slug header');
  return slug;
}

function userPermissions(req: Request): string[] {
  return (req.headers['x-user-permissions'] as string)?.split(',').filter(Boolean) ?? [];
}

function hasAnyPermission(req: Request, ...needed: string[]): boolean {
  const perms = userPermissions(req);
  return needed.some((p) => perms.includes(p));
}

function sendError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ success: false, error: { code, message } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const createRunSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  totalWorkingDays: z.number().int().min(0).max(31),
  totalHolidays: z.number().int().min(0).max(31),
  notes: z.string().max(2000).nullable().optional(),
});

const listRunsSchema = z.object({
  year: z.coerce.number().int().optional(),
  status: z.enum(['DRAFT', 'PROCESSING', 'FINALIZED', 'CANCELLED']).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /payroll/template.xlsx — blank import template
// ─────────────────────────────────────────────────────────────────────────────
router.get('/template.xlsx', (req: Request, res: Response) => {
  if (!hasAnyPermission(req, 'payroll:read', 'payroll:write', 'payroll:finalize', 'payroll:delete')) {
    return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
  }
  const buf = buildTemplateWorkbook();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="salary-run-template.xlsx"');
  res.send(buf);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /payroll/period-defaults?month=&year= — compute default working days/holidays
// ─────────────────────────────────────────────────────────────────────────────
router.get('/period-defaults', async (req: Request, res: Response) => {
  if (!hasAnyPermission(req, 'payroll:read', 'payroll:write', 'payroll:finalize', 'payroll:delete')) {
    return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
  }
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) return sendError(res, 400, 'BAD_REQUEST', 'month and year are required');
    const prisma = getPrisma(req);
    const defaults = await payrollService.computePeriodDefaults(prisma, month, year);
    res.json({ success: true, data: defaults });
  } catch (err: any) {
    logger.error({ err: err.message }, 'period-defaults failed');
    sendError(res, 500, 'INTERNAL_ERROR', err.message ?? 'Failed');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /payroll/runs — list runs
// ─────────────────────────────────────────────────────────────────────────────
router.get('/runs', async (req: Request, res: Response) => {
  if (!hasAnyPermission(req, 'payroll:read', 'payroll:write', 'payroll:finalize', 'payroll:delete')) {
    return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
  }
  try {
    const filters = listRunsSchema.parse(req.query);
    const prisma = getPrisma(req);
    const runs = await payrollService.listRuns(prisma, filters);
    res.json({ success: true, data: runs });
  } catch (err: any) {
    if (err instanceof z.ZodError) return sendError(res, 400, 'VALIDATION_ERROR', JSON.stringify(err.errors));
    logger.error({ err: err.message }, 'list runs failed');
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to list runs');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /payroll/runs — create a DRAFT run
// ─────────────────────────────────────────────────────────────────────────────
router.post('/runs', async (req: Request, res: Response) => {
  if (!hasAnyPermission(req, 'payroll:write')) {
    return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
  }
  try {
    const parsed = createRunSchema.parse(req.body);
    const input = {
      month: parsed.month,
      year: parsed.year,
      totalWorkingDays: parsed.totalWorkingDays,
      totalHolidays: parsed.totalHolidays,
      notes: parsed.notes ?? null,
    };
    const prisma = getPrisma(req);
    const run = await payrollService.createRun(prisma, getUserId(req), input);
    res.status(201).json({ success: true, data: run });
  } catch (err: any) {
    if (err instanceof z.ZodError) return sendError(res, 400, 'VALIDATION_ERROR', JSON.stringify(err.errors));
    if (err.code === 'DUPLICATE_PERIOD') return sendError(res, 409, 'DUPLICATE_PERIOD', err.message);
    logger.error({ err: err.message }, 'create run failed');
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create run');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /payroll/runs/:id — run detail with items
// ─────────────────────────────────────────────────────────────────────────────
router.get('/runs/:id', async (req: Request, res: Response) => {
  if (!hasAnyPermission(req, 'payroll:read', 'payroll:write', 'payroll:finalize', 'payroll:delete')) {
    return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
  }
  try {
    const prisma = getPrisma(req);
    const run = await payrollService.getRunWithItems(prisma, req.params.id);
    if (!run) return sendError(res, 404, 'NOT_FOUND', 'Salary run not found');
    res.json({ success: true, data: run });
  } catch (err: any) {
    logger.error({ err: err.message }, 'get run failed');
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch run');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /payroll/runs/:id/import — upload & parse Excel
// ─────────────────────────────────────────────────────────────────────────────
router.post('/runs/:id/import', upload.single('file'), async (req: Request, res: Response) => {
  if (!hasAnyPermission(req, 'payroll:write')) {
    return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
  }
  try {
    if (!req.file) return sendError(res, 400, 'BAD_REQUEST', 'file is required (multipart field "file")');
    const prisma = getPrisma(req);
    const summary = await payrollService.importExcel(
      prisma,
      req.params.id,
      req.file.buffer,
      req.file.originalname,
      getUserId(req),
      getTenantSlug(req),
    );
    res.json({ success: true, data: summary });
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') return sendError(res, 404, 'NOT_FOUND', err.message);
    if (err.code === 'FORBIDDEN') return sendError(res, 409, 'FORBIDDEN', err.message);
    logger.error({ err: err.message }, 'import failed');
    sendError(res, 500, 'INTERNAL_ERROR', err.message ?? 'Import failed');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /payroll/runs/:id/generate-payslips
// ─────────────────────────────────────────────────────────────────────────────
router.post('/runs/:id/generate-payslips', async (req: Request, res: Response) => {
  if (!hasAnyPermission(req, 'payroll:write', 'payroll:finalize')) {
    return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
  }
  try {
    const prisma = getPrisma(req);
    const result = await payrollService.generatePayslips(prisma, req.params.id, getUserId(req), getTenantSlug(req));
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') return sendError(res, 404, 'NOT_FOUND', err.message);
    if (err.code === 'FORBIDDEN') return sendError(res, 409, 'FORBIDDEN', err.message);
    logger.error({ err: err.message }, 'generate payslips failed');
    sendError(res, 500, 'INTERNAL_ERROR', err.message ?? 'Generation failed');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /payroll/runs/:id/finalize
// ─────────────────────────────────────────────────────────────────────────────
router.post('/runs/:id/finalize', async (req: Request, res: Response) => {
  if (!hasAnyPermission(req, 'payroll:finalize')) {
    return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
  }
  try {
    const prisma = getPrisma(req);
    const run = await payrollService.finalizeRun(prisma, req.params.id, getUserId(req), getTenantSlug(req));
    res.json({ success: true, data: run });
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') return sendError(res, 404, 'NOT_FOUND', err.message);
    if (err.code === 'FORBIDDEN' || err.code === 'CONFLICT' || err.code === 'INVALID_STATE') {
      return sendError(res, 409, err.code, err.message);
    }
    logger.error({ err: err.message }, 'finalize failed');
    sendError(res, 500, 'INTERNAL_ERROR', err.message ?? 'Finalize failed');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /payroll/runs/:id/cancel
// ─────────────────────────────────────────────────────────────────────────────
router.post('/runs/:id/cancel', async (req: Request, res: Response) => {
  if (!hasAnyPermission(req, 'payroll:delete', 'payroll:write')) {
    return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
  }
  try {
    const prisma = getPrisma(req);
    const run = await payrollService.cancelRun(prisma, req.params.id);
    res.json({ success: true, data: run });
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') return sendError(res, 404, 'NOT_FOUND', err.message);
    if (err.code === 'FORBIDDEN') return sendError(res, 409, 'FORBIDDEN', err.message);
    logger.error({ err: err.message }, 'cancel failed');
    sendError(res, 500, 'INTERNAL_ERROR', err.message ?? 'Cancel failed');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /payroll/employees/:employeeId/payslips — list finalized payslips for one employee
// (Self users with payroll:self get only their own; HR with payroll:read sees any employee.)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/employees/:employeeId/payslips', async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const { employeeId } = req.params;
    const userId = getUserId(req);

    const canSeeAll = hasAnyPermission(req, 'payroll:read', 'payroll:write', 'payroll:finalize');
    const canSeeOwn = hasAnyPermission(req, 'payroll:self');

    if (!canSeeAll) {
      if (!canSeeOwn) return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
      // Resolve user → employee.id and ensure match
      const user = await prisma.user.findFirst({
        where: { id: userId },
        select: { employee: { select: { id: true } } },
      });
      const requesterEmployeeId = user?.employee?.id;
      if (!requesterEmployeeId || requesterEmployeeId !== employeeId) {
        return sendError(res, 403, 'FORBIDDEN', 'You can only view your own payslips');
      }
    }

    const payslips = await payrollService.listEmployeePayslips(prisma, employeeId);
    res.json({ success: true, data: payslips });
  } catch (err: any) {
    logger.error({ err: err.message }, 'list employee payslips failed');
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch payslips');
  }
});

export default router;
