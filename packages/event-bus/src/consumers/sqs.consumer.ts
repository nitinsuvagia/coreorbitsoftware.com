/**
 * SQS Consumer - Poll and process messages from AWS SQS queues
 */

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  DeleteMessageBatchCommand,
  ChangeMessageVisibilityCommand,
} from '@aws-sdk/client-sqs';
import pino from 'pino';

import { config, SQSQueueName, getQueueUrl } from '../config';
import { BaseEvent, EventHandler, SQSMessageEnvelope, SNSMessageEnvelope } from '../types';

const logger = pino({ name: 'sqs-consumer' });

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
// CONSUMER OPTIONS
// ============================================================================

export interface ConsumerOptions {
  /** Number of messages to receive per poll (1-10) */
  batchSize?: number;
  
  /** Visibility timeout in seconds */
  visibilityTimeout?: number;
  
  /** Long polling wait time in seconds (0-20) */
  waitTimeSeconds?: number;
  
  /** Maximum concurrent message processing */
  maxConcurrency?: number;
  
  /** Whether to automatically delete messages on success */
  autoDelete?: boolean;
  
  /** Whether to automatically extend visibility on long processing */
  autoExtendVisibility?: boolean;
  
  /** Interval for visibility extension check (ms) */
  visibilityExtendInterval?: number;
}

const defaultOptions: Required<ConsumerOptions> = {
  batchSize: config.consumer.batchSize,
  visibilityTimeout: config.aws.sqs.visibilityTimeoutSeconds,
  waitTimeSeconds: 20,
  maxConcurrency: config.consumer.maxConcurrency,
  autoDelete: true,
  autoExtendVisibility: true,
  visibilityExtendInterval: 15000, // 15 seconds
};

// ============================================================================
// CONSUMER STATE
// ============================================================================

interface ConsumerState {
  queue: SQSQueueName;
  handler: EventHandler;
  options: Required<ConsumerOptions>;
  isRunning: boolean;
  activeMessages: number;
  pollPromise: Promise<void> | null;
}

const consumers = new Map<string, ConsumerState>();

// ============================================================================
// MESSAGE PROCESSING
// ============================================================================

/**
 * Parse message body, handling both direct SQS and SNS-via-SQS messages
 */
function parseMessageBody(body: string): BaseEvent {
  const parsed = JSON.parse(body);
  
  // Check if this is an SNS notification wrapped in SQS
  if (parsed.Type === 'Notification' && parsed.Message) {
    const snsEnvelope = parsed as SNSMessageEnvelope;
    return JSON.parse(snsEnvelope.Message) as BaseEvent;
  }
  
  // Direct SQS message
  return parsed as BaseEvent;
}

/**
 * Process a single message
 */
async function processMessage(
  state: ConsumerState,
  message: SQSMessageEnvelope
): Promise<boolean> {
  const queueUrl = getQueueUrl(state.queue);
  const client = getSQSClient();
  
  let visibilityTimer: NodeJS.Timeout | null = null;
  
  try {
    const event = parseMessageBody(message.Body);
    
    logger.debug({
      queue: state.queue,
      messageId: message.MessageId,
      eventId: event.id,
      eventType: event.type,
    }, 'Processing message');
    
    // Set up visibility timeout extension
    if (state.options.autoExtendVisibility) {
      visibilityTimer = setInterval(async () => {
        try {
          await client.send(new ChangeMessageVisibilityCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
            VisibilityTimeout: state.options.visibilityTimeout,
          }));
          logger.debug({
            messageId: message.MessageId,
          }, 'Extended message visibility');
        } catch (error) {
          logger.warn({
            messageId: message.MessageId,
            error: (error as Error).message,
          }, 'Failed to extend visibility');
        }
      }, state.options.visibilityExtendInterval);
    }
    
    // Process the message
    await state.handler(event);
    
    // Delete on success
    if (state.options.autoDelete) {
      await client.send(new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      }));
    }
    
    logger.debug({
      queue: state.queue,
      messageId: message.MessageId,
      eventId: event.id,
    }, 'Message processed successfully');
    
    return true;
  } catch (error) {
    logger.error({
      queue: state.queue,
      messageId: message.MessageId,
      error: (error as Error).message,
      stack: (error as Error).stack,
    }, 'Failed to process message');
    
    // Message will return to queue after visibility timeout
    return false;
  } finally {
    if (visibilityTimer) {
      clearInterval(visibilityTimer);
    }
  }
}

/**
 * Poll for messages and process them
 */
async function poll(state: ConsumerState): Promise<void> {
  const client = getSQSClient();
  const queueUrl = getQueueUrl(state.queue);
  
  while (state.isRunning) {
    try {
      // Check concurrency limit
      if (state.activeMessages >= state.options.maxConcurrency) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      const availableSlots = state.options.maxConcurrency - state.activeMessages;
      const batchSize = Math.min(state.options.batchSize, availableSlots);
      
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: batchSize,
        WaitTimeSeconds: state.options.waitTimeSeconds,
        VisibilityTimeout: state.options.visibilityTimeout,
        MessageAttributeNames: ['All'],
        AttributeNames: ['All'],
      });
      
      const result = await client.send(command);
      
      if (result.Messages && result.Messages.length > 0) {
        logger.debug({
          queue: state.queue,
          count: result.Messages.length,
        }, 'Received messages');
        
        // Process messages concurrently
        const promises = result.Messages.map(async (msg) => {
          state.activeMessages++;
          try {
            await processMessage(state, msg as SQSMessageEnvelope);
          } finally {
            state.activeMessages--;
          }
        });
        
        await Promise.all(promises);
      }
    } catch (error) {
      logger.error({
        queue: state.queue,
        error: (error as Error).message,
      }, 'Error polling queue');
      
      // Wait before retrying on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// ============================================================================
// CONSUMER MANAGEMENT
// ============================================================================

/**
 * Start consuming messages from a queue
 */
export function startConsumer(
  queue: SQSQueueName,
  handler: EventHandler,
  options?: ConsumerOptions
): string {
  const consumerId = `${queue}-${Date.now()}`;
  
  const state: ConsumerState = {
    queue,
    handler,
    options: { ...defaultOptions, ...options },
    isRunning: true,
    activeMessages: 0,
    pollPromise: null,
  };
  
  consumers.set(consumerId, state);
  
  // Start polling
  state.pollPromise = poll(state);
  
  logger.info({
    consumerId,
    queue,
    options: state.options,
  }, 'Consumer started');
  
  return consumerId;
}

/**
 * Stop a consumer
 */
export async function stopConsumer(consumerId: string): Promise<void> {
  const state = consumers.get(consumerId);
  
  if (!state) {
    logger.warn({ consumerId }, 'Consumer not found');
    return;
  }
  
  state.isRunning = false;
  
  // Wait for polling to stop
  if (state.pollPromise) {
    await state.pollPromise;
  }
  
  // Wait for active messages to complete
  while (state.activeMessages > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  consumers.delete(consumerId);
  
  logger.info({ consumerId, queue: state.queue }, 'Consumer stopped');
}

/**
 * Stop all consumers
 */
export async function stopAllConsumers(): Promise<void> {
  const stopPromises = Array.from(consumers.keys()).map(id => stopConsumer(id));
  await Promise.all(stopPromises);
  logger.info('All consumers stopped');
}

/**
 * Get consumer status
 */
export function getConsumerStatus(consumerId: string): {
  isRunning: boolean;
  activeMessages: number;
  queue: SQSQueueName;
} | null {
  const state = consumers.get(consumerId);
  
  if (!state) {
    return null;
  }
  
  return {
    isRunning: state.isRunning,
    activeMessages: state.activeMessages,
    queue: state.queue,
  };
}

/**
 * List all active consumers
 */
export function listConsumers(): Array<{
  id: string;
  queue: SQSQueueName;
  isRunning: boolean;
  activeMessages: number;
}> {
  return Array.from(consumers.entries()).map(([id, state]) => ({
    id,
    queue: state.queue,
    isRunning: state.isRunning,
    activeMessages: state.activeMessages,
  }));
}

// ============================================================================
// MANUAL MESSAGE OPERATIONS
// ============================================================================

/**
 * Manually receive messages without starting a consumer
 */
export async function receiveMessages(
  queue: SQSQueueName,
  options?: {
    maxMessages?: number;
    waitTimeSeconds?: number;
    visibilityTimeout?: number;
  }
): Promise<Array<{ message: BaseEvent; receiptHandle: string }>> {
  const client = getSQSClient();
  const queueUrl = getQueueUrl(queue);
  
  const command = new ReceiveMessageCommand({
    QueueUrl: queueUrl,
    MaxNumberOfMessages: options?.maxMessages || 10,
    WaitTimeSeconds: options?.waitTimeSeconds || 0,
    VisibilityTimeout: options?.visibilityTimeout || 30,
    MessageAttributeNames: ['All'],
  });
  
  const result = await client.send(command);
  
  if (!result.Messages) {
    return [];
  }
  
  return result.Messages.map(msg => ({
    message: parseMessageBody(msg.Body!),
    receiptHandle: msg.ReceiptHandle!,
  }));
}

/**
 * Manually delete a message
 */
export async function deleteMessage(
  queue: SQSQueueName,
  receiptHandle: string
): Promise<void> {
  const client = getSQSClient();
  const queueUrl = getQueueUrl(queue);
  
  await client.send(new DeleteMessageCommand({
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle,
  }));
}

/**
 * Manually delete multiple messages
 */
export async function deleteMessageBatch(
  queue: SQSQueueName,
  receiptHandles: string[]
): Promise<void> {
  if (receiptHandles.length === 0) return;
  
  const client = getSQSClient();
  const queueUrl = getQueueUrl(queue);
  
  // Delete in batches of 10
  for (let i = 0; i < receiptHandles.length; i += 10) {
    const batch = receiptHandles.slice(i, i + 10);
    
    await client.send(new DeleteMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: batch.map((handle, index) => ({
        Id: `${index}`,
        ReceiptHandle: handle,
      })),
    }));
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Destroy the SQS client
 */
export function destroySQSConsumerClient(): void {
  if (sqsClient) {
    sqsClient.destroy();
    sqsClient = null;
  }
}
