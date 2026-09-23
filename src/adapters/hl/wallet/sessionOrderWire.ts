import type { LiveBookSoilAudit } from "../../../services/check-soil-resistance";
import {
  buildMarketOrderWire,
  buildOrderAction,
  formatHlPerpPrice,
  ensureHlMinNotionalSize,
} from "../execution-wire";
import type { HlOrderWire } from "../execution-types";
import {
  applyW01DepthRefillDefense,
  buildPreTradeFromSoilAudit,
  HL_LIVE_MIN_NOTIONAL_USD,
  HL_LIVE_NOTIONAL_SAFETY_FLOOR_USD,
  resolveMarketIocLimitPx,
} from "../../../data/verified-5tx";
import type { PreTradeValidationInput } from "../execution-types";
import { formatOrderSizeLabel } from "./sessionOrderFillSync";
import { LIVE_5TX_ACCOUNT_BALANCE_USD } from "./sessionOrderTypes";

export interface Live5TxOrderWirePlan {
  preTrade: PreTradeValidationInput;
  orderLimitPx: number;
  sizeLabel: string;
  w01DepthRefillBps: number;
}

/** Canonical SDK-aligned IoC market order wire + action (vaultAddress omitted). */
export interface SessionAgentOrderWirePlan {
  action: Record<string, unknown>;
  wire: HlOrderWire;
  limitPx: number;
  size: number;
}

export function buildSessionAgentMarketOrderWire(args: {
  asset: number;
  isBuy: boolean;
  notionalUsd: number;
  limitPx: number;
  szDecimals: number;
  reduceOnly?: boolean;
}): SessionAgentOrderWirePlan {
  const formattedLimitPx = formatHlPerpPrice(args.limitPx, args.szDecimals);
  const orderNotionalUsd = Math.max(args.notionalUsd, HL_LIVE_MIN_NOTIONAL_USD);
  const rawSize = Math.max(
    orderNotionalUsd / Math.max(formattedLimitPx, 1),
    HL_LIVE_MIN_NOTIONAL_USD / Math.max(formattedLimitPx, 1),
  );
  const formattedSize = ensureHlMinNotionalSize(
    rawSize,
    formattedLimitPx,
    args.szDecimals,
    HL_LIVE_MIN_NOTIONAL_USD,
    HL_LIVE_NOTIONAL_SAFETY_FLOOR_USD,
  );
  const wire = buildMarketOrderWire({
    asset: args.asset,
    isBuy: args.isBuy,
    size: formattedSize,
    limitPx: formattedLimitPx,
    reduceOnly: args.reduceOnly ?? false,
  });
  return {
    action: buildOrderAction([wire], "na"),
    wire,
    limitPx: formattedLimitPx,
    size: formattedSize,
  };
}

export function buildLive5TxOrderWirePlan(
  soilAudit: LiveBookSoilAudit,
  side: "BUY" | "SHORT",
  notionalUsd: number,
  szDecimals: number,
): Live5TxOrderWirePlan {
  const basePreTrade = buildPreTradeFromSoilAudit(
    soilAudit,
    notionalUsd,
    LIVE_5TX_ACCOUNT_BALANCE_USD,
  );
  const preTrade = applyW01DepthRefillDefense(basePreTrade, soilAudit, notionalUsd);
  const w01DepthRefillBps = Math.max(32, Math.round(soilAudit.priceImpactBps));
  const orderLimitPx = resolveMarketIocLimitPx(soilAudit, side, szDecimals);
  const formattedLimitPx = formatHlPerpPrice(orderLimitPx, szDecimals);
  const orderNotionalUsd = Math.max(notionalUsd, HL_LIVE_MIN_NOTIONAL_USD);
  const rawSize = Math.max(
    orderNotionalUsd / Math.max(formattedLimitPx, 1),
    HL_LIVE_MIN_NOTIONAL_USD / Math.max(formattedLimitPx, 1),
  );
  const formattedSize = ensureHlMinNotionalSize(
    rawSize,
    formattedLimitPx,
    szDecimals,
    HL_LIVE_MIN_NOTIONAL_USD,
    HL_LIVE_NOTIONAL_SAFETY_FLOOR_USD,
  );
  return {
    preTrade,
    orderLimitPx,
    sizeLabel: formatOrderSizeLabel(formattedSize, szDecimals),
    w01DepthRefillBps,
  };
}
