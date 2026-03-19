import { prisma } from '../db/prisma';
import { sendSignalMessage } from '../bots/telegram.bot';
import { createChildLogger } from '../core/logger';
import type { SignalResult } from '../types';
import { formatPrice, formatPercent, formatLargeNumber } from '../utils/format';

const log = createChildLogger('publish');

function buildSignalMessage(signal: SignalResult): string {
  const directionEmoji = signal.direction === 'LONG' ? '\uD83D\uDCC8' : signal.direction === 'SHORT' ? '\uD83D\uDCC9' : '\u27A1\uFE0F';
  const confidenceEmoji = signal.confidence === 'HIGH' ? '\uD83D\uDD34' : signal.confidence === 'MEDIUM' ? '\uD83D\uDFE1' : '\uD83D\uDFE2';

  return [
    `${directionEmoji} *VELO SIGNAL \u2014 ${signal.symbol}*`,
    ``,
    `\u25AA Direction: *${signal.direction}*`,
    `\u25AA Confidence: ${confidenceEmoji} *${signal.confidence}* (${signal.score}/100)`,
    ``,
    `\u25AA Entry: *${formatPrice(signal.entryPrice)}*`,
    `\u25AA Target: *${formatPrice(signal.targetPrice)}*`,
    `\u25AA Stop Loss: *${formatPrice(signal.stopLoss)}*`,
    `\u25AA Risk/Reward: *${signal.riskReward}x*`,
    ``,
    `\uD83D\uDCCA *Analysis:*`,
    signal.reasoning,
    ``,
    `\u23F0 Expires in 8 hours`,
    `\u26A0\uFE0F This is not financial advice.`,
  ].join('\n');
}

export async function publishSignals(signals: SignalResult[]): Promise<number> {
  let published = 0;

  for (const signal of signals) {
    try {
      const message = buildSignalMessage(signal);
      const msgId = await sendSignalMessage(message);

      await prisma.signal.updateMany({
        where: {
          coinId: signal.coinId,
          published: false,
          createdAt: { gte: new Date(Date.now() - 60000) },
        },
        data: {
          published: true,
          publishedAt: new Date(),
          telegramMsgId: msgId,
        },
      });

      published++;
      log.info({ coinId: signal.coinId, msgId }, 'Signal published');
    } catch (err) {
      log.error({ coinId: signal.coinId, err }, 'Failed to publish signal');
    }
  }

  return published;
}
