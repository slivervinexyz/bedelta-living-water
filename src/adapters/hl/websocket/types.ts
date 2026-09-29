/** Hyperliquid WebSocket types and timing constants. */

export const HL_WS_URL = "wss://api.hyperliquid.xyz/ws";
export const HL_WS_TESTNET_URL = "wss://api.hyperliquid-testnet.xyz/ws";

/** Client heartbeat ping interval */
export const WS_HEARTBEAT_INTERVAL_MS = 30_000;

/** No inbound activity within this window → stale + reconnect */
export const WS_STALE_THRESHOLD_MS = 5_000;

/** Initial reconnect delay (exponential backoff base) */
export const WS_RECONNECT_BASE_MS = 1_000;

/** Maximum reconnect backoff cap */
export const WS_RECONNECT_MAX_MS = 30_000;

export type HlWsChannel =
  | "subscriptionResponse"
  | "allMids"
  | "l2Book"
  | "user"
  | "pong"
  | string;

export interface HlWsSubscribeMessage {
  method: "subscribe" | "unsubscribe" | "ping";
  subscription?: Record<string, unknown>;
}

export interface HlWsInboundMessage {
  channel: HlWsChannel;
  data: unknown;
}

export interface AllMidsData {
  mids: Record<string, string>;
}

export interface WsBookLevel {
  px: string;
  sz: string;
  n?: number;
}

export interface WsBookData {
  coin: string;
  levels: [WsBookLevel[], WsBookLevel[]];
  time: number;
}

export interface WsUserEventData {
  fills?: unknown[];
  funding?: unknown;
  liquidation?: unknown;
  nonUserCancel?: unknown[];
  [key: string]: unknown;
}

export interface WsHealthSnapshot {
  connected: boolean;
  latencyMs: number | null;
  lastMessageAt: number | null;
  lastPingAt: number | null;
  stale: boolean;
  reconnectAttempts: number;
  soilTripped: boolean;
  tripReasons: string[];
}

export interface HyperliquidWsClientOptions {
  url?: string;
  isTestnet?: boolean;
  /** Injectable WebSocket constructor (for Workers tests) */
  WebSocketImpl?: typeof WebSocket;
  /** Injectable socket factory (preferred for unit tests) */
  wsFactory?: WsFactory;
  now?: () => number;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
  autoReconnect?: boolean;
  heartbeatIntervalMs?: number;
  staleThresholdMs?: number;
  onHealthChange?: (health: WsHealthSnapshot) => void;
  onMessage?: (message: HlWsInboundMessage) => void;
}

/** Minimal WebSocket surface used by the client (native + mock-friendly) */
export interface WsLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: Event) => void) | null;
  onmessage: ((ev: MessageEvent) => void) | null;
  onclose: ((ev: CloseEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
}

export type WsFactory = (url: string) => WsLike;
