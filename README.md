# VelographyBot

Production-ready Telegram signal bot built with Node.js + TypeScript.
Railway deployable. Prisma + PostgreSQL. OpenAI + CoinGecko + RSS news intelligence.

## Stack
- Node.js + TypeScript
- Express (health/admin routes)
- Telegraf (Telegram bot)
- Prisma + PostgreSQL
- node-cron scheduler
- OpenAI API
- CoinGecko market data
- RSS news feed parsing
- Railway deployment ready

## Quick Start
```bash
cp .env.example .env
npm install
npx prisma generate
npm run dev
```
