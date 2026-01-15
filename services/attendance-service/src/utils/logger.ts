import pino from 'pino';

// Create logger config based on environment
const loggerConfig: pino.LoggerOptions = {
  name: 'attendance-service',
  level: process.env.LOG_LEVEL || 'info',
};

// Only add transport in development
if (process.env.NODE_ENV === 'development') {
  loggerConfig.transport = { target: 'pino-pretty', options: { colorize: true } };
}

export const logger = pino(loggerConfig);
