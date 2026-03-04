/**
 * Holiday Routes - API endpoints for holiday management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { getTenantPrismaBySlug } from '../utils/database';
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
  parseHolidayExcel,
  validateHolidayImportData,
} from '../services/holiday.service';
import {
  listOptionalHolidays,
  getEmployeeOptedHolidays,
  optInToHoliday,
  cancelOptIn,
  getTenantOptionalHolidaySettings,
  getOptedHolidayCount,
} from '../services/optional-holiday.service';
import {
  isOpenAIConfiguredForHolidays,
  generateHolidaysWithAI,
  popularCountries,
} from '../services/ai-holiday.service';
import { logger } from '../utils/logger';
import { parseISO } from 'date-fns';

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
});

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
// AI HOLIDAY GENERATION ROUTES
// ============================================================================

/**
 * GET /holidays/ai/status
 * Check if AI is configured for holiday generation
 */
router.get('/ai/status', async (req: Request, res: Response) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const aiEnabled = await isOpenAIConfiguredForHolidays(tenantSlug);
    res.json({ aiEnabled });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to check AI status');
    res.status(500).json({ error: 'Failed to check AI status' });
  }
});

/**
 * GET /holidays/ai/countries
 * Get list of popular countries for holiday generation
 */
router.get('/ai/countries', async (req: Request, res: Response) => {
  res.json({ countries: popularCountries });
});

/**
 * POST /holidays/ai/generate
 * Generate holidays for a country using AI
 */
router.post('/ai/generate', async (req: Request, res: Response) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const { country, year, includeOptional } = req.body;

    if (!country || typeof country !== 'string') {
      return res.status(400).json({ error: 'Country is required' });
    }
    
    const targetYear = year || new Date().getFullYear();
    
    const holidays = await generateHolidaysWithAI(tenantSlug, {
      country,
      year: targetYear,
      includeOptional: includeOptional ?? true,
    });

    res.json({ 
      success: true,
      country,
      year: targetYear,
      holidays,
      count: holidays.length,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to generate holidays with AI');
    
    if (error.message.includes('not configured')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Failed to generate holidays' });
  }
});

/**
 * POST /holidays/ai/import
 * Import selected AI-generated holidays
 */
router.post('/ai/import', async (req: Request, res: Response) => {
  try {
    const tenantSlug = (req as any).tenantSlug;
    const userId = (req as any).userId;
    const { holidays } = req.body;

    if (!Array.isArray(holidays) || holidays.length === 0) {
      return res.status(400).json({ error: 'No holidays selected for import' });
    }

    const prisma = await getTenantPrismaBySlug(tenantSlug);

    // Validate and prepare holidays for import
    const validHolidays = holidays.map(h => ({
      name: h.name,
      date: h.date,
      type: h.type as 'public' | 'optional' | 'restricted',
      description: h.description,
      isRecurring: h.isRecurring ?? true,
      appliesToAll: true,
    }));

    // Import holidays
    const result = await bulkCreateHolidays(prisma, { holidays: validHolidays }, userId);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${result.created} holidays`,
      data: result,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to import AI-generated holidays');
    res.status(500).json({ error: error.message || 'Failed to import holidays' });
  }
});

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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
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
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
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

// ============================================================================
// OPTIONAL HOLIDAY OPT-IN ROUTES
// ============================================================================

/**
 * GET /holidays/optional/settings
 * Get optional holiday settings for tenant
 */
router.get(
  '/optional/settings',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const settings = await getTenantOptionalHolidaySettings(tenantSlug);
      res.json({ data: settings });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /holidays/optional/:employeeId
 * List all optional holidays with opt status for an employee
 */
router.get(
  '/optional/:employeeId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      const { employeeId } = req.params;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      
      const settings = await getTenantOptionalHolidaySettings(tenantSlug);
      const holidays = await listOptionalHolidays(prisma, employeeId, year);
      const optedCount = await getOptedHolidayCount(prisma, employeeId, year);
      
      res.json({
        data: {
          holidays,
          quota: settings.optionalHolidayQuota,
          used: optedCount,
          remaining: Math.max(0, settings.optionalHolidayQuota - optedCount),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /holidays/optional/:employeeId/opted
 * Get only opted holidays for an employee
 */
router.get(
  '/optional/:employeeId/opted',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      const { employeeId } = req.params;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      
      const optedHolidays = await getEmployeeOptedHolidays(prisma, employeeId, year);
      
      res.json({ data: optedHolidays });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /holidays/optional/:employeeId/:holidayId/opt
 * Opt into an optional holiday
 */
router.post(
  '/optional/:employeeId/:holidayId/opt',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      const { employeeId, holidayId } = req.params;
      
      const result = await optInToHoliday(prisma, employeeId, holidayId, tenantSlug);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.status(200).json({
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Opt-in to holiday failed');
      next(error);
    }
  }
);

/**
 * DELETE /holidays/optional/:employeeId/:holidayId/opt
 * Cancel opt-in for an optional holiday
 */
router.delete(
  '/optional/:employeeId/:holidayId/opt',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      const { employeeId, holidayId } = req.params;
      
      const result = await cancelOptIn(prisma, employeeId, holidayId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Cancel opt-in failed');
      next(error);
    }
  }
);

// ============================================================================
// EXCEL IMPORT/EXPORT ROUTES
// ============================================================================

/**
 * GET /holidays/import/sample
 * Download sample Excel template for holiday import
 */
router.get(
  '/import/sample',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Create sample data
      const sampleData = [
        {
          'Holiday Name': 'New Year\'s Day',
          'Date (YYYY-MM-DD)': '2026-01-01',
          'Type (public/optional/restricted)': 'public',
          'Description': 'New Year celebration',
          'Recurring (yes/no)': 'yes',
        },
        {
          'Holiday Name': 'Republic Day',
          'Date (YYYY-MM-DD)': '2026-01-26',
          'Type (public/optional/restricted)': 'public',
          'Description': 'India Republic Day',
          'Recurring (yes/no)': 'yes',
        },
        {
          'Holiday Name': 'Holi',
          'Date (YYYY-MM-DD)': '2026-03-10',
          'Type (public/optional/restricted)': 'optional',
          'Description': 'Festival of Colors',
          'Recurring (yes/no)': 'no',
        },
        {
          'Holiday Name': 'Good Friday',
          'Date (YYYY-MM-DD)': '2026-04-03',
          'Type (public/optional/restricted)': 'restricted',
          'Description': 'Christian holiday',
          'Recurring (yes/no)': 'no',
        },
        {
          'Holiday Name': 'Independence Day',
          'Date (YYYY-MM-DD)': '2026-08-15',
          'Type (public/optional/restricted)': 'public',
          'Description': 'India Independence Day',
          'Recurring (yes/no)': 'yes',
        },
      ];

      // Create workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(sampleData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 25 }, // Holiday Name
        { wch: 18 }, // Date
        { wch: 32 }, // Type
        { wch: 35 }, // Description
        { wch: 18 }, // Recurring
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Holidays');

      // Add instructions sheet
      const instructionsData = [
        { 'Field': 'Holiday Name', 'Description': 'Name of the holiday (required, 2-100 characters)' },
        { 'Field': 'Date (YYYY-MM-DD)', 'Description': 'Holiday date in YYYY-MM-DD format (required)' },
        { 'Field': 'Type', 'Description': 'Type of holiday: public, optional, or restricted (required)' },
        { 'Field': 'Description', 'Description': 'Optional description (max 500 characters)' },
        { 'Field': 'Recurring', 'Description': 'Whether holiday repeats yearly: yes or no (default: no)' },
      ];
      const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
      instructionsSheet['!cols'] = [
        { wch: 25 },
        { wch: 60 },
      ];
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="holiday-import-template.xlsx"');
      res.setHeader('Content-Length', buffer.length);

      res.send(buffer);
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to generate sample template');
      next(error);
    }
  }
);

/**
 * POST /holidays/import/preview
 * Preview Excel file without importing (validate and show data)
 */
router.post(
  '/import/preview',
  upload.single('file') as unknown as (req: Request, res: Response, next: NextFunction) => void,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);

      // Parse Excel file
      const parsed = parseHolidayExcel(req.file.buffer);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          error: 'Failed to parse Excel file',
          details: parsed.errors,
        });
      }

      // Validate data against existing holidays
      const validation = await validateHolidayImportData(prisma, parsed.data);

      res.json({
        message: 'File parsed successfully',
        data: {
          total: parsed.data.length,
          valid: validation.valid.length,
          duplicates: validation.duplicates.length,
          invalid: validation.invalid.length,
          preview: validation.valid.slice(0, 10), // Show first 10 valid records
          duplicateDetails: validation.duplicates,
          invalidDetails: validation.invalid,
        },
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Preview import failed');
      if ((error as Error).message.includes('Only Excel')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * POST /holidays/import/excel
 * Import holidays from Excel file
 */
router.post(
  '/import/excel',
  upload.single('file') as unknown as (req: Request, res: Response, next: NextFunction) => void,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const tenantSlug = (req as any).tenantSlug;
      const prisma = await getTenantPrismaBySlug(tenantSlug);
      const userId = (req as any).userId;
      const skipDuplicates = req.body.skipDuplicates === 'true' || req.body.skipDuplicates === true;

      // Parse Excel file
      const parsed = parseHolidayExcel(req.file.buffer);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          error: 'Failed to parse Excel file',
          details: parsed.errors,
        });
      }

      if (parsed.data.length === 0) {
        return res.status(400).json({ error: 'No valid holiday data found in file' });
      }

      // Validate and filter data
      const validation = await validateHolidayImportData(prisma, parsed.data);

      if (validation.valid.length === 0) {
        return res.status(400).json({ 
          error: 'No valid holidays to import',
          details: {
            duplicates: validation.duplicates.length,
            invalid: validation.invalid.length,
          },
        });
      }

      // Import valid holidays
      const result = await bulkCreateHolidays(
        prisma,
        { holidays: validation.valid },
        userId
      );

      res.status(201).json({
        message: `Successfully imported ${result.created} holidays`,
        data: {
          created: result.created,
          skipped: result.skipped + validation.duplicates.length,
          invalid: validation.invalid.length,
          duplicates: validation.duplicates,
          invalidDetails: validation.invalid,
        },
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Import holidays failed');
      if ((error as Error).message.includes('Only Excel')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

export default router;
