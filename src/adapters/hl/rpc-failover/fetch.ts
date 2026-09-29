import {
  assertRpcAllowlisted,
  BROWSER_MIMIC_USER_AGENT,
} from "../../../services/defense/rpc-whitelist";
import {
  HL_RPC_FAILOVER_LATENCY_MS,
  HL_RPC_FAILOVER_TIMEOUT_MS,
} from "../../../config/constants";
import {
  defaultExchangeEndpoints,
  defaultInfoEndpoints,
} from "./endpoints";
import { buildHealthStatus, emitHealth, setActiveRpcEndpointId } from "./health";
import type { RpcChannel, RpcFailoverFetchOptions } from "./types";

/** Synthetic 503 when primary + backup + public RPC slots are exhausted. */
export function buildRpcBufferedResponse(
  channel: RpcChannel,
  health: ReturnType<typeof buildHealthStatus>,
): Response {
  console.warn(
    `[RPC_HEALTH] ${channel} buffered telemetry active — all RPC endpoints unreachable`,
  );
  return new Response(
    JSON.stringify({ error: "RPC_BUFFERED", health }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
}

/** Fetch via Primary → Backup → Public with latency/timeout failover. */
export async function fetchWithRpcFailover(
  channel: RpcChannel,
  init?: RequestInit,
  options: RpcFailoverFetchOptions = {},
): Promise<Response> {
  try {
    return await fetchWithRpcFailoverInner(channel, init, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[RPC_HEALTH] Network connection lost — ${channel} failover buffered: ${message}`,
    );
    return buildRpcBufferedResponse(channel, {
      primaryOk: false,
      backupOk: false,
      fallbackBuffered: true,
    });
  }
}

async function fetchWithRpcFailoverInner(
  channel: RpcChannel,
  init?: RequestInit,
  options: RpcFailoverFetchOptions = {},
): Promise<Response> {
  const latencyCap = options.latencyMs ?? HL_RPC_FAILOVER_LATENCY_MS;
  const timeoutMs = options.timeoutMs ?? HL_RPC_FAILOVER_TIMEOUT_MS;
  const fetchFn = options.fetchFn ?? fetch;
  const extraHosts = options.extraHosts ?? [];
  const endpoints =
    options.endpoints ??
    (channel === "info" ? defaultInfoEndpoints() : defaultExchangeEndpoints());

  for (let i = 0; i < endpoints.length; i += 1) {
    const ep = endpoints[i]!;
    const switched = i > 0;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const started = performance.now();
      const headerBag: Record<string, string> = {
        ...(init?.headers instanceof Headers
          ? Object.fromEntries(init.headers.entries())
          : (init?.headers as Record<string, string> | undefined) ?? {}),
      };
      if (!headerBag["User-Agent"] && !headerBag["user-agent"]) {
        headerBag["User-Agent"] = BROWSER_MIMIC_USER_AGENT;
      }
      if (!headerBag.Accept && !headerBag.accept) {
        headerBag.Accept = "application/json, text/plain, */*";
      }
      if (fetchFn === fetch) {
        assertRpcAllowlisted(ep.url, extraHosts);
      }
      const res = await fetchFn(ep.url, {
        ...init,
        headers: headerBag,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const latencyMs = performance.now() - started;

      if (!res.ok) {
        emitHealth({
          channel, endpointId: ep.id, role: ep.role, url: ep.url, latencyMs,
          ok: false, switched, reason: "HTTP_ERROR", timestamp: new Date().toISOString(),
        });
        setActiveRpcEndpointId(channel, ep.id);
        return res;
      }
      // Exchange POST is stateful — never retry on latency after HTTP ok (duplicate nonce).
      if (channel === "exchange") {
        setActiveRpcEndpointId(channel, ep.id);
        emitHealth({
          channel, endpointId: ep.id, role: ep.role, url: ep.url, latencyMs,
          ok: true, switched, timestamp: new Date().toISOString(),
        });
        return res;
      }
      if (latencyMs > latencyCap && i < endpoints.length - 1) {
        emitHealth({
          channel, endpointId: ep.id, role: ep.role, url: ep.url, latencyMs,
          ok: false, switched: true, reason: "LATENCY", timestamp: new Date().toISOString(),
        });
        continue;
      }
      setActiveRpcEndpointId(channel, ep.id);
      emitHealth({
        channel, endpointId: ep.id, role: ep.role, url: ep.url, latencyMs,
        ok: true, switched, timestamp: new Date().toISOString(),
      });
      return res;
    } catch (err) {
      clearTimeout(timer);
      const reason =
        err instanceof Error &&
        (err.name === "TimeoutError" ||
          err.name === "AbortError" ||
          /timeout|aborted/i.test(err.message))
          ? "TIMEOUT"
          : "NETWORK";
      emitHealth({
        channel, endpointId: ep.id, role: ep.role, url: ep.url, latencyMs: timeoutMs,
        ok: false, switched: true, reason, timestamp: new Date().toISOString(),
      });
    }
  }

  const health = buildHealthStatus(endpoints, channel);
  return buildRpcBufferedResponse(channel, {
    primaryOk: health.primaryOk,
    backupOk: health.backupOk,
    fallbackBuffered: true,
  });
}
