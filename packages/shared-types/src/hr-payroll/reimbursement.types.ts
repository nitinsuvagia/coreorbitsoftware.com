/**
 * Reimbursement Types - Expense reimbursements
 */

import { AuditableEntity, BaseEntity } from '../common';

export type ReimbursementStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'processing' | 'paid';
export type ExpenseCategory = 'travel' | 'food' | 'accommodation' | 'transport' | 'equipment' | 'software' | 'training' | 'medical' | 'other';

export interface ReimbursementRequest extends AuditableEntity {
  tenantId: string;
  employeeId: string;
  requestNumber: string;
  status: ReimbursementStatus;
  expenses: ExpenseItem[];
  totalAmount: number;
  currency: string;
  projectId?: string;
  clientId?: string;
  isBillable: boolean;
  submittedAt?: Date;
  approvers: ReimbursementApprover[];
  paidAt?: Date;
  paymentReference?: string;
  notes?: string;
}

export interface ExpenseItem {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  vendor?: string;
  receiptUrl?: string;
  isBillable: boolean;
  approvedAmount?: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface ReimbursementApprover {
  approverId: string;
  order: number;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: Date;
  comments?: string;
}

export interface ExpensePolicy extends BaseEntity {
  tenantId: string;
  name: string;
  description?: string;
  category: ExpenseCategory;
  maxAmount?: number;
  maxAmountPeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'per_trip';
  requiresReceipt: boolean;
  receiptThreshold?: number;
  requiresPreApproval: boolean;
  approvalLevels: number;
  applicableTo: {
    allEmployees: boolean;
    departments?: string[];
    designations?: string[];
  };
  isActive: boolean;
}
