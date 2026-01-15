/**
 * SQS Producer - Send messages to AWS SQS queues
 */

import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
  SendMessageBatchRequestEntry,
} from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

import { config, SQSQueueName, getQueueUrl } from '../config';
import { BaseEvent } from '../types';

const logger = pino({ name: 'sqs-producer' });

// ============================================================================
// SQS CLIENT
// ============================================================================

let sqsClient: SQSClient | null = null;

function getSQSClient(): SQSClient {
  if (!sqsClient) {
    sqsClient = new SQSClient({
      region: config.aws.region,
      ...(config.aws.accessKeyId && {
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey!,
        },
      }),
      ...(config.aws.endpoint && {
        endpoint: config.aws.endpoint,
      }),
    });
  }
  return sqsClient;
}

// ============================================================================
// MESSAGE BUILDER
// ============================================================================

export interface SendMessageOptions {
  /** Delay before message becomes visible (0-900 seconds) */
  delaySeconds?: number;
  
  /** Message group ID for FIFO queues */
  messageGroupId?: string;
  
  /** Deduplication ID for FIFO queues */
  deduplicationId?: string;
  
  /** Custom message attributes */
  messageAttributes?: Record<string, string | number>;
}

/**
 * Create a new event with proper structure
 */
export function createEvent<TPayload>(
  type: string,
  payload: TPayload,
  options?: {
    source?: string;
    correlationId?: string;
    causationId?: string;
    tenantId?: string;
    tenantSlug?: string;
    userId?: string;
    version?: string;
    metadata?: Record<string, unknown>;
  }
): BaseEvent<TPayload> {
  return {
    id: uuidv4(),
    type,
    version: options?.version || '1.0',
    timestamp: new Date().toISOString(),
    source: options?.source || 'unknown',
    correlationId: options?.correlationId,
    causationId: options?.causationId,
    tenantId: options?.tenantId,
    tenantSlug: options?.tenantSlug,
    userId: options?.userId,
    payload,
    metadata: options?.metadata,
  };
}

// ============================================================================
// SEND MESSAGE
// ============================================================================

/**
 * Send a single message to an SQS queue
 */
export async function sendMessage<TPayload>(
  queue: SQSQueueName,
  event: BaseEvent<TPayload>,
  options?: SendMessageOptions
): Promise<string> {
  const client = getSQSClient();
  const queueUrl = getQueueUrl(queue);
  
  const messageBody = JSON.stringify(event);
  
  // Build message attributes
  const messageAttributes: Record<string, { DataType: string; StringValue: string }> = {
    EventType: {
      DataType: 'String',
      StringValue: event.type,
    },
    EventVersion: {
      DataType: 'String',
      StringValue: event.version,
    },
    Source: {
      DataType: 'String',
      StringValue: event.source,
    },
  };
  
  if (event.tenantId) {
    messageAttributes['TenantId'] = {
      DataType: 'String',
      StringValue: event.tenantId,
    };
  }
  
  if (event.correlationId) {
    messageAttributes['CorrelationId'] = {
      DataType: 'String',
      StringValue: event.correlationId,
    };
  }
  
  // Add custom attributes
  if (options?.messageAttributes) {
    for (const [key, value] of Object.entries(options.messageAttributes)) {
      messageAttributes[key] = {
        DataType: typeof value === 'number' ? 'Number' : 'String',
        StringValue: String(value),
      };
    }
  }
  
  try {
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: messageBody,
      DelaySeconds: options?.delaySeconds,
      MessageGroupId: options?.messageGroupId,
      MessageDeduplicationId: options?.deduplicationId,
      MessageAttributes: messageAttributes,
    });
    
    const result = await client.send(command);
    
    logger.debug({
      queue,
      messageId: result.MessageId,
      eventId: event.id,
      eventType: event.type,
    }, 'Message sent to SQS');
    
    return result.MessageId!;
  } catch (error) {
    logger.error({
      queue,
      eventId: event.id,
      eventType: event.type,
      error: (error as Error).message,
    }, 'Failed to send message to SQS');
    throw error;
  }
}

// ============================================================================
// BATCH SEND
// ============================================================================

/**
 * Send multiple messages to an SQS queue in batch (max 10)
 */
export async function sendMessageBatch<TPayload>(
  queue: SQSQueueName,
  events: BaseEvent<TPayload>[],
  options?: SendMessageOptions
): Promise<{ successful: string[]; failed: string[] }> {
  if (events.length === 0) {
    return { successful: [], failed: [] };
  }
  
  if (events.length > 10) {
    throw new Error('SQS batch limit is 10 messages. Use sendMessageBatches for more.');
  }
  
  const client = getSQSClient();
  const queueUrl = getQueueUrl(queue);
  
  const entries: SendMessageBatchRequestEntry[] = events.map((event, index) => ({
    Id: `${index}`,
    MessageBody: JSON.stringify(event),
    DelaySeconds: options?.delaySeconds,
    MessageGroupId: options?.messageGroupId,
    MessageDeduplicationId: options?.deduplicationId
      ? `${options.deduplicationId}-${index}`
      : undefined,
    MessageAttributes: {
      EventType: {
        DataType: 'String',
        StringValue: event.type,
      },
      EventVersion: {
        DataType: 'String',
        StringValue: event.version,
      },
      Source: {
        DataType: 'String',
        StringValue: event.source,
      },
    },
  }));
  
  try {
    const command = new SendMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: entries,
    });
    
    const result = await client.send(command);
    
    const successful = result.Successful?.map(s => s.MessageId!) || [];
    const failed = result.Failed?.map(f => f.Id!) || [];
    
    logger.debug({
      queue,
      successful: successful.length,
      failed: failed.length,
    }, 'Batch messages sent to SQS');
    
    if (failed.length > 0) {
      logger.warn({
        queue,
        failed: result.Failed,
      }, 'Some batch messages failed');
    }
    
    return { successful, failed };
  } catch (error) {
    logger.error({
      queue,
      count: events.length,
      error: (error as Error).message,
    }, 'Failed to send batch to SQS');
    throw error;
  }
}

/**
 * Send multiple messages in batches of 10
 */
export async function sendMessageBatches<TPayload>(
  queue: SQSQueueName,
  events: BaseEvent<TPayload>[],
  options?: SendMessageOptions
): Promise<{ successful: string[]; failed: string[] }> {
  const successful: string[] = [];
  const failed: string[] = [];
  
  // Split into chunks of 10
  for (let i = 0; i < events.length; i += 10) {
    const batch = events.slice(i, i + 10);
    const result = await sendMessageBatch(queue, batch, options);
    successful.push(...result.successful);
    failed.push(...result.failed);
  }
  
  return { successful, failed };
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Destroy the SQS client
 */
export function destroySQSClient(): void {
  if (sqsClient) {
    sqsClient.destroy();
    sqsClient = null;
  }
}
