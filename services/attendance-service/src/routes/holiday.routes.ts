/**
 * Holiday Routes - API endpoints for holiday management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantPrisma } from '@oms/tenant-db-manager';
import {
  createHoliday,
  bulkCreateHolidays,
  updateHoliday,
  deleteHoliday,
  getHolidayById,
  listHolidays,
  getUpcomingHolidays,
  generateRecurringHolidays,
  getHolidayStats,
  getWorkingDaysInRange,
  importStandardHolidays,
} from '../services/holiday.service';
import { logger } from '../utils/logger';
import { parseISO } from 'date-fns';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createHolidaySchema = z.object({
  name: z.string().min(2).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['public', 'optional', 'restricted']),
  description: z.string().max(500).optional(),
  isRecurring: z.boolean().optional(),
  appliesToAll: z.boolean().optional(),
  departmentIds: z.array(z.string().uuid()).optional(),
});

const updateHolidaySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['public', 'optional', 'restricted']).optional(),
  description: z.string().max(500).optional(),
  isRecurring: z.boolean().optional(),
  appliesToAll: z.boolean().optional(),
  departmentIds: z.array(z.string().uuid()).optional(),
});

const bulkCreateSchema = z.object({
  holidays: z.array(createHolidaySchema),
});

const listHolidaysSchema = z.object({
  year: z.coerce.number().min(2020).max(2100).optional(),
  type: z.enum(['public', 'optional', 'restricted']).optional(),
  departmentId: z.string().uuid().optional(),
  month: z.coerce.number().min(1).max(12).optional(),
});

const workingDaysSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departmentId: z.string().uuid().optional(),
});

const importHolidaysSchema = z.object({
  year: z.number().min(2020).max(2100),
  country: z.string().length(2).toUpperCase(),
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /holidays
 * Create a holiday
 */
router.post(
  '/',
  validateBody(createHolidaySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const userId = (req as any).userId;
      
      const holiday = await createHoliday(prisma, req.body, userId);
      
      res.status(201).json({
        message: 'Holiday created successfully',
        data: holiday,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Create holiday failed');
      if ((error as Error).message.includes('already exists')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * POST /holidays/bulk
 * Bulk create holidays
 */
router.post(
  '/bulk',
  validateBody(bulkCreateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const userId = (req as any).userId;
      
      const result = await bulkCreateHolidays(prisma, req.body, userId);
      
      res.status(201).json({
        message: `Created ${result.created} holidays, skipped ${result.skipped}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /holidays
 * List holidays with filters
 */
router.get(
  '/',
  validateQuery(listHolidaysSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      
      const holidays = await listHolidays(prisma, req.query as any);
      
      res.json({ data: holidays });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /holidays/upcoming
 * Get upcoming holidays
 */
router.get(
  '/upcoming',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const departmentId = req.query.departmentId as string | undefined;
      
      const holidays = await getUpcomingHolidays(prisma, limit, departmentId);
      
      res.json({ data: holidays });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /holidays/stats/:year
 * Get holiday statistics for a year
 */
router.get(
  '/stats/:year',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const year = parseInt(req.params.year);
      
      const stats = await getHolidayStats(prisma, year);
      
      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /holidays/working-days
 * Get working days in a date range
 */
router.get(
  '/working-days',
  validateQuery(workingDaysSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { fromDate, toDate, departmentId } = req.query as any;
      
      const result = await getWorkingDaysInRange(
        prisma,
        parseISO(fromDate),
        parseISO(toDate),
        departmentId
      );
      
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /holidays/:id
 * Get holiday by ID
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      
      const holiday = await getHolidayById(prisma, id);
      
      if (!holiday) {
        return res.status(404).json({ error: 'Holiday not found' });
      }
      
      res.json({ data: holiday });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /holidays/:id
 * Update a holiday
 */
router.put(
  '/:id',
  validateBody(updateHolidaySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      const userId = (req as any).userId;
      
      const holiday = await updateHoliday(prisma, id, req.body, userId);
      
      res.json({
        message: 'Holiday updated successfully',
        data: holiday,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /holidays/:id
 * Delete a holiday
 */
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      
      await deleteHoliday(prisma, id);
      
      res.json({ message: 'Holiday deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /holidays/generate-recurring
 * Generate recurring holidays for a year
 */
router.post(
  '/generate-recurring',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const year = req.body.year || new Date().getFullYear() + 1;
      const userId = (req as any).userId;
      
      const result = await generateRecurringHolidays(prisma, year, userId);
      
      res.status(201).json({
        message: `Generated ${result.created} recurring holidays for ${year}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /holidays/import
 * Import standard holidays for a country
 */
router.post(
  '/import',
  validateBody(importHolidaysSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { year, country } = req.body;
      const userId = (req as any).userId;
      
      const result = await importStandardHolidays(prisma, year, country, userId);
      
      res.status(201).json({
        message: `Imported ${result.created} holidays for ${country} ${year}`,
        data: result,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Import holidays failed');
      if ((error as Error).message.includes('not available')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

export default router;
