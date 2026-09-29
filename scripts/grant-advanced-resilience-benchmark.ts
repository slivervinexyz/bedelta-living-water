#!/usr/bin/env tsx
/** v1.0 Santenmoku — Tier-1 Grant Advanced Resilience & Benchmark harness. */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __SELF = fileURLToPath(import.meta.url);
if (typeof globalThis.gc !== "function" && !process.env.__GRANT_BENCH_GC__) {
  const r = spawnSync(
    process.execPath,
    ["--expose-gc", "--import", "tsx", __SELF],
    { stdio: "inherit", env: { ...process.env, __GRANT_BENCH_GC__: "1" } },
  );
  process.exit(r.status ?? 1);
}

import { MIN_DEPTH_USD } from "../src/services/risk-control";
import {
  assertExoMeshRiskGate,
  checkSoilResistance,
  createRpcFailoverMock,
  evaluateGatewayRules,
  resolveAaProbeRouteAsync,
  runGmxTwoPhaseToctou,
} from "./_shared/grant-resilience-harness";
import { muteConsole, resetProbes, SAFE_AT, setOracleLag } from "./_shared/santenmoku-stress-probes";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const METRICS_PATH = join(ROOT, "docs/audit/grant-resilience-benchmark-metrics.json");
const AUDIT_PATH = join(ROOT, "docs/logging/20260814-230000-grant-resilience-benchmark-audit.md");
const SYMBOL = "ETH";
const BASE = 3_500;
const BALANCE = 10_000;
const BENCH_ITERS = 10_000;

const soil = (depthUsd = MIN_DEPTH_USD, dydx = BASE) => ({
  symbol: SYMBOL,
  hlSpot: BASE,
  hlPerp: BASE,
  dydxPerp: dydx,
  depthUsd,
  orderSizeUsd: 500,
  accountBalanceUsd: BALANCE,
  at: SAFE_AT,
});

async function test1Toctou(now: number) {
  const result = await runGmxTwoPhaseToctou(SYMBOL, () => soil(), () => soil(MIN_DEPTH_USD, BASE * 1.02));
  const pass =
    result.phase1Pass &&
    result.phase2FailClosed &&
    result.compensationTriggered &&
    result.orderTimeout &&
    result.sagaPhase === "COMPENSATE";
  return { pass, result, keeperDelayMs: 2_000 };
}

async function test2Failover(now: number) {
  const modes = ["http429", "http503", "timeout"] as const;
  const routes: Awaited<ReturnType<typeof resolveAaProbeRouteAsync>>[] = [];
  let falseNegatives = 0;
  let gateChecks = 0;

  for (const mode of modes) {
    const mock = createRpcFailoverMock(mode);
    const route = await resolveAaProbeRouteAsync(mock);
    routes.push(route);

    resetProbes(now);
    setOracleLag(now, 95);
    const toxic = assertExoMeshRiskGate(
      { symbol: SYMBOL, soil: soil(0, BASE * 1.02) },
      true,
    );
    const healthy = assertExoMeshRiskGate({ symbol: SYMBOL, soil: soil() }, false);
    falseNegatives += toxic.falseNegatives + healthy.falseNegatives;
    gateChecks += 2;
  }

  const maxFailoverMs = Math.max(...routes.map((r) => r.failoverMs));
  const allRotated = routes.every((r) => r.primaryFailed);
  const pass = allRotated && maxFailoverMs < 50 && falseNegatives === 0;
  return { pass, routes, maxFailoverMs, falseNegatives, gateChecks };
}

function test3Benchmark(now: number) {
  resetProbes(now);
  setOracleLag(now, 95);
  const inp = soil();

  for (let i = 0; i < 3_000; i++) {
    evaluateGatewayRules({ symbol: SYMBOL, soil: inp });
    checkSoilResistance(inp);
  }
  if (typeof globalThis.gc === "function") globalThis.gc();

  const heap0 = process.memoryUsage().heapUsed;
  const latencies: number[] = [];

  for (let i = 0; i < BENCH_ITERS; i++) {
    const t0 = performance.now();
    evaluateGatewayRules({ symbol: SYMBOL, soil: inp });
    checkSoilResistance(inp);
    latencies.push(performance.now() - t0);
  }

  if (typeof globalThis.gc === "function") globalThis.gc();
  const meanMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const heapDeltaMb = (process.memoryUsage().heapUsed - heap0) / (1024 * 1024);
  const pass = meanMs < 1.0 && Math.abs(heapDeltaMb) <= 0.5;
  return { pass, meanMs, heapDeltaMb, iterations: BENCH_ITERS, gcUsed: typeof globalThis.gc === "function" };
}

async function main(): Promise<void> {
  const restore = muteConsole();
  const started = Date.now();
  const now = Date.now();

  const t1 = await test1Toctou(now);
  const t2 = await test2Failover(now);
  const t3 = test3Benchmark(now);
  restore();

  console.log(`[TEST 1] TOCTOU Async Consistency: ${t1.pass ? "PASS" : "FAIL"}`);
  console.log(`[TEST 2] Multi-RPC Failover Resilience: ${t2.pass ? "PASS" : "FAIL"}`);
  console.log(`[TEST 3] Benchmark Latency (< 1.0ms) & Memory Guard: ${t3.pass ? "PASS" : "FAIL"}`);

  const metrics = {
    protocol: "SliverVine Protocol (BeDelta Living Water v1.0 / BeΔ)",
    harness: "grant-advanced-resilience-benchmark",
    tests: {
      toctou: { pass: t1.pass, ...t1.result, keeperDelayMs: t1.keeperDelayMs },
      failover: {
        pass: t2.pass,
        maxFailoverMs: t2.maxFailoverMs,
        falseNegatives: t2.falseNegatives,
        gateChecks: t2.gateChecks,
        routes: t2.routes,
      },
      benchmark: {
        pass: t3.pass,
        meanLatencyMs: Number(t3.meanMs.toFixed(4)),
        heapDeltaMb: Number(t3.heapDeltaMb.toFixed(4)),
        gcUsed: t3.gcUsed,
        iterations: t3.iterations,
        sloTargetMs: 1.0,
        soilSloMs: 500,
      },
    },
    allPass: t1.pass && t2.pass && t3.pass,
    durationMs: Date.now() - started,
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(METRICS_PATH), { recursive: true });
  mkdirSync(dirname(AUDIT_PATH), { recursive: true });
  writeFileSync(METRICS_PATH, `${JSON.stringify(metrics, null, 2)}\n`);

  const audit = [
    "# Grant Resilience Benchmark Audit",
    "",
    `**Timestamp:** ${metrics.generatedAt}`,
    `**Protocol:** SliverVine Protocol (BeDelta Living Water v1.0 / BeΔ)`,
    `**Harness:** \`scripts/grant-advanced-resilience-benchmark.ts\``,
    "",
    "## Results",
    "",
    `| Test | Status |`,
    `|------|--------|`,
    `| TOCTOU Async Consistency (GMX v2 2-Phase) | ${t1.pass ? "PASS" : "FAIL"} |`,
    `| Multi-RPC Failover Resilience | ${t2.pass ? "PASS" : "FAIL"} |`,
    `| Benchmark Latency & Memory Guard | ${t3.pass ? "PASS" : "FAIL"} |`,
    "",
    "## Key Metrics",
    "",
    `- Mean gateway evaluation latency: **${metrics.tests.benchmark.meanLatencyMs}ms** (SLO < 1.0ms)`,
    `- Max RPC failover switch: **${metrics.tests.failover.maxFailoverMs.toFixed(2)}ms** (SLO < 50ms)`,
    `- ExoMesh risk gate false negatives: **${metrics.tests.failover.falseNegatives}**`,
    `- Post-GC heap delta: **${metrics.tests.benchmark.heapDeltaMb} MB** (gc=${metrics.tests.benchmark.gcUsed})`,
    `- Benchmark iterations: **${metrics.tests.benchmark.iterations}**`,
    "",
    `**Overall:** ${metrics.allPass ? "ALL PASS" : "FAILURES DETECTED"}`,
  ].join("\n");
  writeFileSync(AUDIT_PATH, `${audit}\n`);

  console.log(JSON.stringify(metrics, null, 2));
  if (!metrics.allPass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
