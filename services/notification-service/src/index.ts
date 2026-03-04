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
import { handleEvent } from './services/event-handlers';
import { initializeWebSocket, shutdown as shutdownWebSocket, getStats } from './services/websocket.service';
import { preloadTemplates } from './services/template.service';
import { startEmailQueueProcessor } from './services/queue.service';
import { initializeScheduledJobs, stopScheduledJobs } from './services/scheduled-jobs.service';

const server = createServer(app);

/**
 * Subscribe to Redis topics for real-time event processing
 */
function subscribeToEvents(eventBus: any): void {
  // Generic notification event handler
  const createEventHandler = (eventType: string) => async (event: any) => {
    await handleEvent(eventType, event.payload, {
      tenantId: event.tenantId,
      tenantSlug: event.tenantSlug,
    });
  };

  // ============================================================================
  // TASK EVENTS
  // ============================================================================
  eventBus.subscribeToTopic('task-created', createEventHandler('task.assigned'));
  eventBus.subscribeToTopic('task-assigned', createEventHandler('task.assigned'));
  eventBus.subscribeToTopic('task-mentioned', createEventHandler('task.mentioned'));
  eventBus.subscribeToTopic('task-commented', createEventHandler('task.commented'));
  
  // ============================================================================
  // LEAVE EVENTS
  // ============================================================================
  eventBus.subscribeToTopic('leave-requested', createEventHandler('leave.requested'));
  eventBus.subscribeToTopic('leave-approved', createEventHandler('leave.approved'));
  eventBus.subscribeToTopic('leave-rejected', createEventHandler('leave.rejected'));
  
  // ============================================================================
  // EMPLOYEE EVENTS
  // ============================================================================
  eventBus.subscribeToTopic('employee-created', createEventHandler('employee.onboarded'));
  eventBus.subscribeToTopic('employee-onboarded', createEventHandler('employee.onboarded'));
  
  // ============================================================================
  // RECRUITMENT EVENTS
  // ============================================================================
  eventBus.subscribeToTopic('job-description-created', createEventHandler('job.created'));
  eventBus.subscribeToTopic('job-description-published', createEventHandler('job.published'));
  eventBus.subscribeToTopic('candidate-applied', createEventHandler('candidate.applied'));
  eventBus.subscribeToTopic('candidate-shortlisted', createEventHandler('candidate.shortlisted'));
  eventBus.subscribeToTopic('candidate-hired', createEventHandler('candidate.hired'));
  
  // ============================================================================
  // INTERVIEW EVENTS
  // ============================================================================
  eventBus.subscribeToTopic('interview-scheduled', createEventHandler('interview.scheduled'));
  eventBus.subscribeToTopic('interview-rescheduled', createEventHandler('interview.rescheduled'));
  eventBus.subscribeToTopic('interview-cancelled', createEventHandler('interview.cancelled'));
  
  // ============================================================================
  // ASSESSMENT EVENTS
  // ============================================================================
  eventBus.subscribeToTopic('assessment-assigned', createEventHandler('assessment.assigned'));
  eventBus.subscribeToTopic('assessment-submitted', createEventHandler('assessment.submitted'));
  eventBus.subscribeToTopic('assessment-evaluated', createEventHandler('assessment.evaluated'));
  
  // ============================================================================
  // HOLIDAY EVENTS
  // ============================================================================
  eventBus.subscribeToTopic('holiday-created', createEventHandler('holiday.created'));
  
  // ============================================================================
  // DOCUMENT EVENTS
  // ============================================================================
  eventBus.subscribeToTopic('document-expiring', createEventHandler('document.expiring'));
  eventBus.subscribeToTopic('document-expired', createEventHandler('document.expired'));
  
  // ============================================================================
  // BILLING EVENTS
  // ============================================================================
  eventBus.subscribeToTopic('billing-invoice-created', createEventHandler('billing.invoice_created'));
  eventBus.subscribeToTopic('billing-payment-received', createEventHandler('billing.payment_received'));
  eventBus.subscribeToTopic('billing-payment-failed', createEventHandler('billing.payment_failed'));
  eventBus.subscribeToTopic('billing-subscription-changed', createEventHandler('billing.subscription_changed'));
  eventBus.subscribeToTopic('billing-subscription-activated', createEventHandler('billing.subscription_activated'));
  eventBus.subscribeToTopic('billing-subscription-canceled', createEventHandler('billing.subscription_canceled'));
  
  // ============================================================================
  // PROJECT EVENTS
  // ============================================================================
  eventBus.subscribeToTopic('project-member-added', createEventHandler('project.member_added'));
  
  logger.info('Subscribed to all notification event topics');
}

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

    // Get event bus instance and subscribe to events
    const eventBus = getEventBus();
    subscribeToEvents(eventBus);
    
    // Initialize scheduled jobs for recurring notifications
    initializeScheduledJobs();
    logger.info('Scheduled notification jobs initialized');
    
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
  
  // Stop scheduled jobs
  stopScheduledJobs();
  
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
