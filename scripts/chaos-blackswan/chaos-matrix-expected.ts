/** Expected reason prefixes for matrix assertions. */
import { MALFORMED_PAYLOADS } from "./chaos-context";
import { poisonPayloadForId } from "./chaos-matrix-spec";

export function expectedMalformedPayloadPrefix(raw: string): string {
  try {
    JSON.parse(raw);
    return "UNTRUSTED_TELEMETRY_FAIL_CLOSED";
  } catch {
    return "MALFORMED_JSON_FAIL_CLOSED";
  }
}

/** Spec-asserted reason prefix for each matrix id (1–255) — prevents false-negative masking. */
export function expectedReasonPrefixForId(id: number): string {
  if (id <= 20) return "ORACLE_LAG_DEADLOCK";
  if (id <= 25) return "ORACLE_TIMESTAMP_STALE_FAIL_CLOSED";
  if (id === 26) return "DEPTH_USD=";
  if (id <= 40) return "GMX_PRICE_IMPACT_PENALTY";
  if (id <= 45) return "DEPTH_USD=";
  if (id <= 50) return "CROSS_VENUE_SLIPPAGE=";
  if (id <= 58) return "ARBITRUM_SEQUENCER_DOWN";
  if (id <= 67) return "ARBITRUM_SEQUENCER_GRACE";
  if (id === 68) return "ARBITRUM_GAS_SURCHARGE";
  if (id <= 75) return "ARBITRUM_GAS_SURCHARGE";
  if (id <= 85) return "ORACLE_LAG_DEADLOCK";
  if (id <= 92) return "ARBITRUM_SEQUENCER_DOWN";
  if (id <= 100) return "ARBITRUM_SEQUENCER_GRACE";
  if (id <= 108) return "SESSION_KEY_CLIP:";
  if (id <= 125) return "ROOT_PROTECTION_TRIP";
  if (id === 140) return "PAYLOAD_INFLATION_FAIL_CLOSED";
  if (id <= 135) return expectedMalformedPayloadPrefix(poisonPayloadForId(id));
  if (id <= 145) return "MALFORMED_JSON_FAIL_CLOSED";
  if (id <= 150) {
    const raw = MALFORMED_PAYLOADS[(id - 146) % MALFORMED_PAYLOADS.length]!;
    return expectedMalformedPayloadPrefix(raw);
  }
  if (id <= 160) return "CROSS_VENUE_SLIPPAGE=";
  if (id <= 168) return "SLIPPAGE=";
  if (id <= 175) return "R20_PHYSICAL_DEADLOCK";
  if (id <= 185) return "ORACLE_LAG_DEADLOCK";
  if (id <= 192) return "SOFT_CONFIRMATION_DRIFT_DEADLOCK";
  if (id <= 200) return "ARBITRUM_SEQUENCER_DOWN";
  if (id <= 208) return "ARBITRUM_SEQUENCER_PROBE_MISSING";
  if (id <= 216) return "PAYLOAD_INFLATION_FAIL_CLOSED";
  if (id <= 225) return "GMX_PRICE_IMPACT_PENALTY";
  if (id <= 235) return "ROOT17_DAILY_LOSS_EXCEEDED";
  if (id <= 242) return "R20_PHYSICAL_DEADLOCK";
  if (id <= 248) return "ROOT_PROTECTION_TRIP";
  return "ORACLE_LAG_DEADLOCK";
}

export function reasonMatchesExpectedPrefix(
  reasons: string[],
  expectedReasonPrefix: string,
): boolean {
  return reasons.some(
    (reason) => reason.startsWith(expectedReasonPrefix) || reason.includes(expectedReasonPrefix),
  );
}
