/**
 * Salary Types - Salary structure and components
 */

import { AuditableEntity, BaseEntity } from '../common';

export interface SalaryStructure extends AuditableEntity {
  tenantId: string;
  employeeId: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  baseSalary: number;
  currency: string;
  payFrequency: 'weekly' | 'bi_weekly' | 'monthly';
  components: SalaryComponent[];
  deductions: SalaryDeduction[];
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  ctc: number;
  isActive: boolean;
}

export interface SalaryComponent extends BaseEntity {
  name: string;
  code: string;
  type: 'earning' | 'allowance' | 'bonus' | 'reimbursement';
  calculationType: 'fixed' | 'percentage';
  value: number;
  baseComponent?: string;
  isTaxable: boolean;
  isActive: boolean;
}

export interface SalaryDeduction extends BaseEntity {
  name: string;
  code: string;
  type: 'tax' | 'provident_fund' | 'insurance' | 'loan' | 'other';
  calculationType: 'fixed' | 'percentage';
  value: number;
  maxLimit?: number;
  isStatutory: boolean;
  isActive: boolean;
}

export interface SalaryRevision extends AuditableEntity {
  tenantId: string;
  employeeId: string;
  effectiveDate: Date;
  previousSalary: number;
  newSalary: number;
  incrementPercentage: number;
  incrementAmount: number;
  reason: 'annual_increment' | 'promotion' | 'market_adjustment' | 'performance' | 'other';
  remarks?: string;
  approvedBy: string;
  approvedAt: Date;
}
