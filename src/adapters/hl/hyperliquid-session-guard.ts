/** Hyperliquid L1 session-key & orderbook guard constants. */
import {
  FLAGS_HL_RATE,
  FLAGS_HL_SESSION,
  FLAGS_HL_SIZE,
  FLAGS_HL_SPREAD,
  HL_RATE_LIMIT_RPM,
  HL_SPREAD_MAX_BPS,
  evaluateHlSessionFlags,
} from "../../core/risk-engine-core";
import { checkSoilResistance, type SoilResistanceInput } from "../../services/risk-control";
import { SESSION_KEY_NOTIONAL_CAP_USD } from "../../services/session-key-adapter-lib/session-key-types";

export const HL_ORDERBOOK_SPREAD_MAX_BPS = HL_SPREAD_MAX_BPS;
export const HL_SESSION_MAX_SIZE_PER_ORDER_USD = SESSION_KEY_NOTIONAL_CAP_USD;
export const HL_SESSION_RATE_LIMIT_PER_MIN = HL_RATE_LIMIT_RPM;

export interface HyperliquidSessionGuardInput {
  orderSizeUsd: number;
  maxOrderSizeUsd?: number;
  spreadBps: number;
  requestsInLastMinute?: number;
  sessionKeyValid: boolean;
  /** Cross-venue soil probe — wires checkSoilResistance() before session broadcast. */
  symbol?: string;
  refPriceUsd?: number;
  spotPriceUsd?: number;
  depthUsd?: number;
  nowMs?: number;
  /** Skip Wasm soil fuse (unit tests for session bitmask only). */
  skipSoilProbe?: boolean;
}

export interface HyperliquidSessionGuardResult {
  ok: boolean;
  status: "ALLOW" | "FAIL_CLOSED";
  reasons: string[];
  soilOk?: boolean;
}

function buildHlSoilInput(input: HyperliquidSessionGuardInput): SoilResistanceInput {
  const ref = input.refPriceUsd ?? 3500;
  const spot = input.spotPriceUsd ?? ref;
  return {
    symbol: input.symbol ?? "ETH",
    hlSpot: ref,
    hlPerp: spot,
    dydxPerp: ref,
    depthUsd: input.depthUsd ?? 200_000,
    orderSizeUsd: input.orderSizeUsd,
    at: new Date(input.nowMs ?? Date.now()),
    disableThresholdJitter: true,
  };
}

export function evaluateHyperliquidSessionGuard(
  input: HyperliquidSessionGuardInput,
): HyperliquidSessionGuardResult {
  const maxSize = input.maxOrderSizeUsd ?? HL_SESSION_MAX_SIZE_PER_ORDER_USD;
  const flags = evaluateHlSessionFlags(
    input.sessionKeyValid,
    input.orderSizeUsd,
    maxSize,
    input.spreadBps,
    input.requestsInLastMinute ?? 0,
  );
  const ok = flags === 0;
  const reasons: string[] = [];
  if (flags & FLAGS_HL_SESSION) reasons.push("HL_SESSION_KEY_INVALID");
  if (flags & FLAGS_HL_SIZE) reasons.push(`HL_MAX_SIZE_PER_ORDER_BREACH:size=${input.orderSizeUsd}>${maxSize}`);
  if (flags & FLAGS_HL_SPREAD) reasons.push(`HL_ORDERBOOK_SPREAD_BREACH:spreadBps=${input.spreadBps}>${HL_ORDERBOOK_SPREAD_MAX_BPS}`);
  if (flags & FLAGS_HL_RATE) {
    const rpm = input.requestsInLastMinute ?? 0;
    reasons.push(`HL_RATE_LIMIT_BREACH:rpm=${rpm}>${HL_SESSION_RATE_LIMIT_PER_MIN}`);
  }

  let soilOk = true;
  if (!input.skipSoilProbe) {
    const soilProbe = checkSoilResistance(buildHlSoilInput(input));
    soilOk = soilProbe.ok;
    if (!soilOk) reasons.push("SOIL_RESISTANCE_TRIP", ...soilProbe.reasons);
  }

  const passed = ok && soilOk;
  return { ok: passed, status: passed ? "ALLOW" : "FAIL_CLOSED", reasons, soilOk };
}
