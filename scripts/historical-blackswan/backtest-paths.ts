/** Dual-path execution — Baseline RPC vs ExoMesh + Sanctuary Wasm. */
import {
  evalAsyncVaultDrift,
  packSoilLane,
  MAX_SLIPPAGE,
} from "../../src/core/soil-resistance-math";
import {
  evaluatePackedSoilLane,
  ensureSoilWasmRuntime,
  isSoilWasmRuntimeReady,
} from "../../src/core/soil-wasm-runtime";
import {
  evaluateSanctuaryGmxWireMask,
  ensureSanctuaryWasmRuntime,
} from "../../src/core/sanctuary-wasm-runtime";
import { SOIL_PACK_LEN } from "../../src/core/soil-slippage-cold-path";
import { MIN_DEPTH_USD } from "../../src/services/risk-control";
import { evaluateOracleLag } from "../../src/services/risk/arbitrum-gas-guard";
import {
  evaluateRpcDefenseGate,
  HONEYPOT_SIMULATED_SLIPPAGE,
} from "../../src/services/defense/rpc-whitelist";
import { evaluateSequencerProbe } from "../../src/services/risk/sequencer-guard";
import {
  GMX_EXEC_GAS_USD,
  ORACLE_LAG_DEADLOCK_MS,
  STD_TX_GAS_USD,
  type IntentVector,
  type PathMetrics,
} from "./backtest-types";

const SOIL_LANE = new Float64Array(SOIL_PACK_LEN);
const NOW_MS = 1_700_000_000_000;

function crossVenueSlippage(v: IntentVector): number {
  if (v.hlPerp <= 0 || v.dydxPerp <= 0) return Number.POSITIVE_INFINITY;
  return Math.abs(v.dydxPerp - v.hlPerp) / v.hlPerp;
}

export function computeBaselineMetrics(v: IntentVector): PathMetrics {
  const depth = v.depthUsd * v.depthCollapseFactor;
  const slip = Math.max(v.marketSlippage, crossVenueSlippage(v));
  const slippageLossUsd = v.orderSizeUsd * slip;
  const sandwichUsd = v.sandwichSpreadBps
    ? v.orderSizeUsd * (v.sandwichSpreadBps / 10_000)
    : 0;
  const toxicFlowExposureUsd =
    sandwichUsd + (depth < MIN_DEPTH_USD * 0.5 ? v.orderSizeUsd * 0.025 : 0);
  const gasWastedUsd = v.useGmxPath ? GMX_EXEC_GAS_USD : STD_TX_GAS_USD;
  return {
    executed: true,
    failClosed: false,
    slippageLossUsd,
    toxicFlowExposureUsd,
    gasWastedUsd,
    lossPreventedUsd: 0,
    gasSavedUsd: 0,
    latencyUs: 0,
    interceptReasons: [],
  };
}

function measureSoilWasmUs(): number {
  const t0 = process.hrtime.bigint();
  evaluatePackedSoilLane(SOIL_LANE);
  return Number(process.hrtime.bigint() - t0) / 1000;
}

export function runExomeshPath(v: IntentVector, measureWasmOnly = false): PathMetrics {
  ensureSoilWasmRuntime();
  ensureSanctuaryWasmRuntime();
  const baseline = computeBaselineMetrics(v);
  const reasons: string[] = [];
  const depth = v.depthUsd * v.depthCollapseFactor;

  packSoilLane(v.hlSpot, v.hlPerp, v.dydxPerp, depth, MAX_SLIPPAGE, MIN_DEPTH_USD, SOIL_LANE);
  const wasmLatencyUs = measureSoilWasmUs();
  const soil = evaluatePackedSoilLane(SOIL_LANE);
  if (soil.tripFlags !== 0) reasons.push("SOIL_CORE_WASM_FAIL_CLOSED");

  if (v.oracleLagMs > ORACLE_LAG_DEADLOCK_MS) {
    const lag = evaluateOracleLag(NOW_MS - v.oracleLagMs, NOW_MS);
    if (lag.deadlock && lag.reason) reasons.push(lag.reason);
  }

  if (v.sequencerDelayMs >= 30_000) {
    const probe = evaluateSequencerProbe(0, Math.floor(NOW_MS / 1000) - 120);
    if (!probe.safe && probe.reason) reasons.push(probe.reason);
  }

  if (v.asyncRequestRate && v.asyncClaimRate !== undefined && v.asyncMaxBps !== undefined) {
    if (evalAsyncVaultDrift(v.asyncRequestRate, v.asyncClaimRate, v.asyncMaxBps)) {
      reasons.push("SANCTUARY_ASYNC_VAULT_DRIFT");
    }
  }

  if (v.rpcUrl) {
    const gate = evaluateRpcDefenseGate(v.rpcUrl, undefined, undefined, {
      circuitProbe: v.circuitProbe,
    });
    if (gate.tripped) reasons.push(gate.code ?? "HONEYPOT_CIRCUIT_BREAK");
  }

  if (v.useGmxPath) {
    const mask = evaluateSanctuaryGmxWireMask(
      {
        slippageBps: v.sanctuarySlippageBps ?? 800,
        poolLongUsd: v.poolImbalanceUsd ?? 50_000,
        poolShortUsd: 500_000,
      },
      { executionFee: 1_000_000_000_000_000n },
    );
    if (mask !== null && mask !== 0) reasons.push("SANCTUARY_INVARIANTS_WASM");
  }

  if (v.rpcUrl && reasons.some((r) => r.includes("HONEYPOT"))) {
    baseline.slippageLossUsd = Math.max(
      baseline.slippageLossUsd,
      v.orderSizeUsd * HONEYPOT_SIMULATED_SLIPPAGE,
    );
  }

  const failClosed = reasons.length > 0;
  const latencyUs = measureWasmOnly ? wasmLatencyUs : wasmLatencyUs;
  if (failClosed) {
    const prevented = baseline.slippageLossUsd + baseline.toxicFlowExposureUsd + baseline.gasWastedUsd;
    return {
      executed: false,
      failClosed: true,
      slippageLossUsd: 0,
      toxicFlowExposureUsd: 0,
      gasWastedUsd: 0,
      lossPreventedUsd: prevented,
      gasSavedUsd: baseline.gasWastedUsd,
      latencyUs,
      interceptReasons: reasons,
    };
  }
  return { ...baseline, failClosed: false, latencyUs, interceptReasons: [] };
}

export function wasmRuntimesReady(): { soil: boolean; sanctuary: boolean } {
  return { soil: isSoilWasmRuntimeReady(), sanctuary: ensureSanctuaryWasmRuntime() };
}
