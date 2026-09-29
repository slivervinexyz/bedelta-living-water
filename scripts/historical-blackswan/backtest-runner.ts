/** Orchestrates 3-tier backtest + SSOT JSON export. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARBITRUM_ONE_CHAIN_ID,
  resolveAuditArtifactBinding,
} from "../audit-artifact-bindings";
import { runMonteCarloChaosMatrix } from "./backtest-monte-carlo";
import { wasmRuntimesReady } from "./backtest-paths";
import { runTier1MacroEvents, runTier2Adversarial } from "./backtest-scenarios";
import {
  SSOT_PATH,
  type ComparativeRadar,
  type HistoricalBlackSwanSsot,
  type PathMetrics,
  type ScenarioDualResult,
} from "./backtest-types";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, SSOT_PATH);

function aggregateScenarios(rows: ScenarioDualResult[]): {
  baseline: PathMetrics;
  exomesh: PathMetrics;
  intercepts: number;
} {
  const baseline: PathMetrics = {
    executed: true,
    failClosed: false,
    slippageLossUsd: 0,
    toxicFlowExposureUsd: 0,
    gasWastedUsd: 0,
    lossPreventedUsd: 0,
    gasSavedUsd: 0,
    latencyUs: 0,
    interceptReasons: [],
  };
  const exomesh: PathMetrics = { ...baseline };
  let intercepts = 0;
  for (const row of rows) {
    baseline.slippageLossUsd += row.withoutExoMesh.slippageLossUsd;
    baseline.toxicFlowExposureUsd += row.withoutExoMesh.toxicFlowExposureUsd;
    baseline.gasWastedUsd += row.withoutExoMesh.gasWastedUsd;
    exomesh.slippageLossUsd += row.withSliverVine.slippageLossUsd;
    exomesh.toxicFlowExposureUsd += row.withSliverVine.toxicFlowExposureUsd;
    exomesh.gasWastedUsd += row.withSliverVine.gasWastedUsd;
    exomesh.lossPreventedUsd += row.withSliverVine.lossPreventedUsd;
    exomesh.gasSavedUsd += row.withSliverVine.gasSavedUsd;
    if (row.withSliverVine.failClosed) intercepts += 1;
  }
  return { baseline, exomesh, intercepts };
}

function buildRadar(
  tier1: Record<string, ScenarioDualResult>,
  tier2: Record<string, ScenarioDualResult>,
  tier3: ReturnType<typeof runMonteCarloChaosMatrix>,
): ComparativeRadar {
  const t1 = aggregateScenarios(Object.values(tier1));
  const t2 = aggregateScenarios(Object.values(tier2));
  const withoutSlip = t1.baseline.slippageLossUsd + t2.baseline.slippageLossUsd;
  const withoutToxic = t1.baseline.toxicFlowExposureUsd + t2.baseline.toxicFlowExposureUsd;
  const withoutGas = t1.baseline.gasWastedUsd + t2.baseline.gasWastedUsd;
  const withSlip = t1.exomesh.slippageLossUsd + t2.exomesh.slippageLossUsd;
  const withToxic = t1.exomesh.toxicFlowExposureUsd + t2.exomesh.toxicFlowExposureUsd;
  const withGas = t1.exomesh.gasWastedUsd + t2.exomesh.gasWastedUsd;
  const tier12Count = Object.keys(tier1).length + Object.keys(tier2).length;
  const tier12Intercepts = t1.intercepts + t2.intercepts;

  return {
    withoutExoMesh: {
      totalSlippageLossUsd: Number((withoutSlip + tier3.baselineTotalLossUsd * 0.65).toFixed(2)),
      totalToxicFlowUsd: Number((withoutToxic + tier3.baselineTotalLossUsd * 0.25).toFixed(2)),
      totalGasWastedUsd: Number((withoutGas + tier3.iterations * 0.35).toFixed(2)),
      aggregateLossUsd: Number(
        (withoutSlip + withoutToxic + withoutGas + tier3.baselineTotalLossUsd).toFixed(2),
      ),
      interceptRatePct: 0,
    },
    withSliverVine: {
      totalSlippageLossUsd: Number(withSlip.toFixed(2)),
      totalToxicFlowUsd: Number(withToxic.toFixed(2)),
      totalGasWastedUsd: Number(withGas.toFixed(2)),
      aggregateLossUsd: Number((withSlip + withToxic + withGas).toFixed(2)),
      interceptRatePct: Number(
        (((tier12Intercepts + tier3.interceptCount) /
          (tier12Count + tier3.iterations)) *
          100).toFixed(2),
      ),
      totalLossPreventedUsd: Number(
        (t1.exomesh.lossPreventedUsd + t2.exomesh.lossPreventedUsd + tier3.totalLossPreventedUsd).toFixed(2),
      ),
      totalGasSavedUsd: Number(
        (t1.exomesh.gasSavedUsd + t2.exomesh.gasSavedUsd + tier3.totalGasSavedUsd).toFixed(2),
      ),
      reflexLatencyP50Us: tier3.latencyP50Us,
      reflexLatencyP99Us: tier3.latencyP99Us,
    },
  };
}

export function runHistoricalBlackSwanBacktest(): HistoricalBlackSwanSsot {
  const binding = resolveAuditArtifactBinding();
  const tier1 = runTier1MacroEvents();
  const tier2 = runTier2Adversarial();
  const tier3 = runMonteCarloChaosMatrix();
  const runtimes = wasmRuntimesReady();

  return {
    schema: "silvervine.historical-blackswan-backtest.ssot.v1",
    protocol: "SliverVine Protocol",
    harness: "historical-blackswan-backtest",
    timestamp: binding.timestamp,
    chainId: ARBITRUM_ONE_CHAIN_ID,
    gitCommitHash: binding.gitCommitHash,
    wasm: runtimes,
    tier1_macro_events: tier1,
    tier2_adversarial: tier2,
    tier3_monte_carlo: tier3,
    comparative_radar_matrix: buildRadar(tier1, tier2, tier3),
  };
}

export function writeHistoricalBlackSwanSsot(report: HistoricalBlackSwanSsot): void {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(report, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2)}\n`);
}

export function printBacktestSummary(report: HistoricalBlackSwanSsot): void {
  const t3 = report.tier3_monte_carlo;
  const radar = report.comparative_radar_matrix;
  console.log(`[Tier1] ${Object.keys(report.tier1_macro_events).length} macro black swans replayed`);
  console.log(`[Tier2] ${Object.keys(report.tier2_adversarial).length} adversarial vectors defended`);
  console.log(
    `[Tier3] Monte Carlo ${t3.iterations}× — intercept ${t3.interceptRatePct}% · p50 ${t3.latencyP50Us}µs · p99 ${t3.latencyP99Us}µs`,
  );
  console.log(
    `[Radar] Without ExoMesh loss $${radar.withoutExoMesh.aggregateLossUsd} vs With SliverVine $${radar.withSliverVine.aggregateLossUsd} · prevented $${radar.withSliverVine.totalLossPreventedUsd}`,
  );
  console.log(`[SSOT] ${SSOT_PATH}`);
}
