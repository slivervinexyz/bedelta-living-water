#!/usr/bin/env tsx
/**
 * 24h sandbox soak harness — sequential 1-minute ticks against Hyperliquid testnet.
 * Default: 1,440 iterations (24h). Short run: `--iterations 10`
 */
import { performance } from "node:perf_hooks";
import {
  SOAK_TELEMETRY_COINS,
  __resetSoakTelemetryForTests,
  readInMemorySoakLog,
  runSoakTelemetryTick,
  type SoakTelemetryTick,
} from "../../src/services/soak-telemetry";
import { __resetCircuitBreakerForTests } from "../../src/services/circuit-breaker";
import { __clearL2BookCacheForTests } from "../../src/services/hyperliquid-adapter";
import {
  MAX_HEAP_VARIANCE_RATIO,
  WARMUP_ITERATIONS,
  createMockFetch,
  heapMb,
  parseCliOptions,
} from "./cli";
import { logTickMetrics, summarizeTicks } from "./metrics";

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));

  __resetSoakTelemetryForTests();
  __resetCircuitBreakerForTests();
  __clearL2BookCacheForTests();

  let iterationFailures = 0;
  let lastBatchTicks: SoakTelemetryTick[] = [];
  let fatalErrors = 0;

  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    await runSoakTelemetryTick({
      fetchFn: options.useMock ? createMockFetch(i) : undefined,
      fetchOptions: {
        maxRetries: options.useMock ? 1 : 2,
        timeoutMs: options.useMock ? 50 : 8_000,
      },
    }).catch(() => {
      fatalErrors += 1;
    });
  }

  if (global.gc) {
    global.gc();
  }

  const heapStart = process.memoryUsage().heapUsed;
  const heapSamples: number[] = [heapStart];
  const started = performance.now();

  for (let i = 1; i <= options.iterations; i++) {
    const tickStarted = performance.now();

    try {
      const rolling = await runSoakTelemetryTick({
        fetchFn: options.useMock ? createMockFetch(i) : undefined,
        fetchOptions: {
          maxRetries: options.useMock ? 1 : 2,
          timeoutMs: options.useMock ? 50 : 8_000,
        },
      });

      lastBatchTicks = rolling.ticks.slice(-SOAK_TELEMETRY_COINS.length);
      const batchFailures = lastBatchTicks.filter(
        (t) => !!t.error || !t.soilOk,
      ).length;
      iterationFailures += batchFailures;
    } catch {
      fatalErrors += 1;
      iterationFailures += SOAK_TELEMETRY_COINS.length;
      lastBatchTicks = SOAK_TELEMETRY_COINS.map((coin) => ({
        at: new Date().toISOString(),
        coin,
        latencyMs: performance.now() - tickStarted,
        soilOk: false,
        soilReasons: ["ITERATION_EXCEPTION"],
        crossVenueSlippage: -1,
        spotPerpSlippage: -1,
        counterVerdict: "REJECT",
        counterArmed: false,
        imbalanceRatio: 0,
        liveSlippageBps: Number.POSITIVE_INFINITY,
        dynamicMaxSlUsd: 0,
        error: "ITERATION_EXCEPTION",
      }));
    }

    const heapUsed = process.memoryUsage().heapUsed;
    heapSamples.push(heapUsed);
    logTickMetrics(i, lastBatchTicks, heapUsed, iterationFailures);
  }

  const elapsedMs = performance.now() - started;
  const heapEnd = process.memoryUsage().heapUsed;
  const heapGrowthRatio = (heapEnd - heapStart) / Math.max(heapStart, 1);
  const heapMin = Math.min(...heapSamples);
  const heapMax = Math.max(...heapSamples);
  const heapVarianceRatio = (heapMax - heapMin) / Math.max(heapStart, 1);

  const log = readInMemorySoakLog();
  const recentTicks = log.ticks.slice(-options.iterations * SOAK_TELEMETRY_COINS.length);
  const network = summarizeTicks(recentTicks);

  const summary = {
    event: "SOAK_SUMMARY",
    mode: options.useMock ? "mock" : "live-testnet",
    iterations: options.iterations,
    elapsedMs: Number(elapsedMs.toFixed(2)),
    avgTickMs: Number((elapsedMs / options.iterations).toFixed(3)),
    tickCount: log.tickCount,
    bufferSize: log.ticks.length,
    iterationFailures,
    failureRate: Number(
      (iterationFailures / (options.iterations * SOAK_TELEMETRY_COINS.length)).toFixed(4),
    ),
    fatalErrors,
    network,
    heapStartMb: heapMb(heapStart),
    heapEndMb: heapMb(heapEnd),
    heapGrowthRatio: Number(heapGrowthRatio.toFixed(4)),
    heapVarianceRatio: Number(heapVarianceRatio.toFixed(4)),
    memoryOk:
      heapGrowthRatio <= MAX_HEAP_VARIANCE_RATIO &&
      heapVarianceRatio <= MAX_HEAP_VARIANCE_RATIO,
  };

  console.log(JSON.stringify(summary));

  if (!summary.memoryOk || summary.fatalErrors > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[soak-test] fatal", err);
  process.exitCode = 1;
});
