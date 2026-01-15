/**
 * Employee Service - Entry Point
 */

import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { getTenantDbManager, resetTenantDbManager } from '@oms/tenant-db-manager';
import { getEventBus } from '@oms/event-bus';

// Initialize tenant database manager
const initTenantDb = async () => {
  try {
    // getTenantDbManager uses defaultConfig which reads from environment variables:
    // - MASTER_DATABASE_URL / DATABASE_URL
    // - TENANT_DB_HOST, TENANT_DB_PORT, TENANT_DB_USER, TENANT_DB_PASSWORD, TENANT_DB_PREFIX
    const manager = getTenantDbManager();
    logger.info('Tenant database manager initialized');
    return manager;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize tenant database manager');
    throw error;
  }
};

const startServer = async () => {
  // Initialize tenant DB first
  await initTenantDb();
  
  const server = app.listen(config.port, config.host, () => {
    logger.info({
      host: config.host,
      port: config.port,
      env: config.nodeEnv,
    }, `👥 Employee Service started`);
  });

  // Initialize event bus
  const eventBus = getEventBus('employee-service');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down Employee Service...');
    
    server.close(async () => {
      await eventBus.shutdown();
      await resetTenantDbManager();
      logger.info('Employee Service stopped');
      process.exit(0);
    });
    
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return server;
};

startServer().catch((error) => {
  logger.error({ error }, 'Failed to start Employee Service');
  process.exit(1);
});
