/**
 * Asset Types - IT asset management
 */

import { AuditableEntity } from '../common';

export type AssetStatus = 'available' | 'assigned' | 'in_maintenance' | 'retired' | 'disposed' | 'lost';
export type AssetType = 'laptop' | 'desktop' | 'monitor' | 'keyboard' | 'mouse' | 'headset' | 'phone' | 'tablet' | 'server' | 'network_device' | 'furniture' | 'other';
export type AssetCondition = 'new' | 'excellent' | 'good' | 'fair' | 'poor';

export interface Asset extends AuditableEntity {
  tenantId: string;
  assetTag: string;
  name: string;
  type: AssetType;
  category: string;
  status: AssetStatus;
  condition: AssetCondition;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  specifications?: AssetSpecifications;
  purchaseInfo: AssetPurchaseInfo;
  warranty?: AssetWarranty;
  currentAssigneeId?: string;
  assignedAt?: Date;
  location?: string;
  department?: string;
  notes?: string;
  documents?: AssetDocument[];
  customFields?: Record<string, unknown>;
}

export interface AssetSpecifications {
  processor?: string;
  ram?: string;
  storage?: string;
  os?: string;
  screenSize?: string;
  resolution?: string;
  other?: Record<string, string>;
}

export interface AssetPurchaseInfo {
  purchaseDate: Date;
  purchasePrice: number;
  currency: string;
  vendor?: string;
  invoiceNumber?: string;
  poNumber?: string;
  depreciationRate?: number;
  currentValue?: number;
}

export interface AssetWarranty {
  startDate: Date;
  endDate: Date;
  provider?: string;
  type: 'standard' | 'extended' | 'comprehensive';
  coverage?: string;
  contactInfo?: string;
}

export interface AssetDocument {
  id: string;
  type: 'invoice' | 'warranty' | 'manual' | 'receipt' | 'other';
  name: string;
  url: string;
  uploadedAt: Date;
}

export interface AssetAssignment extends AuditableEntity {
  tenantId: string;
  assetId: string;
  employeeId: string;
  assignedAt: Date;
  returnedAt?: Date;
  condition: AssetCondition;
  notes?: string;
  acknowledgementUrl?: string;
}
