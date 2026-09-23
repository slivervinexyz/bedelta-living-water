import {
  assertRpcAllowlisted,
  BROWSER_MIMIC_USER_AGENT,
} from "../../../services/defense/rpc-whitelist";
import { HL_RPC_HEALTH_PROBE_TIMEOUT_MS } from "../../../config/constants";
import {
  defaultExchangeEndpoints,
  defaultInfoEndpoints,
} from "./endpoints";
import type {
  RpcChannel,
  RpcEndpoint,
  RpcEndpointRole,
  RpcFailoverFetchOptions,
  RpcHealthLog,
  RpcHealthStatus,
} from "./types";

const healthLogs: RpcHealthLog[] = [];
const activeId: Record<RpcChannel, string | null> = { info: null, exchange: null };

function emitHealth(log: RpcHealthLog): void {
  healthLogs.push(log);
  if (healthLogs.length > 64) healthLogs.shift();
  console.info(
    `[RPC_HEALTH] ${log.channel}/${log.role} ${log.ok ? "ok" : "fail"} ` +
      `${log.latencyMs.toFixed(1)}ms${log.switched ? " SWITCH" : ""}` +
      (log.reason ? ` ${log.reason}` : ""),
  );
}

function buildHealthStatus(
  endpoints: readonly RpcEndpoint[],
  channel: RpcChannel,
): RpcHealthStatus {
  const recent = healthLogs
    .filter((log) => log.channel === channel)
    .slice(-endpoints.length);
  const byRole = (role: RpcEndpointRole): boolean =>
    recent.some((log) => log.role === role && log.ok);
  const primaryOk = byRole("primary");
  const backupOk = byRole("backup");
  return {
    primaryOk,
    backupOk,
    fallbackBuffered: !primaryOk && !backupOk,
  };
}

async function probeEndpoint(
  channel: RpcChannel,
  ep: RpcEndpoint,
  timeoutMs: number,
  fetchFn: typeof fetch,
  extraHosts: readonly string[],
): Promise<RpcHealthLog> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (fetchFn === fetch) {
      assertRpcAllowlisted(ep.url, extraHosts);
    }
    const res = await fetchFn(ep.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "User-Agent": BROWSER_MIMIC_USER_AGENT,
      },
      body: JSON.stringify({ type: "allMids" }),
      signal: controller.signal,
    });
    const latencyMs = performance.now() - started;
    const ok = res.ok;
    const log: RpcHealthLog = {
      channel,
      endpointId: ep.id,
      role: ep.role,
      url: ep.url,
      latencyMs,
      ok,
      switched: false,
      reason: ok ? undefined : "HTTP_ERROR",
      timestamp: new Date().toISOString(),
    };
    emitHealth(log);
    return log;
  } catch (err) {
    const reason =
      err instanceof Error &&
      (err.name === "TimeoutError" ||
        err.name === "AbortError" ||
        /timeout|aborted/i.test(err.message))
        ? "TIMEOUT"
        : "NETWORK";
    const log: RpcHealthLog = {
      channel,
      endpointId: ep.id,
      role: ep.role,
      url: ep.url,
      latencyMs: performance.now() - started,
      ok: false,
      switched: false,
      reason,
      timestamp: new Date().toISOString(),
    };
    emitHealth(log);
    return log;
  } finally {
    clearTimeout(timer);
  }
}

/** Probe primary + backup RPC slots; never throws on network loss. */
export async function probeRpcHealth(
  channel: RpcChannel = "info",
  options: RpcFailoverFetchOptions = {},
): Promise<RpcHealthStatus> {
  const timeoutMs = options.timeoutMs ?? HL_RPC_HEALTH_PROBE_TIMEOUT_MS;
  const fetchFn = options.fetchFn ?? fetch;
  const extraHosts = options.extraHosts ?? [];
  const endpoints =
    options.endpoints ??
    (channel === "info" ? defaultInfoEndpoints() : defaultExchangeEndpoints());

  const primary = endpoints.find((ep) => ep.role === "primary");
  const backup = endpoints.find((ep) => ep.role === "backup");

  let primaryOk = false;
  let backupOk = false;

  if (primary) {
    const log = await probeEndpoint(channel, primary, timeoutMs, fetchFn, extraHosts);
    primaryOk = log.ok;
  }
  if (backup) {
    const log = await probeEndpoint(channel, backup, timeoutMs, fetchFn, extraHosts);
    backupOk = log.ok;
  }

  const status: RpcHealthStatus = {
    primaryOk,
    backupOk,
    fallbackBuffered: !primaryOk && !backupOk,
  };

  if (status.fallbackBuffered) {
    console.info(
      "[RPC_HEALTH] buffered telemetry active — primary and backup unreachable",
    );
  }

  return status;
}

export function getRpcHealthLogs(): readonly RpcHealthLog[] {
  return healthLogs.slice();
}

export function getActiveRpcEndpointId(channel: RpcChannel): string | null {
  return activeId[channel];
}

export function setActiveRpcEndpointId(channel: RpcChannel, id: string): void {
  activeId[channel] = id;
}

/** @internal */
export function __resetRpcFailoverForTests(): void {
  healthLogs.length = 0;
  activeId.info = null;
  activeId.exchange = null;
}

export { buildHealthStatus, emitHealth };
