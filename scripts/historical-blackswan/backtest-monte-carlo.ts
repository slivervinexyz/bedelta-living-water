/** Tier 3 — 10,000× Monte Carlo chaos matrix. */
import { MAX_SLIPPAGE, packSoilLane } from "../../src/core/soil-resistance-math";
import {
  ensureSoilWasmRuntime,
  evaluatePackedSoilLane,
  isSoilWasmRuntimeReady,
} from "../../src/core/soil-wasm-runtime";
import { SOIL_PACK_LEN } from "../../src/core/soil-slippage-cold-path";
import { MIN_DEPTH_USD } from "../../src/services/risk-control";
import { evaluateOracleLag } from "../../src/services/risk/arbitrum-gas-guard";
import {
  MONTE_CARLO_ITERATIONS,
  MONTE_CARLO_SEED,
  ORACLE_LAG_DEADLOCK_MS,
  STD_TX_GAS_USD,
  type MonteCarloAggregate,
} from "./backtest-types";

const SOIL_LANE = new Float64Array(SOIL_PACK_LEN);
const NOW_MS = 1_700_000_000_000;
const BASE = 3_500;
const ORDER = 500;

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(sorted: number[], pct: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[idx]!;
}

function baselineLoss(
  orderUsd: number,
  slip: number,
  depthFactor: number,
): { slippage: number; toxic: number; gas: number } {
  const depth = MIN_DEPTH_USD * depthFactor;
  const toxic = depth < MIN_DEPTH_USD ? orderUsd * 0.015 : orderUsd * 0.002;
  return {
    slippage: orderUsd * slip,
    toxic,
    gas: STD_TX_GAS_USD,
  };
}

function exomeshIntercept(
  slip: number,
  depthFactor: number,
  oracleLagMs: number,
  sequencerDelayMs: number,
): { intercept: boolean; latencyUs: number } {
  const depth = MIN_DEPTH_USD * depthFactor;
  const hlPerp = BASE;
  const dydxPerp = BASE * (1 + slip);
  packSoilLane(BASE, hlPerp, dydxPerp, depth, MAX_SLIPPAGE, MIN_DEPTH_USD, SOIL_LANE);
  const t0 = process.hrtime.bigint();
  const soil = evaluatePackedSoilLane(SOIL_LANE);
  const latencyUs = Number(process.hrtime.bigint() - t0) / 1000;
  if (soil.tripFlags !== 0) return { intercept: true, latencyUs };
  if (depth < MIN_DEPTH_USD) return { intercept: true, latencyUs };
  if (oracleLagMs > ORACLE_LAG_DEADLOCK_MS) {
    const lag = evaluateOracleLag(NOW_MS - oracleLagMs, NOW_MS);
    if (lag.deadlock) return { intercept: true, latencyUs };
  }
  if (sequencerDelayMs >= 30_000) return { intercept: true, latencyUs };
  if (slip > MAX_SLIPPAGE) return { intercept: true, latencyUs };
  return { intercept: false, latencyUs };
}

export function runMonteCarloChaosMatrix(): MonteCarloAggregate {
  ensureSoilWasmRuntime();
  const rand = mulberry32(MONTE_CARLO_SEED);
  let interceptCount = 0;
  let baselineTotalLossUsd = 0;
  let totalLossPreventedUsd = 0;
  let totalGasSavedUsd = 0;
  const latencies: number[] = [];

  for (let i = 0; i < MONTE_CARLO_ITERATIONS; i++) {
    const slip = 0.001 + rand() * (0.5 - 0.001);
    const sequencerDelayMs = 10 + rand() * (30_000 - 10);
    const depthFactor = 0.1 + rand() * 0.9;
    const oracleLagMs = 1_000 + rand() * (60_000 - 1_000);

    const base = baselineLoss(ORDER, slip, depthFactor);
    const baseTotal = base.slippage + base.toxic + base.gas;
    baselineTotalLossUsd += baseTotal;

    const exo = exomeshIntercept(slip, depthFactor, oracleLagMs, sequencerDelayMs);
    latencies.push(exo.latencyUs);
    if (exo.intercept) {
      interceptCount += 1;
      totalLossPreventedUsd += baseTotal;
      totalGasSavedUsd += STD_TX_GAS_USD;
    }
  }

  latencies.sort((a, b) => a - b);
  return {
    iterations: MONTE_CARLO_ITERATIONS,
    seed: MONTE_CARLO_SEED,
    interceptRatePct: Number(((interceptCount / MONTE_CARLO_ITERATIONS) * 100).toFixed(2)),
    interceptCount,
    baselineTotalLossUsd: Number(baselineTotalLossUsd.toFixed(2)),
    totalLossPreventedUsd: Number(totalLossPreventedUsd.toFixed(2)),
    totalGasSavedUsd: Number(totalGasSavedUsd.toFixed(2)),
    latencyP50Us: Number(percentile(latencies, 50).toFixed(2)),
    latencyP99Us: Number(percentile(latencies, 99).toFixed(2)),
    wasmRuntimeReady: isSoilWasmRuntimeReady(),
  };
}
