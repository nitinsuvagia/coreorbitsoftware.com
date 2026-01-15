/**
 * Invoice Types - Client billing and payments
 */

import { AuditableEntity } from '../common';

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'refunded';
export type ClientPaymentMethod = 'bank_transfer' | 'credit_card' | 'debit_card' | 'check' | 'cash' | 'paypal' | 'stripe' | 'other';
export type ClientPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface ClientInvoice extends AuditableEntity {
  tenantId: string;
  clientId: string;
  projectId?: string;
  contractId?: string;
  invoiceNumber: string;
  referenceNumber?: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  items: InvoiceLineItem[];
  subtotal: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  taxRate?: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  notes?: string;
  terms?: string;
  footer?: string;
  attachments?: string[];
  sentAt?: Date;
  viewedAt?: Date;
  paidAt?: Date;
  paymentInstructions?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  amount: number;
  taxable: boolean;
  taskId?: string;
  projectId?: string;
}

export interface Payment extends AuditableEntity {
  tenantId: string;
  invoiceId: string;
  clientId: string;
  paymentNumber: string;
  amount: number;
  currency: string;
  method: ClientPaymentMethod;
  status: ClientPaymentStatus;
  transactionId?: string;
  paymentDate: Date;
  notes?: string;
  receiptUrl?: string;
  refundedAmount?: number;
  refundedAt?: Date;
  refundReason?: string;
}

export interface CreditNote extends AuditableEntity {
  tenantId: string;
  clientId: string;
  invoiceId?: string;
  creditNoteNumber: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'draft' | 'issued' | 'applied' | 'refunded';
  appliedToInvoices?: AppliedCredit[];
  issuedAt?: Date;
}

export interface AppliedCredit {
  invoiceId: string;
  amount: number;
  appliedAt: Date;
}
