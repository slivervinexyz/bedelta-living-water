import type { CounterAttackResult } from "../src/services/counter-attack-matrix";
import type { SigningResult } from "../src/services/session-key-adapter";

export const ACCOUNT_BALANCE_USD = 10_000;
export const ORDER_NOTIONAL_USD = 150;
export const PIPELINE_BUDGET_MS = 5;

export interface StressPair {
  symbol: string;
  asset: number;
  markPx: number;
  bestBid: number;
  bestAsk: number;
  bidDepthUsd: number;
  askDepthUsd: number;
}

export interface PairSimulation {
  pair: StressPair;
  imbalance: number;
  counter: CounterAttackResult;
  soilOk: boolean;
  soilReasons: string[];
  soilDepthUsd: number;
  soilSpreadBps: number;
  signing: SigningResult | null;
  eip712Json: string | null;
  elapsedMs: number;
}

export const STRESS_PAIRS: StressPair[] = [
  {
    symbol: "BTC",
    asset: 0,
    markPx: 65_000,
    bestBid: 64_998,
    bestAsk: 65_002,
    bidDepthUsd: 100_000,
    askDepthUsd: 800_000,
  },
  {
    symbol: "ETH",
    asset: 1,
    markPx: 3_500,
    bestBid: 3_499.5,
    bestAsk: 3_500.5,
    bidDepthUsd: 120_000,
    askDepthUsd: 900_000,
  },
];
