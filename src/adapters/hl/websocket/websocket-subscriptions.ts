/**
 * Hyperliquid WebSocket subscription helpers.
 */

import {
  isAllowedTelemetrySymbol,
  normalizeTelemetrySymbol,
} from "../../../services/risk-control";
import { buildSubscribeFrame } from "./websocket-frames";
import type {
  AllMidsData,
  HlWsInboundMessage,
  WsBookData,
  WsLike,
  WsUserEventData,
} from "./types";

const WS_OPEN = 1;

export interface WsSubscriptionState {
  subscriptions: Record<string, unknown>[];
  allMids: Record<string, string>;
  l2Books: Map<string, WsBookData>;
  userEvents: WsUserEventData[];
}

export function createSubscriptionState(): WsSubscriptionState {
  return {
    subscriptions: [],
    allMids: {},
    l2Books: new Map(),
    userEvents: [],
  };
}

export function trackSubscription(
  state: WsSubscriptionState,
  sub: Record<string, unknown>,
): void {
  const key = JSON.stringify(sub);
  if (!state.subscriptions.some((s) => JSON.stringify(s) === key)) {
    state.subscriptions.push(sub);
  }
}

export function sendSubscribe(
  ws: WsLike | null,
  subscription: Record<string, unknown>,
): void {
  if (!ws || ws.readyState !== WS_OPEN) return;
  try {
    ws.send(buildSubscribeFrame(subscription));
  } catch (err) {
    console.warn(
      "[HL_WS] Network connection lost — subscribe send suppressed",
      err instanceof Error ? err.message : err,
    );
  }
}

export function resubscribeAll(
  ws: WsLike | null,
  subscriptions: Record<string, unknown>[],
): void {
  for (const sub of subscriptions) {
    sendSubscribe(ws, sub);
  }
}

export function buildAllMidsSubscription(dex?: string): Record<string, unknown> {
  const sub: Record<string, unknown> = { type: "allMids" };
  if (dex) sub.dex = dex;
  return sub;
}

export function buildL2BookSubscription(
  coin: string,
  options: { nSigFigs?: number; mantissa?: number; fast?: boolean } = {},
): Record<string, unknown> | null {
  if (!isAllowedTelemetrySymbol(coin)) return null;
  return {
    type: "l2Book",
    coin: normalizeTelemetrySymbol(coin),
    ...options,
  };
}

export function buildUserEventsSubscription(user: string): Record<string, unknown> {
  return { type: "userEvents", user: user.toLowerCase() };
}

export function applyInboundChannelMessage(
  state: WsSubscriptionState,
  message: HlWsInboundMessage,
): void {
  switch (message.channel) {
    case "allMids":
      state.allMids = (message.data as AllMidsData)?.mids ?? state.allMids;
      break;
    case "l2Book": {
      const book = message.data as WsBookData;
      if (book?.coin && isAllowedTelemetrySymbol(book.coin)) {
        state.l2Books.set(normalizeTelemetrySymbol(book.coin), book);
      }
      break;
    }
    case "user":
      state.userEvents.push(message.data as WsUserEventData);
      break;
    default:
      break;
  }
}
