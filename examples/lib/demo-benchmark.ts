import { evaluateVariationalFlags } from "../../src/core/risk-engine-core";
import { checkSoilResistance, type SoilResistanceInput } from "../../src/services/risk-control";
import { captureDemoBenchmark, EDGE_TARGET_US, type DemoBenchmarkSnapshot } from "./demo-timing";

export { EDGE_TARGET_US, type DemoBenchmarkSnapshot };

const NOMINAL_VARIATIONAL_PROBE = {
  quotePriceUsd: 3500,
  oracleMarkUsd: 3500,
  quoteTimestampMs: Date.now() - 100,
  nowMs: Date.now(),
  tradeSizeUsd: 5_000,
  olpDepthUsd: 100_000,
  longTailAsset: false as const,
};

export function captureSoilBenchmark(
  soil: SoilResistanceInput,
  e2eHarness?: () => void,
): DemoBenchmarkSnapshot {
  const nowMs = soil.at?.getTime() ?? Date.now();
  const variationalProbe = { ...NOMINAL_VARIATIONAL_PROBE, nowMs, quoteTimestampMs: nowMs - 100 };
  return captureDemoBenchmark({
    warmup: () => checkSoilResistance(soil),
    pureInvariant: () => {
      evaluateVariationalFlags(variationalProbe);
    },
    fullMatrix: () => {
      checkSoilResistance(soil);
    },
    e2eHarness: e2eHarness ?? (() => checkSoilResistance(soil)),
  });
}
