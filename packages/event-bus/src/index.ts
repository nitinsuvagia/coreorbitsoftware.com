/**
 * @oms/event-bus
 * 
 * Event bus for microservices communication
 * Supports AWS SQS/SNS in production, Redis for local development
 */

// Main EventBus
import { getEventBus as _getEventBus } from './event-bus';
export { EventBus, getEventBus, createEvent, initializeEventBus, shutdownEventBus, subscribeToEvent } from './event-bus';

// Convenience function for publishing events
export async function publishEvent(eventType: string, payload: any, options?: { tenantId?: string; tenantSlug?: string }): Promise<void> {
  const eventBus = _getEventBus();
  // Publish to AUDIT_LOG queue by default or could be routed based on event type
  await eventBus.sendToQueue('oms-audit-log' as any, eventType, payload, options);
}

// Configuration
export { 
  config,
  SQS_QUEUES, 
  SNS_TOPICS,
  getQueueUrl,
  getTopicArn,
  getDlqName,
} from './config';
export type { 
  EventBusConfig, 
  SQSQueueName, 
  SNSTopicName,
} from './config';

// Types
export type {
  BaseEvent,
  EventHandler,
  EventSubscription,
  TopicSubscription,
  SQSMessageEnvelope,
  SNSMessageEnvelope,
  // Payload types
  UserLoginPayload,
  UserLogoutPayload,
  PasswordResetPayload,
  TenantCreatedPayload,
  TenantUpdatedPayload,
  TenantSuspendedPayload,
  UserCreatedPayload,
  UserUpdatedPayload,
  UserRoleChangedPayload,
  EmployeeOnboardedPayload,
  EmployeeOffboardedPayload,
  AttendanceCheckInPayload,
  AttendanceCheckOutPayload,
  LeaveRequestedPayload,
  LeaveApprovedPayload,
  ProjectCreatedPayload,
  ProjectMemberAddedPayload,
  TaskCreatedPayload,
  TaskStatusChangedPayload,
  NotificationSendPayload,
  NotificationBulkSendPayload,
  InvoiceCreatedPayload,
  PaymentReceivedPayload,
  DocumentUploadedPayload,
  ReportRequestedPayload,
  ReportGeneratedPayload,
  AuditLogPayload,
  // Typed events
  UserLoginEvent,
  UserLogoutEvent,
  TenantCreatedEvent,
  TenantUpdatedEvent,
  EmployeeOnboardedEvent,
  AttendanceCheckInEvent,
  TaskCreatedEvent,
  NotificationSendEvent,
  AuditLogEvent,
} from './types';

// SQS Producer (for advanced usage)
export {
  sendMessage,
  sendMessageBatch,
  sendMessageBatches,
  destroySQSClient,
} from './producers/sqs.producer';
export type { SendMessageOptions } from './producers/sqs.producer';

// SNS Publisher (for advanced usage)
export {
  publishToTopic,
  publishBatch,
  publishBatches,
  destroySNSClient,
} from './producers/sns.publisher';
export type { PublishOptions } from './producers/sns.publisher';

// SQS Consumer (for advanced usage)
export {
  startConsumer,
  stopConsumer,
  stopAllConsumers,
  getConsumerStatus,
  listConsumers,
  receiveMessages,
  deleteMessage,
  deleteMessageBatch,
  destroySQSConsumerClient,
} from './consumers/sqs.consumer';
export type { ConsumerOptions } from './consumers/sqs.consumer';

// Redis Adapter (for local development)
export {
  redisSendMessage,
  redisReceiveMessages,
  redisDeleteMessage,
  redisPublishToTopic,
  redisSubscribeToTopic,
  redisUnsubscribeFromTopic,
  redisStartConsumer,
  redisStopConsumer,
  redisStopAllConsumers,
  redisDisconnect,
} from './local/redis.adapter';
