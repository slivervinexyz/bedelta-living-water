import type { HyperliquidWsClientOptions, WsHealthSnapshot, WsLike } from "./types";
import { attachWsSocketHandlers, handleWsConnectFailure } from "./websocket-connection";
import {
  clearHlWsTimers,
  createHlWsClientRuntime,
  patchHlWsHealth,
  resolveHlWsClientDeps,
  type HlWsClientDeps,
  type HlWsClientRuntime,
} from "./websocket-client-runtime";
import {
  createHlWsSocketHost,
  handleHlWsRawMessage,
  onHlWsOpen,
} from "./websocket-client-handlers";
import {
  checkHlWsClientStale,
  scheduleHlWsClientReconnect,
  sendHlWsClientPing,
  startHlWsTimers,
} from "./websocket-client-timers";

const WS_OPEN = 1;

export interface HlWsClientHost {
  runtime: HlWsClientRuntime;
  deps: HlWsClientDeps;
  ws: WsLike | null;
  setWs(ws: WsLike | null): void;
  getHealth(): WsHealthSnapshot;
  setHealth(patch: Partial<WsHealthSnapshot>): void;
  refreshSoilTrip(): void;
  onMessage?: HyperliquidWsClientOptions["onMessage"];
  reconnect(): void;
}

export function openHlWsSocket(host: HlWsClientHost): void {
  if (host.ws && host.ws.readyState === WS_OPEN) return;
  const { deps, runtime } = host;
  const socketHost = createHlWsSocketHost({
    runtime,
    autoReconnect: deps.autoReconnect,
    ws: host.ws,
    setWs: host.setWs,
    onOpen: () => {
      onHlWsOpen(
        runtime,
        host.ws,
        () => host.setHealth({ lastMessageAt: deps.now(), stale: false }),
        (patch) => host.setHealth(patch),
        () =>
          startHlWsTimers(
            runtime,
            deps.setIntervalFn,
            deps.heartbeatIntervalMs,
            () =>
              sendHlWsClientPing(runtime, host.ws, deps.now, (p) => host.setHealth(p)),
            () =>
              checkHlWsClientStale(
                runtime,
                deps.now,
                deps.staleThresholdMs,
                (p) => host.setHealth(p),
                () => host.refreshSoilTrip(),
                () => host.reconnect(),
              ),
            deps.clearIntervalFn,
          ),
      );
    },
    onRawMessage: (raw) => {
      handleHlWsRawMessage({
        runtime,
        raw,
        now: deps.now,
        touchActivity: () => host.setHealth({ lastMessageAt: deps.now(), stale: false }),
        setHealth: (patch) => host.setHealth(patch),
        onMessage: host.onMessage,
        refreshSoilTrip: () => host.refreshSoilTrip(),
      });
    },
    clearTimers: () => clearHlWsTimers(runtime, deps.clearIntervalFn),
    scheduleReconnect: () =>
      scheduleHlWsClientReconnect(
        runtime,
        deps.setTimeoutFn,
        () => openHlWsSocket(host),
        (patch) => host.setHealth(patch),
      ),
    setHealth: (patch) => host.setHealth(patch),
  });
  try {
    const socket = deps.wsFactory(deps.url);
    host.ws = socket;
    host.setWs(socket);
    attachWsSocketHandlers(socketHost, socket);
  } catch (err) {
    handleWsConnectFailure(socketHost, err);
  }
}

export {
  createHlWsClientRuntime,
  patchHlWsHealth,
  resolveHlWsClientDeps,
  clearHlWsTimers,
  type HlWsClientDeps,
  type HlWsClientRuntime,
};
