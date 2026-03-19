import { createApp } from './app';
import { env } from './config/env';
import { logger } from './core/logger';
import { connectDB, disconnectDB } from './db/prisma';
import { registerTask, stopAllTasks } from './core/scheduler';
import { launchBot, stopBot } from './bots/telegram.bot';
import { runBotCycle } from './services/runBotCycle.service';
import { updateMarketSnapshots } from './services/marketSnapshot.service';
import { updateNewsIntelligence } from './services/newsIntelligence.service';
import { runHealthCheck } from './services/health.service';

async function bootstrap() {
  logger.info('\uD83D\uDE80 Starting VelographyBot...');

  // 1. Connect to database
  await connectDB();

  // 2. Start Express server
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, '\uD83C\uDF10 HTTP server listening');
  });

  // 3. Launch Telegram bot
  await launchBot();

  // 4. Register cron jobs
  registerTask({
    name: 'market-snapshot',
    expression: env.SNAPSHOT_CRON,
    handler: async () => { await updateMarketSnapshots(); },
    runOnStart: true,
  });

  registerTask({
    name: 'news-intelligence',
    expression: env.NEWS_CRON,
    handler: async () => { await updateNewsIntelligence(); },
    runOnStart: true,
  });

  registerTask({
    name: 'signal-engine',
    expression: env.SIGNAL_CRON,
    handler: async () => { await runBotCycle(); },
    runOnStart: false,
  });

  registerTask({
    name: 'health-check',
    expression: env.HEALTH_CRON,
    handler: async () => { await runHealthCheck(); },
    runOnStart: false,
  });

  logger.info('\u2705 VelographyBot fully initialized');

  // ─── Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully...');
    stopAllTasks();
    stopBot();
    server.close(async () => {
      await disconnectDB();
      logger.info('Shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
