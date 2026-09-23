/**
 * Hyperliquid WebSocket stream engine — Cloudflare Workers / browser native WebSocket.
 *
 * Subscriptions: allMids, l2Book, userEvents.
 * Resiliency: 30s heartbeat ping, stale detection (>5s), exponential backoff reconnect.
 * Risk: WS disconnect / latency >200ms flags soil resistance TRIPPED for signing pipeline.
 */

export * from "./websocket/types";
export * from "./websocket/websocket-frames";
export * from "./websocket/websocket-health";
export { HyperliquidWsClient } from "./websocket/websocket-client";
export { MockWebSocket, createMockWsFactory } from "./websocket/websocket-mock";
