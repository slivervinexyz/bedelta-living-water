import type { HlWsInboundMessage, WsBookData } from "./types";

/** Build HL subscribe frame */
export function buildSubscribeFrame(
  subscription: Record<string, unknown>,
): string {
  return JSON.stringify({ method: "subscribe", subscription });
}

export function buildPingFrame(): string {
  return JSON.stringify({ method: "ping" });
}

export function parseWsMessage(raw: string): HlWsInboundMessage | null {
  try {
    const parsed = JSON.parse(raw) as HlWsInboundMessage;
    if (!parsed || typeof parsed !== "object" || !("channel" in parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Compute spread from top-of-book (bid/ask) for slippage monitoring */
export function computeBookSpreadBps(book: WsBookData): number | null {
  const bids = book.levels?.[0] ?? [];
  const asks = book.levels?.[1] ?? [];
  const bestBid = bids[0]?.px ? Number(bids[0].px) : 0;
  const bestAsk = asks[0]?.px ? Number(asks[0].px) : 0;
  if (bestBid <= 0 || bestAsk <= 0) return null;
  const mid = (bestBid + bestAsk) / 2;
  return ((bestAsk - bestBid) / mid) * 10_000;
}
