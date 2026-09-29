import { HL_INFO_URL } from "../../src/config/constants";
import { STALE_THRESHOLD_MS } from "../../src/config/risk-parameters";
import { HL_WS_URL } from "../../src/adapters/hl/websocket/types";
import {
  computeLiveBookMetrics,
  isL2BookFailClosed,
  type HlL2BookResponse,
  type LiveL2BookSnapshot,
} from "../../src/services/exchanges/hl-l2-book";

export async function probeL2FailClosed(symbol: string): Promise<{
  ok: boolean;
  probeMs: number;
  midPx: number;
  depthUsd: number;
  bidDepthUsd: number;
  askDepthUsd: number;
  reason?: string;
}> {
  let last: {
    ok: boolean;
    probeMs: number;
    midPx: number;
    depthUsd: number;
    bidDepthUsd: number;
    askDepthUsd: number;
    reason?: string;
  } | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch(HL_INFO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "l2Book", coin: symbol }),
        signal: AbortSignal.timeout(STALE_THRESHOLD_MS),
      });
      const probeMs = Date.now() - t0;
      if (probeMs > STALE_THRESHOLD_MS || !res.ok) {
        last = {
          ok: false,
          probeMs,
          midPx: 0,
          depthUsd: 0,
          bidDepthUsd: 0,
          askDepthUsd: 0,
          reason: `L2_FAIL_CLOSED_${probeMs}ms`,
        };
        continue;
      }
      const raw = (await res.json()) as HlL2BookResponse;
      const snapshot: LiveL2BookSnapshot = {
        coin: symbol,
        book: {
          coin: raw.coin ?? symbol,
          levels: raw.levels ?? [[], []],
          time: raw.time,
        },
        fetchedAt: new Date().toISOString(),
        live: true,
        source: "testnet",
      };
      if (isL2BookFailClosed(snapshot)) {
        last = {
          ok: false,
          probeMs,
          midPx: 0,
          depthUsd: 0,
          bidDepthUsd: 0,
          askDepthUsd: 0,
          reason: "L2_FAIL_CLOSED_STALE",
        };
        continue;
      }
      const metrics = computeLiveBookMetrics(snapshot.book);
      if (!metrics) {
        last = {
          ok: false,
          probeMs,
          midPx: 0,
          depthUsd: 0,
          bidDepthUsd: 0,
          askDepthUsd: 0,
          reason: "L2_FAIL_CLOSED_EMPTY",
        };
        continue;
      }
      return {
        ok: true,
        probeMs,
        midPx: metrics.midPx,
        depthUsd: metrics.depthUsd,
        bidDepthUsd: metrics.bidDepthUsd,
        askDepthUsd: metrics.askDepthUsd,
      };
    } catch (err) {
      last = {
        ok: false,
        probeMs: Date.now() - t0,
        midPx: 0,
        depthUsd: 0,
        bidDepthUsd: 0,
        askDepthUsd: 0,
        reason:
          err instanceof Error
            ? `L2_FAIL_CLOSED_${err.name}`
            : "L2_FAIL_CLOSED_ERROR",
      };
    }
  }

  return (
    last ?? {
      ok: false,
      probeMs: STALE_THRESHOLD_MS,
      midPx: 0,
      depthUsd: 0,
      bidDepthUsd: 0,
      askDepthUsd: 0,
      reason: "L2_FAIL_CLOSED",
    }
  );
}

export async function connectMainnetL2Ws(symbol: string): Promise<{
  connected: boolean;
  latencyMs: number | null;
  bookReceived: boolean;
}> {
  return new Promise((resolve) => {
    const started = Date.now();
    let settled = false;
    let bookReceived = false;
    let connected = false;
    let ws: WebSocket;

    const finish = (r: {
      connected: boolean;
      latencyMs: number | null;
      bookReceived: boolean;
    }) => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve(r);
    };

    try {
      ws = new WebSocket(HL_WS_URL);
    } catch {
      resolve({ connected: false, latencyMs: null, bookReceived: false });
      return;
    }

    const timeout = setTimeout(() => {
      finish({
        connected,
        latencyMs: connected ? Date.now() - started : null,
        bookReceived,
      });
    }, 8_000);

    ws.addEventListener("open", () => {
      connected = true;
      ws.send(
        JSON.stringify({
          method: "subscribe",
          subscription: { type: "l2Book", coin: symbol },
        }),
      );
    });
    ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as { channel?: string };
        if (msg.channel === "l2Book") {
          clearTimeout(timeout);
          finish({
            connected: true,
            latencyMs: Date.now() - started,
            bookReceived: true,
          });
        }
      } catch {
        /* ignore */
      }
    });
    ws.addEventListener("error", () => {
      clearTimeout(timeout);
      finish({ connected: false, latencyMs: null, bookReceived: false });
    });
  });
}
