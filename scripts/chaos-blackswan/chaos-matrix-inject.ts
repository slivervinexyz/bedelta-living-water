/** Named chaos injection scenarios. */
import {
  evaluateOracleLag,
  ORACLE_LAG_DEADLOCK_MS,
} from "../../src/services/risk/arbitrum-gas-guard";
import { SEQUENCER_GRACE_SEC } from "../../src/services/risk/sequencer-guard";
import { evaluateGmxPriceImpactSoilGate } from "../../src/services/yield/gmx-v2-price-impact";
import { blockedResult } from "./chaos-gate-helpers";
import { evaluateGatewayRules } from "./chaos-gateway-rules";
import {
  EVAL_MS,
  ILLIQUID_ORDER_IMPACT,
  ORACLE_LAG_SPIKE_MS,
  PRICE_IMPACT_TOXIC_BPS,
  SEQUENCER_DOWN_ANSWER,
} from "./chaos-context";
import {
  expectedMalformedPayloadPrefix,
  reasonMatchesExpectedPrefix,
} from "./chaos-matrix-expected";
import type { ChaosAttackResult } from "./chaos-types";

export function injectOracleLagSpike(): ChaosAttackResult {
  const lag = evaluateOracleLag(EVAL_MS - ORACLE_LAG_SPIKE_MS, EVAL_MS);
  const gw = evaluateGatewayRules({
    oracleUpdatedAtMs: EVAL_MS - ORACLE_LAG_SPIKE_MS,
    l2BlockTimestampMs: EVAL_MS,
  });
  const reasons = [lag.reason, ...gw.reasons].filter((r): r is string => Boolean(r));
  const blocked =
    lag.deadlock === true &&
    lag.lagMs === ORACLE_LAG_SPIKE_MS &&
    lag.lagMs > ORACLE_LAG_DEADLOCK_MS &&
    gw.failClosed &&
    reasons.some((r) => r.includes("ORACLE_LAG_DEADLOCK"));
  return blockedResult("oracle_lag_spike", "ORACLE_LAG_DEADLOCK", reasons, blocked);
}

export function injectPriceImpactToxicity(): ChaosAttackResult {
  const gate = evaluateGmxPriceImpactSoilGate(ILLIQUID_ORDER_IMPACT);
  const gw = evaluateGatewayRules({ gmxPenaltyBps: PRICE_IMPACT_TOXIC_BPS });
  const reasons = [...gate.reasons, ...gw.reasons];
  const blocked =
    gate.triggered &&
    gw.failClosed &&
    reasons.some((r) => r.startsWith("GMX_PRICE_IMPACT_PENALTY"));
  return blockedResult("price_impact_toxicity", "SOIL_TRIPPED", reasons, blocked);
}

export function injectSequencerDown(): ChaosAttackResult {
  const gw = evaluateGatewayRules({
    sequencerAnswer: SEQUENCER_DOWN_ANSWER,
    sequencerElapsedSec: 1,
  });
  const blocked =
    gw.failClosed &&
    gw.reasons.some((r) => r.includes("ARBITRUM_SEQUENCER_GRACE")) &&
    gw.reasons.some((r) => r.includes(`${SEQUENCER_GRACE_SEC}s`));
  return blockedResult("sequencer_down", "GRACE_FREEZE_600S", gw.reasons, blocked);
}

export function injectMalformedTelemetry(raw: string): ChaosAttackResult {
  const gw = evaluateGatewayRules({ payload: raw });
  const expectedReasonPrefix = expectedMalformedPayloadPrefix(raw);
  const reasonPrefixMatched = reasonMatchesExpectedPrefix(gw.reasons, expectedReasonPrefix);
  const blocked = gw.failClosed && !gw.crashed && reasonPrefixMatched;
  const reasons = gw.reasons.length ? gw.reasons : [expectedReasonPrefix];
  return {
    scenario: "malformed_telemetry",
    blocked,
    trigger: reasons[0] ?? "FAIL_CLOSED",
    capitalLossUsd: blocked ? 0 : 1,
    crashed: gw.crashed,
    reasons,
    expectedReasonPrefix,
    reasonPrefixMatched,
  };
}
