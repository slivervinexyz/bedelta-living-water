import { readActiveSystemState } from "../../../core/state";
import {
  assertSessionKeyPermission,
} from "../../../services/hyperliquidAdapter";
import type { FlattenAction, IntentLeg } from "../../../core/intent-ledger";
import { unwrapHlError } from "../error-unwrap";
import { buildCancelAction } from "../execution-wire";
import { executeSignedAction } from "../execution-transport";
import { buildExecutionContext } from "./helpers";
import { executeHlSessionKeyOrder } from "./execute-order";
import type { HlOrderExecutionResult, HlSessionKeyExecutorOptions } from "./types";

/** Reduce-only unwind / flatten for 2PC abort paths */
export async function flattenHlLeg(
  action: FlattenAction,
  opts: HlSessionKeyExecutorOptions & { limitPx?: number; symbol?: string },
): Promise<HlOrderExecutionResult> {
  const leg: IntentLeg = {
    venue: "HL",
    side: action.side,
    sizeUsd: action.sizeUsd,
    symbol: opts.symbol ?? "ETH",
  };
  return executeHlSessionKeyOrder(leg, {
    ...opts,
    permission: "ORDER_EXECUTE",
    limitPx: opts.limitPx,
    reduceOnly: true,
  });
}

/** Cancel open HL order by oid — TRADE_ONLY cancel path */
export async function cancelHlOrder(
  args: { asset: number; oid: number },
  opts: HlSessionKeyExecutorOptions,
): Promise<HlOrderExecutionResult> {
  try {
    assertSessionKeyPermission("ORDER_CANCEL");
  } catch (err) {
    return {
      ok: false,
      dryRun: opts.dryRun ?? true,
      reason: unwrapHlError(err),
      reduceOnly: true,
    };
  }

  const state = opts.systemState ?? readActiveSystemState();
  const ctx = buildExecutionContext(opts, state);
  const action = buildCancelAction([{ asset: args.asset, oid: args.oid }]);

  try {
    const result = await executeSignedAction(action, ctx, { skipPreTrade: true });
    return { ok: true, dryRun: result.dryRun, reduceOnly: true };
  } catch (err) {
    return {
      ok: false,
      dryRun: opts.dryRun ?? true,
      reason: unwrapHlError(err),
      reduceOnly: true,
    };
  }
}
