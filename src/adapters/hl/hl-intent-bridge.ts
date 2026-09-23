/**
 * Bridges 2PC Intent Ledger ↔ Hyperliquid Session Key execution.
 */

import type {
  CommitLegFn,
  FlattenLegFn,
  IntentLeg,
  IntentLegPrepareResult,
  PrepareLegFn,
} from "../../core/intent-ledger";
import {
  executeHlSessionKeyOrder,
  flattenHlLeg,
  type HlSessionKeyExecutorOptions,
} from "./session-key-executor";

export interface HlIntentBridgeOptions extends HlSessionKeyExecutorOptions {
  /** Mock second-leg prepare latency (ms) — for integration tests */
  mockSecondLegDelayMs?: number;
  /** Force second leg commit failure */
  mockSecondLegCommitFail?: boolean;
}

export interface HlIntentBridgeHandlers {
  prepareLeg: PrepareLegFn;
  commitLeg: CommitLegFn;
  flattenLeg: FlattenLegFn;
  hlFlattenLog: Array<{ sizeUsd: number; reason: string; ok: boolean }>;
}

export function createHlIntentBridge(
  options: HlIntentBridgeOptions,
): HlIntentBridgeHandlers {
  const hlFlattenLog: HlIntentBridgeHandlers["hlFlattenLog"] = [];

  const prepareLeg: PrepareLegFn = async (leg, legIndex) => {
    if (leg.venue !== "HL") {
      if (options.mockSecondLegDelayMs) {
        await new Promise((r) => setTimeout(r, options.mockSecondLegDelayMs));
      }
      if (leg.sizeUsd <= 0) {
        return { legIndex, ok: false, reason: "MOCK_LEG_INVALID" };
      }
      return { legIndex, ok: true, filledUsd: leg.sizeUsd };
    }

    const result = await executeHlSessionKeyOrder(leg, options);
    if (!result.ok) {
      return {
        legIndex,
        ok: false,
        reason: result.reason ?? "HL_PREPARE_FAILED",
      };
    }
    return {
      legIndex,
      ok: true,
      filledUsd: result.filledUsd ?? leg.sizeUsd,
    };
  };

  const commitLeg: CommitLegFn = async (leg, legIndex, intent) => {
    const prep = intent.legResults.find((r) => r.legIndex === legIndex);
    if (!prep?.ok) return { ok: false, reason: "LEG_NOT_PREPARED" };

    if (leg.venue !== "HL" && options.mockSecondLegCommitFail) {
      return { ok: false, reason: "MOCK_SECOND_LEG_TIMEOUT" };
    }

    if (leg.venue === "HL") {
      return { ok: true };
    }
    return { ok: true };
  };

  const flattenLeg: FlattenLegFn = async (action, _intent) => {
    if (action.venue !== "HL") {
      return { ok: true };
    }
    const result = await flattenHlLeg(action, options);
    hlFlattenLog.push({
      sizeUsd: action.sizeUsd,
      reason: action.reason,
      ok: result.ok,
    });
    return { ok: result.ok, reason: result.reason };
  };

  return { prepareLeg, commitLeg, flattenLeg, hlFlattenLog };
}

/** Narrow helper — detect HL legs in a dual-leg intent */
export function isHlLeg(leg: IntentLeg): boolean {
  return leg.venue === "HL";
}

export type { IntentLegPrepareResult };
