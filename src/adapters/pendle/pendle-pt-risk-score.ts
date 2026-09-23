/** Pendle PT risk score — mirrors cross-guard rawRiskScore with parameterized nowMs. */
import type { PTMarketState } from "../../core/pendle-types";

export function scorePendlePtMarketRisk(market: PTMarketState, nowMs: number): number {
  const nowSec = Math.floor(nowMs / 1000);
  const T = Math.max(0, (market.expiry - nowSec) / (365.25 * 86_400));
  const timeDecay = Math.exp(-3 * T);
  const yieldJitter =
    Math.abs(market.historicalYield24h - market.impliedYield) /
    Math.max(0.0001, market.impliedYield);
  const yieldRisk = Math.min(1, yieldJitter / 0.02);
  const slip =
    (1_000_000 * market.ptPriceInAsset) / Math.max(1, 2 * market.liquidityConstant);
  return Math.round((timeDecay * 0.4 + yieldRisk * 0.3 + Math.min(1, slip / 0.05) * 0.3) * 100);
}
