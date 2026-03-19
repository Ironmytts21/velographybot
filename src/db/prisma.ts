import { PrismaClient } from '@prisma/client';
import { createChildLogger } from '../core/logger';

const log = createChildLogger('prisma');

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

  client.$on('error', (e) => log.error({ ...e }, 'Prisma error'));
  client.$on('warn', (e) => log.warn({ ...e }, 'Prisma warning'));

  return client;
}

// Prevent multiple instances in dev (hot-reload)
export const prisma: PrismaClient =
  global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export async function connectDB(): Promise<void> {
  await prisma.$connect();
  log.info('Database connected');
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  log.info('Database disconnected');
}
