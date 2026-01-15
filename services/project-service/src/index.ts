/**
 * Project Service - Entry Point
 * 
 * Handles project management, client management, and time tracking
 */

import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { initializeTenantDbManager, shutdownTenantDbManager } from '@oms/tenant-db-manager';
import { initializeEventBus, shutdownEventBus } from '@oms/event-bus';

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function bootstrap() {
  try {
    logger.info('Starting Project Service...');
    
    // Initialize tenant database manager
    logger.info('Initializing tenant database manager...');
    await initializeTenantDbManager({
      masterDatabaseUrl: config.masterDatabaseUrl,
      maxConnections: 100,
      connectionTimeout: 30000,
    });
    
    // Initialize event bus
    logger.info('Initializing event bus...');
    await initializeEventBus({
      serviceName: 'project-service',
      region: config.aws.region,
      useLocalRedis: config.nodeEnv !== 'production',
      redisUrl: config.redis.url,
    });
    
    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`Project Service listening on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info({
        minEntryMinutes: config.timeTracking.minEntryMinutes,
        maxHoursPerDay: config.timeTracking.maxHoursPerDay,
        pastEditWindowDays: config.timeTracking.pastEditWindowDays,
        roundingInterval: config.timeTracking.roundingIntervalMinutes,
      }, 'Time tracking configuration:');
      logger.info({
        defaultHourlyRate: `$${(config.billing.defaultHourlyRateCents / 100).toFixed(2)}`,
        defaultCurrency: config.billing.defaultCurrency,
        defaultBillable: config.billing.defaultBillable,
      }, 'Billing configuration:');
    });
    
    // ========================================================================
    // GRACEFUL SHUTDOWN
    // ========================================================================
    
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async (err) => {
        if (err) {
          logger.error({ error: err.message }, 'Error closing server');
          process.exit(1);
        }
        
        try {
          // Shutdown event bus
          logger.info('Shutting down event bus...');
          await shutdownEventBus();
          
          // Shutdown tenant database connections
          logger.info('Shutting down database connections...');
          await shutdownTenantDbManager();
          
          logger.info('Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error({ error: (error as Error).message }, 'Error during shutdown');
          process.exit(1);
        }
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error({
        error: error.message,
        stack: error.stack,
      }, 'Uncaught exception');
      shutdown('uncaughtException');
    });
    
    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error({
        reason: String(reason),
        promise: String(promise),
      }, 'Unhandled rejection');
    });
    
  } catch (error) {
    logger.error({
      error: (error as Error).message,
      stack: (error as Error).stack,
    }, 'Failed to start Project Service');
    process.exit(1);
  }
}

// Start the service
bootstrap();
