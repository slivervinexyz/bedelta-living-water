/**
 * Hyperliquid L1 order wire builders.
 */

import { floatToWire } from "./execution-wire-format";
import type {
  HlOrderWire,
  OrderGrouping,
  OrderTif,
  TpslSide,
} from "./execution-types";

export function buildLimitOrderWire(args: {
  asset: number;
  isBuy: boolean;
  size: number;
  limitPx: number;
  reduceOnly?: boolean;
  tif?: OrderTif;
  cloid?: string;
}): HlOrderWire {
  const wire: HlOrderWire = {
    a: args.asset,
    b: args.isBuy,
    p: floatToWire(args.limitPx),
    s: floatToWire(args.size),
    r: args.reduceOnly ?? false,
    t: { limit: { tif: args.tif ?? "Gtc" } },
  };
  if (args.cloid) wire.c = args.cloid;
  return wire;
}

/** Market-style entry via IoC limit that crosses the spread */
export function buildMarketOrderWire(args: {
  asset: number;
  isBuy: boolean;
  size: number;
  limitPx: number;
  reduceOnly?: boolean;
  cloid?: string;
}): HlOrderWire {
  return buildLimitOrderWire({ ...args, tif: "Ioc" });
}

export function buildTriggerOrderWire(args: {
  asset: number;
  isBuy: boolean;
  size: number;
  triggerPx: number;
  tpsl: TpslSide;
  isMarket?: boolean;
  reduceOnly?: boolean;
  cloid?: string;
}): HlOrderWire {
  const wire: HlOrderWire = {
    a: args.asset,
    b: args.isBuy,
    p: "0",
    s: floatToWire(args.size),
    r: args.reduceOnly ?? true,
    t: {
      trigger: {
        triggerPx: floatToWire(args.triggerPx),
        isMarket: args.isMarket ?? true,
        tpsl: args.tpsl,
      },
    },
  };
  if (args.cloid) wire.c = args.cloid;
  return wire;
}

export function buildOrderAction(
  orders: HlOrderWire[],
  grouping: OrderGrouping = "na",
): Record<string, unknown> {
  return { type: "order", orders, grouping };
}

export function buildCancelAction(
  cancels: Array<{ asset: number; oid: number }>,
): Record<string, unknown> {
  return {
    type: "cancel",
    cancels: cancels.map((c) => ({ a: c.asset, o: c.oid })),
  };
}

export function buildCancelByCloidAction(
  cancels: Array<{ asset: number; cloid: string }>,
): Record<string, unknown> {
  return {
    type: "cancelByCloid",
    cancels: cancels.map((c) => ({ a: c.asset, cloid: c.cloid })),
  };
}
