/** Shared HL fetch / book-walk / fmt — script-only benchmark helpers. */

import type { HlL2BookResponse } from "../../src/services/exchanges/hyperliquid-adapter";
import {
  isoNow,
  fmtUsd,
  fmtPct,
  fmtBps,
  maxDrawdown,
  sharpeFromDailyReturns,
} from "./hl-benchmark-math";
import {
  postHlInfo,
  fetchFundingHistory,
  fetchCandles,
  fetchL2Book,
} from "./hl-data-fetch";
import { parseLevel, walkBook } from "./hl-book-walk";

export {
  isoNow,
  fmtUsd,
  fmtPct,
  fmtBps,
  maxDrawdown,
  sharpeFromDailyReturns,
};

export {
  postHlInfo,
  postHlInfo as postHl,
  fetchFundingHistory,
  fetchCandles,
  fetchL2Book,
};

export { parseLevel, walkBook };

export type { FundingPoint, Candle } from "./hl-benchmark-types";

export function dualSlip(
  book: HlL2BookResponse,
  mid: number,
  notional: number,
): { impactBps: number; slipUsd: number } {
  const buy = walkBook(book.levels?.[1] ?? [], mid, notional, "buy");
  const sell = walkBook(book.levels?.[0] ?? [], mid, notional, "sell");
  return {
    impactBps: (buy.impactBps + sell.impactBps) / 2,
    slipUsd: (buy.slipUsd + sell.slipUsd) / 2,
  };
}

export function sharpeDaily(dailyPnls: number[], notional: number): number {
  if (dailyPnls.length < 2 || !(notional > 0)) return 0;
  return sharpeFromDailyReturns(dailyPnls.map((p) => p / notional));
}

export function clamp01(n: number): number {
  return Math.min(100, Math.max(0, n));
}
