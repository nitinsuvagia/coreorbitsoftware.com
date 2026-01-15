/**
 * EventBus - Unified facade for event messaging
 * 
 * Automatically switches between AWS (SQS/SNS) and Redis based on configuration.
 * Provides a simple, consistent API for publishing and consuming events.
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

import { config, SQSQueueName, SNSTopicName, SQS_QUEUES, SNS_TOPICS } from './config';
import { BaseEvent, EventHandler } from './types';

// AWS producers/consumers
import { 
  sendMessage as sqsSendMessage, 
  sendMessageBatch as sqsSendBatch,
  createEvent,
  destroySQSClient,
} from './producers/sqs.producer';
import { 
  publishToTopic as snsPublish, 
  destroySNSClient,
} from './producers/sns.publisher';
import { 
  startConsumer as sqsStartConsumer, 
  stopConsumer as sqsStopConsumer,
  stopAllConsumers as sqsStopAll,
  destroySQSConsumerClient,
} from './consumers/sqs.consumer';

// Redis adapter
import {
  redisSendMessage,
  redisPublishToTopic,
  redisStartConsumer,
  redisStopConsumer,
  redisStopAllConsumers,
  redisSubscribeToTopic,
  redisUnsubscribeFromTopic,
  redisDisconnect,
} from './local/redis.adapter';

const logger = pino({ name: 'event-bus' });

// ============================================================================
// EVENT BUS CLASS
// ============================================================================

export class EventBus {
  private static instance: EventBus | null = null;
  private consumers: Map<string, string> = new Map();
  private subscriptions: Map<string, string> = new Map();
  private serviceName: string;
  
  private constructor(serviceName: string) {
    this.serviceName = serviceName;
    logger.info({ 
      mode: config.mode, 
      service: serviceName,
    }, 'EventBus initialized');
  }
  
  /**
   * Get or create the EventBus singleton
   */
  static getInstance(serviceName: string = 'unknown'): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus(serviceName);
    }
    return EventBus.instance;
  }
  
  /**
   * Check if using AWS mode
   */
  private get isAWS(): boolean {
    return config.mode === 'aws';
  }
  
  // ==========================================================================
  // PUBLISHING
  // ==========================================================================
  
  /**
   * Send an event to a specific queue (point-to-point)
   */
  async sendToQueue<TPayload>(
    queue: SQSQueueName,
    type: string,
    payload: TPayload,
    options?: {
      correlationId?: string;
      causationId?: string;
      tenantId?: string;
      tenantSlug?: string;
      userId?: string;
      delaySeconds?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<string> {
    const event = createEvent(type, payload, {
      source: this.serviceName,
      correlationId: options?.correlationId,
      causationId: options?.causationId,
      tenantId: options?.tenantId,
      tenantSlug: options?.tenantSlug,
      userId: options?.userId,
      metadata: options?.metadata,
    });
    
    if (this.isAWS) {
      return sqsSendMessage(queue, event, {
        delaySeconds: options?.delaySeconds,
      });
    } else {
      return redisSendMessage(queue, event, {
        delaySeconds: options?.delaySeconds,
      });
    }
  }
  
  /**
   * Send multiple events to a queue
   */
  async sendBatchToQueue<TPayload>(
    queue: SQSQueueName,
    type: string,
    payloads: TPayload[],
    options?: {
      correlationId?: string;
      tenantId?: string;
      tenantSlug?: string;
    }
  ): Promise<{ successful: number; failed: number }> {
    const events = payloads.map(payload =>
      createEvent(type, payload, {
        source: this.serviceName,
        correlationId: options?.correlationId,
        tenantId: options?.tenantId,
        tenantSlug: options?.tenantSlug,
      })
    );
    
    if (this.isAWS) {
      const result = await sqsSendBatch(queue, events);
      return {
        successful: result.successful.length,
        failed: result.failed.length,
      };
    } else {
      // Redis doesn't have native batching, send one by one
      let successful = 0;
      let failed = 0;
      
      for (const event of events) {
        try {
          await redisSendMessage(queue, event);
          successful++;
        } catch {
          failed++;
        }
      }
      
      return { successful, failed };
    }
  }
  
  /**
   * Publish an event to a topic (pub/sub - fan-out)
   */
  async publishToTopic<TPayload>(
    topic: SNSTopicName,
    type: string,
    payload: TPayload,
    options?: {
      correlationId?: string;
      causationId?: string;
      tenantId?: string;
      tenantSlug?: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<string> {
    const event = createEvent(type, payload, {
      source: this.serviceName,
      correlationId: options?.correlationId,
      causationId: options?.causationId,
      tenantId: options?.tenantId,
      tenantSlug: options?.tenantSlug,
      userId: options?.userId,
      metadata: options?.metadata,
    });
    
    if (this.isAWS) {
      return snsPublish(topic, event);
    } else {
      return redisPublishToTopic(topic, event);
    }
  }
  
  // ==========================================================================
  // CONSUMING
  // ==========================================================================
  
  /**
   * Start consuming messages from a queue
   */
  startQueueConsumer(
    queue: SQSQueueName,
    handler: EventHandler,
    options?: {
      batchSize?: number;
      maxConcurrency?: number;
    }
  ): string {
    const consumerId = this.isAWS
      ? sqsStartConsumer(queue, handler, options)
      : redisStartConsumer(queue, handler, options);
    
    this.consumers.set(queue, consumerId);
    
    logger.info({ queue, consumerId }, 'Queue consumer started');
    
    return consumerId;
  }
  
  /**
   * Stop consuming from a queue
   */
  async stopQueueConsumer(queue: SQSQueueName): Promise<void> {
    const consumerId = this.consumers.get(queue);
    
    if (consumerId) {
      if (this.isAWS) {
        await sqsStopConsumer(consumerId);
      } else {
        redisStopConsumer(consumerId);
      }
      
      this.consumers.delete(queue);
      logger.info({ queue, consumerId }, 'Queue consumer stopped');
    }
  }
  
  /**
   * Subscribe to a topic (Redis mode only - AWS uses SQS subscriptions)
   */
  async subscribeToTopic(
    topic: SNSTopicName,
    handler: EventHandler
  ): Promise<string> {
    if (this.isAWS) {
      throw new Error('In AWS mode, topic subscriptions are configured via SQS. Use startQueueConsumer instead.');
    }
    
    const subscriptionId = await redisSubscribeToTopic(topic, handler);
    this.subscriptions.set(topic, subscriptionId);
    
    logger.info({ topic, subscriptionId }, 'Topic subscription created');
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from a topic
   */
  async unsubscribeFromTopic(topic: SNSTopicName): Promise<void> {
    const subscriptionId = this.subscriptions.get(topic);
    
    if (subscriptionId) {
      await redisUnsubscribeFromTopic(topic, subscriptionId);
      this.subscriptions.delete(topic);
      
      logger.info({ topic, subscriptionId }, 'Topic subscription removed');
    }
  }
  
  // ==========================================================================
  // CONVENIENCE METHODS
  // ==========================================================================
  
  /**
   * Emit a tenant event (creates tenant and broadcasts)
   */
  async emitTenantEvent<TPayload>(
    type: string,
    payload: TPayload,
    tenantContext: { tenantId: string; tenantSlug: string },
    correlationId?: string
  ): Promise<string> {
    return this.publishToTopic(SNS_TOPICS.TENANT_EVENTS, type, payload, {
      tenantId: tenantContext.tenantId,
      tenantSlug: tenantContext.tenantSlug,
      correlationId,
    });
  }
  
  /**
   * Emit a user event
   */
  async emitUserEvent<TPayload>(
    type: string,
    payload: TPayload,
    context: { tenantId?: string; tenantSlug?: string; userId?: string },
    correlationId?: string
  ): Promise<string> {
    return this.publishToTopic(SNS_TOPICS.USER_EVENTS, type, payload, {
      ...context,
      correlationId,
    });
  }
  
  /**
   * Send a notification
   */
  async sendNotification(
    payload: {
      recipientId: string;
      recipientType: 'user' | 'employee';
      channel: 'email' | 'push' | 'sms' | 'in_app';
      templateId: string;
      templateData: Record<string, unknown>;
      priority?: 'low' | 'normal' | 'high';
    },
    context?: { tenantId?: string; tenantSlug?: string }
  ): Promise<string> {
    return this.sendToQueue(
      SQS_QUEUES.NOTIFICATION_SEND,
      'notification.send',
      { ...payload, priority: payload.priority || 'normal' },
      context
    );
  }
  
  /**
   * Log an audit event
   */
  async logAudit(
    payload: {
      action: string;
      resourceType: string;
      resourceId: string;
      previousState?: Record<string, unknown>;
      newState?: Record<string, unknown>;
      performedBy: string;
      ipAddress?: string;
      userAgent?: string;
    },
    context?: { tenantId?: string; tenantSlug?: string }
  ): Promise<string> {
    return this.sendToQueue(SQS_QUEUES.AUDIT_LOG, 'audit.log', payload, context);
  }
  
  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================
  
  /**
   * Stop all consumers and subscriptions
   */
  async stopAll(): Promise<void> {
    // Stop queue consumers
    if (this.isAWS) {
      await sqsStopAll();
    } else {
      redisStopAllConsumers();
    }
    
    // Clear subscriptions
    for (const [topic, subscriptionId] of this.subscriptions) {
      await redisUnsubscribeFromTopic(topic as SNSTopicName, subscriptionId);
    }
    
    this.consumers.clear();
    this.subscriptions.clear();
    
    logger.info('All consumers and subscriptions stopped');
  }
  
  /**
   * Shutdown the event bus and clean up resources
   */
  async shutdown(): Promise<void> {
    await this.stopAll();
    
    if (this.isAWS) {
      destroySQSClient();
      destroySNSClient();
      destroySQSConsumerClient();
    } else {
      await redisDisconnect();
    }
    
    EventBus.instance = null;
    
    logger.info('EventBus shutdown complete');
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create or get the EventBus instance
 */
export function getEventBus(serviceName?: string): EventBus {
  return EventBus.getInstance(serviceName);
}

/**
 * Initialize the event bus (convenience function for services)
 */
export async function initializeEventBus(options: {
  serviceName: string;
  region?: string;
  useLocalRedis?: boolean;
  redisUrl?: string;
}): Promise<EventBus> {
  const eventBus = EventBus.getInstance(options.serviceName);
  return eventBus;
}

/**
 * Shutdown the event bus (convenience function for services)
 */
export async function shutdownEventBus(): Promise<void> {
  const eventBus = EventBus.getInstance();
  await eventBus.shutdown();
}

/**
 * Subscribe to events on a topic (convenience function for services)
 */
export async function subscribeToEvent(
  eventType: string,
  handler: (data: any) => Promise<void>
): Promise<void> {
  const eventBus = EventBus.getInstance();
  // For Redis mode, subscribe to a topic matching the event type
  // In production (AWS), this would use SQS subscriptions
  const topicName = eventType.replace(/\./g, '-') as any;
  try {
    await eventBus.subscribeToTopic(topicName, async (event) => {
      if (event.type === eventType) {
        await handler(event.payload);
      }
    });
  } catch (error) {
    // Subscription might not be available in AWS mode - log and continue
    logger.warn({ eventType, error }, 'Could not subscribe to event - may not be available in this mode');
  }
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { createEvent } from './producers/sqs.producer';
export { SQS_QUEUES, SNS_TOPICS } from './config';
export type { SQSQueueName, SNSTopicName } from './config';
