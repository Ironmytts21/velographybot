import axios from 'axios';
import { env } from '../../config/env';
import { withRetry } from '../../utils/retry';
import { createChildLogger } from '../../core/logger';
import type { MarketSnapshot, NewsItem } from '../../types';

const log = createChildLogger('openai');

const client = axios.create({
  baseURL: 'https://api.openai.com/v1',
  timeout: 30000,
  headers: {
    Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export async function generateSignalReasoning(
  snapshot: MarketSnapshot,
  newsItems: NewsItem[],
  direction: string,
  score: number,
): Promise<string> {
  const newsContext = newsItems
    .slice(0, 5)
    .map((n) => `- [${n.sentiment}] ${n.title}`)
    .join('\n');

  const prompt = `You are a professional crypto trading analyst. Generate a concise, actionable signal reasoning.

Coin: ${snapshot.name} (${snapshot.symbol})
Price: $${snapshot.price}
24h Change: ${snapshot.change24h.toFixed(2)}%
7d Change: ${snapshot.change7d?.toFixed(2) ?? 'N/A'}%
Volume 24h: $${snapshot.volume24h.toLocaleString()}
Market Cap: $${snapshot.marketCap.toLocaleString()}
Trend: ${snapshot.trend}
RSI: ${snapshot.rsi ?? 'N/A'}
Signal Direction: ${direction}
Confidence Score: ${score}/100

Recent News Headlines:
${newsContext || 'No recent news available'}

Write 2-3 sentences explaining the signal rationale. Be specific, professional, and concise. No emojis in this section.`;

  return withRetry(async () => {
    const response = await client.post('/chat/completions', {
      model: env.OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a professional cryptocurrency trading signal analyst. Provide clear, factual, concise analysis.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 200,
      temperature: 0.4,
    });

    const content = (response.data as { choices: Array<{ message: { content: string } }> })
      .choices[0]?.message?.content ?? 'Signal generated based on technical and sentiment analysis.';

    log.debug({ coinId: snapshot.coinId, score }, 'Generated AI reasoning');
    return content.trim();
  });
}
