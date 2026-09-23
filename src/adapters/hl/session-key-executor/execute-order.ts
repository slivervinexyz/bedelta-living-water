import { verifySessionKeyValidity } from "../auth";
import { readActiveSystemState } from "../../../core/state";
import {
  assertSessionKeyExecutionGates,
} from "../../../services/session-key-adapter";
import { HL_SESSION_KEY_ALLOWED_CONTRACTS } from "../../../services/fool-proof-guard";
import {
  auditSessionKeyNonceState,
  resolveSessionKeyNonce,
} from "../../../services/session-key-adapter-lib/nonce-auto-healing";
import {
  assertSessionKeyPermission,
  type SessionKeyPermission,
} from "../../../services/hyperliquidAdapter";
import type { IntentLeg } from "../../../core/intent-ledger";
import type { PreTradeValidationInput } from "../execution-types";
import { unwrapHlError } from "../error-unwrap";
import {
  buildLimitOrderWire,
  buildOrderAction,
  formatHlPerpPrice,
  ensureHlMinNotionalSize,
} from "../execution-wire";
import { buildSessionAgentMarketOrderWire } from "../wallet/sessionOrderWire";
import { HL_LIVE_MIN_NOTIONAL_USD, HL_LIVE_NOTIONAL_SAFETY_FLOOR_USD } from "../../../data/verified-5tx";
import { executeSignedAction } from "../execution-transport";
import { assertHlOrderFilled } from "../hl-order-response";
import {
  assertTradeSessionActive,
  handleSessionKeySignFailure,
  isReadOnlyObserver,
} from "../session-key-fallback";
import {
  buildExecutionContext,
  legToSessionPayload,
  resolveAssetIndex,
} from "./helpers";
import type { HlOrderExecutionResult, HlSessionKeyExecutorOptions } from "./types";

/** Execute HL leg with Dynamic Max SL + TRADE_ONLY permission gate */
export async function executeHlSessionKeyOrder(
  leg: IntentLeg,
  opts: HlSessionKeyExecutorOptions & {
    limitPx?: number;
    preTrade?: PreTradeValidationInput;
    permission?: SessionKeyPermission;
    reduceOnly?: boolean;
    marketIoc?: boolean;
    szDecimals?: number;
  },
): Promise<HlOrderExecutionResult> {
  const state = opts.systemState ?? readActiveSystemState();
  const permission = opts.permission ?? "ORDER_EXECUTE";

  if (isReadOnlyObserver(state)) {
    return {
      ok: false,
      dryRun: opts.dryRun ?? true,
      reason: `READ_ONLY_OBSERVER — ${state.sessionKeyStatus ?? "SESSION_KEY_EXPIRED"}`,
      reduceOnly: opts.reduceOnly ?? false,
    };
  }

  try {
    assertTradeSessionActive(state);
    assertSessionKeyPermission(permission);
  } catch (err) {
    handleSessionKeySignFailure(err);
    return {
      ok: false,
      dryRun: opts.dryRun ?? true,
      reason: unwrapHlError(err),
      reduceOnly: opts.reduceOnly ?? false,
    };
  }

  const limitPx = opts.limitPx ?? 3_500;
  const asset = resolveAssetIndex(leg.symbol, opts.resolveAssetIndex);
  const reduceOnly = opts.reduceOnly ?? false;
  const marketIoc = opts.marketIoc ?? false;
  const szDecimals = opts.szDecimals ?? 4;
  const formattedLimitPx = formatHlPerpPrice(limitPx, szDecimals);
  const orderNotionalUsd = Math.max(leg.sizeUsd, HL_LIVE_MIN_NOTIONAL_USD);
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
  const payload = legToSessionPayload(leg, asset, formattedLimitPx, reduceOnly);
  payload.limitPx = formattedLimitPx.toFixed(Math.min(8, Math.max(0, 6 - szDecimals)));
  payload.sz = formattedSize.toFixed(szDecimals);

  try {
    assertSessionKeyExecutionGates(payload, state, state.accountBalanceUsd, {
      contractTarget: HL_SESSION_KEY_ALLOWED_CONTRACTS[0],
      hlAction: "order",
    });
  } catch (err) {
    return {
      ok: false,
      dryRun: opts.dryRun ?? true,
      reason: unwrapHlError(err),
      reduceOnly,
    };
  }

  let action: Record<string, unknown>;
  if (marketIoc && !reduceOnly) {
    action = buildSessionAgentMarketOrderWire({
      asset,
      isBuy: payload.isBuy,
      notionalUsd: orderNotionalUsd,
      limitPx,
      szDecimals,
      reduceOnly: false,
    }).action;
  } else {
    const wire = reduceOnly
      ? buildLimitOrderWire({
          asset,
          isBuy: payload.isBuy,
          size: formattedSize,
          limitPx: formattedLimitPx,
          reduceOnly: true,
          tif: "Ioc",
        })
      : buildLimitOrderWire({
          asset,
          isBuy: payload.isBuy,
          size: formattedSize,
          limitPx: formattedLimitPx,
          reduceOnly: false,
        });
    action = buildOrderAction([wire]);
  }

  const ctx = buildExecutionContext(opts, state);
  const nowMs = Date.now();
  const sessionKey = opts.sessionKey ?? ctx.sessionKey;
  if (sessionKey && !verifySessionKeyValidity(sessionKey.agentAddress, sessionKey.expiresAt, nowMs)) {
    return {
      ok: false,
      dryRun: ctx.dryRun ?? true,
      reason: `SESSION_KEY_EXPIRED:expiresAt<=${nowMs}`,
      reduceOnly,
    };
  }
  const nonceAudit = auditSessionKeyNonceState(nowMs);
  if (!nonceAudit.ok) {
    return {
      ok: false,
      dryRun: ctx.dryRun ?? true,
      reason: `SESSION_KEY_NONCE_REPLAY_GUARD:${nonceAudit.reasons.join("|")}`,
      reduceOnly,
    };
  }
  const orderNonce = ctx.dryRun ? undefined : resolveSessionKeyNonce(nowMs);

  try {
    const result = await executeSignedAction(action, ctx, {
      preTrade: opts.preTrade,
      skipPreTrade: reduceOnly || opts.skipPreTrade === true,
      nonce: orderNonce,
    });

    if (result.dryRun) {
      return {
        ok: true,
        dryRun: true,
        filledUsd: orderNotionalUsd,
        reduceOnly,
      };
    }

    const filledStatus = assertHlOrderFilled(result.response);

    return {
      ok: true,
      dryRun: false,
      filledUsd: orderNotionalUsd,
      reduceOnly,
      exchangeOid: filledStatus.oid,
    };
  } catch (err) {
    handleSessionKeySignFailure(err);
    return {
      ok: false,
      dryRun: opts.dryRun ?? true,
      reason: unwrapHlError(err),
      reduceOnly,
    };
  }
}
