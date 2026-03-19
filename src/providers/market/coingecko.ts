import axios from 'axios';
import { env } from '../../config/env';
import { withRetry } from '../../utils/retry';
import { createChildLogger } from '../../core/logger';
import type { CoinMarketData } from '../../types';

const log = createChildLogger('coingecko');

const client = axios.create({
  baseURL: env.COINGECKO_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    ...(env.COINGECKO_API_KEY
      ? { 'x-cg-demo-api-key': env.COINGECKO_API_KEY }
      : {}),
  },
});

const TRACKED_COINS = [
  'bitcoin',
  'ethereum',
  'solana',
  'binancecoin',
  'ripple',
  'cardano',
  'avalanche-2',
  'polkadot',
];

export async function fetchMarketData(
  coinIds: string[] = TRACKED_COINS,
): Promise<CoinMarketData[]> {
  return withRetry(async () => {
    const response = await client.get('/coins/markets', {
      params: {
        vs_currency: 'usd',
        ids: coinIds.join(','),
        order: 'market_cap_desc',
        per_page: coinIds.length,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h,7d',
      },
    });

    const data = response.data as Array<Record<string, unknown>>;

    return data.map((coin) => ({
      coinId: String(coin.id),
      symbol: String(coin.symbol).toUpperCase(),
      name: String(coin.name),
      price: Number(coin.current_price),
      change24h: Number(coin.price_change_percentage_24h ?? 0),
      change7d: coin.price_change_percentage_7d_in_currency != null
        ? Number(coin.price_change_percentage_7d_in_currency)
        : null,
      volume24h: Number(coin.total_volume),
      marketCap: Number(coin.market_cap),
      ath: coin.ath != null ? Number(coin.ath) : null,
      athChange: coin.ath_change_percentage != null
        ? Number(coin.ath_change_percentage)
        : null,
    }));
  });
}

export async function fetchCoinDetails(coinId: string): Promise<Record<string, unknown>> {
  return withRetry(async () => {
    const response = await client.get(`/coins/${coinId}`, {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
      },
    });
    log.debug({ coinId }, 'Fetched coin details');
    return response.data as Record<string, unknown>;
  });
}

export { TRACKED_COINS };
