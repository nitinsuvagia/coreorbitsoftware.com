/**
 * Leave Types - Leave management
 */

import { AuditableEntity, BaseEntity } from '../common';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn';
export type LeaveDayType = 'full' | 'first_half' | 'second_half';

export interface LeaveType extends BaseEntity {
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  color: string;
  isPaid: boolean;
  isCarryForward: boolean;
  maxCarryForward?: number;
  isEncashable: boolean;
  maxEncashment?: number;
  requiresApproval: boolean;
  maxConsecutiveDays?: number;
  minNoticeDays?: number;
  allowNegativeBalance: boolean;
  applicableGender?: 'male' | 'female' | 'all';
  isActive: boolean;
}

export interface LeavePolicy extends BaseEntity {
  tenantId: string;
  leaveTypeId: string;
  name: string;
  annualQuota: number;
  accrualType: 'yearly' | 'monthly' | 'quarterly';
  accrualDay: number;
  applicableTo: LeaveApplicability;
  isActive: boolean;
}

export interface LeaveApplicability {
  allEmployees: boolean;
  departments?: string[];
  designations?: string[];
  employmentTypes?: string[];
  minTenureDays?: number;
}

export interface LeaveRequest extends AuditableEntity {
  tenantId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  dayType: LeaveDayType;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  approverId?: string;
  approverComments?: string;
  approvedAt?: Date;
  attachments?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
  };
  delegateTo?: string;
}

export interface LeaveBalance {
  tenantId: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  available: number;
  carryForward: number;
  encashed: number;
  lapsed: number;
}

export interface Holiday extends BaseEntity {
  tenantId: string;
  name: string;
  date: Date;
  type: 'public' | 'restricted' | 'optional' | 'company';
  isRecurring: boolean;
  applicableLocations?: string[];
  applicableDepartments?: string[];
  description?: string;
}
