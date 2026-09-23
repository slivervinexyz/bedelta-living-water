/** Tier 1 macro + Tier 2 adversarial scenario vectors. */
import { MIN_DEPTH_USD } from "../../src/services/risk-control";
import { HONEYPOT_RPC_HOSTS } from "../../src/services/defense/rpc-whitelist";
import {
  computeBaselineMetrics,
  runExomeshPath,
} from "./backtest-paths";
import type { IntentVector, ScenarioDualResult } from "./backtest-types";

const BASE = 3_500;
const BALANCE = 10_000;
const ORDER = 5_000;

function dual(
  scenarioId: string,
  eventDate: string,
  description: string,
  vector: IntentVector,
): ScenarioDualResult {
  const withoutExoMesh = computeBaselineMetrics(vector);
  const withSliverVine = runExomeshPath(vector);
  return {
    scenarioId,
    eventDate,
    description,
    withoutExoMesh,
    withSliverVine,
    delta: {
      slippageLossPreventedUsd:
        withoutExoMesh.slippageLossUsd - withSliverVine.slippageLossUsd,
      toxicFlowPreventedUsd:
        withoutExoMesh.toxicFlowExposureUsd - withSliverVine.toxicFlowExposureUsd,
      gasSavedUsd: withSliverVine.gasSavedUsd,
      interceptDelta: withSliverVine.failClosed && !withoutExoMesh.failClosed,
    },
  };
}

export function runTier1MacroEvents(): Record<string, ScenarioDualResult> {
  const blackMonday: IntentVector = {
    orderSizeUsd: ORDER,
    accountBalanceUsd: BALANCE,
    hlSpot: BASE,
    hlPerp: BASE * 0.94,
    dydxPerp: BASE * 0.82,
    depthUsd: 18_000,
    depthCollapseFactor: 1,
    marketSlippage: 0.18,
    sequencerDelayMs: 2_400,
    oracleLagMs: 8_000,
    sandwichSpreadBps: 120,
    useGmxPath: true,
    sanctuarySlippageBps: 1_200,
    poolImbalanceUsd: 12_000,
  };

  const oracleLag: IntentVector = {
    orderSizeUsd: ORDER,
    accountBalanceUsd: BALANCE,
    hlSpot: BASE,
    hlPerp: BASE * 1.04,
    dydxPerp: BASE * 1.06,
    depthUsd: MIN_DEPTH_USD,
    depthCollapseFactor: 1,
    marketSlippage: 0.02,
    sequencerDelayMs: 12_000,
    oracleLagMs: 45_000,
  };

  const liquidityDepeg: IntentVector = {
    orderSizeUsd: ORDER,
    accountBalanceUsd: BALANCE,
    hlSpot: BASE,
    hlPerp: BASE,
    dydxPerp: BASE,
    depthUsd: MIN_DEPTH_USD * 0.35,
    depthCollapseFactor: 0.35,
    marketSlippage: 0.08,
    sequencerDelayMs: 500,
    oracleLagMs: 2_000,
    asyncRequestRate: 1_000_000_000_000_000_000n,
    asyncClaimRate: 1_080_000_000_000_000_000n,
    asyncMaxBps: 500,
  };

  return {
    "2025-08-05_black_monday_volatility_strike": dual(
      "A",
      "2025-08-05",
      "GMX GM high slippage cascade & orderbook thinning",
      blackMonday,
    ),
    "2025-11-12_oracle_latency_lag": dual(
      "B",
      "2025-11-12",
      "Arbitrum sequencer congestion & delayed oracle price feeds",
      oracleLag,
    ),
    "2026-03-18_liquidity_depeg": dual(
      "C",
      "2026-03-18",
      "Pendle PT escort rate drift & async vault divergence",
      liquidityDepeg,
    ),
  };
}

export function runTier2Adversarial(): Record<string, ScenarioDualResult> {
  const jitterScraper: IntentVector = {
    orderSizeUsd: ORDER,
    accountBalanceUsd: BALANCE,
    hlSpot: BASE,
    hlPerp: BASE * 1.00492,
    dydxPerp: BASE * 1.00508,
    depthUsd: MIN_DEPTH_USD * 0.92,
    depthCollapseFactor: 0.92,
    marketSlippage: 0.0051,
    sequencerDelayMs: 80,
    oracleLagMs: 500,
    sandwichSpreadBps: 65,
  };

  const honeypotHost = HONEYPOT_RPC_HOSTS[0] ?? "rpc.silvervine-clone.trap";
  const honeypotRpc: IntentVector = {
    orderSizeUsd: ORDER,
    accountBalanceUsd: BALANCE,
    hlSpot: BASE,
    hlPerp: BASE,
    dydxPerp: BASE,
    depthUsd: MIN_DEPTH_USD * 2,
    depthCollapseFactor: 1,
    marketSlippage: 0.001,
    sequencerDelayMs: 20,
    oracleLagMs: 100,
    rpcUrl: `https://${honeypotHost}/v1`,
    circuitProbe: true,
  };

  return {
    jitter_scraper_mev_sandwich: dual(
      "JitterScraper",
      "synthetic",
      "Searcher bot front-running AI agent intents under volatile spread",
      jitterScraper,
    ),
    honeypot_decoy_rpc_infiltration: dual(
      "HoneypotRpc",
      "synthetic",
      "Malicious/spoofed RPC depth injection attempting agent signature trick",
      honeypotRpc,
    ),
  };
}
