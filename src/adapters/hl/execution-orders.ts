/**
 * Hyperliquid high-level order placement helpers.
 */

import type {
  ExecutionContext,
  ExecutionResult,
  OrderGrouping,
  OrderTif,
  PreTradeValidationInput,
  TpslSide,
} from "./execution-types";
import { executeSignedAction } from "./execution-transport";
import {
  buildCancelAction,
  buildCancelByCloidAction,
  buildLimitOrderWire,
  buildMarketOrderWire,
  buildOrderAction,
  buildTriggerOrderWire,
} from "./execution-wire";

export async function placeLimitOrder(
  args: {
    asset: number;
    isBuy: boolean;
    size: number;
    limitPx: number;
    reduceOnly?: boolean;
    tif?: OrderTif;
    cloid?: string;
    grouping?: OrderGrouping;
    preTrade: PreTradeValidationInput;
  },
  ctx: ExecutionContext,
): Promise<ExecutionResult> {
  const wire = buildLimitOrderWire(args);
  const action = buildOrderAction([wire], args.grouping);
  return executeSignedAction(action, ctx, { preTrade: args.preTrade });
}

export async function placeMarketOrder(
  args: {
    asset: number;
    isBuy: boolean;
    size: number;
    limitPx: number;
    reduceOnly?: boolean;
    cloid?: string;
    grouping?: OrderGrouping;
    preTrade: PreTradeValidationInput;
  },
  ctx: ExecutionContext,
): Promise<ExecutionResult> {
  const wire = buildMarketOrderWire(args);
  const action = buildOrderAction([wire], args.grouping ?? "na");
  return executeSignedAction(action, ctx, { preTrade: args.preTrade });
}

export async function placeTriggerOrder(
  args: {
    asset: number;
    isBuy: boolean;
    size: number;
    triggerPx: number;
    tpsl: TpslSide;
    isMarket?: boolean;
    reduceOnly?: boolean;
    cloid?: string;
    grouping?: OrderGrouping;
    preTrade: PreTradeValidationInput;
  },
  ctx: ExecutionContext,
): Promise<ExecutionResult> {
  const wire = buildTriggerOrderWire(args);
  const action = buildOrderAction([wire], args.grouping ?? "normalTpsl");
  return executeSignedAction(action, ctx, { preTrade: args.preTrade });
}

/** Atomic limit entry + stop-market trigger (Pgate: on-chain SL pairing) */
export async function placeLimitWithStopLoss(
  args: {
    asset: number;
    isBuy: boolean;
    size: number;
    limitPx: number;
    stopTriggerPx: number;
    preTrade: PreTradeValidationInput;
    entryCloid?: string;
    stopCloid?: string;
  },
  ctx: ExecutionContext,
): Promise<ExecutionResult> {
  const entry = buildLimitOrderWire({
    asset: args.asset,
    isBuy: args.isBuy,
    size: args.size,
    limitPx: args.limitPx,
    cloid: args.entryCloid,
  });
  const stop = buildTriggerOrderWire({
    asset: args.asset,
    isBuy: !args.isBuy,
    size: args.size,
    triggerPx: args.stopTriggerPx,
    tpsl: "sl",
    isMarket: true,
    reduceOnly: true,
    cloid: args.stopCloid,
  });
  const action = buildOrderAction([entry, stop], "normalTpsl");
  return executeSignedAction(action, ctx, { preTrade: args.preTrade });
}

export async function cancelOrder(
  args: { asset: number; oid: number },
  ctx: ExecutionContext,
): Promise<ExecutionResult> {
  const action = buildCancelAction([{ asset: args.asset, oid: args.oid }]);
  return executeSignedAction(action, ctx, { skipPreTrade: true });
}

export async function cancelOrderByCloid(
  args: { asset: number; cloid: string },
  ctx: ExecutionContext,
): Promise<ExecutionResult> {
  const action = buildCancelByCloidAction([
    { asset: args.asset, cloid: args.cloid },
  ]);
  return executeSignedAction(action, ctx, { skipPreTrade: true });
}
