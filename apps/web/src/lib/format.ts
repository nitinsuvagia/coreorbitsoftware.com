/**
 * Formatting utilities for dates, times, and currency
 * Uses organization settings for consistent formatting across the application
 */

export interface OrganizationLocaleSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
}

// Default settings if organization settings are not available
export const DEFAULT_LOCALE_SETTINGS: OrganizationLocaleSettings = {
  timezone: 'UTC',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  currency: 'INR',
};

// Common currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  CNY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  SGD: 'S$',
  AED: 'د.إ',
  SAR: '﷼',
};

// Currency locale mapping for proper number formatting
const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  INR: 'en-IN',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  AUD: 'en-AU',
  CAD: 'en-CA',
  CHF: 'de-CH',
  SGD: 'en-SG',
  AED: 'ar-AE',
  SAR: 'ar-SA',
};

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number,
  settings: Partial<OrganizationLocaleSettings> = {},
  options: {
    showSymbol?: boolean;
    compact?: boolean;
    decimals?: number;
  } = {}
): string {
  const currency = settings.currency || DEFAULT_LOCALE_SETTINGS.currency;
  const { showSymbol = true, compact = false, decimals = 0 } = options;
  
  const locale = CURRENCY_LOCALES[currency] || 'en-US';
  const symbol = getCurrencySymbol(currency);
  
  if (compact) {
    // Format as compact (e.g., 50K, 1.2M)
    const formatter = new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    });
    const formatted = formatter.format(amount);
    return showSymbol ? `${symbol}${formatted}` : formatted;
  }
  
  // Standard formatting with locale-specific separators
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const formatted = formatter.format(amount);
  return showSymbol ? `${symbol}${formatted}` : formatted;
}

/**
 * Format salary range
 */
export function formatSalaryRange(
  min: number,
  max: number,
  settings: Partial<OrganizationLocaleSettings> = {},
  employmentType: string = 'full-time'
): string {
  const currency = settings.currency || DEFAULT_LOCALE_SETTINGS.currency;
  const symbol = getCurrencySymbol(currency);
  const locale = CURRENCY_LOCALES[currency] || 'en-US';
  
  if (employmentType === 'internship' || employmentType === 'contract') {
    // Hourly rate for internship/contract
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${symbol}${formatter.format(min)}-${formatter.format(max)}/hr`;
  }
  
  // Annual salary - show in compact format (K)
  const formatCompact = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 100000) {
      // For INR lakhs
      if (currency === 'INR') {
        return `${(value / 100000).toFixed(1)}L`;
      }
      return `${(value / 1000).toFixed(0)}K`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };
  
  return `${symbol}${formatCompact(min)}-${formatCompact(max)}`;
}

/**
 * Parse a date format string and format a date
 */
export function formatDate(
  date: Date | string | null | undefined,
  settings: Partial<OrganizationLocaleSettings> = {},
  customFormat?: string
): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';
  
  const format = customFormat || settings.dateFormat || DEFAULT_LOCALE_SETTINGS.dateFormat;
  const timezone = settings.timezone || DEFAULT_LOCALE_SETTINGS.timezone;
  
  // Get date parts in the specified timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  
  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const parts = formatter.formatToParts(dateObj);
  
  const day = parts.find(p => p.type === 'day')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const year = parts.find(p => p.type === 'year')?.value || '';
  
  // Get month name for formats that need it
  const monthNameFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
  });
  const monthShort = monthNameFormatter.format(dateObj);
  
  const monthLongFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'long',
  });
  const monthLong = monthLongFormatter.format(dateObj);
  
  // Apply format
  return format
    .replace('YYYY', year)
    .replace('YY', year.slice(-2))
    .replace('MMMM', monthLong)
    .replace('MMM', monthShort)
    .replace('MM', month)
    .replace('DD', day);
}

/**
 * Format time
 */
export function formatTime(
  date: Date | string | null | undefined,
  settings: Partial<OrganizationLocaleSettings> = {}
): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';
  
  const timeFormat = settings.timeFormat || DEFAULT_LOCALE_SETTINGS.timeFormat;
  const timezone = settings.timezone || DEFAULT_LOCALE_SETTINGS.timezone;
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
}

/**
 * Format date and time together
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  settings: Partial<OrganizationLocaleSettings> = {}
): string {
  if (!date) return '-';
  
  const formattedDate = formatDate(date, settings);
  const formattedTime = formatTime(date, settings);
  
  if (formattedDate === '-' || formattedTime === '-') return '-';
  
  return `${formattedDate} ${formattedTime}`;
}

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(
  date: Date | string | null | undefined,
  settings: Partial<OrganizationLocaleSettings> = {}
): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';
  
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);
  
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  
  if (Math.abs(diffSeconds) < 60) {
    return rtf.format(diffSeconds, 'second');
  } else if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  } else if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  } else if (Math.abs(diffDays) < 30) {
    return rtf.format(diffDays, 'day');
  } else {
    // Fallback to formatted date
    return formatDate(date, settings);
  }
}

// Available date formats
export const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)', example: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)', example: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)', example: '2024-12-31' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (31-12-2024)', example: '31-12-2024' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY (31 Dec 2024)', example: '31 Dec 2024' },
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY (Dec 31, 2024)', example: 'Dec 31, 2024' },
  { value: 'MMMM DD, YYYY', label: 'MMMM DD, YYYY (December 31, 2024)', example: 'December 31, 2024' },
];

// Available time formats
export const TIME_FORMATS = [
  { value: '24h', label: '24-hour (14:30)', example: '14:30' },
  { value: '12h', label: '12-hour (2:30 PM)', example: '2:30 PM' },
];

// Available currencies
export const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
];

// Common timezones
export const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)', offset: '+05:30' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT, UTC-5/-4)', offset: '-05:00' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT, UTC-8/-7)', offset: '-08:00' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT, UTC-6/-5)', offset: '-06:00' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST, UTC+0/+1)', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST, UTC+1/+2)', offset: '+01:00' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST, UTC+1/+2)', offset: '+01:00' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)', offset: '+04:00' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)', offset: '+09:00' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST, UTC+8)', offset: '+08:00' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT, UTC+10/+11)', offset: '+10:00' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST/NZDT, UTC+12/+13)', offset: '+12:00' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
];

// Avatar color palettes - each has a background and text color class
const AVATAR_COLORS = [
  { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  { bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-700 dark:text-lime-400' },
  { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
  { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400' },
  { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
  { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400' },
  { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400' },
  { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', text: 'text-fuchsia-700 dark:text-fuchsia-400' },
  { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400' },
];

/**
 * Get consistent avatar color classes based on a string (name, email, or ID)
 * Returns the same color for the same input string
 */
export function getAvatarColor(identifier: string): { bg: string; text: string; className: string } {
  // Generate a hash from the string
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  const color = AVATAR_COLORS[index];
  
  return {
    bg: color.bg,
    text: color.text,
    className: `${color.bg} ${color.text}`,
  };
}

/**
 * Get initials from a name (first letter of first and last name)
 */
export function getInitials(firstName: string, lastName?: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}`;
}
