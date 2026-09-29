/** Malformed / inflated telemetry payload defense — split from gateway rules. */
import { checkSoilResistance } from "../../src/services/risk-control";
import { HEALTHY_SOIL } from "./chaos-context";
import type { GatewayRuleInput } from "./chaos-types";

export function appendPayloadDefenseReasons(
  reasons: string[],
  input: GatewayRuleInput,
): void {
  if ((input.payloadBytes ?? 0) > 1_000_000) {
    reasons.push("PAYLOAD_INFLATION_FAIL_CLOSED");
  }
  if (input.payload === undefined) return;
  try {
    const parsed = JSON.parse(input.payload) as unknown;
    try {
      checkSoilResistance(parsed as typeof HEALTHY_SOIL);
    } catch {
      reasons.push("SOIL_EVAL_FAIL_CLOSED");
    }
    reasons.push("UNTRUSTED_TELEMETRY_FAIL_CLOSED");
  } catch {
    reasons.push("MALFORMED_JSON_FAIL_CLOSED");
  }
}
