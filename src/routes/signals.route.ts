import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { createChildLogger } from '../core/logger';

const log = createChildLogger('signalsRoute');
const router = Router();

// GET /signals — list recent published signals
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const signals = await prisma.signal.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json({ signals, count: signals.length });
  } catch (err) {
    log.error({ err }, 'Signals route error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /signals/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const signal = await prisma.signal.findUnique({
      where: { id: req.params.id },
    });
    if (!signal) return res.status(404).json({ error: 'Signal not found' });
    res.json(signal);
  } catch (err) {
    log.error({ err }, 'Signal lookup error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
