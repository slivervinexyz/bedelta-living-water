import type { StatsVaultEntry } from "./vault-radar.types";

function pnlSeries(entry: StatsVaultEntry, window: string): number[] {
  const block = entry.pnls.find(([w]) => w === window);
  return (block?.[1] ?? []).map((v) => parseFloat(v)).filter(Number.isFinite);
}

export function computeDrawdownUsd(values: number[]): number {
  if (values.length < 2) return 0;
  let peak = values[0]!;
  let maxDrop = 0;
  for (const v of values) {
    peak = Math.max(peak, v);
    maxDrop = Math.max(maxDrop, peak - v);
  }
  return maxDrop;
}

export function computeTradeFrequencyScore(values: number[]): number {
  if (values.length < 2) return 0;
  let moves = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i]! - values[i - 1]!) > 0.01) moves++;
  }
  return moves / Math.max(values.length - 1, 1);
}

export function scoreStatsEntry(entry: StatsVaultEntry): {
  riskScore: number;
  dayDrawdownUsd: number;
  weekDrawdownUsd: number;
  tradeFrequencyScore: number;
} {
  const day = pnlSeries(entry, "day");
  const week = pnlSeries(entry, "week");
  const dayDrawdownUsd = computeDrawdownUsd(day);
  const weekDrawdownUsd = computeDrawdownUsd(week);
  const tradeFrequencyScore = computeTradeFrequencyScore(day);
  const tvl = parseFloat(entry.summary.tvl) || 0;
  const drawdownNorm = Math.min((dayDrawdownUsd + weekDrawdownUsd * 0.5) / 500, 5);
  const freqNorm = tradeFrequencyScore * 3;
  const tvlNorm = Math.log10(Math.max(tvl, 100)) / 6;
  const riskScore = drawdownNorm * 40 + freqNorm * 35 + tvlNorm * 25;
  return { riskScore, dayDrawdownUsd, weekDrawdownUsd, tradeFrequencyScore };
}
