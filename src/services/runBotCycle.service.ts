import { updateMarketSnapshots } from './marketSnapshot.service';
import { updateNewsIntelligence } from './newsIntelligence.service';
import { runSignalEngine } from './signalEngine.service';
import { publishSignals } from './publish.service';
import { createChildLogger } from '../core/logger';
import type { BotCycleResult } from '../types';

const log = createChildLogger('botCycle');

export async function runBotCycle(): Promise<BotCycleResult> {
  const start = Date.now();
  log.info('\u25B6 Starting bot cycle');

  const [snapshots, news] = await Promise.all([
    updateMarketSnapshots(),
    updateNewsIntelligence(),
  ]);

  const signals = await runSignalEngine();
  const published = await publishSignals(signals);

  const result: BotCycleResult = {
    snapshotsUpdated: snapshots.length,
    newsProcessed: news.length,
    signalsGenerated: signals.length,
    signalsPublished: published,
    durationMs: Date.now() - start,
  };

  log.info(result, '\u25A0 Bot cycle complete');
  return result;
}
