/**
 * Redis Adapter - Local development event bus using Redis pub/sub
 * 
 * This adapter mimics AWS SQS/SNS behavior for local development
 * without requiring AWS credentials or LocalStack.
 */

import Redis, { RedisOptions } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

import { config, SQSQueueName, SNSTopicName } from '../config';
import { BaseEvent, EventHandler } from '../types';

const logger = pino({ name: 'redis-adapter' });

// ============================================================================
// REDIS CLIENTS
// ============================================================================

let publisher: Redis | null = null;
let subscriber: Redis | null = null;
let queueClient: Redis | null = null;

function getRedisOptions(): RedisOptions {
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    keyPrefix: config.redis.keyPrefix,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 10) return null;
      return Math.min(times * 100, 3000);
    },
  };
}

async function getPublisher(): Promise<Redis> {
  if (!publisher) {
    publisher = new Redis(getRedisOptions());
    await publisher.connect();
    logger.debug('Redis publisher connected');
  }
  return publisher;
}

async function getSubscriber(): Promise<Redis> {
  if (!subscriber) {
    subscriber = new Redis(getRedisOptions());
    await subscriber.connect();
    logger.debug('Redis subscriber connected');
  }
  return subscriber;
}

async function getQueueClient(): Promise<Redis> {
  if (!queueClient) {
    queueClient = new Redis(getRedisOptions());
    await queueClient.connect();
    logger.debug('Redis queue client connected');
  }
  return queueClient;
}

// ============================================================================
// QUEUE OPERATIONS (Simulating SQS)
// ============================================================================

/**
 * Send a message to a Redis list (simulating SQS queue)
 */
export async function redisSendMessage<TPayload>(
  queue: SQSQueueName,
  event: BaseEvent<TPayload>,
  options?: { delaySeconds?: number }
): Promise<string> {
  const client = await getQueueClient();
  const messageId = uuidv4();
  
  const envelope = {
    messageId,
    event,
    timestamp: Date.now(),
    receiveCount: 0,
  };
  
  if (options?.delaySeconds) {
    // Use sorted set for delayed messages
    const delayedKey = `delayed:${queue}`;
    const executeAt = Date.now() + (options.delaySeconds * 1000);
    await client.zadd(delayedKey, executeAt, JSON.stringify(envelope));
  } else {
    // Push to list for immediate processing
    await client.lpush(`queue:${queue}`, JSON.stringify(envelope));
  }
  
  logger.debug({
    queue,
    messageId,
    eventType: event.type,
    delayed: !!options?.delaySeconds,
  }, 'Message sent to Redis queue');
  
  return messageId;
}

/**
 * Receive messages from a Redis list (simulating SQS receive)
 */
export async function redisReceiveMessages(
  queue: SQSQueueName,
  options?: {
    maxMessages?: number;
    waitTimeSeconds?: number;
  }
): Promise<Array<{
  messageId: string;
  event: BaseEvent;
  receiptHandle: string;
}>> {
  const client = await getQueueClient();
  const maxMessages = options?.maxMessages || 10;
  const waitTime = (options?.waitTimeSeconds || 0) * 1000;
  
  // First, move any delayed messages that are ready
  await moveDelayedMessages(queue);
  
  const messages: Array<{
    messageId: string;
    event: BaseEvent;
    receiptHandle: string;
  }> = [];
  
  const startTime = Date.now();
  
  while (messages.length < maxMessages) {
    // Try to pop a message
    let raw: string | null;
    
    if (waitTime > 0 && messages.length === 0) {
      // Blocking pop for long polling simulation
      const remaining = waitTime - (Date.now() - startTime);
      if (remaining > 0) {
        const result = await client.brpop(`queue:${queue}`, Math.ceil(remaining / 1000));
        raw = result ? result[1] : null;
      } else {
        break;
      }
    } else {
      raw = await client.rpop(`queue:${queue}`);
    }
    
    if (!raw) break;
    
    try {
      const envelope = JSON.parse(raw);
      const receiptHandle = `${envelope.messageId}:${Date.now()}`;
      
      // Move to processing set (simulating visibility timeout)
      await client.hset(`processing:${queue}`, receiptHandle, raw);
      
      messages.push({
        messageId: envelope.messageId,
        event: envelope.event,
        receiptHandle,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to parse message');
    }
  }
  
  return messages;
}

/**
 * Move delayed messages that are ready to the main queue
 */
async function moveDelayedMessages(queue: SQSQueueName): Promise<void> {
  const client = await getQueueClient();
  const delayedKey = `delayed:${queue}`;
  const now = Date.now();
  
  // Get messages ready to be processed
  const ready = await client.zrangebyscore(delayedKey, 0, now);
  
  if (ready.length > 0) {
    // Move to main queue
    for (const msg of ready) {
      await client.lpush(`queue:${queue}`, msg);
    }
    // Remove from delayed set
    await client.zremrangebyscore(delayedKey, 0, now);
  }
}

/**
 * Delete a message (acknowledge processing)
 */
export async function redisDeleteMessage(
  queue: SQSQueueName,
  receiptHandle: string
): Promise<void> {
  const client = await getQueueClient();
  await client.hdel(`processing:${queue}`, receiptHandle);
  
  logger.debug({ queue, receiptHandle }, 'Message deleted from Redis queue');
}

/**
 * Return a message to the queue (simulating visibility timeout expiry)
 */
export async function redisReturnMessage(
  queue: SQSQueueName,
  receiptHandle: string
): Promise<void> {
  const client = await getQueueClient();
  const raw = await client.hget(`processing:${queue}`, receiptHandle);
  
  if (raw) {
    const envelope = JSON.parse(raw);
    envelope.receiveCount++;
    
    // Check if should go to DLQ
    if (envelope.receiveCount >= config.aws.sqs.maxReceiveCount) {
      await client.lpush(`queue:${queue}-dlq`, JSON.stringify(envelope));
      logger.warn({ queue, messageId: envelope.messageId }, 'Message moved to DLQ');
    } else {
      await client.lpush(`queue:${queue}`, JSON.stringify(envelope));
    }
    
    await client.hdel(`processing:${queue}`, receiptHandle);
  }
}

// ============================================================================
// PUB/SUB OPERATIONS (Simulating SNS)
// ============================================================================

const topicSubscriptions = new Map<string, Map<string, EventHandler>>();

/**
 * Publish a message to a topic (simulating SNS)
 */
export async function redisPublishToTopic<TPayload>(
  topic: SNSTopicName,
  event: BaseEvent<TPayload>
): Promise<string> {
  const pub = await getPublisher();
  const messageId = uuidv4();
  
  const envelope = {
    messageId,
    topic,
    event,
    timestamp: Date.now(),
  };
  
  await pub.publish(`topic:${topic}`, JSON.stringify(envelope));
  
  logger.debug({
    topic,
    messageId,
    eventType: event.type,
  }, 'Message published to Redis topic');
  
  return messageId;
}

/**
 * Subscribe to a topic (simulating SNS subscription)
 */
export async function redisSubscribeToTopic(
  topic: SNSTopicName,
  handler: EventHandler
): Promise<string> {
  const sub = await getSubscriber();
  const subscriptionId = uuidv4();
  
  // Store handler
  if (!topicSubscriptions.has(topic)) {
    topicSubscriptions.set(topic, new Map());
    
    // Subscribe to Redis channel
    await sub.subscribe(`topic:${topic}`);
  }
  
  topicSubscriptions.get(topic)!.set(subscriptionId, handler);
  
  // Set up message handler if not already set
  sub.on('message', async (channel, message) => {
    const topicName = channel.replace('topic:', '') as SNSTopicName;
    const handlers = topicSubscriptions.get(topicName);
    
    if (handlers) {
      try {
        const envelope = JSON.parse(message);
        
        for (const [, h] of handlers) {
          try {
            await h(envelope.event);
          } catch (error) {
            logger.error({
              topic: topicName,
              error: (error as Error).message,
            }, 'Handler error');
          }
        }
      } catch (error) {
        logger.error({ error }, 'Failed to parse topic message');
      }
    }
  });
  
  logger.debug({ topic, subscriptionId }, 'Subscribed to Redis topic');
  
  return subscriptionId;
}

/**
 * Unsubscribe from a topic
 */
export async function redisUnsubscribeFromTopic(
  topic: SNSTopicName,
  subscriptionId: string
): Promise<void> {
  const handlers = topicSubscriptions.get(topic);
  
  if (handlers) {
    handlers.delete(subscriptionId);
    
    if (handlers.size === 0) {
      const sub = await getSubscriber();
      await sub.unsubscribe(`topic:${topic}`);
      topicSubscriptions.delete(topic);
    }
  }
  
  logger.debug({ topic, subscriptionId }, 'Unsubscribed from Redis topic');
}

// ============================================================================
// CONSUMER (Simulating SQS Consumer)
// ============================================================================

interface RedisConsumerState {
  queue: SQSQueueName;
  handler: EventHandler;
  isRunning: boolean;
  pollingInterval: NodeJS.Timeout | null;
}

const redisConsumers = new Map<string, RedisConsumerState>();

/**
 * Start consuming from a Redis queue
 */
export function redisStartConsumer(
  queue: SQSQueueName,
  handler: EventHandler,
  options?: { pollingIntervalMs?: number; batchSize?: number }
): string {
  const consumerId = `${queue}-${Date.now()}`;
  const pollingIntervalMs = options?.pollingIntervalMs || config.consumer.pollingIntervalMs;
  const batchSize = options?.batchSize || config.consumer.batchSize;
  
  const state: RedisConsumerState = {
    queue,
    handler,
    isRunning: true,
    pollingInterval: null,
  };
  
  // Start polling
  const poll = async () => {
    if (!state.isRunning) return;
    
    try {
      const messages = await redisReceiveMessages(queue, {
        maxMessages: batchSize,
        waitTimeSeconds: 0,
      });
      
      for (const msg of messages) {
        try {
          await handler(msg.event);
          await redisDeleteMessage(queue, msg.receiptHandle);
        } catch (error) {
          logger.error({
            queue,
            messageId: msg.messageId,
            error: (error as Error).message,
          }, 'Handler error');
          await redisReturnMessage(queue, msg.receiptHandle);
        }
      }
    } catch (error) {
      logger.error({
        queue,
        error: (error as Error).message,
      }, 'Polling error');
    }
  };
  
  state.pollingInterval = setInterval(poll, pollingIntervalMs);
  redisConsumers.set(consumerId, state);
  
  // Initial poll
  poll();
  
  logger.info({ consumerId, queue }, 'Redis consumer started');
  
  return consumerId;
}

/**
 * Stop a Redis consumer
 */
export function redisStopConsumer(consumerId: string): void {
  const state = redisConsumers.get(consumerId);
  
  if (state) {
    state.isRunning = false;
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval);
    }
    redisConsumers.delete(consumerId);
    logger.info({ consumerId }, 'Redis consumer stopped');
  }
}

/**
 * Stop all Redis consumers
 */
export function redisStopAllConsumers(): void {
  for (const [id] of redisConsumers) {
    redisStopConsumer(id);
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Disconnect all Redis clients
 */
export async function redisDisconnect(): Promise<void> {
  redisStopAllConsumers();
  
  if (publisher) {
    await publisher.quit();
    publisher = null;
  }
  
  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
  }
  
  if (queueClient) {
    await queueClient.quit();
    queueClient = null;
  }
  
  topicSubscriptions.clear();
  
  logger.info({}, 'Redis clients disconnected');
}
