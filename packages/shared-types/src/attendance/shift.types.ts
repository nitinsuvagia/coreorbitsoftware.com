/**
 * Shift Types - Work shift management
 */

import { BaseEntity } from '../common';

export interface Shift extends BaseEntity {
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  halfDayHours: number;
  fullDayHours: number;
  breakDuration: number;
  isOvernight: boolean;
  isFlexible: boolean;
  flexibleWindow?: number;
  workingDays: number[];
  color: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface ShiftAssignment extends BaseEntity {
  tenantId: string;
  employeeId: string;
  shiftId: string;
  startDate: Date;
  endDate?: Date;
  isRotating: boolean;
  rotationScheduleId?: string;
}

export interface ShiftRotationSchedule extends BaseEntity {
  tenantId: string;
  name: string;
  description?: string;
  rotationType: 'weekly' | 'bi_weekly' | 'monthly';
  shifts: {
    shiftId: string;
    order: number;
  }[];
  isActive: boolean;
}

export interface ShiftSwapRequest extends BaseEntity {
  tenantId: string;
  requestorId: string;
  requestorShiftId: string;
  requestorDate: Date;
  swapWithId: string;
  swapShiftId: string;
  swapDate: Date;
  reason?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  respondedAt?: Date;
  approvedById?: string;
  approvedAt?: Date;
}
