import type {
  HyperliquidWsClientOptions,
  HlWsInboundMessage,
  WsBookData,
  WsHealthSnapshot,
  WsUserEventData,
} from "./types";
import {
  buildAllMidsSubscription,
  buildL2BookSubscription,
  buildUserEventsSubscription,
  sendSubscribe,
  trackSubscription,
} from "./websocket-subscriptions";
import { emitWsHealthChange, refreshWsSoilTrip } from "./websocket-connection";
import {
  clearHlWsTimers,
  createHlWsClientRuntime,
  openHlWsSocket,
  patchHlWsHealth,
  resolveHlWsClientDeps,
  type HlWsClientDeps,
  type HlWsClientRuntime,
} from "./websocket-client-connect";

export class HyperliquidWsClient {
  private ws: import("./types").WsLike | null = null;
  private readonly deps: HlWsClientDeps;
  private readonly onHealthChange?: (health: WsHealthSnapshot) => void;
  private readonly onMessage?: (message: HlWsInboundMessage) => void;
  private readonly runtime: HlWsClientRuntime = createHlWsClientRuntime();

  constructor(options: HyperliquidWsClientOptions = {}) {
    this.deps = resolveHlWsClientDeps(options);
    this.onHealthChange = options.onHealthChange;
    this.onMessage = options.onMessage;
  }

  getHealth(): WsHealthSnapshot {
    return { ...this.runtime.health };
  }

  getLatestAllMids(): Readonly<Record<string, string>> {
    return this.runtime.subState.allMids;
  }

  getLatestL2Book(coin: string): WsBookData | null {
    return this.runtime.subState.l2Books.get(coin.toUpperCase()) ?? null;
  }

  getUserEvents(): readonly WsUserEventData[] {
    return this.runtime.subState.userEvents;
  }

  connect(): void {
    this.runtime.intentionalClose = false;
    this.openSocket();
  }

  disconnect(): void {
    this.runtime.intentionalClose = true;
    clearHlWsTimers(this.runtime, this.deps.clearIntervalFn);
    if (this.runtime.timers.reconnectTimer) {
      this.deps.clearTimeoutFn(this.runtime.timers.reconnectTimer);
      this.runtime.timers.reconnectTimer = null;
    }
    this.ws?.close(1000, "client_disconnect");
    this.ws = null;
    this.setHealth({ connected: false, stale: true });
  }

  subscribeAllMids(dex?: string): void {
    const sub = buildAllMidsSubscription(dex);
    trackSubscription(this.runtime.subState, sub);
    sendSubscribe(this.ws, sub);
  }

  subscribeL2Book(
    coin: string,
    options: { nSigFigs?: number; mantissa?: number; fast?: boolean } = {},
  ): void {
    const sub = buildL2BookSubscription(coin, options);
    if (!sub) return;
    trackSubscription(this.runtime.subState, sub);
    sendSubscribe(this.ws, sub);
  }

  subscribeUserEvents(user: string): void {
    const sub = buildUserEventsSubscription(user);
    trackSubscription(this.runtime.subState, sub);
    sendSubscribe(this.ws, sub);
  }

  reconnect(): void {
    if (this.runtime.intentionalClose || !this.ws) return;
    this.ws.close(4000, "reconnect");
  }

  private openSocket(): void {
    openHlWsSocket({
      runtime: this.runtime,
      deps: this.deps,
      ws: this.ws,
      setWs: (ws) => {
        this.ws = ws;
      },
      getHealth: () => this.getHealth(),
      setHealth: (patch) => this.setHealth(patch),
      refreshSoilTrip: () => this.refreshSoilTrip(),
      onMessage: this.onMessage,
      reconnect: () => this.reconnect(),
    });
  }

  private refreshSoilTrip(): void {
    const { soilTripped, tripReasons } = refreshWsSoilTrip(this.runtime.health);
    this.runtime.health.soilTripped = soilTripped;
    this.runtime.health.tripReasons = tripReasons;
    emitWsHealthChange(() => this.getHealth(), this.onHealthChange);
  }

  private setHealth(patch: Partial<WsHealthSnapshot>): void {
    patchHlWsHealth(this.runtime, patch);
    this.refreshSoilTrip();
  }
}
