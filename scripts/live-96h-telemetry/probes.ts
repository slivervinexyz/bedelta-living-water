/** Venue probe implementations. */
import { performance } from "node:perf_hooks";
import {
  HL_L2_STALE_THRESHOLD_MS,
  HL_TESTNET_INFO_URL,
  PGATE_MAX_LATENCY_MS,
} from "../../src/config/constants";
import { classifyTelemetryStatus, computeJitterMs } from "./status";
import { FETCH_TIMEOUT_MS, type TelemetrySample, type TelemetryVenue } from "./types";

export async function fetchJson(
  url: string,
  init: RequestInit,
): Promise<{ rttMs: number; json: unknown }> {
  const t0 = performance.now();
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const rttMs = Math.round(performance.now() - t0);
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return { rttMs, json: await res.json() };
}

export async function probeArbitrumSepolia(): Promise<TelemetrySample> {
  const venue: TelemetryVenue = "arbitrum-sepolia";
  const url =
    process.env.ARB_SEPOLIA_RPC_URL?.trim() ||
    "https://sepolia-rollup.arbitrum.io/rpc";
  const ts = new Date().toISOString();
  try {
    const { rttMs, json } = await fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "live96h",
        method: "eth_blockNumber",
        params: [],
      }),
    });
    const block = (json as { result?: string }).result ?? "unknown";
    const jitterMs = computeJitterMs(venue, rttMs);
    return {
      timestamp: ts,
      venue,
      rttMs,
      jitterMs,
      status: classifyTelemetryStatus(rttMs, jitterMs, PGATE_MAX_LATENCY_MS),
      detail: `eth_blockNumber=${block}`,
    };
  } catch (err) {
    const jitterMs = computeJitterMs(venue, null);
    return {
      timestamp: ts,
      venue,
      rttMs: null,
      jitterMs,
      status: "Trip",
      detail: err instanceof Error ? err.message : "fetch_failed",
    };
  }
}

function hlSpreadBps(book: {
  levels?: Array<Array<{ px?: string }>>;
}): number | null {
  const bid = Number(book.levels?.[0]?.[0]?.px);
  const ask = Number(book.levels?.[1]?.[0]?.px);
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= bid) return null;
  const mid = (bid + ask) / 2;
  return Math.round(((ask - bid) / mid) * 10_000 * 100) / 100;
}

export async function probeHyperliquidTestnet(): Promise<TelemetrySample> {
  const venue: TelemetryVenue = "hyperliquid-testnet";
  const ts = new Date().toISOString();
  try {
    const t0 = performance.now();
    const metaRes = await fetch(HL_TESTNET_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "meta" }),
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!metaRes.ok) throw new Error(`meta_HTTP_${metaRes.status}`);
    await metaRes.json();

    const bookRes = await fetch(HL_TESTNET_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "l2Book", coin: "ETH" }),
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!bookRes.ok) throw new Error(`l2Book_HTTP_${bookRes.status}`);
    const book = (await bookRes.json()) as { levels?: Array<Array<{ px?: string }>> };
    const rttMs = Math.round(performance.now() - t0);
    const spreadBps = hlSpreadBps(book);
    const jitterMs = computeJitterMs(venue, rttMs);
    return {
      timestamp: ts,
      venue,
      rttMs,
      jitterMs,
      status: classifyTelemetryStatus(rttMs, jitterMs, HL_L2_STALE_THRESHOLD_MS),
      detail:
        spreadBps === null
          ? "meta+l2Book ETH"
          : `meta+l2Book ETH spreadBps=${spreadBps}`,
    };
  } catch (err) {
    const jitterMs = computeJitterMs(venue, null);
    return {
      timestamp: ts,
      venue,
      rttMs: null,
      jitterMs,
      status: "Trip",
      detail: err instanceof Error ? err.message : "fetch_failed",
    };
  }
}

export async function probeRobinhoodWorker(): Promise<TelemetrySample> {
  const venue: TelemetryVenue = "robinhood-worker";
  const ts = new Date().toISOString();
  const workerUrl =
    process.env.LOCAL_WORKER_TELEMETRY_URL?.trim() ||
    process.env.TELEMETRY_UPSTREAM?.trim() ||
    "https://bedeltawater.slivervine.xyz/api/telemetry/health";
  const rhRpc = process.env.ROBINHOOD_TESTNET_RPC_URL?.trim();
  try {
    const t0 = performance.now();
    const workerRes = await fetch(workerUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!workerRes.ok) throw new Error(`worker_HTTP_${workerRes.status}`);
    await workerRes.json().catch(() => null);

    let rhDetail = "";
    if (rhRpc) {
      try {
        const rh = await fetchJson(rhRpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "rh96h",
            method: "eth_blockNumber",
            params: [],
          }),
        });
        rhDetail = ` · robinhoodRpcRttMs=${rh.rttMs}`;
      } catch {
        rhDetail = " · robinhoodRpc=Trip";
      }
    }

    const rttMs = Math.round(performance.now() - t0);
    const jitterMs = computeJitterMs(venue, rttMs);
    return {
      timestamp: ts,
      venue,
      rttMs,
      jitterMs,
      status: classifyTelemetryStatus(rttMs, jitterMs, HL_L2_STALE_THRESHOLD_MS),
      detail: `worker=${workerUrl}${rhDetail}`,
    };
  } catch (err) {
    const jitterMs = computeJitterMs(venue, null);
    return {
      timestamp: ts,
      venue,
      rttMs: null,
      jitterMs,
      status: "Trip",
      detail: err instanceof Error ? err.message : "fetch_failed",
    };
  }
}
