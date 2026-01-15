/**
 * Report Service - Entry Point
 * 
 * Microservice for analytics, reporting, and data exports.
 */

import { createServer } from 'http';
import { initializeEventBus, shutdownEventBus, subscribeToEvent } from '@oms/event-bus';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import * as analyticsService from './services/analytics.service';

const server = createServer(app);

async function start(): Promise<void> {
  try {
    // Initialize event bus
    await initializeEventBus({
      serviceName: 'report-service',
      region: config.aws.region,
      useLocalRedis: config.nodeEnv === 'development',
      redisUrl: config.redis.url,
    });
    
    logger.info('Event bus initialized');
    
    // Subscribe to events that affect analytics
    await setupEventHandlers();
    
    // Start HTTP server
    server.listen(config.port, () => {
      logger.info({
        environment: config.nodeEnv,
      }, `Report Service started on port ${config.port}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start Report Service');
    process.exit(1);
  }
}

async function setupEventHandlers(): Promise<void> {
  // Clear cache on data changes
  const cacheInvalidationEvents = [
    'employee.created',
    'employee.updated',
    'employee.deleted',
    'attendance.recorded',
    'project.created',
    'project.updated',
    'task.created',
    'task.updated',
    'task.completed',
    'leave.approved',
  ];
  
  for (const eventType of cacheInvalidationEvents) {
    await subscribeToEvent(eventType, async (data) => {
      if (data.tenantSlug) {
        analyticsService.clearCache(data.tenantSlug);
        logger.debug({ eventType, tenantSlug: data.tenantSlug }, 'Cache cleared due to event');
      }
    });
  }
  
  logger.info('Event handlers registered');
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down Report Service...');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  await shutdownEventBus();
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  logger.info('Report Service shutdown complete');
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
