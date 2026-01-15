/**
 * HR Events - HR and payroll events
 */

export interface PayrollProcessedEvent {
  tenantId: string;
  payrollRunId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  totalEmployees: number;
  totalNetPay: number;
  currency: string;
  processedBy: string;
  processedAt: Date;
}

export interface PayslipGeneratedEvent {
  tenantId: string;
  payslipId: string;
  employeeId: string;
  payPeriod: string;
  netPay: number;
  generatedAt: Date;
}

export interface SalaryRevisedEvent {
  tenantId: string;
  employeeId: string;
  previousSalary: number;
  newSalary: number;
  incrementPercentage: number;
  effectiveDate: Date;
  revisedBy: string;
  revisedAt: Date;
}

export interface ReimbursementApprovedEvent {
  tenantId: string;
  reimbursementId: string;
  employeeId: string;
  amount: number;
  currency: string;
  approvedBy: string;
  approvedAt: Date;
}

export interface PerformanceReviewCompletedEvent {
  tenantId: string;
  reviewId: string;
  cycleId: string;
  employeeId: string;
  finalRating: number;
  completedAt: Date;
}
