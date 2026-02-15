'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useHolidays } from '@/hooks/use-holidays';
import { calculateLeaveDays, calculateSimpleLeaveDays, type LeaveCalculationResult } from '@/lib/leave-calculator';
import type { Holiday } from '@/lib/leave-calculator';
import type { OrganizationSettings } from '@/app/(dashboard)/organization/types';
import { get } from '@/lib/api/client';

export interface UseLeaveCalculatorOptions {
  fromDate: string;
  toDate: string;
  durationType: 'full_day' | 'first_half' | 'second_half' | 'second_to_full' | 'second_to_first' | 'full_to_first';
}

export function useLeaveCalculator(options: UseLeaveCalculatorOptions) {
  const { fromDate, toDate, durationType } = options;
  
  // Fetch full organization settings (including weeklyWorkingHours)
  const { data: orgSettingsResponse, isLoading: loadingSettings } = useQuery({
    queryKey: ['org-settings-full'],
    queryFn: () => get<{ settings: OrganizationSettings }>('/api/v1/organization/settings'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const orgSettings = (orgSettingsResponse as any)?.settings || null;
  
  // Get holidays for the year of the leave dates
  const year = fromDate ? new Date(fromDate).getFullYear() : new Date().getFullYear();
  const { data: holidaysResponse } = useHolidays({ year });
  const holidays: Holiday[] = useMemo(() => {
    const data = (holidaysResponse as any)?.data || holidaysResponse || [];
    return Array.isArray(data) ? data : [];
  }, [holidaysResponse]);

  // Calculate leave days
  const result = useMemo<LeaveCalculationResult | null>(() => {
    if (!fromDate || !toDate) return null;

    // If org settings are loaded, use the full calculation
    if (orgSettings?.weeklyWorkingHours) {
      return calculateLeaveDays({
        fromDate,
        toDate,
        durationType,
        weeklyWorkingHours: orgSettings.weeklyWorkingHours,
        holidays,
        excludeHolidays: orgSettings.excludeHolidaysFromLeave ?? true,
        excludeNonWorkingDays: orgSettings.excludeWeekendsFromLeave ?? true,
      });
    }

    // Fallback to simple calculation
    const simpleDays = calculateSimpleLeaveDays(fromDate, toDate, durationType);
    return {
      totalDays: simpleDays,
      workingDays: simpleDays,
      holidayDays: 0,
      nonWorkingDays: 0,
      halfDays: 0,
      breakdown: [],
    };
  }, [fromDate, toDate, durationType, orgSettings, holidays]);

  return {
    result,
    loading: loadingSettings,
    leaveDays: result?.workingDays ?? 0,
    holidayDays: result?.holidayDays ?? 0,
    nonWorkingDays: result?.nonWorkingDays ?? 0,
    breakdown: result?.breakdown ?? [],
  };
}
