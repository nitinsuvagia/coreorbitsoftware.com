/**
 * Auth Service - Entry Point
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from monorepo root directory (3 levels up from src: src -> auth-service -> services -> root)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { disconnectMaster } from './utils/database';
import { resetTenantDbManager } from '@oms/tenant-db-manager';

const server = app.listen(config.port, config.host, () => {
  logger.info({
    host: config.host,
    port: config.port,
    env: config.nodeEnv,
  }, '🔐 Auth Service started');
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down Auth Service...');
  
  server.close(async () => {
    await disconnectMaster();
    await resetTenantDbManager();
    logger.info('Auth Service stopped');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default server;
