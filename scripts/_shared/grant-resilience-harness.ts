/** v1.0 Santenmoku — Grant resilience harness (opt-in telemetry, no prod side-effects). */
import {
  assertExoMeshRiskGate,
  evaluateGatewayRules,
  checkSoilResistance,
  type GatewayRulesInput,
  type GatewayRulesResult,
  type ExoMeshRiskGateVerdict,
} from "../../src/core/risk-engine";
import type { SoilResistanceInput } from "../../src/services/risk-control";
import { GMX_RPC_PROVIDERS } from "../../src/services/adapters/gmx-v2-rpc-constants";
import {
  resetProbes,
  setInvalidOracleTimestamp,
  setOracleLag,
} from "./santenmoku-stress-probes";

export type GmxOrderPhase = "PREPARE" | "EXECUTE" | "COMPENSATE";

export interface AaProbeRouteResult {
  route: string;
  failoverMs: number;
  primaryFailed: boolean;
  statusCode: number;
}

export type { ExoMeshRiskGateVerdict };

export interface GmxToctouResult {
  phase1Pass: boolean;
  phase2FailClosed: boolean;
  sagaPhase: GmxOrderPhase;
  compensationTriggered: boolean;
  orderTimeout: boolean;
  reasons: string[];
}

const BLOCK_BODY = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "eth_blockNumber",
  params: [],
});
const OK_BODY = JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1234" });

/** Deterministic mock — primary 429/503 or hang (3s stall simulated via abort). */
export function createRpcFailoverMock(
  mode: "http429" | "http503" | "timeout",
): typeof fetch {
  const primary = GMX_RPC_PROVIDERS[0]!;
  const secondary = GMX_RPC_PROVIDERS[1]!;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === primary) {
      if (mode === "timeout") {
        return new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          const abort = () => reject(new DOMException("Aborted", "AbortError"));
          if (signal?.aborted) { abort(); return; }
          signal?.addEventListener("abort", abort, { once: true });
          setTimeout(() => {
            signal?.removeEventListener("abort", abort);
            reject(new Error("RPC_TIMEOUT_3000MS"));
          }, 3_000);
        });
      }
      return new Response(BLOCK_BODY, {
        status: mode === "http503" ? 503 : 429,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url === secondary) {
      return new Response(OK_BODY, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(BLOCK_BODY, { status: 404 });
  }) as typeof fetch;
}

const AA_PROBE_TIMEOUT_MS = 40;

/** Arbitrum Adapter probe route — Primary → Secondary failover race. */
export async function resolveAaProbeRouteAsync(
  fetchFn: typeof fetch,
): Promise<AaProbeRouteResult> {
  const primary = GMX_RPC_PROVIDERS[0]!;
  const secondary = GMX_RPC_PROVIDERS[1]!;
  const t0 = performance.now();
  for (const url of [primary, secondary]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AA_PROBE_TIMEOUT_MS);
    try {
      const res = await fetchFn(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: BLOCK_BODY,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        return {
          route: url,
          failoverMs: performance.now() - t0,
          primaryFailed: url !== primary,
          statusCode: res.status,
        };
      }
      if (res.status === 429 || res.status === 503) continue;
    } catch {
      clearTimeout(timer);
      continue;
    }
  }
  throw new Error("AA_PROBE_ROUTE_EXHAUSTED");
}

export { assertExoMeshRiskGate };

/** GMX v2 two-phase lifecycle — TOCTOU async consistency with Saga compensation. */
export async function runGmxTwoPhaseToctou(
  symbol: string,
  soilHealthy: () => SoilResistanceInput,
  soilToxic: () => SoilResistanceInput,
  keeperDelayMs = 2_000,
): Promise<GmxToctouResult> {
  const t0 = Date.now();
  resetProbes(t0);
  setOracleLag(t0, 95);

  const phase1 = evaluateGatewayRules({ symbol, soil: soilHealthy() });
  if (phase1.tripped) {
    return {
      phase1Pass: false,
      phase2FailClosed: false,
      sagaPhase: "PREPARE",
      compensationTriggered: false,
      orderTimeout: false,
      reasons: phase1.reasons,
    };
  }

  await new Promise((r) => setTimeout(r, keeperDelayMs));

  const t1 = Date.now();
  resetProbes(t1);
  setInvalidOracleTimestamp(t1);

  const phase2 = evaluateGatewayRules({ symbol, soil: soilToxic() });
  const tripped = phase2.failClosed && phase2.tripped;
  return {
    phase1Pass: true,
    phase2FailClosed: tripped,
    sagaPhase: tripped ? "COMPENSATE" : "EXECUTE",
    compensationTriggered: tripped,
    orderTimeout: tripped,
    reasons: phase2.reasons,
  };
}

export { checkSoilResistance, evaluateGatewayRules };
