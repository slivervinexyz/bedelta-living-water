#!/usr/bin/env tsx
/** SEPSB — SliverVine ExoMesh Pre-Consensus Security Benchmark harness. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeSoilSlippageMetrics } from "../src/core/soil-resistance-math";
import { detectBenchmarkEnvironment } from "../src/utils/hardware-detector";
import { evaluateSepsbCorpus, exportSepsbDuneCsv, SEPSB_STRESS_CSV_PATH } from "./sepsb-dune-csv-export";
import type { SepsbBenchmarkSsot, SepsbCaseResult, SepsbCorpusFile, SepsbCorpusSnapshot } from "./sepsb-benchmark-types";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOXIC_PATH = join(ROOT, "tests/p0/corpus/toxic-set.json");
const BENIGN_PATH = join(ROOT, "tests/p0/corpus/benign-set.json");
const SSOT_PATH = join(ROOT, "docs/audit/SEPSB_BENCHMARK_SSOT.json");
const CORPUS_SNAPSHOT_PATH = join(ROOT, "docs/audit/SEPSB_CORPUS_SNAPSHOT.json");
const METRICS_PATH = join(ROOT, "docs/audit/SYSTEM_METRICS_SSOT.json");
const TOXIC_SOURCE = "tests/p0/corpus/toxic-set.json";
const BENIGN_SOURCE = "tests/p0/corpus/benign-set.json";
const LATENCY_ITERS = 10_000;
const TPR_MIN = 99.5;
const FPR_MAX = 0.5;

function loadCorpus(path: string): SepsbCorpusFile {
  return JSON.parse(readFileSync(path, "utf8")) as SepsbCorpusFile;
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

function measureReflexLatencyUs(): { p50: number; p99: number } {
  const soil = {
    hlSpot: 3500,
    hlPerp: 3500,
    dydxPerp: 3498.25,
    depthUsd: 500_000,
    maxSlippage: 0.005,
    minDepthUsd: 100_000,
  };
  for (let i = 0; i < 500; i++) computeSoilSlippageMetrics({ symbol: "ETH", ...soil });
  const samplesUs: number[] = [];
  for (let i = 0; i < LATENCY_ITERS; i++) {
    const t0 = performance.now();
    computeSoilSlippageMetrics({ symbol: "ETH", ...soil });
    samplesUs.push((performance.now() - t0) * 1000);
  }
  samplesUs.sort((a, b) => a - b);
  return { p50: Number(percentile(samplesUs, 50).toFixed(3)), p99: Number(percentile(samplesUs, 99).toFixed(3)) };
}

function computeRates(toxic: SepsbCaseResult[], benign: SepsbCaseResult[]) {
  const tp = toxic.filter((r) => r.actual === "block").length;
  const fn = toxic.length - tp;
  const fp = benign.filter((r) => r.actual === "block").length;
  const tn = benign.length - fp;
  const tpr = toxic.length ? (tp / (tp + fn)) * 100 : 100;
  const fpr = benign.length ? (fp / (fp + tn)) * 100 : 0;
  const observatoryMisblock = benign.filter((r) => r.observatoryParadox && r.actual === "block").length;
  return { tpr, fpr, observatoryMisblock, tp, fn, fp, tn };
}

function exportCorpusSnapshot(
  generatedAt: string,
  toxicFile: SepsbCorpusFile,
  benignFile: SepsbCorpusFile,
  toxicResults: SepsbCaseResult[],
  benignResults: SepsbCaseResult[],
  verdict: "PASS" | "FAIL",
): void {
  const snapshot: SepsbCorpusSnapshot = {
    schema: "silvervine.sepsb-corpus-snapshot.v1",
    benchmark_title: "SliverVine ExoMesh Pre-Consensus Security Benchmark (SEPSB)",
    standard_version: "SEPSB-v1.0-Santenmoku",
    generatedAt,
    sources: { toxic: TOXIC_SOURCE, benign: BENIGN_SOURCE },
    corpus: { toxic: toxicFile, benign: benignFile },
    lastRun: { verdict, toxicResults, benignResults },
  };
  mkdirSync(dirname(CORPUS_SNAPSHOT_PATH), { recursive: true });
  writeFileSync(CORPUS_SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
}

function main(): void {
  const env = detectBenchmarkEnvironment();
  const toxicFile = loadCorpus(TOXIC_PATH);
  const benignFile = loadCorpus(BENIGN_PATH);
  const toxic = evaluateSepsbCorpus(toxicFile);
  const benign = evaluateSepsbCorpus(benignFile);
  const rates = computeRates(toxic, benign);
  const latency = measureReflexLatencyUs();
  const killSwitch = rates.fpr > FPR_MAX;
  const verdict =
    !killSwitch && rates.tpr >= TPR_MIN && rates.observatoryMisblock === 0 && toxic.every((r) => r.pass) && benign.every((r) => r.pass)
      ? "PASS"
      : "FAIL";

  const report: SepsbBenchmarkSsot = {
    schema: "silvervine.sepsb-benchmark.ssot.v1",
    protocol: "SliverVine Protocol",
    harness: "sepsb-benchmark-runner",
    benchmark_title: "SliverVine ExoMesh Pre-Consensus Security Benchmark (SEPSB)",
    standard_version: "SEPSB-v1.0-Santenmoku",
    generatedAt: env.detectedAt,
    benchmark_environment: env,
    corpus: { toxicCases: toxic.length, benignCases: benign.length },
    metrics: {
      truePositiveRatePct: Number(rates.tpr.toFixed(4)),
      falsePositiveRatePct: Number(rates.fpr.toFixed(4)),
      reflexLatencyP50Us: latency.p50,
      reflexLatencyP99Us: latency.p99,
      observatoryParadoxMisblockCount: rates.observatoryMisblock,
      latencyIterations: LATENCY_ITERS,
    },
    targets: { tprMinPct: TPR_MIN, fprMaxPct: FPR_MAX, observatoryMisblockMax: 0 },
    verdict,
    killSwitchTriggered: killSwitch,
    caseResults: [...toxic, ...benign],
  };

  mkdirSync(dirname(SSOT_PATH), { recursive: true });
  writeFileSync(SSOT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  exportCorpusSnapshot(env.detectedAt, toxicFile, benignFile, toxic, benign, verdict);
  const stressCsvPath = join(ROOT, SEPSB_STRESS_CSV_PATH);
  exportSepsbDuneCsv(
    {
      timestamp: env.detectedAt,
      toxicFile,
      benignFile,
      toxicResults: toxic,
      benignResults: benign,
      tprRate: rates.tpr,
      fprRate: rates.fpr,
      env,
    },
    stressCsvPath,
  );

  const metrics = JSON.parse(readFileSync(METRICS_PATH, "utf8")) as Record<string, unknown>;
  metrics.benchmark_environment = env;
  metrics.generatedAt = env.detectedAt;
  metrics.sepsb_benchmark = {
    ssot: "docs/audit/SEPSB_BENCHMARK_SSOT.json",
    corpus_snapshot: "docs/audit/SEPSB_CORPUS_SNAPSHOT.json",
    stress_telemetry_csv: SEPSB_STRESS_CSV_PATH,
    benchmark_title: report.benchmark_title,
    standard_version: report.standard_version,
    verdict: report.verdict,
    truePositiveRatePct: report.metrics.truePositiveRatePct,
    falsePositiveRatePct: report.metrics.falsePositiveRatePct,
    reflexLatencyP50Us: report.metrics.reflexLatencyP50Us,
    reflexLatencyP99Us: report.metrics.reflexLatencyP99Us,
  };
  writeFileSync(METRICS_PATH, `${JSON.stringify(metrics, null, 2)}\n`);

  console.log(`[SEPSB] TPR ${report.metrics.truePositiveRatePct}% (target >= ${TPR_MIN}%)`);
  console.log(`[SEPSB] FPR ${report.metrics.falsePositiveRatePct}% (target <= ${FPR_MAX}%${killSwitch ? " KILL-SWITCH" : ""})`);
  console.log(`[SEPSB] Reflex p50 ${latency.p50}µs · p99 ${latency.p99}µs (${LATENCY_ITERS} iter)`);
  console.log(`[SEPSB] Observatory mis-block ${rates.observatoryMisblock} (max 0)`);
  console.log(`[SEPSB] Verdict ${verdict}`);
  console.log(`[SSOT] ${SSOT_PATH}`);
  console.log(`[SSOT] ${CORPUS_SNAPSHOT_PATH}`);
  console.log(`[SSOT] ${stressCsvPath}`);
  if (verdict !== "PASS") process.exitCode = 1;
}

main();
