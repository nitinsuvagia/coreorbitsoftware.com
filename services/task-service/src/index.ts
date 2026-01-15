/**
 * Task Service - Entry Point
 * 
 * Microservice for task management including tasks, subtasks,
 * comments, and activity tracking.
 */

import { createServer } from 'http';
import { initializeEventBus, shutdownEventBus } from '@oms/event-bus';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';

const server = createServer(app);

async function start(): Promise<void> {
  try {
    // Initialize event bus
    await initializeEventBus({
      serviceName: 'task-service',
      region: config.aws.region,
      useLocalRedis: config.nodeEnv === 'development',
      redisUrl: config.redis.url,
    });
    
    logger.info('Event bus initialized');
    
    // Start HTTP server
    server.listen(config.port, () => {
      logger.info({
        environment: config.nodeEnv,
      }, `Task Service started on port ${config.port}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start Task Service');
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down Task Service...');
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Shutdown event bus
  await shutdownEventBus();
  
  // Wait for graceful shutdown
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  logger.info('Task Service shutdown complete');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
});

// Start the service
start();
