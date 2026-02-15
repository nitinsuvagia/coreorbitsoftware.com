/**
 * Optional Holiday Service - Employee opt-in management for optional holidays
 */

import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { getMasterPrisma } from '../utils/database';

// ============================================================================
// TYPES
// ============================================================================

export interface OptionalHolidayWithStatus {
  id: string;
  name: string;
  date: Date;
  description: string | null;
  opted: boolean;
  optedAt: Date | null;
  canOpt: boolean;
  canCancel: boolean;
}

export interface EmployeeOptedHoliday {
  id: string;
  holidayId: string;
  year: number;
  status: 'OPTED' | 'CANCELLED';
  optedAt: Date;
  cancelledAt: Date | null;
  holiday: {
    id: string;
    name: string;
    date: Date;
    description: string | null;
  };
}

// ============================================================================
// GET TENANT SETTINGS
// ============================================================================

/**
 * Get tenant settings including optional holiday quota
 */
export async function getTenantOptionalHolidaySettings(
  tenantSlug: string
): Promise<{ optionalHolidayQuota: number; enabledHolidayTypes: any }> {
  const masterPrisma = getMasterPrisma();
  
  const tenant = await masterPrisma.tenant.findFirst({
    where: { slug: tenantSlug },
    include: { settings: true },
  });

  if (!tenant || !tenant.settings) {
    return {
      optionalHolidayQuota: 2,
      enabledHolidayTypes: { public: true, optional: true, restricted: true },
    };
  }

  const enabledHolidayTypes = tenant.settings.enabledHolidayTypes
    ? (typeof tenant.settings.enabledHolidayTypes === 'string'
        ? JSON.parse(tenant.settings.enabledHolidayTypes)
        : tenant.settings.enabledHolidayTypes)
    : { public: true, optional: true, restricted: true };

  return {
    optionalHolidayQuota: tenant.settings.optionalHolidayQuota ?? 2,
    enabledHolidayTypes,
  };
}

// ============================================================================
// OPTIONAL HOLIDAY OPERATIONS
// ============================================================================

/**
 * List available optional holidays for an employee with their opt status
 */
export async function listOptionalHolidays(
  prisma: PrismaClient,
  employeeId: string,
  year?: number
): Promise<OptionalHolidayWithStatus[]> {
  const targetYear = year || new Date().getFullYear();
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31);
  const today = new Date();
  
  // Get all optional holidays for the year
  const holidays = await prisma.holiday.findMany({
    where: {
      type: 'OPTIONAL',
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  // Get employee's opted holidays
  const employeeOptedHolidays = await prisma.employeeOptionalHoliday.findMany({
    where: {
      employeeId,
      year: targetYear,
      status: 'OPTED',
    },
  });

  const optedHolidayIds = new Set(employeeOptedHolidays.map(h => h.holidayId));

  return holidays.map(holiday => ({
    id: holiday.id,
    name: holiday.name,
    date: holiday.date,
    description: holiday.description,
    opted: optedHolidayIds.has(holiday.id),
    optedAt: employeeOptedHolidays.find(h => h.holidayId === holiday.id)?.optedAt || null,
    canOpt: !optedHolidayIds.has(holiday.id) && holiday.date > today,
    canCancel: optedHolidayIds.has(holiday.id) && holiday.date > today,
  }));
}

/**
 * Get employee's opted holidays
 */
export async function getEmployeeOptedHolidays(
  prisma: PrismaClient,
  employeeId: string,
  year?: number
): Promise<EmployeeOptedHoliday[]> {
  const targetYear = year || new Date().getFullYear();

  const optedHolidays = await prisma.employeeOptionalHoliday.findMany({
    where: {
      employeeId,
      year: targetYear,
      status: 'OPTED',
    },
    include: {
      holiday: {
        select: {
          id: true,
          name: true,
          date: true,
          description: true,
        },
      },
    },
    orderBy: { optedAt: 'desc' },
  });

  return optedHolidays as EmployeeOptedHoliday[];
}

/**
 * Get count of opted holidays for an employee in a year
 */
export async function getOptedHolidayCount(
  prisma: PrismaClient,
  employeeId: string,
  year?: number
): Promise<number> {
  const targetYear = year || new Date().getFullYear();

  return prisma.employeeOptionalHoliday.count({
    where: {
      employeeId,
      year: targetYear,
      status: 'OPTED',
    },
  });
}

/**
 * Opt into an optional holiday
 */
export async function optInToHoliday(
  prisma: PrismaClient,
  employeeId: string,
  holidayId: string,
  tenantSlug: string
): Promise<{ success: boolean; message: string; data?: any }> {
  // Check if holiday exists and is optional
  const holiday = await prisma.holiday.findUnique({
    where: { id: holidayId },
  });

  if (!holiday) {
    return { success: false, message: 'Holiday not found' };
  }

  if (holiday.type !== 'OPTIONAL') {
    return { success: false, message: 'Only optional holidays can be opted into' };
  }

  // Check if holiday date is in the future
  if (holiday.date <= new Date()) {
    return { success: false, message: 'Cannot opt into past or current day holidays' };
  }

  const year = holiday.date.getFullYear();

  // Check if already opted
  const existing = await prisma.employeeOptionalHoliday.findFirst({
    where: {
      employeeId,
      holidayId,
      year,
      status: 'OPTED',
    },
  });

  if (existing) {
    return { success: false, message: 'Already opted for this holiday' };
  }

  // Check quota
  const settings = await getTenantOptionalHolidaySettings(tenantSlug);
  const currentCount = await getOptedHolidayCount(prisma, employeeId, year);

  if (currentCount >= settings.optionalHolidayQuota) {
    return {
      success: false,
      message: `You have already used all ${settings.optionalHolidayQuota} optional holidays for ${year}. Please cancel an existing one to opt for a new holiday.`,
    };
  }

  // Check if there's a cancelled entry, if so update it
  const cancelled = await prisma.employeeOptionalHoliday.findFirst({
    where: {
      employeeId,
      holidayId,
      year,
      status: 'CANCELLED',
    },
  });

  let optedHoliday;
  if (cancelled) {
    optedHoliday = await prisma.employeeOptionalHoliday.update({
      where: { id: cancelled.id },
      data: {
        status: 'OPTED',
        optedAt: new Date(),
        cancelledAt: null,
      },
    });
  } else {
    optedHoliday = await prisma.employeeOptionalHoliday.create({
      data: {
        id: uuidv4(),
        employeeId,
        holidayId,
        year,
        status: 'OPTED',
        optedAt: new Date(),
      },
    });
  }

  logger.info({
    action: 'optional_holiday_opted',
    employeeId,
    holidayId,
    holidayName: holiday.name,
    year,
  }, 'Employee opted for optional holiday');

  return {
    success: true,
    message: `Successfully opted for ${holiday.name}`,
    data: optedHoliday,
  };
}

/**
 * Cancel an optional holiday opt-in
 */
export async function cancelOptIn(
  prisma: PrismaClient,
  employeeId: string,
  holidayId: string
): Promise<{ success: boolean; message: string }> {
  const holiday = await prisma.holiday.findUnique({
    where: { id: holidayId },
  });

  if (!holiday) {
    return { success: false, message: 'Holiday not found' };
  }

  // Check if holiday date is in the future
  if (holiday.date <= new Date()) {
    return { success: false, message: 'Cannot cancel opt-in for past holidays' };
  }

  const year = holiday.date.getFullYear();

  const optedHoliday = await prisma.employeeOptionalHoliday.findFirst({
    where: {
      employeeId,
      holidayId,
      year,
      status: 'OPTED',
    },
  });

  if (!optedHoliday) {
    return { success: false, message: 'You have not opted for this holiday' };
  }

  await prisma.employeeOptionalHoliday.update({
    where: { id: optedHoliday.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });

  logger.info({
    action: 'optional_holiday_cancelled',
    employeeId,
    holidayId,
    holidayName: holiday.name,
    year,
  }, 'Employee cancelled optional holiday opt-in');

  return {
    success: true,
    message: `Successfully cancelled opt-in for ${holiday.name}`,
  };
}

/**
 * Check if an employee has opted for a specific holiday
 * Used for leave calculation
 */
export async function hasEmployeeOptedForHoliday(
  prisma: PrismaClient,
  employeeId: string,
  holidayId: string
): Promise<boolean> {
  const holiday = await prisma.holiday.findUnique({
    where: { id: holidayId },
  });

  if (!holiday) return false;

  const year = holiday.date.getFullYear();

  const opted = await prisma.employeeOptionalHoliday.findFirst({
    where: {
      employeeId,
      holidayId,
      year,
      status: 'OPTED',
    },
  });

  return !!opted;
}

/**
 * Get all opted holiday dates for an employee (for leave calculation)
 */
export async function getEmployeeOptedHolidayDates(
  prisma: PrismaClient,
  employeeId: string,
  year?: number
): Promise<Date[]> {
  const targetYear = year || new Date().getFullYear();

  const optedHolidays = await prisma.employeeOptionalHoliday.findMany({
    where: {
      employeeId,
      year: targetYear,
      status: 'OPTED',
    },
    include: {
      holiday: {
        select: { date: true },
      },
    },
  });

  return optedHolidays.map(h => h.holiday.date);
}
