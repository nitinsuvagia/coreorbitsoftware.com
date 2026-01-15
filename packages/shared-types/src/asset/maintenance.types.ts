/**
 * Asset Maintenance Types - Maintenance tracking
 */

import { AuditableEntity } from '../common';

export type MaintenanceType = 'preventive' | 'corrective' | 'upgrade' | 'inspection';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';

export interface AssetMaintenance extends AuditableEntity {
  tenantId: string;
  assetId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  title: string;
  description?: string;
  scheduledDate: Date;
  completedDate?: Date;
  performedBy?: string;
  vendor?: string;
  cost?: number;
  currency?: string;
  notes?: string;
  attachments?: string[];
}

export interface MaintenanceSchedule extends AuditableEntity {
  tenantId: string;
  assetId: string;
  type: MaintenanceType;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  frequencyValue?: number;
  lastPerformed?: Date;
  nextDue: Date;
  isActive: boolean;
}

export interface AssetRequest extends AuditableEntity {
  tenantId: string;
  requesterId: string;
  assetType: string;
  category: string;
  reason: string;
  priority: MaintenancePriority;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  approverId?: string;
  approvedAt?: Date;
  fulfilledAt?: Date;
  assignedAssetId?: string;
  notes?: string;
}
