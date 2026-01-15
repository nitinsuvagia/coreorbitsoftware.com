/**
 * Event Bus Configuration
 */

export interface EventBusConfig {
  // Environment
  nodeEnv: 'development' | 'staging' | 'production';
  
  // Mode: 'aws' for production, 'redis' for local development
  mode: 'aws' | 'redis';
  
  // AWS Configuration
  aws: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string; // For LocalStack
    
    // SQS Configuration
    sqs: {
      queueUrlPrefix: string;
      messageRetentionSeconds: number;
      visibilityTimeoutSeconds: number;
      maxReceiveCount: number;
      deadLetterQueueSuffix: string;
    };
    
    // SNS Configuration
    sns: {
      topicArnPrefix: string;
    };
  };
  
  // Redis Configuration (for local development)
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };
  
  // Consumer Configuration
  consumer: {
    pollingIntervalMs: number;
    batchSize: number;
    maxConcurrency: number;
  };
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const nodeEnv = (process.env.NODE_ENV || 'development') as EventBusConfig['nodeEnv'];
const mode = (process.env.EVENT_BUS_MODE || (nodeEnv === 'production' ? 'aws' : 'redis')) as EventBusConfig['mode'];

export const config: EventBusConfig = {
  nodeEnv,
  mode,
  
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.AWS_ENDPOINT, // LocalStack: http://localhost:4566
    
    sqs: {
      queueUrlPrefix: process.env.SQS_QUEUE_URL_PREFIX || 'https://sqs.us-east-1.amazonaws.com/123456789012',
      messageRetentionSeconds: 1209600, // 14 days
      visibilityTimeoutSeconds: 30,
      maxReceiveCount: 5, // Before sending to DLQ
      deadLetterQueueSuffix: '-dlq',
    },
    
    sns: {
      topicArnPrefix: process.env.SNS_TOPIC_ARN_PREFIX || 'arn:aws:sns:us-east-1:123456789012',
    },
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_EVENT_DB || '1', 10),
    keyPrefix: 'oms:events:',
  },
  
  consumer: {
    pollingIntervalMs: parseInt(process.env.EVENT_POLLING_INTERVAL_MS || '1000', 10),
    batchSize: parseInt(process.env.EVENT_BATCH_SIZE || '10', 10),
    maxConcurrency: parseInt(process.env.EVENT_MAX_CONCURRENCY || '5', 10),
  },
};

// ============================================================================
// QUEUE & TOPIC DEFINITIONS
// ============================================================================

/**
 * All SQS Queues in the system
 */
export const SQS_QUEUES = {
  // Auth Events
  AUTH_USER_LOGIN: 'oms-auth-user-login',
  AUTH_USER_LOGOUT: 'oms-auth-user-logout',
  AUTH_PASSWORD_RESET: 'oms-auth-password-reset',
  
  // Tenant Events
  TENANT_CREATED: 'oms-tenant-created',
  TENANT_UPDATED: 'oms-tenant-updated',
  TENANT_SUSPENDED: 'oms-tenant-suspended',
  TENANT_DELETED: 'oms-tenant-deleted',
  
  // User Events
  USER_CREATED: 'oms-user-created',
  USER_UPDATED: 'oms-user-updated',
  USER_DELETED: 'oms-user-deleted',
  USER_ROLE_CHANGED: 'oms-user-role-changed',
  
  // Employee Events
  EMPLOYEE_ONBOARDED: 'oms-employee-onboarded',
  EMPLOYEE_UPDATED: 'oms-employee-updated',
  EMPLOYEE_OFFBOARDED: 'oms-employee-offboarded',
  EMPLOYEE_DEPARTMENT_CHANGED: 'oms-employee-department-changed',
  
  // Attendance Events
  ATTENDANCE_CHECK_IN: 'oms-attendance-check-in',
  ATTENDANCE_CHECK_OUT: 'oms-attendance-check-out',
  ATTENDANCE_LEAVE_REQUESTED: 'oms-attendance-leave-requested',
  ATTENDANCE_LEAVE_APPROVED: 'oms-attendance-leave-approved',
  
  // Project Events
  PROJECT_CREATED: 'oms-project-created',
  PROJECT_UPDATED: 'oms-project-updated',
  PROJECT_COMPLETED: 'oms-project-completed',
  PROJECT_MEMBER_ADDED: 'oms-project-member-added',
  
  // Time Entry Events
  TIME_ENTRY_CREATED: 'oms-time-entry-created',
  TIME_ENTRY_APPROVED: 'oms-time-entry-approved',
  TIME_ENTRY_REJECTED: 'oms-time-entry-rejected',
  
  // Task Events
  TASK_CREATED: 'oms-task-created',
  TASK_UPDATED: 'oms-task-updated',
  TASK_ASSIGNED: 'oms-task-assigned',
  TASK_STATUS_CHANGED: 'oms-task-status-changed',
  TASK_COMPLETED: 'oms-task-completed',
  
  // Notification Events
  NOTIFICATION_SEND: 'oms-notification-send',
  NOTIFICATION_BULK_SEND: 'oms-notification-bulk-send',
  
  // Billing Events
  BILLING_INVOICE_CREATED: 'oms-billing-invoice-created',
  BILLING_PAYMENT_RECEIVED: 'oms-billing-payment-received',
  BILLING_SUBSCRIPTION_CHANGED: 'oms-billing-subscription-changed',
  
  // Document Events
  DOCUMENT_UPLOADED: 'oms-document-uploaded',
  DOCUMENT_PROCESSED: 'oms-document-processed',
  DOCUMENT_DELETED: 'oms-document-deleted',
  
  // Report Events
  REPORT_REQUESTED: 'oms-report-requested',
  REPORT_GENERATED: 'oms-report-generated',
  
  // Audit Events
  AUDIT_LOG: 'oms-audit-log',
} as const;

export type SQSQueueName = typeof SQS_QUEUES[keyof typeof SQS_QUEUES];

/**
 * SNS Topics for fan-out pub/sub
 */
export const SNS_TOPICS = {
  // Broadcast topics (multiple subscribers)
  TENANT_EVENTS: 'oms-tenant-events',
  USER_EVENTS: 'oms-user-events',
  EMPLOYEE_EVENTS: 'oms-employee-events',
  PROJECT_EVENTS: 'oms-project-events',
  SYSTEM_EVENTS: 'oms-system-events',
  BILLING_EVENTS: 'oms-billing-events',
} as const;

export type SNSTopicName = typeof SNS_TOPICS[keyof typeof SNS_TOPICS];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get full SQS Queue URL
 */
export function getQueueUrl(queueName: SQSQueueName): string {
  return `${config.aws.sqs.queueUrlPrefix}/${queueName}`;
}

/**
 * Get full SNS Topic ARN
 */
export function getTopicArn(topicName: SNSTopicName): string {
  return `${config.aws.sns.topicArnPrefix}:${topicName}`;
}

/**
 * Get DLQ name for a queue
 */
export function getDlqName(queueName: SQSQueueName): string {
  return `${queueName}${config.aws.sqs.deadLetterQueueSuffix}`;
}
