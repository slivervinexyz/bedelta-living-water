/**
 * Hyperliquid L1 order wire builders and pre-trade Pgate gate.
 * @see risk-control.ts — checkSoilResistanceWithVine()
 */

import { assertVineShield } from "../../services/fool-proof-guard";
import { checkSoilResistanceWithVine } from "../../services/risk-control";
import { PGATE_MAX_LATENCY_MS, PGATE_MAX_SLIPPAGE } from "../../config/constants";
import {
  assertMaxOrderClipUsd,
  shouldTriggerReduceOnlyFlatten,
} from "../../config/risk-parameters";
import { passesHighFundingAsymmetryFilter } from "../../services/step2-scoring";
import {
  PreTradeValidationError,
  type PreTradeValidationInput,
} from "./execution-types";

export {
  floatToWire,
  formatHlPerpPrice,
  formatHlSize,
  ensureHlMinNotionalSize,
} from "./execution-wire-format";

export {
  buildLimitOrderWire,
  buildMarketOrderWire,
  buildTriggerOrderWire,
  buildOrderAction,
  buildCancelAction,
  buildCancelByCloidAction,
} from "./execution-wire-builders";

/**
 * Pgate + soil resistance gate — blocks new position orders.
 * @theory Kyle (1985) — Kyle's Lambda price-impact prior to venue POST.
 * @theory Almgren & Chriss (2000) — transient impact / optimal execution slippage cap.
 * @see checkSoilResistanceWithVine — cross-venue soil matrix.
 */
export function assertPreTradeValidation(input: PreTradeValidationInput): void {
  const reasons: string[] = [];

  if (input.latencyMs !== undefined && input.latencyMs > PGATE_MAX_LATENCY_MS) {
    reasons.push(`LATENCY_MS=${input.latencyMs}>${PGATE_MAX_LATENCY_MS}`);
  }

  if (
    input.expectedSlippage !== undefined &&
    input.expectedSlippage > PGATE_MAX_SLIPPAGE
  ) {
    reasons.push(
      `EXPECTED_SLIPPAGE=${(input.expectedSlippage * 100).toFixed(4)}%>${PGATE_MAX_SLIPPAGE * 100}%`,
    );
  }

  if (input.foolProof && input.accountBalanceUsd !== undefined) {
    try {
      assertVineShield({
        order: input.foolProof,
        accountBalanceUsd: input.accountBalanceUsd,
      });
    } catch (err) {
      reasons.push(err instanceof Error ? err.message : String(err));
    }
  }

  const soil = checkSoilResistanceWithVine(input);
  if (soil.tripped) reasons.push(...soil.reasons);

  if (
    input.step2HighFundingAsymmetry &&
    !passesHighFundingAsymmetryFilter(input.step2HighFundingAsymmetry)
  ) {
    reasons.push("STEP2_HIGH_FUNDING_ASYMMETRY_GATE");
  }

  if (input.orderNotionalUsd !== undefined) {
    const clipReason = assertMaxOrderClipUsd(input.orderNotionalUsd);
    if (clipReason) reasons.push(clipReason);
  }

  if (
    input.dailyDrawdownPct !== undefined &&
    shouldTriggerReduceOnlyFlatten(input.dailyDrawdownPct)
  ) {
    reasons.push("HARD_STOP_LOSS_PCT→REDUCE_ONLY_FLATTEN");
  }

  if (reasons.length > 0) {
    throw new PreTradeValidationError(
      "Pre-trade validation failed — execution blocked",
      reasons,
    );
  }
}
