/**
 * Offer Types - Job offer management
 */

import { AuditableEntity, BaseEntity } from '../common';

export type OfferStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'declined' | 'expired' | 'withdrawn';

export interface Offer extends AuditableEntity {
  tenantId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  offerNumber: string;
  status: OfferStatus;
  designation: string;
  departmentId: string;
  reportingManagerId: string;
  compensation: OfferCompensation;
  joiningDate: Date;
  expiryDate: Date;
  benefits: OfferBenefit[];
  terms?: string;
  attachments?: string[];
  approvers: OfferApprover[];
  sentAt?: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  declineReason?: string;
  signedDocumentUrl?: string;
  notes?: string;
}

export interface OfferCompensation {
  baseSalary: number;
  currency: string;
  period: 'monthly' | 'yearly';
  variablePay?: number;
  variablePayFrequency?: 'monthly' | 'quarterly' | 'yearly';
  signingBonus?: number;
  relocationBonus?: number;
  stockOptions?: StockOption;
  totalCompensation: number;
}

export interface StockOption {
  units: number;
  vestingPeriodMonths: number;
  cliffMonths: number;
  vestingSchedule: string;
  strikePrice?: number;
}

export interface OfferBenefit {
  name: string;
  description?: string;
  value?: number;
  type: 'insurance' | 'leave' | 'allowance' | 'perk' | 'other';
}

export interface OfferApprover {
  approverId: string;
  order: number;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: Date;
  comments?: string;
}

export interface OfferTemplate extends BaseEntity {
  tenantId: string;
  name: string;
  description?: string;
  content: string;
  variables: OfferTemplateVariable[];
  designationId?: string;
  departmentId?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface OfferTemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency';
  defaultValue?: string;
  isRequired: boolean;
}
