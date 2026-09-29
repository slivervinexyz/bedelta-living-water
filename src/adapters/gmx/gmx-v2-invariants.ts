/** GMX v2 pool imbalance & collateral reserve boundary constants. */
import {
  FLAGS_COLLATERAL_TRIP,
  FLAGS_IMBALANCE_TRIP,
  GMX_COLLATERAL_MIN,
  GMX_IMBALANCE_MAX,
  PROTO_VECT_LEN,
  evaluateGmxFlags,
  packProtocolLane,
} from "../../core/risk-engine-core";
import { checkSoilResistance, type SoilResistanceInput } from "../../services/risk-control";

export const GMX_POOL_IMBALANCE_MAX_RATIO = GMX_IMBALANCE_MAX;
export const GMX_COLLATERAL_RESERVE_MIN_RATIO = GMX_COLLATERAL_MIN;

const GMX_VEC = new Float64Array(PROTO_VECT_LEN);

export function computeGmxPoolImbalanceRatio(input: {
  oiLongUsd: number;
  oiShortUsd: number;
  poolTvlUsd: number;
}): number {
  const tvl = Number(input.poolTvlUsd);
  if (!Number.isFinite(tvl) || tvl <= 0) return Number.POSITIVE_INFINITY;
  return Math.abs(Number(input.oiLongUsd) - Number(input.oiShortUsd)) / tvl;
}

export function verifyGmxPoolImbalance(input: {
  oiLongUsd: number;
  oiShortUsd: number;
  poolTvlUsd: number;
  skewDeltaUsd?: number;
  notionalUsd?: number;
  nowMs?: number;
}): { ok: boolean; imbalanceRatio: number; reasons: string[] } {
  const imbalanceRatio = computeGmxPoolImbalanceRatio(input);
  const flags = evaluateGmxFlags(
    packProtocolLane(0, input.oiLongUsd, input.oiShortUsd, input.poolTvlUsd, 0, GMX_VEC),
    0,
    input.skewDeltaUsd !== undefined
      ? { skewDeltaUsd: input.skewDeltaUsd, notionalUsd: input.notionalUsd, nowMs: input.nowMs }
      : undefined,
  );
  const reasons: string[] = [];
  if (flags & FLAGS_IMBALANCE_TRIP) {
    reasons.push(`GMX_POOL_IMBALANCE_BREACH:ratio=${imbalanceRatio.toFixed(4)}>${GMX_POOL_IMBALANCE_MAX_RATIO}`);
  }
  return { ok: reasons.length === 0, imbalanceRatio, reasons };
}

export function verifyGmxCollateralReserve(input: {
  collateralReserveRatio: number;
}): { ok: boolean; reasons: string[] } {
  const ratio = Number(input.collateralReserveRatio);
  const flags = evaluateGmxFlags(packProtocolLane(0, 0, 0, 0, ratio, GMX_VEC));
  const reasons: string[] = [];
  if (flags & FLAGS_COLLATERAL_TRIP) {
    reasons.push(`GMX_COLLATERAL_RESERVE_BREACH:ratio=${ratio.toFixed(4)}<${GMX_COLLATERAL_RESERVE_MIN_RATIO}`);
  }
  return { ok: reasons.length === 0, reasons };
}

export interface GmxV2PoolGuardInput {
  oiLongUsd: number;
  oiShortUsd: number;
  poolTvlUsd: number;
  collateralReserveRatio?: number;
  skewDeltaUsd?: number;
  notionalUsd?: number;
  symbol?: string;
  refPriceUsd?: number;
  spotPriceUsd?: number;
  depthUsd?: number;
  nowMs?: number;
}

export interface GmxV2PoolGuardResult {
  ok: boolean;
  status: "ALLOW" | "FAIL_CLOSED";
  reasons: string[];
  imbalanceOk: boolean;
  reserveOk: boolean;
  soilOk: boolean;
}

function buildGmxSoilInput(input: GmxV2PoolGuardInput): SoilResistanceInput {
  const ref = input.refPriceUsd ?? 3500;
  const spot = input.spotPriceUsd ?? ref;
  return {
    symbol: input.symbol ?? "ETH",
    hlSpot: ref,
    hlPerp: spot,
    dydxPerp: ref,
    depthUsd: input.depthUsd ?? input.poolTvlUsd,
    orderSizeUsd: input.notionalUsd ?? 0,
    at: new Date(input.nowMs ?? Date.now()),
    disableThresholdJitter: true,
  };
}

/** Pre-consensus GMX v2 guard — pool invariants + checkSoilResistance() before GM broadcast. */
export function evaluateGmxV2PoolGuard(input: GmxV2PoolGuardInput): GmxV2PoolGuardResult {
  const reasons: string[] = [];
  const imbalance = verifyGmxPoolImbalance(input);
  if (!imbalance.ok) reasons.push(...imbalance.reasons);
  let reserveOk = true;
  if (input.collateralReserveRatio !== undefined) {
    const reserve = verifyGmxCollateralReserve({ collateralReserveRatio: input.collateralReserveRatio });
    reserveOk = reserve.ok;
    if (!reserve.ok) reasons.push(...reserve.reasons);
  }
  const soilProbe = checkSoilResistance(buildGmxSoilInput(input));
  const soilOk = soilProbe.ok;
  if (!soilOk) reasons.push("SOIL_RESISTANCE_TRIP", ...soilProbe.reasons);
  const ok = imbalance.ok && reserveOk && soilOk;
  return {
    ok,
    status: ok ? "ALLOW" : "FAIL_CLOSED",
    reasons: [...new Set(reasons)],
    imbalanceOk: imbalance.ok,
    reserveOk,
    soilOk,
  };
}
