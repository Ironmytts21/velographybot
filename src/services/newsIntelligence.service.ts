import { prisma } from '../db/prisma';
import { fetchAllNews } from '../providers/news/rss';
import { createChildLogger } from '../core/logger';
import type { NewsItem } from '../types';

const log = createChildLogger('newsIntelligence');

export async function updateNewsIntelligence(): Promise<NewsItem[]> {
  log.info('Fetching news...');
  const rawNews = await fetchAllNews();

  const saved: NewsItem[] = [];

  for (const item of rawNews) {
    try {
      await prisma.newsItem.upsert({
        where: { url: item.url },
        update: {
          sentiment: item.sentiment,
          relevance: item.relevance,
        },
        create: {
          title: item.title,
          url: item.url,
          source: item.source,
          summary: item.summary,
          sentiment: item.sentiment,
          relevance: item.relevance,
          publishedAt: item.publishedAt,
        },
      });
      saved.push(item);
    } catch (err) {
      log.warn({ url: item.url, err }, 'Failed to save news item (likely duplicate)');
    }
  }

  log.info({ count: saved.length }, 'News intelligence updated');
  return saved;
}

export async function getRecentNews(limitHours = 24): Promise<NewsItem[]> {
  const since = new Date(Date.now() - limitHours * 60 * 60 * 1000);
  const items = await prisma.newsItem.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  });

  return items.map((item) => ({
    title: item.title,
    url: item.url,
    source: item.source,
    summary: item.summary,
    sentiment: item.sentiment as import('../types').Sentiment,
    relevance: item.relevance,
    publishedAt: item.publishedAt,
  }));
}
