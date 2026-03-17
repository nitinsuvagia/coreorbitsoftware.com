/**
 * Holiday Service - Holiday calendar management
 */

import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuidv4 } from 'uuid';
import {
  format,
  parseISO,
  startOfYear,
  endOfYear,
  isWeekend,
  eachDayOfInterval,
  getYear,
  addDays,
} from 'date-fns';
import { logger } from '../utils/logger';
import { getEventBus, SNS_TOPICS } from '@oms/event-bus';

// ============================================================================
// TYPES
// ============================================================================

// Helper to convert lowercase type to uppercase for database enum
const toDbHolidayType = (type: 'public' | 'optional' | 'restricted'): 'PUBLIC' | 'OPTIONAL' | 'RESTRICTED' => {
  return type.toUpperCase() as 'PUBLIC' | 'OPTIONAL' | 'RESTRICTED';
};

// Helper to parse date string (YYYY-MM-DD) at noon UTC to avoid timezone day-shift issues
const parseDateAsUTC = (dateStr: string): Date => {
  // Parse YYYY-MM-DD and create date at noon UTC to avoid day boundary issues
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
};

// Helper to convert database enum to lowercase for API response
const fromDbHolidayType = (type: string): 'public' | 'optional' | 'restricted' => {
  return type.toLowerCase() as 'public' | 'optional' | 'restricted';
};

export interface CreateHolidayInput {
  name: string;
  date: string;
  type: 'public' | 'optional' | 'restricted';
  description?: string;
  isRecurring?: boolean;
  appliesToAll?: boolean;
  departmentIds?: string[];
}

export interface UpdateHolidayInput {
  name?: string;
  date?: string;
  type?: 'public' | 'optional' | 'restricted';
  description?: string;
  isRecurring?: boolean;
  appliesToAll?: boolean;
  departmentIds?: string[];
}

export interface BulkCreateHolidaysInput {
  holidays: CreateHolidayInput[];
}

export interface HolidayFilters {
  year?: number;
  type?: 'public' | 'optional' | 'restricted';
  departmentId?: string;
  month?: number;
}

// ============================================================================
// HOLIDAY OPERATIONS
// ============================================================================

/**
 * Create a holiday
 */
export async function createHoliday(
  prisma: PrismaClient,
  input: CreateHolidayInput,
  userId: string
): Promise<any> {
  const id = uuidv4();
  const date = parseDateAsUTC(input.date);
  
  // Check for duplicate
  const existing = await prisma.holiday.findFirst({
    where: {
      date,
      name: input.name,
    },
  });
  
  if (existing) {
    throw new Error(`Holiday '${input.name}' already exists on ${input.date}`);
  }
  
  // Create holiday
  const holiday = await prisma.holiday.create({
    data: {
      id,
      name: input.name,
      date,
      type: toDbHolidayType(input.type),
      description: input.description,
      isRecurring: input.isRecurring ?? false,
      appliesToAll: input.appliesToAll ?? true,
      createdBy: userId,
      updatedBy: userId,
    },
  });
  
  // Link to specific departments if not applies to all
  if (!input.appliesToAll && input.departmentIds?.length) {
    await prisma.holidayDepartment.createMany({
      data: input.departmentIds.map(deptId => ({
        id: uuidv4(),
        holidayId: id,
        departmentId: deptId,
      })),
    });
  }
  
  logger.info({ holidayId: id, name: input.name, date: input.date }, 'Holiday created');
  
  // Publish event for notifications (requires tenantContext)
  // Note: tenantContext needs to be passed from route handler
  // For now, we can publish with minimal context
  try {
    const eventBus = getEventBus('attendance-service');
    await eventBus.publishToTopic('holiday-created' as any, 'holiday.created', {
      holidayId: id,
      name: input.name,
      date: input.date,
      type: input.type,
      description: input.description,
      appliesToAll: input.appliesToAll ?? true,
      departmentIds: input.departmentIds,
      createdBy: userId,
    }, { tenantId: 'system', tenantSlug: 'system' }); // Admin-triggered, notify all
  } catch (error) {
    logger.warn({ error }, 'Failed to publish holiday-created event');
  }
  
  return holiday;
}

/**
 * Bulk create holidays
 */
export async function bulkCreateHolidays(
  prisma: PrismaClient,
  input: BulkCreateHolidaysInput,
  userId: string
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  
  for (const holidayInput of input.holidays) {
    try {
      await createHoliday(prisma, holidayInput, userId);
      created++;
    } catch (error) {
      logger.warn({ 
        name: holidayInput.name, 
        date: holidayInput.date,
        error: (error as Error).message,
      }, 'Skipped holiday creation');
      skipped++;
    }
  }
  
  logger.info({ created, skipped }, 'Bulk holiday creation completed');
  
  return { created, skipped };
}

/**
 * Update a holiday
 */
export async function updateHoliday(
  prisma: PrismaClient,
  id: string,
  input: UpdateHolidayInput,
  userId: string
): Promise<any> {
  const data: any = {
    updatedBy: userId,
    updatedAt: new Date(),
  };
  
  if (input.name) data.name = input.name;
  if (input.date) data.date = parseDateAsUTC(input.date);
  if (input.type) data.type = toDbHolidayType(input.type);
  if (input.description !== undefined) data.description = input.description;
  if (input.isRecurring !== undefined) data.isRecurring = input.isRecurring;
  if (input.appliesToAll !== undefined) data.appliesToAll = input.appliesToAll;
  
  const holiday = await prisma.holiday.update({
    where: { id },
    data,
  });
  
  // Update department associations if specified
  if (input.departmentIds !== undefined) {
    // Remove existing associations
    await prisma.holidayDepartment.deleteMany({
      where: { holidayId: id },
    });
    
    // Add new associations if not applies to all
    if (!input.appliesToAll && input.departmentIds.length) {
      await prisma.holidayDepartment.createMany({
        data: input.departmentIds.map(deptId => ({
          id: uuidv4(),
          holidayId: id,
          departmentId: deptId,
        })),
      });
    }
  }
  
  logger.info({ holidayId: id }, 'Holiday updated');
  
  return holiday;
}

/**
 * Delete a holiday
 */
export async function deleteHoliday(
  prisma: PrismaClient,
  id: string
): Promise<void> {
  // Delete department associations first
  await prisma.holidayDepartment.deleteMany({
    where: { holidayId: id },
  });
  
  await prisma.holiday.delete({
    where: { id },
  });
  
  logger.info({ holidayId: id }, 'Holiday deleted');
}

/**
 * Get holiday by ID
 */
export async function getHolidayById(
  prisma: PrismaClient,
  id: string
): Promise<any | null> {
  const holiday = await prisma.holiday.findUnique({
    where: { id },
    include: {
      holidayDepartments: {
        include: {
          department: { select: { id: true, name: true } },
        },
      },
    },
  });
  
  if (!holiday) return null;
  
  return {
    ...holiday,
    type: fromDbHolidayType(holiday.type),
  };
}

/**
 * List holidays with filters
 */
export async function listHolidays(
  prisma: PrismaClient,
  filters: HolidayFilters
): Promise<any[]> {
  const year = filters.year || new Date().getFullYear();
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  
  const where: any = {
    date: { gte: yearStart, lte: yearEnd },
  };
  
  if (filters.type) {
    where.type = toDbHolidayType(filters.type);
  }
  
  if (filters.month) {
    const monthStart = new Date(year, filters.month - 1, 1);
    const monthEnd = new Date(year, filters.month, 0);
    where.date = { gte: monthStart, lte: monthEnd };
  }
  
  let holidays = await prisma.holiday.findMany({
    where,
    include: {
      holidayDepartments: {
        include: {
          department: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { date: 'asc' },
  });
  
  // Filter by department if specified
  if (filters.departmentId) {
    holidays = holidays.filter(h =>
      h.appliesToAll ||
      h.holidayDepartments.some(hd => hd.departmentId === filters.departmentId)
    );
  }
  
  // Convert type to lowercase for API response
  return holidays.map(h => ({
    ...h,
    type: fromDbHolidayType(h.type),
  }));
}

/**
 * Get holidays for a date range
 */
export async function getHolidaysInRange(
  prisma: PrismaClient,
  fromDate: Date,
  toDate: Date,
  departmentId?: string
): Promise<any[]> {
  const where: any = {
    date: { gte: fromDate, lte: toDate },
  };
  
  let holidays = await prisma.holiday.findMany({
    where,
    orderBy: { date: 'asc' },
    include: {
      holidayDepartments: true,
    },
  });
  
  if (departmentId) {
    holidays = holidays.filter(h =>
      h.appliesToAll ||
      h.holidayDepartments.some(hd => hd.departmentId === departmentId)
    );
  }
  
  // Convert type to lowercase for API response
  return holidays.map(h => ({
    ...h,
    type: fromDbHolidayType(h.type),
  }));
}

/**
 * Check if a date is a holiday
 */
export async function isHoliday(
  prisma: PrismaClient,
  date: Date,
  departmentId?: string
): Promise<boolean> {
  const holidays = await getHolidaysInRange(prisma, date, date, departmentId);
  return holidays.length > 0;
}

/**
 * Get upcoming holidays
 */
export async function getUpcomingHolidays(
  prisma: PrismaClient,
  limit: number = 5,
  departmentId?: string
): Promise<any[]> {
  const today = new Date();
  const yearEnd = endOfYear(today);
  
  let holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: today, lte: yearEnd },
    },
    include: {
      holidayDepartments: {
        include: {
          department: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { date: 'asc' },
  });
  
  if (departmentId) {
    holidays = holidays.filter(h =>
      h.appliesToAll ||
      h.holidayDepartments.some(hd => hd.departmentId === departmentId)
    );
  }
  
  // Convert type to lowercase for API response
  return holidays.slice(0, limit).map(h => ({
    ...h,
    type: fromDbHolidayType(h.type),
  }));
}

/**
 * Generate holidays for a year based on recurring holidays from previous year
 */
export async function generateRecurringHolidays(
  prisma: PrismaClient,
  year: number,
  userId: string
): Promise<{ created: number; skipped: number }> {
  const previousYear = year - 1;
  const prevYearStart = startOfYear(new Date(previousYear, 0, 1));
  const prevYearEnd = endOfYear(new Date(previousYear, 0, 1));
  
  const recurringHolidays = await prisma.holiday.findMany({
    where: {
      date: { gte: prevYearStart, lte: prevYearEnd },
      isRecurring: true,
    },
    include: {
      holidayDepartments: true,
    },
  });
  
  let created = 0;
  let skipped = 0;
  
  for (const holiday of recurringHolidays) {
    const newDate = new Date(holiday.date);
    newDate.setFullYear(year);
    
    try {
      await createHoliday(prisma, {
        name: holiday.name,
        date: format(newDate, 'yyyy-MM-dd'),
        type: holiday.type as 'public' | 'optional' | 'restricted',
        description: holiday.description || undefined,
        isRecurring: true,
        appliesToAll: holiday.appliesToAll,
        departmentIds: holiday.holidayDepartments.map(hd => hd.departmentId),
      }, userId);
      created++;
    } catch (error) {
      skipped++;
    }
  }
  
  logger.info({ year, created, skipped }, 'Recurring holidays generated');
  
  return { created, skipped };
}

/**
 * Get holiday statistics for a year
 */
export async function getHolidayStats(
  prisma: PrismaClient,
  year: number
): Promise<{
  totalHolidays: number;
  publicHolidays: number;
  optionalHolidays: number;
  restrictedHolidays: number;
  weekdayHolidays: number;
  weekendHolidays: number;
  byMonth: { month: number; count: number }[];
}> {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  
  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: yearStart, lte: yearEnd },
    },
  });
  
  const publicHolidays = holidays.filter(h => h.type === 'PUBLIC').length;
  const optionalHolidays = holidays.filter(h => h.type === 'OPTIONAL').length;
  const restrictedHolidays = holidays.filter(h => h.type === 'RESTRICTED').length;
  const weekdayHolidays = holidays.filter(h => !isWeekend(h.date)).length;
  const weekendHolidays = holidays.filter(h => isWeekend(h.date)).length;
  
  // Group by month
  const byMonth: { month: number; count: number }[] = [];
  for (let month = 1; month <= 12; month++) {
    const count = holidays.filter(h => {
      const holidayMonth = h.date.getMonth() + 1;
      return holidayMonth === month;
    }).length;
    byMonth.push({ month, count });
  }
  
  return {
    totalHolidays: holidays.length,
    publicHolidays,
    optionalHolidays,
    restrictedHolidays,
    weekdayHolidays,
    weekendHolidays,
    byMonth,
  };
}

/**
 * Get working days in a date range (excluding weekends and holidays)
 */
export async function getWorkingDaysInRange(
  prisma: PrismaClient,
  fromDate: Date,
  toDate: Date,
  departmentId?: string
): Promise<{ workingDays: number; holidays: number; weekends: number }> {
  const holidays = await getHolidaysInRange(prisma, fromDate, toDate, departmentId);
  const holidayDates = new Set(holidays.map(h => format(h.date, 'yyyy-MM-dd')));
  
  const allDays = eachDayOfInterval({ start: fromDate, end: toDate });
  
  let workingDays = 0;
  let weekends = 0;
  let holidayCount = 0;
  
  for (const day of allDays) {
    if (isWeekend(day)) {
      weekends++;
    } else if (holidayDates.has(format(day, 'yyyy-MM-dd'))) {
      holidayCount++;
    } else {
      workingDays++;
    }
  }
  
  return { workingDays, holidays: holidayCount, weekends };
}

/**
 * Import holidays from standard calendar
 */
export async function importStandardHolidays(
  prisma: PrismaClient,
  year: number,
  country: string,
  userId: string
): Promise<{ created: number; skipped: number }> {
  // Predefined holidays for India (can be extended for other countries)
  const holidaysByCountry: Record<string, CreateHolidayInput[]> = {
    IN: [
      { name: 'Republic Day', date: `${year}-01-26`, type: 'public', isRecurring: true },
      { name: 'Holi', date: `${year}-03-25`, type: 'public', isRecurring: false },
      { name: 'Good Friday', date: `${year}-03-29`, type: 'optional', isRecurring: false },
      { name: 'Independence Day', date: `${year}-08-15`, type: 'public', isRecurring: true },
      { name: 'Gandhi Jayanti', date: `${year}-10-02`, type: 'public', isRecurring: true },
      { name: 'Diwali', date: `${year}-11-01`, type: 'public', isRecurring: false },
      { name: 'Christmas', date: `${year}-12-25`, type: 'public', isRecurring: true },
    ],
    US: [
      { name: 'New Year\'s Day', date: `${year}-01-01`, type: 'public', isRecurring: true },
      { name: 'Martin Luther King Jr. Day', date: `${year}-01-15`, type: 'public', isRecurring: false },
      { name: 'Presidents\' Day', date: `${year}-02-19`, type: 'public', isRecurring: false },
      { name: 'Memorial Day', date: `${year}-05-27`, type: 'public', isRecurring: false },
      { name: 'Independence Day', date: `${year}-07-04`, type: 'public', isRecurring: true },
      { name: 'Labor Day', date: `${year}-09-02`, type: 'public', isRecurring: false },
      { name: 'Thanksgiving', date: `${year}-11-28`, type: 'public', isRecurring: false },
      { name: 'Christmas', date: `${year}-12-25`, type: 'public', isRecurring: true },
    ],
  };
  
  const holidays = holidaysByCountry[country.toUpperCase()];
  
  if (!holidays) {
    throw new Error(`Standard holidays not available for country: ${country}`);
  }
  
  return bulkCreateHolidays(prisma, { holidays }, userId);
}

// ============================================================================
// EXCEL IMPORT/EXPORT FUNCTIONS
// ============================================================================

import * as XLSX from 'xlsx';

interface ParsedHolidayRow {
  name: string;
  date: string;
  type: 'public' | 'optional' | 'restricted';
  description?: string;
  isRecurring: boolean;
  rowNumber: number;
}

interface ParseResult {
  success: boolean;
  data: CreateHolidayInput[];
  errors: { row: number; message: string }[];
}

interface ValidationResult {
  valid: CreateHolidayInput[];
  duplicates: { holiday: CreateHolidayInput; existingHoliday: string }[];
  invalid: { row: number; data: any; message: string }[];
}

/**
 * Parse Excel file buffer and extract holiday data
 */
export function parseHolidayExcel(buffer: Buffer): ParseResult {
  const errors: { row: number; message: string }[] = [];
  const data: CreateHolidayInput[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get first sheet (Holidays sheet)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      return { success: false, data: [], errors: [{ row: 0, message: 'No worksheet found in Excel file' }] };
    }

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rows.length === 0) {
      return { success: false, data: [], errors: [{ row: 0, message: 'No data found in Excel file' }] };
    }

    // Process each row
    rows.forEach((row, index) => {
      const rowNumber = index + 2; // Excel rows start at 1, plus header row
      
      // Extract values (handle different possible column names)
      const name = (row['Holiday Name'] || row['Name'] || row['name'] || '').toString().trim();
      const dateRaw = row['Date (YYYY-MM-DD)'] || row['Date'] || row['date'] || '';
      const typeRaw = (row['Type (public/optional/restricted)'] || row['Type'] || row['type'] || '').toString().toLowerCase().trim();
      const description = (row['Description'] || row['description'] || '').toString().trim();
      const recurringRaw = (row['Recurring (yes/no)'] || row['Recurring'] || row['recurring'] || 'no').toString().toLowerCase().trim();

      // Validate required fields
      if (!name) {
        errors.push({ row: rowNumber, message: 'Holiday name is required' });
        return;
      }

      if (name.length < 2 || name.length > 100) {
        errors.push({ row: rowNumber, message: `Holiday name must be 2-100 characters (got ${name.length})` });
        return;
      }

      // Parse and validate date
      let dateStr: string;
      if (typeof dateRaw === 'number') {
        // Excel serial date number
        const date = XLSX.SSF.parse_date_code(dateRaw);
        dateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      } else {
        dateStr = dateRaw.toString().trim();
      }

      // Validate date format
      const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) {
        errors.push({ row: rowNumber, message: `Invalid date format: "${dateStr}". Use YYYY-MM-DD format` });
        return;
      }

      // Validate date is real
      const [, year, month, day] = dateMatch;
      const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (isNaN(parsedDate.getTime()) || 
          parsedDate.getFullYear() !== parseInt(year) ||
          parsedDate.getMonth() !== parseInt(month) - 1 ||
          parsedDate.getDate() !== parseInt(day)) {
        errors.push({ row: rowNumber, message: `Invalid date: "${dateStr}"` });
        return;
      }

      // Validate type
      const validTypes = ['public', 'optional', 'restricted'];
      if (!validTypes.includes(typeRaw)) {
        errors.push({ row: rowNumber, message: `Invalid type: "${typeRaw}". Must be one of: public, optional, restricted` });
        return;
      }

      // Parse recurring
      const isRecurring = recurringRaw === 'yes' || recurringRaw === 'true' || recurringRaw === '1';

      // Validate description length
      if (description.length > 500) {
        errors.push({ row: rowNumber, message: `Description too long (max 500 characters, got ${description.length})` });
        return;
      }

      // Add valid holiday
      data.push({
        name,
        date: dateStr,
        type: typeRaw as 'public' | 'optional' | 'restricted',
        description: description || undefined,
        isRecurring,
        appliesToAll: true,
      });
    });

    return { success: true, data, errors };
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to parse Excel file');
    return { 
      success: false, 
      data: [], 
      errors: [{ row: 0, message: `Failed to parse Excel file: ${(error as Error).message}` }] 
    };
  }
}

/**
 * Validate import data against existing holidays in database
 */
export async function validateHolidayImportData(
  prisma: PrismaClient,
  holidays: CreateHolidayInput[]
): Promise<ValidationResult> {
  const valid: CreateHolidayInput[] = [];
  const duplicates: { holiday: CreateHolidayInput; existingHoliday: string }[] = [];
  const invalid: { row: number; data: any; message: string }[] = [];

  // Get all existing holidays for the years in the import
  const years = [...new Set(holidays.map(h => parseInt(h.date.substring(0, 4))))];
  const existingHolidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: new Date(`${Math.min(...years)}-01-01`),
        lte: new Date(`${Math.max(...years)}-12-31`),
      },
    },
    select: {
      name: true,
      date: true,
    },
  });

  // Create lookup map
  const existingMap = new Map<string, string>();
  existingHolidays.forEach(h => {
    const key = `${format(h.date, 'yyyy-MM-dd')}_${h.name.toLowerCase()}`;
    existingMap.set(key, h.name);
  });

  // Check each holiday
  holidays.forEach((holiday, index) => {
    const key = `${holiday.date}_${holiday.name.toLowerCase()}`;
    
    if (existingMap.has(key)) {
      duplicates.push({
        holiday,
        existingHoliday: existingMap.get(key)!,
      });
    } else {
      valid.push(holiday);
    }
  });

  return { valid, duplicates, invalid };
}
