/**
 * Notification Service - Entry Point
 * 
 * Microservice for managing notifications across email, push, and in-app channels.
 * Handles notification preferences and event-driven delivery.
 * Now includes WebSocket support for real-time notifications.
 */

import { createServer } from 'http';
import { initializeEventBus, getEventBus, shutdownEventBus, SQS_QUEUES } from '@oms/event-bus';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { verifyEmailConnection } from './services/email.service';
import { handleNotificationEvent } from './services/dispatcher.service';
import { initializeWebSocket, shutdown as shutdownWebSocket, getStats } from './services/websocket.service';
import { preloadTemplates } from './services/template.service';
import { startEmailQueueProcessor } from './services/queue.service';

const server = createServer(app);

async function start(): Promise<void> {
  try {
    // Verify email connection
    await verifyEmailConnection();
    
    // Initialize event bus
    await initializeEventBus({
      serviceName: 'notification-service',
      region: config.aws.region,
      useLocalRedis: config.nodeEnv === 'development',
      redisUrl: config.redisUrl,
    });
    
    logger.info('Event bus initialized');

    // Get event bus instance for queue consumption
    const eventBus = getEventBus();
    
    // Subscribe to notification events
    eventBus.startQueueConsumer(
      SQS_QUEUES.NOTIFICATION_SEND,
      async (event) => {
        await handleNotificationEvent(event.type, event.payload, {
          tenantId: event.tenantId,
          tenantSlug: event.tenantSlug,
        });
      }
    );
    
    // Subscribe to task events for notifications
    eventBus.startQueueConsumer(
      SQS_QUEUES.TASK_CREATED,
      async (event) => {
        await handleNotificationEvent(event.type, event.payload, {
          tenantId: event.tenantId,
          tenantSlug: event.tenantSlug,
        });
      }
    );
    
    eventBus.startQueueConsumer(
      SQS_QUEUES.TASK_ASSIGNED,
      async (event) => {
        await handleNotificationEvent(event.type, event.payload, {
          tenantId: event.tenantId,
          tenantSlug: event.tenantSlug,
        });
      }
    );
    
    // Subscribe to leave events
    eventBus.startQueueConsumer(
      SQS_QUEUES.ATTENDANCE_LEAVE_APPROVED,
      async (event) => {
        await handleNotificationEvent('leave.approved', event.payload, {
          tenantId: event.tenantId,
          tenantSlug: event.tenantSlug,
        });
      }
    );
    
    // Subscribe to employee events  
    eventBus.startQueueConsumer(
      SQS_QUEUES.EMPLOYEE_ONBOARDED,
      async (event) => {
        await handleNotificationEvent('employee.created', event.payload, {
          tenantId: event.tenantId,
          tenantSlug: event.tenantSlug,
        });
      }
    );
    
    logger.info('Subscribed to notification queues');
    
    // Initialize WebSocket server
    initializeWebSocket(server);
    logger.info('WebSocket server initialized');
    
    // Start HTTP server
    server.listen(config.port, async () => {
      const wsStats = await getStats();
      logger.info({
        environment: config.nodeEnv,
        emailProvider: config.email.provider,
        websocket: 'enabled',
        wsPath: '/ws',
      }, `Notification Service started on port ${config.port}`);
      
      // Preload email templates
      try {
        preloadTemplates('platform');
        preloadTemplates('tenant');
        logger.info('Email templates preloaded');
      } catch (error) {
        logger.warn({ error }, 'Failed to preload templates');
      }
      
      // Start email queue processor
      try {
        startEmailQueueProcessor(5000); // Process every 5 seconds
        logger.info('Email queue processor started');
      } catch (error) {
        logger.warn({ error }, 'Failed to start queue processor');
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start Notification Service');
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down Notification Service...');
  
  // Shutdown WebSocket server first
  await shutdownWebSocket();
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Shutdown event bus
  await shutdownEventBus();
  
  // Wait for graceful shutdown
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  logger.info('Notification Service shutdown complete');
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
