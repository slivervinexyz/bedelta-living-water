import { computeLiveBookMetrics } from "../../src/services/exchanges/hyperliquid-adapter";
import type { LiveBookSoilProbe } from "../../src/services/check-soil-resistance";

export function isoNow(): string {
  return new Date().toISOString();
}

export function fmtUsd(n: number, digits = 2): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function fmtPct(ratio: number, digits = 2): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function fmtBps(bps: number, digits = 2): string {
  return `${bps.toFixed(digits)} bps`;
}

export function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(
    xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1),
  );
}

export function maxDrawdown(equity: number[]): number {
  let peak = equity[0] ?? 0;
  let mdd = 0;
  for (const e of equity) {
    peak = Math.max(peak, e);
    if (peak > 0) mdd = Math.min(mdd, (e - peak) / peak);
  }
  return mdd;
}

export function sharpeFromDailyReturns(daily: number[], rf = 0): number {
  if (daily.length < 2) return 0;
  const m = mean(daily);
  const sd = stdev(daily);
  if (sd <= 0) return 0;
  return ((m - rf) / sd) * Math.sqrt(365);
}

export function probeFromMetrics(
  symbol: string,
  metrics: NonNullable<ReturnType<typeof computeLiveBookMetrics>>,
): LiveBookSoilProbe {
  return {
    symbol,
    bestBid: metrics.bestBid,
    bestAsk: metrics.bestAsk,
    midPx: metrics.midPx,
    bidDepthUsd: metrics.bidDepthUsd,
    askDepthUsd: metrics.askDepthUsd,
    spreadBps: metrics.spreadBps,
    priceImpactBps: metrics.priceImpactBps,
    depthUsd: metrics.depthUsd,
  };
}
