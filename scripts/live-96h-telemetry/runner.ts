/** Telemetry tick runner. */
import { probeArbitrumSepolia, probeHyperliquidTestnet, probeRobinhoodWorker } from "./probes";
import type { TelemetrySample } from "./types";

export async function runTelemetryTick(): Promise<TelemetrySample[]> {
  const samples = await Promise.all([
    probeArbitrumSepolia(),
    probeHyperliquidTestnet(),
    probeRobinhoodWorker(),
  ]);
  return samples;
}
