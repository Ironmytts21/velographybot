import { prisma } from '../db/prisma';
import { createChildLogger } from '../core/logger';
import type { HealthCheckResult, HealthStatus } from '../types';
import { nowISO } from '../utils/time';

const log = createChildLogger('health');

async function checkDatabase(): Promise<HealthStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'OK';
  } catch {
    return 'DOWN';
  }
}

async function checkTelegram(): Promise<HealthStatus> {
  try {
    const { bot } = await import('../bots/telegram.bot');
    const info = await bot.telegram.getMe();
    return info.id ? 'OK' : 'DEGRADED';
  } catch {
    return 'DOWN';
  }
}

export async function runHealthCheck(): Promise<HealthCheckResult> {
  const start = Date.now();

  const [dbStatus, telegramStatus] = await Promise.all([
    checkDatabase(),
    checkTelegram(),
  ]);

  const latencyMs = Date.now() - start;

  const services: Record<string, HealthStatus> = {
    database: dbStatus,
    telegram: telegramStatus,
  };

  const allStatuses = Object.values(services);
  let overallStatus: HealthStatus = 'OK';
  if (allStatuses.includes('DOWN')) overallStatus = 'DOWN';
  else if (allStatuses.includes('DEGRADED')) overallStatus = 'DEGRADED';

  const result: HealthCheckResult = {
    status: overallStatus,
    latencyMs,
    services,
    timestamp: nowISO(),
  };

  await prisma.healthLog.create({
    data: {
      status: overallStatus,
      latencyMs,
      details: services,
    },
  });

  log.info({ status: overallStatus, latencyMs }, 'Health check complete');
  return result;
}
