/**
 * Logger utility for Notification Service
 */

import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  name: 'notification-service',
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport: config.nodeEnv === 'development' 
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
