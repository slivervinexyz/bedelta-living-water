/** Gateway composition — soil + oracle/sequencer/gas + root/R17 + payload validation. */
import { evaluateBlackSwanRisk } from "../../src/core/black-swan-guard";
import { SESSION_KEY_CLIP_USD } from "../../src/services/risk/session-audit";
import {
  HardlockError,
  RiskLimitExceeded,
  checkSoilResistance,
  vineWrapProtection,
} from "../../src/services/risk-control";
import { checkRoot17DailyLimit } from "../../src/services/root17-daily";
import {
  evaluateGasSurcharge,
  evaluateOracleLag,
} from "../../src/services/risk/arbitrum-gas-guard";
import {
  __setSequencerProbeForTests,
  evaluateSequencerProbe,
} from "../../src/services/risk/sequencer-guard";
import {
  __setSoftConfirmationProbeForTests,
  evaluateSoftConfirmationDrift,
} from "../../src/services/risk/soft-confirmation-guard";
import {
  evaluateGmxPriceImpactSoilGate,
  type GmxV2PriceImpactSoilInput,
} from "../../src/services/yield/gmx-v2-price-impact";
import {
  armPassThroughGates,
  classifyGatewayIsolateError,
  resetGates,
  setGasGuard,
  setOracleGuard,
} from "./chaos-gate-helpers";
import { appendPayloadDefenseReasons } from "./chaos-gateway-payload";
import {
  EVAL_AT,
  EVAL_MS,
  EVAL_SEC,
  HEALTHY_SOIL,
} from "./chaos-context";
import type { GatewayRuleInput } from "./chaos-types";

/** Gateway composition — soil + oracle/sequencer/gas + root/R17 + payload validation. */
export function evaluateGatewayRules(input: GatewayRuleInput): {
  failClosed: boolean;
  reasons: string[];
  crashed: boolean;
} {
  const reasons: string[] = [];
  try {
    if (input.skipArm) {
      resetGates();
    } else {
      armPassThroughGates();
    }

    appendPayloadDefenseReasons(reasons, input);

    const oracleAt = input.oracleUpdatedAtMs;
    const l2At = input.l2BlockTimestampMs;
    if (oracleAt !== undefined || l2At !== undefined) {
      const oracle = oracleAt ?? EVAL_MS;
      const l2 = l2At ?? EVAL_MS;
      if (oracle <= 0 || l2 <= 0) {
        reasons.push("ORACLE_TIMESTAMP_STALE_FAIL_CLOSED");
      } else {
        const lag = evaluateOracleLag(oracle, l2);
        if (lag.deadlock) {
          setOracleGuard(lag);
          if (lag.reason) reasons.push(lag.reason);
        }
      }
    }

    if (input.sequencerAnswer !== undefined || input.sequencerElapsedSec !== undefined) {
      const answer = input.sequencerAnswer ?? 0;
      const elapsed = input.sequencerElapsedSec ?? 1;
      const startedAtSec = EVAL_SEC - elapsed;
      const probe = evaluateSequencerProbe(answer, startedAtSec, EVAL_SEC);
      __setSequencerProbeForTests({
        answer,
        startedAtSec,
        updatedAtSec: EVAL_SEC,
        fetchedAtMs: EVAL_MS,
        safe: probe.safe,
        reason: probe.reason,
      });
      if (!probe.safe && probe.reason) reasons.push(probe.reason);
    }

    if (input.l1SurchargeUsd !== undefined) {
      const target = input.targetYieldUsd ?? 0.1;
      const gas = evaluateGasSurcharge(input.l1SurchargeUsd, target);
      if (gas.blocked && gas.reason) {
        setGasGuard(gas.reason, gas.ratio);
        reasons.push(gas.reason);
      }
    }

    if (input.driftBlocks !== undefined) {
      const drift = evaluateSoftConfirmationDrift(
        1_000_000 + input.driftBlocks,
        1_000_000,
      );
      __setSoftConfirmationProbeForTests({
        l2LatestBlock: 1_000_000 + input.driftBlocks,
        l1FinalizedBatchBlock: 1_000_000,
        driftBlocks: drift.driftBlocks,
        fetchedAtMs: EVAL_MS,
        safe: drift.safe,
        reason: drift.reason,
      });
      if (!drift.safe && drift.reason) reasons.push(drift.reason);
    }

    if ((input.timeboostDelayMs ?? 0) > 500) {
      reasons.push(`TIMEBOOST_EXPRESS_LANE_DELAY:${input.timeboostDelayMs}ms>500ms`);
    }

    const impact: GmxV2PriceImpactSoilInput | undefined =
      input.gmxPenaltyBps !== undefined
        ? {
            priceImpactPenaltyBps: input.gmxPenaltyBps,
            priceImpactSubsidiesBps: 0,
            reducesImbalance: false,
          }
        : undefined;
    if (impact) {
      const gate = evaluateGmxPriceImpactSoilGate(impact);
      if (gate.triggered) reasons.push(...gate.reasons);
    }

    const soil = checkSoilResistance({
      ...HEALTHY_SOIL,
      hlSpot: input.hlSpot ?? HEALTHY_SOIL.hlSpot,
      hlPerp: input.hlPerp ?? HEALTHY_SOIL.hlPerp,
      dydxPerp: input.dydxPerp ?? HEALTHY_SOIL.dydxPerp,
      depthUsd: input.depthUsd ?? HEALTHY_SOIL.depthUsd,
      ...(impact ? { gmxPriceImpact: impact } : {}),
    });
    if (soil.tripped) reasons.push(...soil.reasons);

    if (input.estimatedLossUsd !== undefined || input.criHardlock) {
      try {
        vineWrapProtection({
          symbol: "ETH",
          estimatedLossUsd: input.estimatedLossUsd ?? 1,
          accountBalanceUsd: input.accountBalanceUsd ?? 10_000,
          criHardlock: input.criHardlock === true,
        });
      } catch (err) {
        if (err instanceof HardlockError) reasons.push("R20_PHYSICAL_DEADLOCK");
        else if (err instanceof RiskLimitExceeded) reasons.push("ROOT_PROTECTION_TRIP");
        else throw err;
      }
    }

    if (input.dailyLossUsd !== undefined || input.dailySlCount !== undefined) {
      const r17 = checkRoot17DailyLimit({
        accountEquityUsd: input.accountBalanceUsd ?? 10_000,
        state: {
          utcDay: EVAL_AT.toISOString().slice(0, 10),
          cumulativeDailyLossUsd: input.dailyLossUsd ?? 0,
          dailySlCount: input.dailySlCount ?? 0,
        },
        now: EVAL_AT,
      });
      if (r17.tripped) reasons.push(r17.reason ?? "R17_DAILY_DRAWDOWN");
    }

    if ((input.sagaRetries ?? 0) >= 3) reasons.push("SAGA_TTL_RETRY_EXHAUSTED");
    if ((input.orderSizeUsd ?? 0) > SESSION_KEY_CLIP_USD) {
      reasons.push(`SESSION_KEY_CLIP:${input.orderSizeUsd}>${SESSION_KEY_CLIP_USD}`);
    }

    if (input.blackSwanSlippage !== undefined) {
      const swan = evaluateBlackSwanRisk({
        symbol: "ETH",
        slippage: input.blackSwanSlippage,
        orderbookDepthUsd: 10_000,
        baselineDepthUsd: 200_000,
        targetVenuePrice: 2100,
        ingressIndexPrice: 3500,
      });
      if (swan.tripped) reasons.push(...swan.reasons);
    }

    if (input.usdcUsd !== undefined && input.usdcUsd < 0.95) {
      reasons.push(`USDC_DEPEG:${input.usdcUsd}<0.95`);
    }
    if (input.protocolPaused) reasons.push("PROTOCOL_PAUSED_FAIL_CLOSED");

    return { failClosed: reasons.length > 0, reasons: [...new Set(reasons)], crashed: false };
  } catch (err) {
    return classifyGatewayIsolateError(err);
  }
}
