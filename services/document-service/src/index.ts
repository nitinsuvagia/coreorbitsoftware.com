/**
 * Document Service - Entry Point
 * 
 * Microservice for file and document management with S3 storage.
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
      serviceName: 'document-service',
      region: config.aws.region,
      useLocalRedis: config.nodeEnv === 'development',
      redisUrl: config.redisUrl,
    });
    
    logger.info('Event bus initialized');
    
    // Start HTTP server
    server.listen(config.port, () => {
      logger.info({
        environment: config.nodeEnv,
        s3Bucket: config.aws.s3Bucket,
      }, `Document Service started on port ${config.port}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start Document Service');
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down Document Service...');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  await shutdownEventBus();
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  logger.info('Document Service shutdown complete');
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
