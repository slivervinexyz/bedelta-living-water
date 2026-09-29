/** Historical black-swan backtest — shared types & constants. */
export const SSOT_PATH = "docs/audit/HISTORICAL_BLACKSWAN_BACKTEST_SSOT.json";
export const MONTE_CARLO_ITERATIONS = 10_000;
export const MONTE_CARLO_SEED = 42;
export const GMX_EXEC_GAS_USD = 1.25;
export const STD_TX_GAS_USD = 0.35;
export const ORACLE_LAG_DEADLOCK_MS = 30_000;

export interface IntentVector {
  orderSizeUsd: number;
  accountBalanceUsd: number;
  hlSpot: number;
  hlPerp: number;
  dydxPerp: number;
  depthUsd: number;
  depthCollapseFactor: number;
  marketSlippage: number;
  sequencerDelayMs: number;
  oracleLagMs: number;
  sandwichSpreadBps?: number;
  asyncRequestRate?: bigint;
  asyncClaimRate?: bigint;
  asyncMaxBps?: number;
  rpcUrl?: string;
  circuitProbe?: boolean;
  useGmxPath?: boolean;
  sanctuarySlippageBps?: number;
  poolImbalanceUsd?: number;
}

export interface PathMetrics {
  executed: boolean;
  failClosed: boolean;
  slippageLossUsd: number;
  toxicFlowExposureUsd: number;
  gasWastedUsd: number;
  lossPreventedUsd: number;
  gasSavedUsd: number;
  latencyUs: number;
  interceptReasons: string[];
}

export interface ScenarioDualResult {
  scenarioId: string;
  eventDate: string;
  description: string;
  withoutExoMesh: PathMetrics;
  withSliverVine: PathMetrics;
  delta: {
    slippageLossPreventedUsd: number;
    toxicFlowPreventedUsd: number;
    gasSavedUsd: number;
    interceptDelta: boolean;
  };
}

export interface MonteCarloAggregate {
  iterations: number;
  seed: number;
  interceptRatePct: number;
  interceptCount: number;
  baselineTotalLossUsd: number;
  totalLossPreventedUsd: number;
  totalGasSavedUsd: number;
  latencyP50Us: number;
  latencyP99Us: number;
  wasmRuntimeReady: boolean;
}

export interface ComparativeRadar {
  withoutExoMesh: {
    totalSlippageLossUsd: number;
    totalToxicFlowUsd: number;
    totalGasWastedUsd: number;
    aggregateLossUsd: number;
    interceptRatePct: number;
  };
  withSliverVine: {
    totalSlippageLossUsd: number;
    totalToxicFlowUsd: number;
    totalGasWastedUsd: number;
    aggregateLossUsd: number;
    interceptRatePct: number;
    totalLossPreventedUsd: number;
    totalGasSavedUsd: number;
    reflexLatencyP50Us: number;
    reflexLatencyP99Us: number;
  };
}

export interface HistoricalBlackSwanSsot {
  schema: "silvervine.historical-blackswan-backtest.ssot.v1";
  protocol: "SliverVine Protocol";
  harness: "historical-blackswan-backtest";
  timestamp: string;
  chainId: number;
  gitCommitHash: string;
  wasm: { soil: boolean; sanctuary: boolean };
  tier1_macro_events: Record<string, ScenarioDualResult>;
  tier2_adversarial: Record<string, ScenarioDualResult>;
  tier3_monte_carlo: MonteCarloAggregate;
  comparative_radar_matrix: ComparativeRadar;
}
