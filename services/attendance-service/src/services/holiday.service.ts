/**
 * Holiday Service - Holiday calendar management
 */

import { PrismaClient } from '@prisma/client';
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

// ============================================================================
// TYPES
// ============================================================================

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
  const date = parseISO(input.date);
  
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
      type: input.type,
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
  if (input.date) data.date = parseISO(input.date);
  if (input.type) data.type = input.type;
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
  return prisma.holiday.findUnique({
    where: { id },
    include: {
      holidayDepartments: {
        include: {
          department: { select: { id: true, name: true } },
        },
      },
    },
  });
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
    where.type = filters.type;
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
  
  return holidays;
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
  
  return holidays;
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
  
  return holidays.slice(0, limit);
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
  
  const publicHolidays = holidays.filter(h => h.type === 'public').length;
  const optionalHolidays = holidays.filter(h => h.type === 'optional').length;
  const restrictedHolidays = holidays.filter(h => h.type === 'restricted').length;
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
