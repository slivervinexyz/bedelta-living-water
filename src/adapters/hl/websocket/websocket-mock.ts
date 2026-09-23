import type { WsFactory, WsLike } from "./types";

/**
 * Test/mock WebSocket with controllable events and sent-frame capture.
 * Implements the subset of WebSocket used by HyperliquidWsClient.
 */
export class MockWebSocket implements WsLike {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly sent: string[] = [];
  readyState = MockWebSocket.CONNECTING;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  constructor(public readonly url: string) {}

  /** Simulate server accepting connection */
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({ type: "open" } as Event);
  }

  simulateMessage(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  simulateClose(code = 1006): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ type: "close", code } as CloseEvent);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number): void {
    this.simulateClose(code ?? 1000);
  }
}

/** Factory helper for tests */
export function createMockWsFactory(
  instances: MockWebSocket[],
): WsFactory {
  return (url: string) => {
    const ws = new MockWebSocket(url);
    instances.push(ws);
    return ws;
  };
}
