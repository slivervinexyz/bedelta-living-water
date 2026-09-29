/** Chaos gate arm/reset helpers. */
import { evaluateOracleLag } from "../../src/services/risk/arbitrum-gas-guard";
import {
  __resetArbitrumGasGuardForTests,
  __setArbitrumGasGuardForTests,
} from "../../src/services/risk/arbitrum-gas-guard";
import {
  __resetSequencerGuardCacheForTests,
  __setSequencerProbeForTests,
  SEQUENCER_GRACE_SEC,
} from "../../src/services/risk/sequencer-guard";
import { __setSoftConfirmationProbeForTests } from "../../src/services/risk/soft-confirmation-guard";
import {
  HardlockError,
  RiskLimitExceeded,
} from "../../src/services/risk-control";
import { EVAL_MS, EVAL_SEC } from "./chaos-context";
import type { ChaosAttackResult, ChaosScenarioId } from "./chaos-types";

export function armPassThroughGates(): void {
  __resetArbitrumGasGuardForTests();
  __setSequencerProbeForTests({
    answer: 0,
    startedAtSec: EVAL_SEC - SEQUENCER_GRACE_SEC - 1,
    updatedAtSec: EVAL_SEC,
    fetchedAtMs: EVAL_MS,
    safe: true,
    reason: null,
  });
  __setSoftConfirmationProbeForTests({
    l2LatestBlock: 1_000_020,
    l1FinalizedBatchBlock: 1_000_000,
    driftBlocks: 20,
    fetchedAtMs: EVAL_MS,
    safe: true,
    reason: null,
  });
}

export function resetGates(): void {
  __resetArbitrumGasGuardForTests();
  __resetSequencerGuardCacheForTests();
  __setSoftConfirmationProbeForTests(null);
}

export function blockedResult(
  scenario: ChaosScenarioId,
  trigger: string,
  reasons: string[],
  blocked: boolean,
  id?: number,
  meta?: Pick<ChaosAttackResult, "expectedReasonPrefix" | "reasonPrefixMatched" | "crashed">,
): ChaosAttackResult {
  return {
    scenario,
    id,
    blocked,
    trigger,
    capitalLossUsd: blocked ? 0 : 1,
    crashed: meta?.crashed ?? false,
    reasons,
    expectedReasonPrefix: meta?.expectedReasonPrefix,
    reasonPrefixMatched: meta?.reasonPrefixMatched,
  };
}

const HANDLED_FAIL_CLOSED_ERROR_MARKERS = [
  "FAIL_CLOSED",
  "DEADLOCK",
  "TRIP",
  "SOIL",
  "UNSAFE",
] as const;

function isHandledFailClosedError(err: unknown): boolean {
  if (err instanceof HardlockError || err instanceof RiskLimitExceeded) return true;
  if (err instanceof SyntaxError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return HANDLED_FAIL_CLOSED_ERROR_MARKERS.some((marker) => msg.includes(marker));
}

export function classifyGatewayIsolateError(err: unknown): {
  failClosed: boolean;
  reasons: string[];
  crashed: boolean;
} {
  if (err instanceof HardlockError) {
    return { failClosed: true, reasons: ["R20_PHYSICAL_DEADLOCK"], crashed: false };
  }
  if (err instanceof RiskLimitExceeded) {
    return { failClosed: true, reasons: ["ROOT_PROTECTION_TRIP"], crashed: false };
  }
  if (isHandledFailClosedError(err)) {
    const msg = err instanceof Error ? err.message : String(err);
    return { failClosed: true, reasons: [msg], crashed: false };
  }
  return { failClosed: true, reasons: ["ISOLATE_CRASH_FAIL_CLOSED"], crashed: true };
}

export function setOracleGuard(lag: ReturnType<typeof evaluateOracleLag>): void {
  __setArbitrumGasGuardForTests({
    l1BaseFeeWei: 1n,
    l1SurchargeWei: 1n,
    l1SurchargeUsd: 0.001,
    targetYieldUsd: 0.1,
    gasYieldRatio: 0.01,
    gasBlocked: false,
    oracleUpdatedAtMs: EVAL_MS - lag.lagMs,
    l2BlockTimestampMs: EVAL_MS,
    oracleLagMs: lag.lagMs,
    oracleLagDeadlock: lag.deadlock,
    reason: lag.reason,
    fetchedAtMs: EVAL_MS,
  });
}

export function setGasGuard(reason: string, ratio: number): void {
  __setArbitrumGasGuardForTests({
    l1BaseFeeWei: 1n,
    l1SurchargeWei: 1n,
    l1SurchargeUsd: 1,
    targetYieldUsd: 0.01,
    gasYieldRatio: ratio,
    gasBlocked: true,
    oracleUpdatedAtMs: EVAL_MS,
    l2BlockTimestampMs: EVAL_MS,
    oracleLagMs: 0,
    oracleLagDeadlock: false,
    reason,
    fetchedAtMs: EVAL_MS,
  });
}
