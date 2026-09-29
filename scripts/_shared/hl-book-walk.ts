import type { HlL2BookLevel } from "../../src/services/exchanges/hyperliquid-adapter";
import type { WalkFill } from "./hl-benchmark-types";

export function parseLevel(level: HlL2BookLevel | [string, string]): {
  px: number;
  sz: number;
} {
  if (Array.isArray(level)) {
    return { px: parseFloat(level[0]), sz: parseFloat(level[1]) };
  }
  return { px: parseFloat(level.px), sz: parseFloat(level.sz) };
}

export function walkBook(
  levels: HlL2BookLevel[],
  midPx: number,
  notionalUsd: number,
  side: "buy" | "sell",
): WalkFill {
  let remaining = notionalUsd;
  let filledUsd = 0;
  let filledQty = 0;

  for (const level of levels) {
    const { px, sz } = parseLevel(level);
    if (!(px > 0 && sz > 0)) continue;
    const levelUsd = px * sz;
    const takeUsd = Math.min(remaining, levelUsd);
    filledUsd += takeUsd;
    filledQty += takeUsd / px;
    remaining -= takeUsd;
    if (remaining <= 1e-9) break;
  }

  if (filledQty <= 0 || filledUsd <= 0 || !(midPx > 0)) {
    return {
      filledUsd: 0,
      filledQty: 0,
      avgPx: midPx,
      midPx,
      impactBps: Number.POSITIVE_INFINITY,
      slipUsd: notionalUsd,
    };
  }

  const avgPx = filledUsd / filledQty;
  const rawImpact =
    side === "buy" ? (avgPx - midPx) / midPx : (midPx - avgPx) / midPx;
  const impactBps = Math.max(0, rawImpact) * 10_000;
  const slipUsd = Math.max(0, rawImpact) * filledUsd;
  return { filledUsd, filledQty, avgPx, midPx, impactBps, slipUsd };
}
