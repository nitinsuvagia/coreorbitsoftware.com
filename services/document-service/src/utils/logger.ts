/**
 * Logger utility for Document Service
 */

import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  name: 'document-service',
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport: config.nodeEnv === 'development' 
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
