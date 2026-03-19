import { Router, Request, Response } from 'express';
import { runHealthCheck } from '../services/health.service';
import { createChildLogger } from '../core/logger';

const log = createChildLogger('healthRoute');
const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const health = await runHealthCheck();
    const statusCode = health.status === 'OK' ? 200 : health.status === 'DEGRADED' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (err) {
    log.error({ err }, 'Health check route error');
    res.status(503).json({ status: 'DOWN', timestamp: new Date().toISOString() });
  }
});

export default router;
