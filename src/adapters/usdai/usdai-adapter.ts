/**
 * USD.ai — AI-compute yield-bearing collateral pre-flight guard (Pillar 3).
 * Decoupled GPU RWA oracle freshness · sUSDai peg · liquidity depth · soil fuse.
 */
import { checkSoilResistance, type SoilResistanceInput } from "../../services/risk-control";
import {
  USDAI_ARBITRUM_CHAIN_ID,
  resolveUsdAiClockSsot,
  type UsdaiSoilInput,
} from "./usdai-constants";
import { verifyUsdAiLiquidityDepth, verifyUsdAiOracle } from "./usdai-soil-gate";

export {
  USDAI_ARBITRUM_CHAIN_ID,
  USDAI_MIN_LIQUIDITY_DEPTH_USD,
  USDAI_NAV_DEVIATION_MAX_BPS,
  USDAI_ORACLE_MAX_AGE_MS,
  USDAI_PEG_DRIFT_MAX_BPS,
  USD_AI_DEPEG_ORACLE_TRIP,
  CLOCK_SKEW_EXCEEDED,
  USDAI_CLOCK_SKEW_MAX_MS,
  type UsdaiSoilInput,
} from "./usdai-constants";
export { packUsdAiProtocolLane, resolveUsdAiProtocolMask, formatUsdAiFlagMask } from "./usdai-protocol-lane";
export {
  computeUsdAiNavDeviationBps,
  computeUsdAiPegDriftBps,
  evaluateUsdAiSoilGate,
  verifyUsdAiLiquidityDepth,
  verifyUsdAiOracle,
  type UsdaiOracleCheckResult,
} from "./usdai-soil-gate";

export interface UsdaiCollateralInput extends UsdaiSoilInput {
  chainId: number;
  collateralSymbol?: string;
  agentId?: string;
  at?: Date;
}

export interface UsdaiCollateralGuardResult {
  ok: boolean;
  status: "ALLOW" | "FAIL_CLOSED";
  reasons: string[];
  oracleOk: boolean;
  depthOk: boolean;
  soilOk: boolean;
  latencyUs: number;
}

function buildUsdAiSoilInput(input: UsdaiCollateralInput): SoilResistanceInput {
  return {
    symbol: input.collateralSymbol ?? "sUSDai",
    hlSpot: input.susdaiPriceUsd,
    hlPerp: input.gpuMarkUsd,
    dydxPerp: input.navUsd,
    depthUsd: Math.max(0, input.liquidityDepthUsd - (input.amountUsd ?? 0)),
    orderSizeUsd: input.amountUsd,
    at: input.at ?? new Date(input.nowMs ?? Date.now()),
    disableThresholdJitter: true,
    usdai: input,
  };
}

export function evaluateUsdAiCollateralGuard(
  input: UsdaiCollateralInput,
): UsdaiCollateralGuardResult {
  const clock = resolveUsdAiClockSsot(input);
  const t0 = performance.now();
  if (clock.tripped) {
    return {
      ok: false,
      status: "FAIL_CLOSED",
      reasons: [...clock.reasons],
      oracleOk: false,
      depthOk: false,
      soilOk: false,
      latencyUs: (performance.now() - t0) * 1000,
    };
  }
  const clocked = clock.input;
  const reasons: string[] = [];

  if (clocked.chainId !== USDAI_ARBITRUM_CHAIN_ID) {
    reasons.push(`USDAI_CHAIN_UNSUPPORTED:chainId=${clocked.chainId}`);
  }

  const oracle = verifyUsdAiOracle({ ...clocked, nowMs: clocked.nowMs });
  if (!oracle.ok) reasons.push(...oracle.reasons);

  const depth = verifyUsdAiLiquidityDepth(clocked.liquidityDepthUsd, clocked.amountUsd ?? 0);
  if (!depth.ok) reasons.push(...depth.reasons);

  const soilProbe = checkSoilResistance(buildUsdAiSoilInput(clocked));
  const soilOk = soilProbe.ok;
  if (!soilOk) reasons.push("SOIL_RESISTANCE_TRIP", ...soilProbe.reasons);

  const ok = reasons.length === 0 && soilOk;

  return {
    ok,
    status: ok ? "ALLOW" : "FAIL_CLOSED",
    reasons: [...new Set(reasons)],
    oracleOk: oracle.ok,
    depthOk: depth.ok,
    soilOk,
    latencyUs: (performance.now() - t0) * 1000,
  };
}
