import { PGATE_MAX_LATENCY_MS } from "../execution";
import {
  checkSoilResistance,
  type SoilResistanceInput,
  type SoilResistanceResult,
} from "../../../services/risk-control";
import type { SigningGateInput } from "../auth";
import { WS_STALE_THRESHOLD_MS, type WsHealthSnapshot } from "./types";

/** Evaluate WS health against Pgate latency / connectivity iron rules */
export function evaluateWsTripReasons(health: WsHealthSnapshot): string[] {
  const reasons: string[] = [];
  if (!health.connected) {
    reasons.push("WS_DISCONNECTED");
  }
  if (health.stale) {
    reasons.push(`WS_STALE_NO_ACTIVITY>${WS_STALE_THRESHOLD_MS}ms`);
  }
  if (
    health.latencyMs !== null &&
    health.latencyMs > PGATE_MAX_LATENCY_MS
  ) {
    reasons.push(
      `WS_LATENCY_MS=${health.latencyMs}>${PGATE_MAX_LATENCY_MS}`,
    );
  }
  return reasons;
}

/**
 * Merge WS health with optional venue soil input — tripped when either fails.
 * Use `gate.soilResistanceTripped` to block signing pipeline on stale WS data.
 */
export function evaluateWsSoilResistance(
  health: WsHealthSnapshot,
  baseInput?: SoilResistanceInput,
): SoilResistanceResult & { gate: SigningGateInput } {
  const wsReasons = evaluateWsTripReasons(health);
  const base = baseInput
    ? checkSoilResistance(baseInput)
    : ({
        ok: true,
        tripped: false,
        crossVenueSlippage: 0,
        spotPerpSlippage: 0,
        reasons: [],
      } satisfies SoilResistanceResult);

  const reasons = [...wsReasons, ...base.reasons];
  const tripped = wsReasons.length > 0 || base.tripped;

  return {
    ok: !tripped,
    tripped,
    crossVenueSlippage: base.crossVenueSlippage,
    spotPerpSlippage: base.spotPerpSlippage,
    reasons,
    gate: {
      soilResistanceTripped: tripped,
      symbol: baseInput?.symbol ?? "HL_WS",
    },
  };
}
