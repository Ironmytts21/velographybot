import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { withRetry } from '../../utils/retry';
import { createChildLogger } from '../../core/logger';
import type { NewsItem, Sentiment } from '../../types';

const log = createChildLogger('rss');

const RSS_FEEDS = [
  { url: 'https://cointelegraph.com/rss', source: 'CoinTelegraph' },
  { url: 'https://coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
  { url: 'https://decrypt.co/feed', source: 'Decrypt' },
  { url: 'https://bitcoinmagazine.com/.rss/full/', source: 'Bitcoin Magazine' },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

const BULLISH_KEYWORDS = ['surge', 'rally', 'breakout', 'bull', 'adoption', 'institutional', 'all-time high', 'ath', 'gains', 'pump'];
const BEARISH_KEYWORDS = ['crash', 'dump', 'bear', 'hack', 'ban', 'regulation', 'sec', 'lawsuit', 'fraud', 'collapse'];

function analyzeSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  const bullScore = BULLISH_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const bearScore = BEARISH_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  if (bullScore > bearScore) return 'POSITIVE';
  if (bearScore > bullScore) return 'NEGATIVE';
  return 'NEUTRAL';
}

function calcRelevance(title: string, keywords: string[]): number {
  const lower = title.toLowerCase();
  const matches = keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
  return Math.min(1, matches / 2);
}

const CRYPTO_KEYWORDS = ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain', 'defi', 'nft', 'solana', 'altcoin'];

async function parseFeed(feedUrl: string, source: string): Promise<NewsItem[]> {
  return withRetry(async () => {
    const response = await axios.get(feedUrl, { timeout: 10000 });
    const result = parser.parse(response.data);
    const items: Array<Record<string, unknown>> =
      result?.rss?.channel?.item ?? result?.feed?.entry ?? [];

    return items.slice(0, 20).map((item) => {
      const title = String(item.title ?? '');
      const url = String(item.link ?? item.guid ?? '');
      const pubDate = item.pubDate ?? item.published ?? item.updated;
      const publishedAt = pubDate ? new Date(String(pubDate)) : new Date();
      const sentiment = analyzeSentiment(title);
      const relevance = calcRelevance(title, CRYPTO_KEYWORDS);

      return {
        title,
        url,
        source,
        summary: null,
        sentiment,
        relevance,
        publishedAt,
      };
    });
  }, { maxAttempts: 2 });
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(({ url, source }) => parseFeed(url, source)),
  );

  const newsItems: NewsItem[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      newsItems.push(...result.value);
    } else {
      log.warn({ err: result.reason }, 'Failed to fetch RSS feed');
    }
  }

  log.info({ count: newsItems.length }, 'Fetched news items');
  return newsItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}
