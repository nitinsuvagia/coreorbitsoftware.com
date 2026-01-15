/**
 * Asset Events - Asset management events
 */

export interface AssetCreatedEvent {
  tenantId: string;
  assetId: string;
  assetTag: string;
  name: string;
  type: string;
  createdBy: string;
  createdAt: Date;
}

export interface AssetAssignedEvent {
  tenantId: string;
  assetId: string;
  assetTag: string;
  employeeId: string;
  assignedBy: string;
  assignedAt: Date;
}

export interface AssetReturnedEvent {
  tenantId: string;
  assetId: string;
  assetTag: string;
  employeeId: string;
  returnedAt: Date;
  condition: string;
}

export interface AssetMaintenanceScheduledEvent {
  tenantId: string;
  assetId: string;
  maintenanceId: string;
  type: string;
  scheduledDate: Date;
  scheduledBy: string;
}

export interface AssetRetiredEvent {
  tenantId: string;
  assetId: string;
  assetTag: string;
  reason: string;
  retiredBy: string;
  retiredAt: Date;
}

export interface LicenseExpiringEvent {
  tenantId: string;
  licenseId: string;
  name: string;
  expiryDate: Date;
  daysUntilExpiry: number;
}

export interface LicenseExpiredEvent {
  tenantId: string;
  licenseId: string;
  name: string;
  expiredAt: Date;
}
