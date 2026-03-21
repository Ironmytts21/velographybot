import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().url(),

  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHANNEL_ID: z.string().min(1),

  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  COINGECKO_API_KEY: z.string().optional(),
  COINGECKO_BASE_URL: z.string().url().default('https://api.coingecko.com/api/v3'),

  SIGNAL_CRON: z.string().default('0 */4 * * *'),
  SNAPSHOT_CRON: z.string().default('*/30 * * * *'),
  NEWS_CRON: z.string().default('0 */2 * * *'),
  HEALTH_CRON: z.string().default('*/5 * * * *'),

  MIN_SIGNAL_SCORE: z.coerce.number().default(65),
  MAX_SIGNALS_PER_CYCLE: z.coerce.number().default(3),

  ADMIN_SECRET: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\u274c Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
