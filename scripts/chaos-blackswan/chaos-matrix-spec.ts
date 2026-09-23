/** Per-id gateway rule specs for 255-case matrix. */
import { SESSION_KEY_CLIP_USD } from "../../src/services/risk/session-audit";
import { ORACLE_LAG_DEADLOCK_MS } from "../../src/services/risk/arbitrum-gas-guard";
import { SOFT_CONFIRMATION_DRIFT_MAX_BLOCKS } from "../../src/services/risk/soft-confirmation-guard";
import {
  EVAL_MS,
  MALFORMED_PAYLOADS,
  ORACLE_LAG_SPIKE_MS,
} from "./chaos-context";
import type { ChaosGroup, GatewayRuleInput } from "./chaos-types";

export function groupForId(id: number): ChaosGroup {
  if (id <= 25) return "A";
  if (id <= 50) return "B";
  if (id <= 75) return "C";
  if (id <= 100) return "D";
  if (id <= 125) return "E";
  if (id <= 150) return "F";
  if (id <= 175) return "G";
  if (id <= 200) return "H";
  if (id <= 225) return "I";
  return "J";
}

function specForId(id: number): GatewayRuleInput {
  if (id <= 15) {
    return { oracleUpdatedAtMs: EVAL_MS - (ORACLE_LAG_DEADLOCK_MS + id), l2BlockTimestampMs: EVAL_MS };
  }
  if (id <= 20) {
    return { oracleUpdatedAtMs: EVAL_MS, l2BlockTimestampMs: EVAL_MS - (ORACLE_LAG_DEADLOCK_MS + id) };
  }
  if (id <= 25) return { oracleUpdatedAtMs: 0, l2BlockTimestampMs: EVAL_MS };

  if (id <= 40) {
    const bps = id === 26 ? 49.9 : 50 + (id - 26) * 18;
    return { gmxPenaltyBps: bps, depthUsd: id === 26 ? 1_000 : 200_000 };
  }
  if (id <= 45) return { depthUsd: id * 100 };
  if (id <= 50) return { hlPerp: 3500, dydxPerp: 3500 * (1 + 0.006 + (id - 46) * 0.01) };

  if (id <= 58) return { sequencerAnswer: 1, sequencerElapsedSec: 0 };
  if (id <= 67) return { sequencerAnswer: 0, sequencerElapsedSec: id === 67 ? 599 : Math.max(1, (id - 58) * 60) };
  if (id === 68) return { sequencerAnswer: 0, sequencerElapsedSec: 601, l1SurchargeUsd: 1, targetYieldUsd: 0.1 };
  if (id <= 75) return { l1SurchargeUsd: 1 + (id - 69), targetYieldUsd: 0.1 };

  if (id <= 85) {
    return {
      oracleUpdatedAtMs: EVAL_MS - ORACLE_LAG_SPIKE_MS,
      l2BlockTimestampMs: EVAL_MS,
      gmxPenaltyBps: 55 + id,
    };
  }
  if (id <= 92) return { sequencerAnswer: 1, hlPerp: 3500, dydxPerp: 3800 };
  if (id <= 100) {
    return {
      sequencerElapsedSec: 10,
      l1SurchargeUsd: 5,
      targetYieldUsd: 0.1,
      gmxPenaltyBps: 80,
    };
  }

  if (id <= 108) return { orderSizeUsd: SESSION_KEY_CLIP_USD + id };
  if (id <= 116) return { estimatedLossUsd: 500 + id, accountBalanceUsd: 10_000 };
  if (id <= 125) return { sagaRetries: 3 + (id - 117), estimatedLossUsd: 250, accountBalanceUsd: 10_000 };

  if (id === 140) return { payloadBytes: 10_000_000, payload: '{"flood":true}' };
  if (id <= 135) {
    const poison = [
      "' OR 1=1 --",
      "'; DROP TABLE orders; --",
      '{"__proto__":{"polluted":true}}',
      '{"constructor":{"prototype":{"admin":true}}}',
      '{"hlSpot":NaN}',
    ];
    return { payload: poison[(id - 126) % poison.length]! };
  }
  if (id <= 145) return { payload: `\u0000${"x".repeat(id)}{` };
  return { payload: MALFORMED_PAYLOADS[(id - 146) % MALFORMED_PAYLOADS.length]! };

  // G–J fall through via later checks
}

export function specForIdTail(id: number): GatewayRuleInput {
  if (id <= 150) return specForId(id);
  if (id <= 160) return { usdcUsd: 0.8 - (id - 151) * 0.01, hlPerp: 3500, dydxPerp: 2800 };
  if (id <= 168) return { hlSpot: 3500, hlPerp: 2100, dydxPerp: 2100, blackSwanSlippage: 0.4 };
  if (id <= 175) return { protocolPaused: true, criHardlock: true, estimatedLossUsd: 1 };

  if (id <= 185) return { timeboostDelayMs: 500 + id, oracleUpdatedAtMs: EVAL_MS - 31_000, l2BlockTimestampMs: EVAL_MS };
  if (id <= 192) return { driftBlocks: SOFT_CONFIRMATION_DRIFT_MAX_BLOCKS + id };
  if (id <= 200) {
    return {
      driftBlocks: SOFT_CONFIRMATION_DRIFT_MAX_BLOCKS + 50,
      sequencerAnswer: 1,
      timeboostDelayMs: 800,
    };
  }

  if (id <= 208) return { skipArm: true, depthUsd: 0 };
  if (id <= 216) return { payloadBytes: 2_000_000 + id * 1000, payload: "not-json" };
  if (id <= 225) return { gmxPenaltyBps: 55, hlPerp: 3500, dydxPerp: 4000, sagaRetries: 5 };

  if (id <= 235) return { dailyLossUsd: 10_000, accountBalanceUsd: 10_000, dailySlCount: 3 };
  if (id <= 242) return { criHardlock: true, estimatedLossUsd: 1, accountBalanceUsd: 10_000 };
  if (id <= 248) return { estimatedLossUsd: 5_000, accountBalanceUsd: 10_000 };
  return {
    oracleUpdatedAtMs: EVAL_MS - ORACLE_LAG_SPIKE_MS,
    l2BlockTimestampMs: EVAL_MS,
    sequencerAnswer: 1,
    gmxPenaltyBps: 500,
    criHardlock: true,
    dailyLossUsd: 50_000,
    protocolPaused: true,
    blackSwanSlippage: 0.5,
    timeboostDelayMs: 2_000,
  };
}

export function poisonPayloadForId(id: number): string {
  const poison = [
    "' OR 1=1 --",
    "'; DROP TABLE orders; --",
    '{"__proto__":{"polluted":true}}',
    '{"constructor":{"prototype":{"admin":true}}}',
    '{"hlSpot":NaN}',
  ];
  return poison[(id - 126) % poison.length]!;
}
