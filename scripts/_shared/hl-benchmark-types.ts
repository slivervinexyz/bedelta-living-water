/** Script-only HL benchmark types — not mounted on Worker hot path. */

export const COIN = "ETH";
export const UA = { "User-Agent": "BeDeltaLivingWater/HlBenchmark" } as const;
export const BINANCE_KLINES = "https://fapi.binance.com/fapi/v1/klines";

export interface FundingPoint {
  coin: string;
  fundingRate: string;
  premium: string;
  time: number;
}

export interface Candle {
  t: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
  n: number;
}

export interface WalkFill {
  filledUsd: number;
  filledQty: number;
  avgPx: number;
  midPx: number;
  impactBps: number;
  slipUsd: number;
}

export interface HlAssetCtx {
  funding: string;
  openInterest: string;
  oraclePx: string;
  markPx: string;
  midPx: string;
  premium: string;
  impactPxs?: [string, string];
}
