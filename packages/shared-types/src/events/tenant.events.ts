/**
 * Tenant Events - Tenant lifecycle events
 */

export interface TenantCreatedEvent {
  tenantId: string;
  name: string;
  slug: string;
  databaseName: string;
  subscriptionTier: string;
  createdBy: string;
  createdAt: Date;
}

export interface TenantUpdatedEvent {
  tenantId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  updatedBy: string;
  updatedAt: Date;
}

export interface TenantSuspendedEvent {
  tenantId: string;
  reason: string;
  suspendedBy: string;
  suspendedAt: Date;
}

export interface TenantDeletedEvent {
  tenantId: string;
  deletedBy: string;
  deletedAt: Date;
  dataRetentionDays: number;
}

export interface SubscriptionChangedEvent {
  tenantId: string;
  previousTier: string;
  newTier: string;
  effectiveDate: Date;
  changedBy: string;
}
