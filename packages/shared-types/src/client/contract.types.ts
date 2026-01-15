/**
 * Contract Types - Client contracts
 */

import { AuditableEntity } from '../common';

export type ContractStatus = 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated' | 'renewed';
export type ContractType = 'msa' | 'sow' | 'nda' | 'sla' | 'amendment' | 'other';

export interface Contract extends AuditableEntity {
  tenantId: string;
  clientId: string;
  contractNumber: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  description?: string;
  startDate: Date;
  endDate: Date;
  value?: number;
  currency?: string;
  autoRenew: boolean;
  renewalTermMonths?: number;
  noticePeriodDays?: number;
  terms?: string;
  documentUrl?: string;
  signedDocumentUrl?: string;
  signatories: ContractSignatory[];
  linkedProjects?: string[];
  parentContractId?: string;
  amendments?: ContractAmendment[];
  reminders: ContractReminder[];
}

export interface ContractSignatory {
  name: string;
  email: string;
  designation: string;
  company: string;
  signedAt?: Date;
  signatureUrl?: string;
  order: number;
}

export interface ContractAmendment {
  id: string;
  title: string;
  description: string;
  effectiveDate: Date;
  documentUrl?: string;
  createdAt: Date;
  createdBy: string;
}

export interface ContractReminder {
  id: string;
  type: 'renewal' | 'expiry' | 'review' | 'custom';
  daysBefore: number;
  recipients: string[];
  isEnabled: boolean;
  lastSentAt?: Date;
}
