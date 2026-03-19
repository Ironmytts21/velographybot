// ────────────────────────────────────────────────────────────────
// VelographyBot — Shared Types
// ────────────────────────────────────────────────────────────────

export type Direction = 'LONG' | 'SHORT' | 'NEUTRAL';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type Trend = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
export type HealthStatus = 'OK' | 'DEGRADED' | 'DOWN';

export interface CoinMarketData {
  coinId: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  change7d: number | null;
  volume24h: number;
  marketCap: number;
  ath: number | null;
  athChange: number | null;
}

export interface MarketSnapshot extends CoinMarketData {
  rsi: number | null;
  trend: Trend;
  createdAt: Date;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  summary: string | null;
  sentiment: Sentiment;
  relevance: number;
  publishedAt: Date;
}

export interface SignalResult {
  coinId: string;
  symbol: string;
  direction: Direction;
  score: number;
  confidence: Confidence;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  riskReward: number;
  reasoning: string;
  expiresAt: Date;
}

export interface ScoringInput {
  snapshot: MarketSnapshot;
  newsItems: NewsItem[];
}

export interface RiskParameters {
  entryPrice: number;
  direction: Direction;
  atrPercent: number;
  riskRewardRatio: number;
}

export interface RiskResult {
  targetPrice: number;
  stopLoss: number;
  riskReward: number;
}

export interface HealthCheckResult {
  status: HealthStatus;
  latencyMs: number;
  services: Record<string, HealthStatus>;
  timestamp: string;
}

export interface BotCycleResult {
  snapshotsUpdated: number;
  newsProcessed: number;
  signalsGenerated: number;
  signalsPublished: number;
  durationMs: number;
}
