/**
 * Leave Days Calculator
 * Calculates actual leave days by excluding holidays and non-working days
 */

import { eachDayOfInterval, parseISO, getDay, format } from 'date-fns';
import type { WeeklyWorkingHours, DayWorkingHours } from '@/app/(dashboard)/organization/types';

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type?: 'public' | 'organization' | 'optional';
}

export interface LeaveCalculationOptions {
  fromDate: string;
  toDate: string;
  durationType: 'full_day' | 'first_half' | 'second_half' | 'second_to_full' | 'second_to_first' | 'full_to_first';
  weeklyWorkingHours?: WeeklyWorkingHours;
  holidays?: Holiday[];
  excludeHolidays?: boolean;
  excludeNonWorkingDays?: boolean;
}

export interface LeaveCalculationResult {
  totalDays: number;  // Total calendar days
  workingDays: number;  // Actual working days (leave days to deduct)
  holidayDays: number;  // Days that fall on holidays
  nonWorkingDays: number;  // Days that fall on non-working days (weekends)
  halfDays: number;  // Days that are half days
  breakdown: DayBreakdown[];
}

export interface DayBreakdown {
  date: string;
  dayName: string;
  isWorkingDay: boolean;
  isHoliday: boolean;
  isHalfDay: boolean;
  holidayName?: string;
  leaveDays: number;  // 0, 0.5, or 1
}

const DAY_KEYS: (keyof WeeklyWorkingHours)[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

const DEFAULT_WEEKLY_HOURS: WeeklyWorkingHours = {
  sunday: { isWorkingDay: false, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
  monday: { isWorkingDay: true, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
  tuesday: { isWorkingDay: true, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
  wednesday: { isWorkingDay: true, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
  thursday: { isWorkingDay: true, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
  friday: { isWorkingDay: true, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
  saturday: { isWorkingDay: false, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
};

/**
 * Get the day settings for a specific date
 */
function getDaySettings(date: Date, weeklyHours: WeeklyWorkingHours): DayWorkingHours {
  const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, etc.
  const dayKey = DAY_KEYS[dayOfWeek];
  return weeklyHours[dayKey];
}

/**
 * Check if a date is a holiday
 */
function findHoliday(date: Date, holidays: Holiday[]): Holiday | undefined {
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidays.find(h => {
    // Handle both ISO timestamps (2026-01-26T00:00:00.000Z) and date strings (2026-01-26)
    const holidayDateStr = h.date.includes('T') ? format(parseISO(h.date), 'yyyy-MM-dd') : h.date;
    return holidayDateStr === dateStr;
  });
}

/**
 * Calculate leave days based on organization settings
 */
export function calculateLeaveDays(options: LeaveCalculationOptions): LeaveCalculationResult {
  const {
    fromDate,
    toDate,
    durationType,
    weeklyWorkingHours = DEFAULT_WEEKLY_HOURS,
    holidays = [],
    excludeHolidays = true,
    excludeNonWorkingDays = true,
  } = options;

  const from = parseISO(fromDate);
  const to = parseISO(toDate);
  const isSingleDay = fromDate === toDate;

  // Get all days in the range
  const allDays = eachDayOfInterval({ start: from, end: to });

  const breakdown: DayBreakdown[] = [];
  let workingDays = 0;
  let holidayDays = 0;
  let nonWorkingDays = 0;
  let halfDays = 0;

  allDays.forEach((date, index) => {
    const isFirstDay = index === 0;
    const isLastDay = index === allDays.length - 1;
    const daySettings = getDaySettings(date, weeklyWorkingHours);
    const holiday = findHoliday(date, holidays);
    const isHoliday = !!holiday;
    const isWorkingDay = daySettings.isWorkingDay;
    const isOrgHalfDay = daySettings.isHalfDay;

    let leaveDays = 0;
    
    // Calculate leave days for this date
    if (excludeHolidays && isHoliday) {
      // Holiday - don't count
      leaveDays = 0;
      holidayDays++;
    } else if (excludeNonWorkingDays && !isWorkingDay) {
      // Non-working day (weekend) - don't count
      leaveDays = 0;
      nonWorkingDays++;
    } else if (!isWorkingDay) {
      // Non-working day but we're counting it (excludeNonWorkingDays = false)
      leaveDays = 0;
    } else {
      // This is a working day - calculate based on duration type
      if (isSingleDay) {
        // Single day leave
        switch (durationType) {
          case 'first_half':
          case 'second_half':
            leaveDays = 0.5;
            halfDays++;
            break;
          case 'full_day':
          default:
            leaveDays = isOrgHalfDay ? 0.5 : 1;
            if (isOrgHalfDay) halfDays++;
            break;
        }
      } else {
        // Multi-day leave
        if (isFirstDay) {
          // First day logic
          switch (durationType) {
            case 'second_to_full':
            case 'second_to_first':
              leaveDays = 0.5; // Starting from 2nd half
              halfDays++;
              break;
            case 'full_to_first':
            case 'full_day':
            default:
              leaveDays = isOrgHalfDay ? 0.5 : 1;
              if (isOrgHalfDay) halfDays++;
              break;
          }
        } else if (isLastDay) {
          // Last day logic
          switch (durationType) {
            case 'full_to_first':
            case 'second_to_first':
              leaveDays = 0.5; // Ending at 1st half
              halfDays++;
              break;
            case 'second_to_full':
            case 'full_day':
            default:
              leaveDays = isOrgHalfDay ? 0.5 : 1;
              if (isOrgHalfDay) halfDays++;
              break;
          }
        } else {
          // Middle days - full day (or half if org half day)
          leaveDays = isOrgHalfDay ? 0.5 : 1;
          if (isOrgHalfDay) halfDays++;
        }
      }
      
      workingDays += leaveDays;
    }

    breakdown.push({
      date: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEEE'),
      isWorkingDay,
      isHoliday,
      isHalfDay: isOrgHalfDay || leaveDays === 0.5,
      holidayName: holiday?.name,
      leaveDays,
    });
  });

  return {
    totalDays: allDays.length,
    workingDays,
    holidayDays,
    nonWorkingDays,
    halfDays,
    breakdown,
  };
}

/**
 * Simple calculation without organization settings (fallback)
 */
export function calculateSimpleLeaveDays(
  fromDate: string,
  toDate: string,
  durationType: LeaveCalculationOptions['durationType']
): number {
  const from = parseISO(fromDate);
  const to = parseISO(toDate);
  const isSingleDay = fromDate === toDate;
  
  const allDays = eachDayOfInterval({ start: from, end: to });
  let days = allDays.length;

  if (isSingleDay) {
    if (durationType === 'first_half' || durationType === 'second_half') {
      return 0.5;
    }
    return 1;
  }

  // Multi-day adjustments
  switch (durationType) {
    case 'second_to_full':
    case 'full_to_first':
      days -= 0.5;
      break;
    case 'second_to_first':
      days -= 1;
      break;
  }

  return days;
}
