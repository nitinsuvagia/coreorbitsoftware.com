/**
 * Attendance Types - Daily attendance tracking
 */

import { AuditableEntity } from '../common';

export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'late' | 'on_leave' | 'holiday' | 'weekend' | 'work_from_home';
export type CheckInSource = 'web' | 'mobile' | 'biometric' | 'manual' | 'system';

export interface Attendance extends AuditableEntity {
  tenantId: string;
  employeeId: string;
  date: Date;
  status: AttendanceStatus;
  shiftId?: string;
  checkIn?: Date;
  checkOut?: Date;
  checkInSource?: CheckInSource;
  checkOutSource?: CheckInSource;
  checkInLocation?: GeoLocation;
  checkOutLocation?: GeoLocation;
  workingHours?: number;
  overtimeHours?: number;
  breakDuration?: number;
  lateMinutes?: number;
  earlyDepartureMinutes?: number;
  notes?: string;
  isRegularized: boolean;
  regularizationId?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

export interface AttendanceRegularization extends AuditableEntity {
  tenantId: string;
  employeeId: string;
  attendanceId: string;
  date: Date;
  originalStatus?: AttendanceStatus;
  requestedStatus: AttendanceStatus;
  checkIn?: Date;
  checkOut?: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approverId?: string;
  approverComments?: string;
  approvedAt?: Date;
}

export interface AttendanceSummary {
  employeeId: string;
  month: number;
  year: number;
  totalDays: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  lateDays: number;
  wfhDays: number;
  leaveDays: number;
  holidayDays: number;
  totalWorkingHours: number;
  totalOvertimeHours: number;
  averageCheckInTime?: string;
  averageCheckOutTime?: string;
}
