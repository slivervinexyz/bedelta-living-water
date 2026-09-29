/** v1.0 Santenmoku stress harness — deterministic Arbitrum probe seeding. */
import { __resetCircuitBreakerForTests } from "../../src/services/circuit-breaker";
import { __resetCircuitBreakerSeverForTests } from "../../src/services/root-protection-lib/circuit-breaker-sever";
import {
  __resetArbitrumGasGuardForTests,
  __setArbitrumGasGuardForTests,
  GAS_SURCHARGE_YIELD_RATIO,
  ORACLE_LAG_DEADLOCK_MS,
} from "../../src/services/risk/arbitrum-gas-guard";
import {
  __resetSequencerGuardCacheForTests,
  __setSequencerProbeForTests,
  SEQUENCER_GRACE_SEC,
} from "../../src/services/risk/sequencer-guard";
import {
  __resetSoftConfirmationGuardForTests,
  __setSoftConfirmationProbeForTests,
} from "../../src/services/risk/soft-confirmation-guard";

export { ORACLE_LAG_DEADLOCK_MS };
export const SAFE_AT = new Date("2026-07-25T06:00:00.000Z");

export function resetProbes(now: number, sequencerDown = false): void {
  __resetCircuitBreakerForTests();
  __resetCircuitBreakerSeverForTests();
  __resetSequencerGuardCacheForTests();
  __resetArbitrumGasGuardForTests();
  __resetSoftConfirmationGuardForTests();
  const sec = Math.floor(now / 1000);
  __setSequencerProbeForTests(
    sequencerDown
      ? {
          answer: 1,
          startedAtSec: sec - 900,
          updatedAtSec: sec,
          fetchedAtMs: now,
          safe: false,
          reason: "ARBITRUM_SEQUENCER_DOWN",
        }
      : {
          answer: 0,
          startedAtSec: sec - SEQUENCER_GRACE_SEC - 1,
          updatedAtSec: sec,
          fetchedAtMs: now,
          safe: true,
          reason: null,
        },
  );
  __setSoftConfirmationProbeForTests({
    l2LatestBlock: 1_000_020,
    l1FinalizedBatchBlock: 1_000_000,
    driftBlocks: 20,
    fetchedAtMs: now,
    safe: true,
    reason: null,
  });
  setOracleLag(now, 95);
}

export function setGasSurchargeRatio(now: number, ratio: number): void {
  const targetYieldUsd = 0.03;
  const blocked = ratio > GAS_SURCHARGE_YIELD_RATIO;
  __setArbitrumGasGuardForTests({
    l1BaseFeeWei: 25_000_000_000n,
    l1SurchargeWei: 1_000_000_000_000_000n,
    l1SurchargeUsd: targetYieldUsd * ratio,
    targetYieldUsd,
    gasYieldRatio: ratio,
    gasBlocked: blocked,
    oracleUpdatedAtMs: now - 95,
    l2BlockTimestampMs: now,
    oracleLagMs: 95,
    oracleLagDeadlock: false,
    reason: blocked ? `ARBITRUM_GAS_SURCHARGE:${(ratio * 100).toFixed(2)}%>30%` : null,
    fetchedAtMs: now,
  });
}

export function setInvalidOracleTimestamp(now: number): void {
  __setArbitrumGasGuardForTests({
    l1BaseFeeWei: 25_000_000_000n,
    l1SurchargeWei: 1_000_000_000_000_000n,
    l1SurchargeUsd: 0.002,
    targetYieldUsd: 0.03,
    gasYieldRatio: 0.05,
    gasBlocked: false,
    oracleUpdatedAtMs: 0,
    l2BlockTimestampMs: now,
    oracleLagMs: 0,
    oracleLagDeadlock: true,
    reason: "INVALID_ORACLE_TIMESTAMP_FAIL_CLOSED",
    fetchedAtMs: now,
  });
}

export function setOracleFutureSkew(now: number, skewMs: number): void {
  __setArbitrumGasGuardForTests({
    l1BaseFeeWei: 25_000_000_000n,
    l1SurchargeWei: 1_000_000_000_000_000n,
    l1SurchargeUsd: 0.002,
    targetYieldUsd: 0.03,
    gasYieldRatio: 0.05,
    gasBlocked: false,
    oracleUpdatedAtMs: now + skewMs,
    l2BlockTimestampMs: now,
    oracleLagMs: skewMs,
    oracleLagDeadlock: skewMs > ORACLE_LAG_DEADLOCK_MS,
    reason:
      skewMs > ORACLE_LAG_DEADLOCK_MS
        ? `ORACLE_LAG_DEADLOCK:${skewMs}ms>${ORACLE_LAG_DEADLOCK_MS}ms`
        : null,
    fetchedAtMs: now,
  });
}

export function setOracleLag(now: number, lagMs: number): void {
  __setArbitrumGasGuardForTests({
    l1BaseFeeWei: 25_000_000_000n,
    l1SurchargeWei: 1_000_000_000_000_000n,
    l1SurchargeUsd: 0.002,
    targetYieldUsd: 0.03,
    gasYieldRatio: 0.05,
    gasBlocked: false,
    oracleUpdatedAtMs: now - lagMs,
    l2BlockTimestampMs: now,
    oracleLagMs: lagMs,
    oracleLagDeadlock: lagMs > ORACLE_LAG_DEADLOCK_MS,
    reason:
      lagMs > ORACLE_LAG_DEADLOCK_MS
        ? `ORACLE_LAG_DEADLOCK:${lagMs}ms>${ORACLE_LAG_DEADLOCK_MS}ms`
        : null,
    fetchedAtMs: now,
  });
}

export function muteConsole(): () => void {
  const sinks = ["warn", "log", "error"] as const;
  const orig = sinks.map((k) => console[k]);
  for (const k of sinks) console[k] = () => {};
  return () => {
    for (let i = 0; i < sinks.length; i++) console[sinks[i]!] = orig[i]!;
  };
}
