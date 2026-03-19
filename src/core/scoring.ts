import type { ScoringInput, Direction, Confidence, Trend, Sentiment } from '../types';
import { createChildLogger } from './logger';

const log = createChildLogger('scoring');

interface ScoreBreakdown {
  priceAction: number;
  momentum: number;
  volume: number;
  sentiment: number;
  rsi: number;
  total: number;
}

function scorePriceAction(change24h: number, change7d: number | null): number {
  let score = 50;
  if (change24h > 5) score += 20;
  else if (change24h > 2) score += 10;
  else if (change24h < -5) score -= 20;
  else if (change24h < -2) score -= 10;

  if (change7d !== null) {
    if (change7d > 10) score += 15;
    else if (change7d > 5) score += 7;
    else if (change7d < -10) score -= 15;
    else if (change7d < -5) score -= 7;
  }
  return Math.max(0, Math.min(100, score));
}

function scoreVolume(volume24h: number, marketCap: number): number {
  if (marketCap <= 0) return 50;
  const ratio = volume24h / marketCap;
  if (ratio > 0.3) return 90;
  if (ratio > 0.15) return 75;
  if (ratio > 0.07) return 60;
  if (ratio > 0.03) return 50;
  return 30;
}

function scoreRSI(rsi: number | null): number {
  if (rsi === null) return 50;
  if (rsi >= 70) return 80; // Overbought — strong momentum
  if (rsi >= 55) return 70;
  if (rsi >= 45) return 50;
  if (rsi >= 30) return 40;
  return 25; // Oversold — potential reversal
}

function scoreSentiment(newsItems: ScoringInput['newsItems']): number {
  if (newsItems.length === 0) return 50;
  const weighted = newsItems.reduce((acc, item) => {
    const sentimentScore =
      item.sentiment === 'POSITIVE' ? 1 : item.sentiment === 'NEGATIVE' ? -1 : 0;
    return acc + sentimentScore * item.relevance;
  }, 0);
  const maxWeight = newsItems.reduce((acc, item) => acc + item.relevance, 0);
  const normalized = maxWeight > 0 ? weighted / maxWeight : 0;
  return Math.round(50 + normalized * 40);
}

function trendToDirection(trend: Trend, totalScore: number): Direction {
  if (totalScore >= 65) return trend === 'BEARISH' ? 'SHORT' : 'LONG';
  if (totalScore <= 35) return trend === 'BULLISH' ? 'LONG' : 'SHORT';
  return 'NEUTRAL';
}

function scoreToConfidence(score: number): Confidence {
  if (score >= 80) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  return 'LOW';
}

export function calculateScore(input: ScoringInput): {
  score: number;
  direction: Direction;
  confidence: Confidence;
  breakdown: ScoreBreakdown;
} {
  const { snapshot, newsItems } = input;

  const priceAction = scorePriceAction(snapshot.change24h, snapshot.change7d);
  const momentum = snapshot.trend === 'BULLISH' ? 70 : snapshot.trend === 'BEARISH' ? 30 : 50;
  const volume = scoreVolume(snapshot.volume24h, snapshot.marketCap);
  const sentiment = scoreSentiment(newsItems);
  const rsiScore = scoreRSI(snapshot.rsi);

  const total = Math.round(
    priceAction * 0.3 + momentum * 0.2 + volume * 0.2 + sentiment * 0.2 + rsiScore * 0.1,
  );

  const direction = trendToDirection(snapshot.trend, total);
  const confidence = scoreToConfidence(total);

  log.debug({ coinId: snapshot.coinId, total, direction, confidence }, 'Score calculated');

  return {
    score: total,
    direction,
    confidence,
    breakdown: { priceAction, momentum, volume, sentiment, rsi: rsiScore, total },
  };
}
