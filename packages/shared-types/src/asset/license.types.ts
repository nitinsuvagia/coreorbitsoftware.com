/**
 * Software License Types - License management
 */

import { AuditableEntity } from '../common';

export type LicenseType = 'perpetual' | 'subscription' | 'volume' | 'site' | 'user' | 'device' | 'trial' | 'freeware' | 'open_source';
export type LicenseStatus = 'active' | 'expired' | 'expiring_soon' | 'suspended' | 'cancelled';

export interface SoftwareLicense extends AuditableEntity {
  tenantId: string;
  name: string;
  vendor: string;
  type: LicenseType;
  status: LicenseStatus;
  licenseKey?: string;
  softwareVersion?: string;
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  purchaseDate: Date;
  expiryDate?: Date;
  renewalDate?: Date;
  cost: number;
  costPerSeat?: number;
  currency: string;
  billingCycle?: 'monthly' | 'yearly' | 'one_time';
  autoRenew: boolean;
  category: string;
  description?: string;
  vendorContact?: VendorContact;
  documents?: string[];
  notes?: string;
}

export interface VendorContact {
  name?: string;
  email?: string;
  phone?: string;
  accountNumber?: string;
  supportUrl?: string;
}

export interface LicenseAssignment extends AuditableEntity {
  tenantId: string;
  licenseId: string;
  employeeId?: string;
  assetId?: string;
  assignedAt: Date;
  revokedAt?: Date;
  notes?: string;
}

export interface LicenseAlert {
  licenseId: string;
  type: 'expiring' | 'expired' | 'over_allocated' | 'under_utilized';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  dueDate?: Date;
}
