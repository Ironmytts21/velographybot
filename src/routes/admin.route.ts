import { Router, Request, Response, NextFunction } from 'express';
import { runBotCycle } from '../services/runBotCycle.service';
import { env } from '../config/env';
import { createChildLogger } from '../core/logger';

const log = createChildLogger('adminRoute');
const router = Router();

// Middleware: verify admin secret
function requireAdminSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-admin-secret'];
  if (secret !== env.ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.use(requireAdminSecret);

// POST /admin/trigger — manually trigger a bot cycle
router.post('/trigger', async (_req: Request, res: Response) => {
  log.info('Manual bot cycle triggered via admin API');
  try {
    const result = await runBotCycle();
    res.json({ success: true, result });
  } catch (err) {
    log.error({ err }, 'Admin trigger failed');
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /admin/snapshots — recent market snapshots
router.get('/snapshots', async (req: Request, res: Response) => {
  const { prisma } = await import('../db/prisma');
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const snapshots = await prisma.marketSnapshot.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  res.json({ snapshots, count: snapshots.length });
});

// GET /admin/news — recent news items
router.get('/news', async (req: Request, res: Response) => {
  const { prisma } = await import('../db/prisma');
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const news = await prisma.newsItem.findMany({
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
  res.json({ news, count: news.length });
});

export default router;
