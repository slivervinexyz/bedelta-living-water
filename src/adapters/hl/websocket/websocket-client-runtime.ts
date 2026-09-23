/**
 * HL WebSocket client runtime state — health, timers, reconnect counters.
 */

import {
  HL_WS_URL,
  HL_WS_TESTNET_URL,
  WS_HEARTBEAT_INTERVAL_MS,
  WS_STALE_THRESHOLD_MS,
  type HyperliquidWsClientOptions,
  type WsHealthSnapshot,
  type WsLike,
} from "./types";
import {
  clearConnectionTimers,
  createConnectionTimers,
  type WsConnectionTimers,
} from "./websocket-connection";
import {
  createSubscriptionState,
  type WsSubscriptionState,
} from "./websocket-subscriptions";

export interface HlWsClientRuntime {
  timers: WsConnectionTimers;
  subState: WsSubscriptionState;
  pendingPingAt: number | null;
  reconnectAttempts: number;
  intentionalClose: boolean;
  health: WsHealthSnapshot;
}

export interface HlWsClientDeps {
  url: string;
  wsFactory: (url: string) => WsLike;
  now: () => number;
  setTimeoutFn: typeof setTimeout;
  clearTimeoutFn: typeof clearTimeout;
  setIntervalFn: typeof setInterval;
  clearIntervalFn: typeof clearInterval;
  autoReconnect: boolean;
  heartbeatIntervalMs: number;
  staleThresholdMs: number;
}

export function createHlWsClientRuntime(): HlWsClientRuntime {
  return {
    timers: createConnectionTimers(),
    subState: createSubscriptionState(),
    pendingPingAt: null,
    reconnectAttempts: 0,
    intentionalClose: false,
    health: {
      connected: false,
      latencyMs: null,
      lastMessageAt: null,
      lastPingAt: null,
      stale: false,
      reconnectAttempts: 0,
      soilTripped: true,
      tripReasons: ["WS_DISCONNECTED"],
    },
  };
}

export function resolveHlWsClientDeps(
  options: HyperliquidWsClientOptions = {},
): HlWsClientDeps {
  return {
    url: options.url ?? (options.isTestnet ? HL_WS_TESTNET_URL : HL_WS_URL),
    wsFactory:
      options.wsFactory ??
      ((url: string) => {
        const Impl = options.WebSocketImpl ?? WebSocket;
        return new Impl(url) as unknown as WsLike;
      }),
    now: options.now ?? (() => Date.now()),
    setTimeoutFn: options.setTimeoutFn ?? setTimeout,
    clearTimeoutFn: options.clearTimeoutFn ?? clearTimeout,
    setIntervalFn: options.setIntervalFn ?? setInterval,
    clearIntervalFn: options.clearIntervalFn ?? clearInterval,
    autoReconnect: options.autoReconnect ?? true,
    heartbeatIntervalMs: options.heartbeatIntervalMs ?? WS_HEARTBEAT_INTERVAL_MS,
    staleThresholdMs: options.staleThresholdMs ?? WS_STALE_THRESHOLD_MS,
  };
}

export function patchHlWsHealth(
  runtime: HlWsClientRuntime,
  patch: Partial<WsHealthSnapshot>,
): void {
  runtime.health = { ...runtime.health, ...patch };
}

export function clearHlWsTimers(
  runtime: HlWsClientRuntime,
  clearIntervalFn: typeof clearInterval,
): void {
  clearConnectionTimers(runtime.timers, clearIntervalFn);
}
