/**
 * Email Queue Service
 * Redis-based queue for reliable email delivery with retry logic
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { SendEmailInput, sendEmail as sendEmailDirect } from './email.service';
import { config } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface EmailJob {
  id: string;
  emailInput: SendEmailInput;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledFor?: Date;
  lastError?: string;
}

export interface EmailJobResult {
  jobId: string;
  success: boolean;
  sentAt?: Date;
  error?: string;
  attempts: number;
}

// ============================================================================
// REDIS CLIENT
// ============================================================================

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    
    redisClient.on('error', (error) => {
      logger.error({ error }, 'Redis connection error');
    });
    
    redisClient.on('connect', () => {
      logger.info('Redis connected for email queue');
    });
  }
  
  return redisClient;
}

// ============================================================================
// QUEUE OPERATIONS
// ============================================================================

const QUEUE_KEY = 'email:queue';
const PROCESSING_KEY = 'email:processing';
const FAILED_KEY = 'email:failed';
const COMPLETED_KEY = 'email:completed';

/**
 * Add email to queue
 */
export async function queueEmail(
  emailInput: SendEmailInput,
  options: {
    maxAttempts?: number;
    scheduledFor?: Date;
  } = {}
): Promise<string> {
  const redis = getRedisClient();
  await redis.connect();
  
  const jobId = `email:${Date.now()}:${Math.random().toString(36).substring(7)}`;
  
  const job: EmailJob = {
    id: jobId,
    emailInput,
    attempts: 0,
    maxAttempts: options.maxAttempts || config.email.retryAttempts,
    createdAt: new Date(),
    scheduledFor: options.scheduledFor,
  };
  
  // Add to queue
  const jobData = JSON.stringify(job);
  
  if (options.scheduledFor && options.scheduledFor > new Date()) {
    // Schedule for later
    const score = options.scheduledFor.getTime();
    await redis.zadd('email:scheduled', score, jobData);
    logger.debug({ jobId, scheduledFor: options.scheduledFor }, 'Email scheduled');
  } else {
    // Add to immediate queue
    await redis.lpush(QUEUE_KEY, jobData);
    logger.debug({ jobId }, 'Email queued');
  }
  
  return jobId;
}

/**
 * Process email queue
 */
export async function processEmailQueue(): Promise<void> {
  const redis = getRedisClient();
  await redis.connect();
  
  try {
    // Move scheduled emails to queue if their time has come
    const now = Date.now();
    const scheduledJobs = await redis.zrangebyscore('email:scheduled', 0, now);
    
    for (const jobData of scheduledJobs) {
      await redis.lpush(QUEUE_KEY, jobData);
      await redis.zrem('email:scheduled', jobData);
    }
    
    // Process queue
    while (true) {
      const jobData = await redis.rpoplpush(QUEUE_KEY, PROCESSING_KEY);
      
      if (!jobData) {
        break; // Queue is empty
      }
      
      const job: EmailJob = JSON.parse(jobData);
      
      try {
        // Send email
        const results = await sendEmailDirect(job.emailInput);
        
        const allSuccessful = results.every(r => r.success);
        
        if (allSuccessful) {
          // Success - move to completed
          const result: EmailJobResult = {
            jobId: job.id,
            success: true,
            sentAt: new Date(),
            attempts: job.attempts + 1,
          };
          
          await redis.setex(
            `${COMPLETED_KEY}:${job.id}`,
            86400, // Keep for 24 hours
            JSON.stringify(result)
          );
          
          await redis.lrem(PROCESSING_KEY, 1, jobData);
          
          logger.info({ jobId: job.id }, 'Email sent successfully');
        } else {
          // Partial or complete failure
          throw new Error(results.find(r => !r.success)?.error || 'Email sending failed');
        }
      } catch (error: any) {
        job.attempts += 1;
        job.lastError = error.message;
        
        if (job.attempts >= job.maxAttempts) {
          // Max attempts reached - move to failed
          const result: EmailJobResult = {
            jobId: job.id,
            success: false,
            error: job.lastError,
            attempts: job.attempts,
          };
          
          await redis.setex(
            `${FAILED_KEY}:${job.id}`,
            86400 * 7, // Keep for 7 days
            JSON.stringify(result)
          );
          
          await redis.lrem(PROCESSING_KEY, 1, jobData);
          
          logger.error({ jobId: job.id, attempts: job.attempts, error: job.lastError }, 'Email failed after max attempts');
        } else {
          // Retry - move back to queue with delay
          const retryDelay = config.email.retryDelayMs * Math.pow(2, job.attempts - 1); // Exponential backoff
          
          await redis.lrem(PROCESSING_KEY, 1, jobData);
          
          setTimeout(async () => {
            await redis.lpush(QUEUE_KEY, JSON.stringify(job));
            logger.warn({ jobId: job.id, attempts: job.attempts, retryDelay }, 'Email queued for retry');
          }, retryDelay);
        }
      }
    }
  } catch (error) {
    logger.error({ error }, 'Error processing email queue');
  }
}

/**
 * Get job status
 */
export async function getEmailJobStatus(jobId: string): Promise<EmailJobResult | null> {
  const redis = getRedisClient();
  await redis.connect();
  
  // Check completed
  const completed = await redis.get(`${COMPLETED_KEY}:${jobId}`);
  if (completed) {
    return JSON.parse(completed);
  }
  
  // Check failed
  const failed = await redis.get(`${FAILED_KEY}:${jobId}`);
  if (failed) {
    return JSON.parse(failed);
  }
  
  // Check if still in queue or processing
  const queued = await redis.lrange(QUEUE_KEY, 0, -1);
  const processing = await redis.lrange(PROCESSING_KEY, 0, -1);
  
  for (const jobData of [...queued, ...processing]) {
    const job: EmailJob = JSON.parse(jobData);
    if (job.id === jobId) {
      return {
        jobId: job.id,
        success: false,
        attempts: job.attempts,
        error: 'Pending',
      };
    }
  }
  
  return null; // Job not found
}

/**
 * Get queue stats
 */
export async function getQueueStats(): Promise<{
  queued: number;
  processing: number;
  scheduled: number;
  failed: number;
}> {
  const redis = getRedisClient();
  await redis.connect();
  
  const [queued, processing, scheduled] = await Promise.all([
    redis.llen(QUEUE_KEY),
    redis.llen(PROCESSING_KEY),
    redis.zcard('email:scheduled'),
  ]);
  
  // Count failed (approximate - keys with TTL)
  const failedKeys = await redis.keys(`${FAILED_KEY}:*`);
  
  return {
    queued,
    processing,
    scheduled,
    failed: failedKeys.length,
  };
}

/**
 * Start queue processor (should be called on service startup)
 */
export function startEmailQueueProcessor(intervalMs: number = 5000): NodeJS.Timeout {
  logger.info({ intervalMs }, 'Starting email queue processor');
  
  // Process immediately
  processEmailQueue().catch(error => {
    logger.error({ error }, 'Initial queue processing failed');
  });
  
  // Then process at intervals
  return setInterval(() => {
    processEmailQueue().catch(error => {
      logger.error({ error }, 'Queue processing failed');
    });
  }, intervalMs);
}

/**
 * Clear all queues (use with caution!)
 */
export async function clearAllQueues(): Promise<void> {
  const redis = getRedisClient();
  await redis.connect();
  
  await Promise.all([
    redis.del(QUEUE_KEY),
    redis.del(PROCESSING_KEY),
    redis.del('email:scheduled'),
  ]);
  
  logger.warn('All email queues cleared');
}
