/**
 * Billing Service - Entry Point
 * 
 * Microservice for subscription management, invoicing, and payments.
 */

import { createServer } from 'http';
import { initializeEventBus, shutdownEventBus, subscribeToEvent } from '@oms/event-bus';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import * as subscriptionService from './services/subscription.service';
import * as usageService from './services/usage.service';

const server = createServer(app);

async function start(): Promise<void> {
  try {
    // Initialize event bus
    await initializeEventBus({
      serviceName: 'billing-service',
      region: config.aws.region,
      useLocalRedis: config.nodeEnv === 'development',
      redisUrl: config.redis.url,
    });
    
    logger.info('Event bus initialized');
    
    // Subscribe to events
    await setupEventHandlers();
    
    // Start scheduled tasks
    startScheduledTasks();
    
    // Start HTTP server
    server.listen(config.port, () => {
      logger.info({
        environment: config.nodeEnv,
      }, `Billing Service started on port ${config.port}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start Billing Service');
    process.exit(1);
  }
}

async function setupEventHandlers(): Promise<void> {
  // Handle employee changes for usage tracking
  await subscribeToEvent('employee.created', async (data) => {
    if (data.tenantId && data.tenantSlug) {
      await usageService.updateEmployeeUsage(data.tenantId, data.tenantSlug);
    }
  });
  
  await subscribeToEvent('employee.deleted', async (data) => {
    if (data.tenantId && data.tenantSlug) {
      await usageService.updateEmployeeUsage(data.tenantId, data.tenantSlug);
    }
  });
  
  // Handle storage usage updates
  await subscribeToEvent('storage.usage_updated', async (data) => {
    if (data.tenantId && data.storageBytes) {
      await usageService.updateStorageUsage(data.tenantId, data.storageBytes);
    }
  });
  
  // Handle API usage tracking
  await subscribeToEvent('api.request', async (data) => {
    if (data.tenantId) {
      await usageService.recordApiCall(data.tenantId);
    }
  });
  
  logger.info('Event handlers registered');
}

function startScheduledTasks(): void {
  // Check for expired subscriptions every hour
  setInterval(async () => {
    try {
      const count = await subscriptionService.handleExpiredSubscriptions();
      if (count > 0) {
        logger.info({ count }, 'Processed expired subscriptions');
      }
    } catch (error) {
      logger.error({ error }, 'Error processing expired subscriptions');
    }
  }, 60 * 60 * 1000); // 1 hour
  
  // Check for ending trials every hour
  setInterval(async () => {
    try {
      const count = await subscriptionService.handleTrialsEnding();
      if (count > 0) {
        logger.info({ count }, 'Processed ending trials');
      }
    } catch (error) {
      logger.error({ error }, 'Error processing ending trials');
    }
  }, 60 * 60 * 1000); // 1 hour
  
  logger.info('Scheduled tasks started');
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down Billing Service...');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  await shutdownEventBus();
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  logger.info('Billing Service shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
});

start();
