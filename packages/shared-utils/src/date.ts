// ============================================
// DATE & TIME UTILITIES
// ============================================

import {
  format,
  formatDistance,
  formatRelative,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInMonths,
  differenceInYears,
  differenceInBusinessDays,
  isWeekend,
  isSameDay,
  isBefore,
  isAfter,
  isWithinInterval,
  eachDayOfInterval,
  getDay,
  setHours,
  setMinutes,
} from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

// ============================================
// FORMATTING
// ============================================

/**
 * Format date to display string
 */
export function formatDate(
  date: Date | string,
  formatStr: string = 'dd MMM yyyy'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, formatStr) : '';
}

/**
 * Format date with time
 */
export function formatDateTime(
  date: Date | string,
  formatStr: string = 'dd MMM yyyy, hh:mm a'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, formatStr) : '';
}

/**
 * Format time only
 */
export function formatTime(
  date: Date | string,
  formatStr: string = 'hh:mm a'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, formatStr) : '';
}

/**
 * Format date in specific timezone
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string,
  formatStr: string = 'dd MMM yyyy, hh:mm a zzz'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? formatInTimeZone(d, timezone, formatStr) : '';
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? formatDistance(d, new Date(), { addSuffix: true }) : '';
}

/**
 * Get relative date (e.g., "yesterday", "last Monday")
 */
export function getRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? formatRelative(d, new Date()) : '';
}

// ============================================
// PARSING & CONVERSION
// ============================================

/**
 * Parse ISO string to Date
 */
export function parseDate(dateString: string): Date | null {
  const d = parseISO(dateString);
  return isValid(d) ? d : null;
}

/**
 * Convert to timezone
 */
export function toTimezone(date: Date, timezone: string): Date {
  return toZonedTime(date, timezone);
}

/**
 * Convert from timezone to UTC
 */
export function fromTimezone(date: Date, timezone: string): Date {
  return fromZonedTime(date, timezone);
}

/**
 * Parse time string (HH:mm) to Date
 */
export function parseTimeString(timeString: string, baseDate: Date = new Date()): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  return setMinutes(setHours(baseDate, hours), minutes);
}

// ============================================
// DATE RANGES
// ============================================

export function getStartOfDay(date: Date = new Date()): Date {
  return startOfDay(date);
}

export function getEndOfDay(date: Date = new Date()): Date {
  return endOfDay(date);
}

export function getStartOfWeek(date: Date = new Date(), weekStartsOn: 0 | 1 = 1): Date {
  return startOfWeek(date, { weekStartsOn });
}

export function getEndOfWeek(date: Date = new Date(), weekStartsOn: 0 | 1 = 1): Date {
  return endOfWeek(date, { weekStartsOn });
}

export function getStartOfMonth(date: Date = new Date()): Date {
  return startOfMonth(date);
}

export function getEndOfMonth(date: Date = new Date()): Date {
  return endOfMonth(date);
}

export function getStartOfYear(date: Date = new Date()): Date {
  return startOfYear(date);
}

export function getEndOfYear(date: Date = new Date()): Date {
  return endOfYear(date);
}

// ============================================
// DATE ARITHMETIC
// ============================================

export { 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears 
};

// ============================================
// DATE COMPARISON
// ============================================

export { 
  isBefore, 
  isAfter, 
  isSameDay, 
  isWithinInterval,
  isWeekend 
};

export function isWorkingDay(date: Date): boolean {
  return !isWeekend(date);
}

export function getDayOfWeek(date: Date): number {
  return getDay(date);
}

// ============================================
// DATE DIFFERENCES
// ============================================

export { 
  differenceInDays, 
  differenceInHours, 
  differenceInMinutes,
  differenceInMonths,
  differenceInYears,
  differenceInBusinessDays 
};

/**
 * Calculate working days between two dates (excluding weekends)
 */
export function getWorkingDays(
  startDate: Date,
  endDate: Date,
  holidays: Date[] = []
): number {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  return days.filter(day => {
    if (isWeekend(day)) return false;
    if (holidays.some(h => isSameDay(h, day))) return false;
    return true;
  }).length;
}

/**
 * Get all dates in a range
 */
export function getDateRange(startDate: Date, endDate: Date): Date[] {
  return eachDayOfInterval({ start: startDate, end: endDate });
}

// ============================================
// DURATION FORMATTING
// ============================================

/**
 * Format minutes to hours and minutes string
 */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Format seconds to HH:MM:SS
 */
export function formatTimeFromSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return [hours, minutes, seconds]
    .map(v => v.toString().padStart(2, '0'))
    .join(':');
}

/**
 * Convert hours and minutes to total minutes
 */
export function toMinutes(hours: number, minutes: number = 0): number {
  return hours * 60 + minutes;
}

/**
 * Convert total minutes to hours and minutes
 */
export function fromMinutes(totalMinutes: number): { hours: number; minutes: number } {
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

// ============================================
// ATTENDANCE HELPERS
// ============================================

/**
 * Calculate working hours between two times
 */
export function calculateWorkingHours(
  checkIn: Date,
  checkOut: Date,
  breakMinutes: number = 0
): number {
  const diffMinutes = differenceInMinutes(checkOut, checkIn);
  return Math.max(0, diffMinutes - breakMinutes);
}

/**
 * Check if time is within grace period
 */
export function isWithinGracePeriod(
  actualTime: Date,
  expectedTime: Date,
  graceMinutes: number
): boolean {
  const diff = Math.abs(differenceInMinutes(actualTime, expectedTime));
  return diff <= graceMinutes;
}

/**
 * Check if employee is late
 */
export function isLate(
  checkInTime: Date,
  shiftStartTime: Date,
  graceMinutes: number = 0
): boolean {
  return differenceInMinutes(checkInTime, shiftStartTime) > graceMinutes;
}

/**
 * Get late minutes
 */
export function getLateMinutes(
  checkInTime: Date,
  shiftStartTime: Date,
  graceMinutes: number = 0
): number {
  const lateBy = differenceInMinutes(checkInTime, shiftStartTime) - graceMinutes;
  return Math.max(0, lateBy);
}
