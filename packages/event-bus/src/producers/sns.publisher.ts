/**
 * SNS Publisher - Publish messages to AWS SNS topics
 */

import {
  SNSClient,
  PublishCommand,
  PublishBatchCommand,
  PublishBatchRequestEntry,
} from '@aws-sdk/client-sns';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

import { config, SNSTopicName, getTopicArn } from '../config';
import { BaseEvent } from '../types';

const logger = pino({ name: 'sns-publisher' });

// ============================================================================
// SNS CLIENT
// ============================================================================

let snsClient: SNSClient | null = null;

function getSNSClient(): SNSClient {
  if (!snsClient) {
    snsClient = new SNSClient({
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
  return snsClient;
}

// ============================================================================
// PUBLISH OPTIONS
// ============================================================================

export interface PublishOptions {
  /** Message subject (for email endpoints) */
  subject?: string;
  
  /** Message group ID for FIFO topics */
  messageGroupId?: string;
  
  /** Deduplication ID for FIFO topics */
  deduplicationId?: string;
  
  /** Custom message attributes for filtering */
  messageAttributes?: Record<string, string | number | string[]>;
}

// ============================================================================
// PUBLISH MESSAGE
// ============================================================================

/**
 * Publish a message to an SNS topic
 */
export async function publishToTopic<TPayload>(
  topic: SNSTopicName,
  event: BaseEvent<TPayload>,
  options?: PublishOptions
): Promise<string> {
  const client = getSNSClient();
  const topicArn = getTopicArn(topic);
  
  const messageBody = JSON.stringify(event);
  
  // Build message attributes for SNS filtering
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
  
  // Add custom attributes
  if (options?.messageAttributes) {
    for (const [key, value] of Object.entries(options.messageAttributes)) {
      if (Array.isArray(value)) {
        messageAttributes[key] = {
          DataType: 'String.Array',
          StringValue: JSON.stringify(value),
        };
      } else {
        messageAttributes[key] = {
          DataType: typeof value === 'number' ? 'Number' : 'String',
          StringValue: String(value),
        };
      }
    }
  }
  
  try {
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: messageBody,
      Subject: options?.subject,
      MessageGroupId: options?.messageGroupId,
      MessageDeduplicationId: options?.deduplicationId,
      MessageAttributes: messageAttributes,
    });
    
    const result = await client.send(command);
    
    logger.debug({
      topic,
      messageId: result.MessageId,
      eventId: event.id,
      eventType: event.type,
    }, 'Message published to SNS');
    
    return result.MessageId!;
  } catch (error) {
    logger.error({
      topic,
      eventId: event.id,
      eventType: event.type,
      error: (error as Error).message,
    }, 'Failed to publish to SNS');
    throw error;
  }
}

// ============================================================================
// BATCH PUBLISH
// ============================================================================

/**
 * Publish multiple messages to an SNS topic in batch (max 10)
 */
export async function publishBatch<TPayload>(
  topic: SNSTopicName,
  events: BaseEvent<TPayload>[],
  options?: PublishOptions
): Promise<{ successful: string[]; failed: string[] }> {
  if (events.length === 0) {
    return { successful: [], failed: [] };
  }
  
  if (events.length > 10) {
    throw new Error('SNS batch limit is 10 messages. Use publishBatches for more.');
  }
  
  const client = getSNSClient();
  const topicArn = getTopicArn(topic);
  
  const entries: PublishBatchRequestEntry[] = events.map((event, index) => ({
    Id: `${index}`,
    Message: JSON.stringify(event),
    Subject: options?.subject,
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
    const command = new PublishBatchCommand({
      TopicArn: topicArn,
      PublishBatchRequestEntries: entries,
    });
    
    const result = await client.send(command);
    
    const successful = result.Successful?.map(s => s.MessageId!) || [];
    const failed = result.Failed?.map(f => f.Id!) || [];
    
    logger.debug({
      topic,
      successful: successful.length,
      failed: failed.length,
    }, 'Batch published to SNS');
    
    if (failed.length > 0) {
      logger.warn({
        topic,
        failed: result.Failed,
      }, 'Some batch publishes failed');
    }
    
    return { successful, failed };
  } catch (error) {
    logger.error({
      topic,
      count: events.length,
      error: (error as Error).message,
    }, 'Failed to publish batch to SNS');
    throw error;
  }
}

/**
 * Publish multiple messages in batches of 10
 */
export async function publishBatches<TPayload>(
  topic: SNSTopicName,
  events: BaseEvent<TPayload>[],
  options?: PublishOptions
): Promise<{ successful: string[]; failed: string[] }> {
  const successful: string[] = [];
  const failed: string[] = [];
  
  // Split into chunks of 10
  for (let i = 0; i < events.length; i += 10) {
    const batch = events.slice(i, i + 10);
    const result = await publishBatch(topic, batch, options);
    successful.push(...result.successful);
    failed.push(...result.failed);
  }
  
  return { successful, failed };
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Destroy the SNS client
 */
export function destroySNSClient(): void {
  if (snsClient) {
    snsClient.destroy();
    snsClient = null;
  }
}
