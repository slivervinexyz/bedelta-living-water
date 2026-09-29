/**
 * HL WS client timer / ping / stale / reconnect helpers.
 */

import type { WsHealthSnapshot, WsLike } from "./types";
import {
  checkWsStale,
  scheduleWsReconnect,
  sendWsPing,
  startConnectionTimers,
} from "./websocket-connection";
import { clearHlWsTimers, type HlWsClientRuntime } from "./websocket-client-runtime";

export function startHlWsTimers(
  runtime: HlWsClientRuntime,
  setIntervalFn: typeof setInterval,
  heartbeatIntervalMs: number,
  sendPing: () => void,
  checkStale: () => void,
  clearIntervalFn: typeof clearInterval,
): void {
  clearHlWsTimers(runtime, clearIntervalFn);
  startConnectionTimers(
    runtime.timers,
    setIntervalFn,
    heartbeatIntervalMs,
    sendPing,
    checkStale,
  );
}

export function sendHlWsClientPing(
  runtime: HlWsClientRuntime,
  ws: WsLike | null,
  now: () => number,
  setHealth: (patch: Partial<WsHealthSnapshot>) => void,
): void {
  sendWsPing(
    ws,
    now(),
    (pingAt) => {
      runtime.pendingPingAt = pingAt;
      setHealth({ lastPingAt: pingAt });
    },
    () => {
      runtime.pendingPingAt = null;
      setHealth({ connected: false, stale: true });
    },
  );
}

export function checkHlWsClientStale(
  runtime: HlWsClientRuntime,
  now: () => number,
  staleThresholdMs: number,
  setHealth: (patch: Partial<WsHealthSnapshot>) => void,
  refreshSoilTrip: () => void,
  reconnect: () => void,
): void {
  checkWsStale(runtime.health, now(), staleThresholdMs, () => {
    setHealth({ stale: true });
    refreshSoilTrip();
    reconnect();
  });
}

export function scheduleHlWsClientReconnect(
  runtime: HlWsClientRuntime,
  setTimeoutFn: typeof setTimeout,
  openSocket: () => void,
  setHealth: (patch: Partial<WsHealthSnapshot>) => void,
): void {
  runtime.reconnectAttempts = scheduleWsReconnect(
    runtime.timers,
    runtime.reconnectAttempts,
    runtime.intentionalClose,
    setTimeoutFn,
    openSocket,
  );
  setHealth({ reconnectAttempts: runtime.reconnectAttempts });
}
