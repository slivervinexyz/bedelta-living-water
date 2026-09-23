import type { WsHealthSnapshot, WsLike } from "./types";

export interface WsSocketHandlerHost {
  intentionalClose: boolean;
  autoReconnect: boolean;
  ws: WsLike | null;
  setWs(ws: WsLike | null): void;
  onOpen(): void;
  onRawMessage(raw: string): void;
  clearTimers(): void;
  scheduleReconnect(): void;
  setHealth(patch: Partial<WsHealthSnapshot>): void;
}

export function attachWsSocketHandlers(
  host: WsSocketHandlerHost,
  socket: WsLike,
): void {
  socket.onopen = () => {
    try {
      host.onOpen();
    } catch (err) {
      console.warn(
        "[HL_WS] Network connection lost — open handler suppressed",
        err instanceof Error ? err.message : err,
      );
      host.setHealth({ connected: false, stale: true });
    }
  };

  socket.onmessage = (event: MessageEvent) => {
    try {
      host.onRawMessage(String(event.data));
    } catch (err) {
      console.warn(
        "[HL_WS] Network connection lost — message handler suppressed",
        err instanceof Error ? err.message : err,
      );
    }
  };

  socket.onerror = () => {
    console.warn("[HL_WS] Network connection lost — socket error");
    host.setHealth({ connected: false, stale: true });
  };

  socket.onclose = () => {
    try {
      host.clearTimers();
      host.setWs(null);
      host.setHealth({ connected: false, stale: true });
      if (!host.intentionalClose && host.autoReconnect) {
        host.scheduleReconnect();
      }
    } catch (err) {
      console.warn(
        "[HL_WS] Network connection lost — close handler suppressed",
        err instanceof Error ? err.message : err,
      );
    }
  };
}

export function handleWsConnectFailure(
  host: WsSocketHandlerHost,
  err: unknown,
): void {
  console.warn(
    "[HL_WS] Network connection lost — connect failed",
    err instanceof Error ? err.message : err,
  );
  host.setWs(null);
  host.setHealth({ connected: false, stale: true });
  if (!host.intentionalClose && host.autoReconnect) {
    host.scheduleReconnect();
  }
}
