/**
 * AI Service - Centralized AI/OpenAI Integration Microservice
 * 
 * This service handles all AI-related functionality:
 * - OpenAI configuration and status checks
 * - Holiday generation
 * - Job Description generation
 * - Assessment question generation
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger';
import { aiRoutes } from './routes/ai.routes';

const app = express();
const PORT = process.env.PORT || 3012;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression() as unknown as express.RequestHandler);
app.use(express.json());
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ai-service',
    timestamp: new Date().toISOString(),
  });
});

// AI Routes
app.use('/ai', aiRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'AI Service started');
});

export default app;
