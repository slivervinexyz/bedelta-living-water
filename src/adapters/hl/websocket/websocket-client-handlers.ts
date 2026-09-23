/**
 * HL WS inbound message + socket-host wiring for HyperliquidWsClient.
 */

import { inspectWsPayloadForInvalidNonce, touchSessionKeyHeartbeat } from "../../../services/session-key-adapter-lib/nonce-auto-healing";
import type { HlWsInboundMessage, WsHealthSnapshot, WsLike } from "./types";
import { parseWsMessage } from "./websocket-frames";
import {
  applyInboundChannelMessage,
  resubscribeAll,
} from "./websocket-subscriptions";
import type { HlWsClientRuntime } from "./websocket-client-runtime";

export function createHlWsSocketHost(deps: {
  runtime: HlWsClientRuntime;
  autoReconnect: boolean;
  ws: WsLike | null;
  setWs: (ws: WsLike | null) => void;
  onOpen: () => void;
  onRawMessage: (raw: string) => void;
  clearTimers: () => void;
  scheduleReconnect: () => void;
  setHealth: (patch: Partial<WsHealthSnapshot>) => void;
}) {
  return {
    intentionalClose: deps.runtime.intentionalClose,
    autoReconnect: deps.autoReconnect,
    ws: deps.ws,
    setWs: deps.setWs,
    onOpen: deps.onOpen,
    onRawMessage: deps.onRawMessage,
    clearTimers: deps.clearTimers,
    scheduleReconnect: deps.scheduleReconnect,
    setHealth: deps.setHealth,
  };
}

export function handleHlWsRawMessage(deps: {
  runtime: HlWsClientRuntime;
  raw: string;
  now: () => number;
  touchActivity: () => void;
  setHealth: (patch: Partial<WsHealthSnapshot>) => void;
  onMessage?: (message: HlWsInboundMessage) => void;
  refreshSoilTrip: () => void;
}): void {
  inspectWsPayloadForInvalidNonce(deps.raw, deps.now());
  deps.touchActivity();

  if (deps.runtime.pendingPingAt !== null) {
    const latencyMs = deps.now() - deps.runtime.pendingPingAt;
    deps.runtime.pendingPingAt = null;
    deps.setHealth({ latencyMs });
  }

  const message = parseWsMessage(deps.raw);
  if (!message) return;

  deps.onMessage?.(message);

  if (message.channel === "pong") {
    touchSessionKeyHeartbeat(deps.now());
  } else {
    applyInboundChannelMessage(deps.runtime.subState, message);
  }

  deps.refreshSoilTrip();
}

export function onHlWsOpen(
  runtime: HlWsClientRuntime,
  ws: WsLike | null,
  touchActivity: () => void,
  setHealth: (patch: Partial<WsHealthSnapshot>) => void,
  startTimers: () => void,
): void {
  runtime.reconnectAttempts = 0;
  touchActivity();
  setHealth({ connected: true, stale: false, reconnectAttempts: 0 });
  resubscribeAll(ws, runtime.subState.subscriptions);
  startTimers();
}
