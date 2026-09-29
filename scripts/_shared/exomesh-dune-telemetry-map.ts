/** ExoMesh Dune telemetry — reason/venue mapping and economic estimators. */
import { MAX_ATTEMPTS_EXCEEDED_SEVERED } from "../../src/core/intent-mandate";
import { HONEYPOT_ACTIVE } from "../../src/services/defense/rpc-fetch-gate-lib/rpc-fetch-gate-eval";
import {
  DuneInterceptStatus,
  DuneInterceptType,
  DuneVenue,
  L2_GAS_SAVED_USD,
  LATENCY_SEED_US,
  POTENTIAL_LOSS_SAVED_RANGE_USD,
} from "./exomesh-dune-telemetry-types";

export function mapReasonToInterceptType(reason: string): DuneInterceptType {
  const r = reason.toUpperCase();
  if (
    r.includes(HONEYPOT_ACTIVE) ||
    r.includes("MALFORMED") ||
    r.includes("UNTRUSTED_TELEMETRY") ||
    r.includes("PAYLOAD_INFLATION")
  ) {
    return "HONEYPOT_DECOY";
  }
  if (
    r.includes("ORACLE") ||
    r.includes("SEQUENCER") ||
    r.includes("SOFT_CONFIRMATION") ||
    r.includes("TIMEBOOST")
  ) {
    return "OBSERVATORY_HAIRCUT";
  }
  if (
    r.includes("SESSION_KEY") ||
    r.includes("ROOT_PROTECTION") ||
    r.includes("ROOT17") ||
    r.includes("SAGA") ||
    r.includes("R20") ||
    r.includes(MAX_ATTEMPTS_EXCEEDED_SEVERED) ||
    r.includes("CHANNEL_SEVERED")
  ) {
    return "MAX_ATTEMPTS_SEVERED";
  }
  return "SOIL_RESISTANCE_TRIP";
}

export function mapRetailCodeToInterceptType(code: string): DuneInterceptType {
  const upper = code.toUpperCase();
  if (upper.includes("MAX_ATTEMPTS") || upper.includes("CHANNEL_SEVERED")) {
    return "MAX_ATTEMPTS_SEVERED";
  }
  if (upper.includes("RPC_TRANSPORT") || upper.includes("HONEYPOT")) {
    return "HONEYPOT_DECOY";
  }
  if (upper.includes("SLIPPAGE") || upper.includes("DEPTH")) {
    return "SOIL_RESISTANCE_TRIP";
  }
  return mapReasonToInterceptType(upper);
}

export function resolveVenueFromSignal(reason: string, scenarioGroup?: string): DuneVenue {
  const r = reason.toUpperCase();
  if (r.includes("GMX") || r.includes("ARBITRUM_GAS") || r.includes("SEQUENCER")) return "gmx";
  if (r.includes("PENDLE") || r.includes("PT_") || r.includes("SHADOW_MARGIN")) return "pendle";
  if (r.includes("ORACLE") || r.includes("USDC_DEPEG")) return "usdai";
  if (r.includes("CROSS_VENUE") || r.includes("BLACK_SWAN") || r.includes("VARIATIONAL")) {
    return "variational";
  }
  if (r.includes("HL") || r.includes("HYPERLIQUID") || r.includes("DYDX")) return "hyperliquid";
  switch (scenarioGroup) {
    case "B":
    case "E":
      return "gmx";
    case "F":
    case "G":
      return "hyperliquid";
    case "H":
      return "variational";
    case "I":
      return "usdai";
    case "J":
      return "pendle";
    default:
      return "gmx";
  }
}

export function estimateGasSavedUsd(
  _interceptType: DuneInterceptType,
  status: DuneInterceptStatus = "FAIL_CLOSED",
): number {
  return status === "FAIL_CLOSED" ? L2_GAS_SAVED_USD : 0;
}

export function estimatePotentialLossSavedUsd(
  interceptType: DuneInterceptType,
  seed: number,
  status: DuneInterceptStatus = "FAIL_CLOSED",
): number {
  if (status !== "FAIL_CLOSED") return 0;
  const [min, max] = POTENTIAL_LOSS_SAVED_RANGE_USD[interceptType];
  const span = max - min;
  return Math.round(min + ((seed % 97) / 97) * span);
}

export function seedReflexLatencyUs(interceptType: DuneInterceptType, seed: number): number {
  const base = LATENCY_SEED_US[interceptType];
  const jitter = (seed % 97) * 0.07;
  return Math.round((base + jitter) * 10) / 10;
}
