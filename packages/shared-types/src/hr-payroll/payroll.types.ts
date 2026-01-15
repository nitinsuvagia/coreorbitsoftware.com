/**
 * Payroll Types - Payroll processing
 */

import { AuditableEntity } from '../common';

export type PayrollStatus = 'draft' | 'processing' | 'pending_approval' | 'approved' | 'paid' | 'cancelled';
export type PayslipStatus = 'draft' | 'generated' | 'sent' | 'viewed';

export interface PayrollRun extends AuditableEntity {
  tenantId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  payDate: Date;
  status: PayrollStatus;
  totalEmployees: number;
  processedEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  currency: string;
  runBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
}

export interface Payslip extends AuditableEntity {
  tenantId: string;
  payrollRunId: string;
  employeeId: string;
  payPeriod: string;
  payDate: Date;
  status: PayslipStatus;
  earnings: PayslipEarning[];
  deductions: PayslipDeduction[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  workingDays: number;
  paidDays: number;
  lopDays: number;
  overtimeHours?: number;
  overtimePay?: number;
  bonuses?: number;
  reimbursements?: number;
  arrears?: number;
  bankDetails: PayslipBankDetails;
  documentUrl?: string;
  sentAt?: Date;
  viewedAt?: Date;
}

export interface PayslipEarning {
  component: string;
  code: string;
  amount: number;
  isTaxable: boolean;
}

export interface PayslipDeduction {
  component: string;
  code: string;
  amount: number;
  type: string;
}

export interface PayslipBankDetails {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode?: string;
}

export interface TaxDeclaration extends AuditableEntity {
  tenantId: string;
  employeeId: string;
  fiscalYear: string;
  status: 'draft' | 'submitted' | 'verified' | 'locked';
  declarations: TaxDeclarationItem[];
  totalDeclared: number;
  totalApproved: number;
  submittedAt?: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface TaxDeclarationItem {
  section: string;
  description: string;
  declaredAmount: number;
  approvedAmount?: number;
  proofUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
}
