import { prisma } from '../db/prisma';
import { fetchMarketData, TRACKED_COINS } from '../providers/market/coingecko';
import { createChildLogger } from '../core/logger';
import type { MarketSnapshot, Trend } from '../types';

const log = createChildLogger('marketSnapshot');

function deriveTrend(change24h: number, change7d: number | null): Trend {
  const score7d = change7d ?? 0;
  if (change24h > 2 && score7d > 0) return 'BULLISH';
  if (change24h < -2 && score7d < 0) return 'BEARISH';
  return 'NEUTRAL';
}

export async function updateMarketSnapshots(): Promise<MarketSnapshot[]> {
  log.info('Fetching market data...');
  const marketData = await fetchMarketData(TRACKED_COINS);

  const snapshots: MarketSnapshot[] = [];

  for (const coin of marketData) {
    const trend = deriveTrend(coin.change24h, coin.change7d);
    const snapshot = await prisma.marketSnapshot.create({
      data: {
        coinId: coin.coinId,
        symbol: coin.symbol,
        name: coin.name,
        price: coin.price,
        change24h: coin.change24h,
        change7d: coin.change7d,
        volume24h: coin.volume24h,
        marketCap: coin.marketCap,
        ath: coin.ath,
        athChange: coin.athChange,
        rsi: null, // RSI requires OHLCV data — extend with CCXT if needed
        trend,
      },
    });

    snapshots.push({
      ...coin,
      rsi: null,
      trend,
      createdAt: snapshot.createdAt,
    });
  }

  log.info({ count: snapshots.length }, 'Market snapshots updated');
  return snapshots;
}

export async function getLatestSnapshots(): Promise<MarketSnapshot[]> {
  const latest = await prisma.$queryRaw<Array<{
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
    rsi: number | null;
    trend: string;
    createdAt: Date;
  }>>`
    SELECT DISTINCT ON ("coinId") *
    FROM market_snapshots
    ORDER BY "coinId", "createdAt" DESC
  `;

  return latest.map((row) => ({
    coinId: row.coinId,
    symbol: row.symbol,
    name: row.name,
    price: row.price,
    change24h: row.change24h,
    change7d: row.change7d,
    volume24h: row.volume24h,
    marketCap: row.marketCap,
    ath: row.ath,
    athChange: row.athChange,
    rsi: row.rsi,
    trend: row.trend as Trend,
    createdAt: row.createdAt,
  }));
}
