import type { RiskParameters, RiskResult } from '../types';
import { createChildLogger } from './logger';

const log = createChildLogger('risk');

const DEFAULT_ATR_PERCENT = 3.0;
const DEFAULT_RR_RATIO = 2.5;

export function calculateRisk(params: RiskParameters): RiskResult {
  const { entryPrice, direction, atrPercent, riskRewardRatio } = params;

  const atr = entryPrice * (atrPercent / 100);

  let stopLoss: number;
  let targetPrice: number;

  if (direction === 'LONG') {
    stopLoss = entryPrice - atr;
    targetPrice = entryPrice + atr * riskRewardRatio;
  } else if (direction === 'SHORT') {
    stopLoss = entryPrice + atr;
    targetPrice = entryPrice - atr * riskRewardRatio;
  } else {
    stopLoss = entryPrice * 0.97;
    targetPrice = entryPrice * 1.03;
  }

  const riskReward = Math.abs(targetPrice - entryPrice) / Math.abs(entryPrice - stopLoss);

  log.debug({ entryPrice, direction, stopLoss, targetPrice, riskReward }, 'Risk calculated');

  return {
    targetPrice: Number(targetPrice.toFixed(8)),
    stopLoss: Number(stopLoss.toFixed(8)),
    riskReward: Number(riskReward.toFixed(2)),
  };
}

export function getDefaultRiskParams(
  entryPrice: number,
  direction: import('../types').Direction,
): RiskParameters {
  return {
    entryPrice,
    direction,
    atrPercent: DEFAULT_ATR_PERCENT,
    riskRewardRatio: DEFAULT_RR_RATIO,
  };
}
