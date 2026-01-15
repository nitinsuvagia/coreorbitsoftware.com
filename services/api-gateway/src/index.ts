/**
 * API Gateway - Entry Point
 */

// Load environment variables FIRST before any other imports
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env from project root
const rootDir = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.local'), override: true });

import app from './app';
import { config } from './config';
import { logger } from './utils/logger';

const server = app.listen(config.port, config.host, () => {
  logger.info({
    host: config.host,
    port: config.port,
    env: config.nodeEnv,
    mainDomain: config.mainDomain,
  }, '🚀 API Gateway started');
  
  logger.info({
    health: `http://${config.host}:${config.port}/health`,
    ready: `http://${config.host}:${config.port}/ready`,
  }, '📍 Endpoints:');
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down API Gateway...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default server;
