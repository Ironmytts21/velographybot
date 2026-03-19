import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { createChildLogger } from '../core/logger';

const log = createChildLogger('telegram');

export const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

// ─── Command Handlers ───────────────────────────────────────────────

bot.start((ctx) => {
  ctx.reply(
    '\uD83D\uDC4B Welcome to *VelographyBot*!\n\nI publish high-quality crypto trading signals based on:\n\u2022 Real-time market data\n\u2022 News sentiment analysis\n\u2022 AI-powered reasoning\n\nSignals are published every 4 hours. Stay tuned!',
    { parse_mode: 'Markdown' },
  );
});

bot.help((ctx) => {
  ctx.reply(
    '*VelographyBot Commands*\n\n/start \u2014 Welcome message\n/help \u2014 This message\n/status \u2014 Bot status',
    { parse_mode: 'Markdown' },
  );
});

bot.command('status', (ctx) => {
  ctx.reply('\u2705 VelographyBot is *online* and monitoring markets.', {
    parse_mode: 'Markdown',
  });
});

bot.on('message', (ctx) => {
  log.debug({ from: ctx.from?.id }, 'Received message');
});

// ─── Publishing ───────────────────────────────────────────────────

export async function sendSignalMessage(text: string): Promise<number> {
  const result = await bot.telegram.sendMessage(env.TELEGRAM_CHANNEL_ID, text, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
  log.info({ messageId: result.message_id, channelId: env.TELEGRAM_CHANNEL_ID }, 'Message sent');
  return result.message_id;
}

export async function launchBot(): Promise<void> {
  await bot.launch();
  log.info('Telegram bot launched (polling)');
}

export function stopBot(): void {
  bot.stop('SIGTERM');
  log.info('Telegram bot stopped');
}
