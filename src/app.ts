import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createChildLogger } from './core/logger';
import healthRoute from './routes/health.route';
import signalsRoute from './routes/signals.route';
import adminRoute from './routes/admin.route';

const log = createChildLogger('app');

export function createApp() {
  const app = express();

  // ─── Security Middleware
  app.use(helmet());
  app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Request logging
  app.use((req, _res, next) => {
    log.debug({ method: req.method, path: req.path }, 'Incoming request');
    next();
  });

  // ─── Routes
  app.use('/health', healthRoute);
  app.use('/signals', signalsRoute);
  app.use('/admin', adminRoute);

  // ─── Root
  app.get('/', (_req, res) => {
    res.json({
      service: 'VelographyBot',
      version: '1.0.0',
      status: 'running',
    });
  });

  // ─── 404 Handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // ─── Error Handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    log.error({ err }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
