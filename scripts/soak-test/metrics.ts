/** Soak telemetry metrics summarizer. */
import type { SoakTelemetryTick } from "../../src/services/soak-telemetry";
import { heapMb } from "./cli";

export function summarizeTicks(ticks: SoakTelemetryTick[]): {
  failureCount: number;
  failureRate: number;
  avgNetworkMs: number;
  maxNetworkMs: number;
} {
  if (ticks.length === 0) {
    return {
      failureCount: 0,
      failureRate: 0,
      avgNetworkMs: 0,
      maxNetworkMs: 0,
    };
  }

  const failureCount = ticks.filter(
    (t) => !!t.error || !t.soilOk,
  ).length;

  const latencies = ticks.map((t) => t.latencyMs);
  const avgNetworkMs =
    latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length;

  return {
    failureCount,
    failureRate: Number((failureCount / ticks.length).toFixed(4)),
    avgNetworkMs: Number(avgNetworkMs.toFixed(3)),
    maxNetworkMs: Math.max(...latencies),
  };
}

export function logTickMetrics(
  iteration: number,
  ticks: SoakTelemetryTick[],
  heapUsed: number,
  cumulativeFailures: number,
): void {
  const networkMs = ticks.reduce((sum, t) => sum + t.latencyMs, 0);

  const payload = {
    event: "SOAK_TICK_METRICS" as const,
    iteration,
    heapUsedMb: heapMb(heapUsed),
    networkMs: Number(networkMs.toFixed(3)),
    failures: cumulativeFailures,
    coins: ticks.map((t) => ({
      coin: t.coin,
      soilOk: t.soilOk,
      counterVerdict: t.counterVerdict,
      latencyMs: t.latencyMs,
      error: t.error ?? null,
    })),
  };

  console.log(JSON.stringify(payload));
}
