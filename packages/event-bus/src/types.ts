/**
 * Event Bus Types
 */

import { SQSQueueName, SNSTopicName } from './config';

// ============================================================================
// BASE EVENT INTERFACE
// ============================================================================

/**
 * Base event structure for all events
 */
export interface BaseEvent<TPayload = unknown> {
  /** Unique event ID (UUID) */
  id: string;
  
  /** Event type/name */
  type: string;
  
  /** Event version for schema evolution */
  version: string;
  
  /** ISO timestamp when event was created */
  timestamp: string;
  
  /** Source service that emitted the event */
  source: string;
  
  /** Correlation ID for request tracing */
  correlationId?: string;
  
  /** Causation ID (the event that caused this event) */
  causationId?: string;
  
  /** Tenant context */
  tenantId?: string;
  tenantSlug?: string;
  
  /** User context */
  userId?: string;
  
  /** Event payload */
  payload: TPayload;
  
  /** Event metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// EVENT PAYLOADS
// ============================================================================

// Auth Events
export interface UserLoginPayload {
  userId: string;
  email: string;
  userType: 'platform_admin' | 'tenant_user';
  ipAddress: string;
  userAgent: string;
  mfaUsed: boolean;
}

export interface UserLogoutPayload {
  userId: string;
  sessionId: string;
  reason: 'manual' | 'expired' | 'revoked';
}

export interface PasswordResetPayload {
  userId: string;
  email: string;
  requestedAt: string;
  expiresAt: string;
}

// Tenant Events
export interface TenantCreatedPayload {
  tenantId: string;
  slug: string;
  name: string;
  planId: string;
  createdBy: string;
  subdomains: string[];
}

export interface TenantUpdatedPayload {
  tenantId: string;
  slug: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  updatedBy: string;
}

export interface TenantSuspendedPayload {
  tenantId: string;
  slug: string;
  reason: string;
  suspendedBy: string;
  suspendedAt: string;
}

// User Events
export interface UserCreatedPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName: string;
  departmentId?: string;
}

export interface UserUpdatedPayload {
  userId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  updatedBy: string;
}

export interface UserRoleChangedPayload {
  userId: string;
  previousRoleId: string;
  previousRoleName: string;
  newRoleId: string;
  newRoleName: string;
  changedBy: string;
}

// Employee Events
export interface EmployeeOnboardedPayload {
  employeeId: string;
  userId: string;
  employeeCode: string;
  departmentId: string;
  departmentName: string;
  designationId: string;
  designationName: string;
  joiningDate: string;
  reportingToId?: string;
}

export interface EmployeeOffboardedPayload {
  employeeId: string;
  userId: string;
  lastWorkingDate: string;
  reason: string;
  offboardedBy: string;
}

// Attendance Events
export interface AttendanceCheckInPayload {
  attendanceId: string;
  employeeId: string;
  checkInTime: string;
  location?: { lat: number; lng: number };
  deviceInfo?: string;
  isRemote: boolean;
}

export interface AttendanceCheckOutPayload {
  attendanceId: string;
  employeeId: string;
  checkOutTime: string;
  workHours: number;
  overtimeHours: number;
}

export interface LeaveRequestedPayload {
  leaveRequestId: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
}

export interface LeaveApprovedPayload {
  leaveRequestId: string;
  employeeId: string;
  approvedBy: string;
  approvedAt: string;
  comments?: string;
}

// Project Events
export interface ProjectCreatedPayload {
  projectId: string;
  name: string;
  code: string;
  clientId?: string;
  clientName?: string;
  managerId: string;
  startDate: string;
  endDate?: string;
  budget?: number;
}

export interface ProjectMemberAddedPayload {
  projectId: string;
  projectName: string;
  memberId: string;
  memberName: string;
  role: string;
  addedBy: string;
}

// Task Events
export interface TaskCreatedPayload {
  taskId: string;
  projectId: string;
  title: string;
  priority: string;
  assigneeId?: string;
  dueDate?: string;
  createdBy: string;
}

export interface TaskStatusChangedPayload {
  taskId: string;
  projectId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
}

// Notification Events
export interface NotificationSendPayload {
  recipientId: string;
  recipientType: 'user' | 'employee';
  channel: 'email' | 'push' | 'sms' | 'in_app';
  templateId: string;
  templateData: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high';
}

export interface NotificationBulkSendPayload {
  recipientIds: string[];
  recipientType: 'user' | 'employee';
  channel: 'email' | 'push' | 'sms' | 'in_app';
  templateId: string;
  templateData: Record<string, unknown>;
}

// Billing Events
export interface InvoiceCreatedPayload {
  invoiceId: string;
  tenantId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export interface PaymentReceivedPayload {
  paymentId: string;
  invoiceId: string;
  tenantId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionId: string;
}

// Document Events
export interface DocumentUploadedPayload {
  documentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  uploadedBy: string;
  category: string;
}

// Report Events
export interface ReportRequestedPayload {
  reportId: string;
  reportType: string;
  parameters: Record<string, unknown>;
  requestedBy: string;
  format: 'pdf' | 'excel' | 'csv';
}

export interface ReportGeneratedPayload {
  reportId: string;
  reportType: string;
  s3Key: string;
  fileSize: number;
  generatedAt: string;
  expiresAt: string;
}

// Audit Events
export interface AuditLogPayload {
  action: string;
  resourceType: string;
  resourceId: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  performedBy: string;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// EVENT HANDLER TYPES
// ============================================================================

/**
 * Event handler function signature
 */
export type EventHandler<T extends BaseEvent = BaseEvent> = (
  event: T
) => Promise<void>;

/**
 * Event handler registration
 */
export interface EventSubscription {
  queue: SQSQueueName;
  handler: EventHandler;
  options?: {
    maxConcurrency?: number;
    visibilityTimeout?: number;
    batchSize?: number;
  };
}

/**
 * SNS subscription configuration
 */
export interface TopicSubscription {
  topic: SNSTopicName;
  queue: SQSQueueName;
  filterPolicy?: Record<string, unknown>;
}

// ============================================================================
// MESSAGE ENVELOPE (SQS/SNS)
// ============================================================================

/**
 * SQS Message wrapper
 */
export interface SQSMessageEnvelope {
  MessageId: string;
  ReceiptHandle: string;
  Body: string;
  Attributes?: Record<string, string>;
  MessageAttributes?: Record<string, {
    DataType: string;
    StringValue?: string;
  }>;
}

/**
 * SNS Message wrapper (when received via SQS)
 */
export interface SNSMessageEnvelope {
  Type: 'Notification';
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  UnsubscribeURL: string;
  MessageAttributes?: Record<string, {
    Type: string;
    Value: string;
  }>;
}

// ============================================================================
// TYPED EVENTS
// ============================================================================

export type UserLoginEvent = BaseEvent<UserLoginPayload>;
export type UserLogoutEvent = BaseEvent<UserLogoutPayload>;
export type TenantCreatedEvent = BaseEvent<TenantCreatedPayload>;
export type TenantUpdatedEvent = BaseEvent<TenantUpdatedPayload>;
export type EmployeeOnboardedEvent = BaseEvent<EmployeeOnboardedPayload>;
export type AttendanceCheckInEvent = BaseEvent<AttendanceCheckInPayload>;
export type TaskCreatedEvent = BaseEvent<TaskCreatedPayload>;
export type NotificationSendEvent = BaseEvent<NotificationSendPayload>;
export type AuditLogEvent = BaseEvent<AuditLogPayload>;
