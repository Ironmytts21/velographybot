import { prisma } from '../db/prisma';
import { getLatestSnapshots } from './marketSnapshot.service';
import { getRecentNews } from './newsIntelligence.service';
import { calculateScore } from '../core/scoring';
import { calculateRisk, getDefaultRiskParams } from '../core/risk';
import { generateSignalReasoning } from '../providers/ai/openai';
import { env } from '../config/env';
import { addHours } from '../utils/time';
import { createChildLogger } from '../core/logger';
import type { SignalResult } from '../types';

const log = createChildLogger('signalEngine');

export async function runSignalEngine(): Promise<SignalResult[]> {
  log.info('Running signal engine...');

  const [snapshots, newsItems] = await Promise.all([
    getLatestSnapshots(),
    getRecentNews(24),
  ]);

  if (snapshots.length === 0) {
    log.warn('No market snapshots available');
    return [];
  }

  const signals: SignalResult[] = [];

  for (const snapshot of snapshots) {
    const relevantNews = newsItems.filter((n) =>
      n.title.toLowerCase().includes(snapshot.symbol.toLowerCase()) ||
      n.title.toLowerCase().includes(snapshot.name.toLowerCase()),
    );

    const { score, direction, confidence } = calculateScore({
      snapshot,
      newsItems: relevantNews,
    });

    if (score < env.MIN_SIGNAL_SCORE || direction === 'NEUTRAL') {
      log.debug({ coinId: snapshot.coinId, score, direction }, 'Skipping low-score signal');
      continue;
    }

    const riskParams = getDefaultRiskParams(snapshot.price, direction);
    const risk = calculateRisk(riskParams);

    let reasoning = '';
    try {
      reasoning = await generateSignalReasoning(snapshot, relevantNews, direction, score);
    } catch (err) {
      log.warn({ coinId: snapshot.coinId, err }, 'AI reasoning failed, using fallback');
      reasoning = `${snapshot.name} shows ${direction} momentum with a confidence score of ${score}/100 based on price action and market sentiment.`;
    }

    const signal: SignalResult = {
      coinId: snapshot.coinId,
      symbol: snapshot.symbol,
      direction,
      score,
      confidence,
      entryPrice: snapshot.price,
      targetPrice: risk.targetPrice,
      stopLoss: risk.stopLoss,
      riskReward: risk.riskReward,
      reasoning,
      expiresAt: addHours(new Date(), 8),
    };

    await prisma.signal.create({
      data: {
        coinId: signal.coinId,
        symbol: signal.symbol,
        direction: signal.direction,
        score: signal.score,
        confidence: signal.confidence,
        entryPrice: signal.entryPrice,
        targetPrice: signal.targetPrice,
        stopLoss: signal.stopLoss,
        riskReward: signal.riskReward,
        reasoning: signal.reasoning,
        expiresAt: signal.expiresAt,
      },
    });

    signals.push(signal);
    log.info({ coinId: signal.coinId, score, direction }, 'Signal generated');

    if (signals.length >= env.MAX_SIGNALS_PER_CYCLE) break;
  }

  log.info({ count: signals.length }, 'Signal engine completed');
  return signals;
}
