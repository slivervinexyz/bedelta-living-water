export type MetaBundle = {
  universe: Array<{ name?: string; szDecimals?: number }>;
  ctxs: Array<{
    funding?: string;
    midPx?: string;
    oraclePx?: string;
    markPx?: string;
    dayNtlVlm?: string;
  }>;
};

export type SpotMeta = {
  universe: Array<{ name?: string; tokens?: number[]; index?: number }>;
  tokens: Array<{ name?: string; szDecimals?: number; index?: number }>;
};

export type DualTarget = {
  symbol: string;
  assetIndex: number;
  szDecimals: number;
  fundingRateHourly: number;
  midPx: number;
  dayNtlVlm: number;
  spotAssetIndex: number;
  spotSzDecimals: number;
};

export const PREFERRED_DUAL_LISTED = [
  "HYPE",
  "ETH",
  "SOL",
  "BTC",
  "PURR",
  "ATOM",
  "ARB",
  "OP",
] as const;
