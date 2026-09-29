#!/usr/bin/env tsx
/**
 * 96-hour Live Network Telemetry Daemon — Triangle Topology RTT / jitter.
 */
export type { TelemetryStatus, TelemetryVenue, TelemetrySample, Live96hTelemetryDoc } from "./live-96h-telemetry/types";
export { classifyTelemetryStatus, computeJitterMs } from "./live-96h-telemetry/status";
export { mergeSamples, persistDoc, flushPersistDoc } from "./live-96h-telemetry/persist";
export { runTelemetryTick } from "./live-96h-telemetry/runner";

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_DURATION_HOURS, DEFAULT_INTERVAL_SEC, OUT_PATH, SCHEMA, type Live96hTelemetryDoc } from "./live-96h-telemetry/types";
import { mergeSamples, persistDoc, flushPersistDoc } from "./live-96h-telemetry/persist";
import { runTelemetryTick } from "./live-96h-telemetry/runner";
import { readFileSync } from "node:fs";

function parseArgs(argv: string[]) {
  const once = argv.includes("--once");
  const intervalFlag = argv.indexOf("--interval");
  const durationFlag = argv.indexOf("--duration-hours");
  const intervalSec =
    intervalFlag >= 0 ? Number(argv[intervalFlag + 1]) : DEFAULT_INTERVAL_SEC;
  const durationHours =
    durationFlag >= 0 ? Number(argv[durationFlag + 1]) : DEFAULT_DURATION_HOURS;
  return {
    once,
    intervalSec:
      Number.isFinite(intervalSec) && intervalSec > 0
        ? Math.floor(intervalSec)
        : DEFAULT_INTERVAL_SEC,
    durationHours:
      Number.isFinite(durationHours) && durationHours > 0
        ? durationHours
        : DEFAULT_DURATION_HOURS,
  };
}

async function main(): Promise<void> {
  const { once, intervalSec, durationHours } = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  const endsAtMs = Date.now() + durationHours * 3_600_000;
  const daemonEndsAt = new Date(endsAtMs).toISOString();
  let doc = loadDoc(startedAt, daemonEndsAt, intervalSec, durationHours);

  const tick = async () => {
    try {
      const samples = await runTelemetryTick();
      doc = mergeSamples(doc, samples);
      persistDoc(doc);
      const line = samples
        .map((s) => `${s.venue} rtt=${s.rttMs ?? "null"}ms jitter=${s.jitterMs ?? "null"}ms ${s.status}`)
        .join(" | ");
      console.log(`[telemetry:96h] ${doc.lastUpdatedAt} ${line}`);
    } catch (err) {
      console.error(
        "[telemetry:96h] tick error (fail-safe):",
        err instanceof Error ? err.message : err,
      );
    }
  };

  await tick();
  if (once) return;

  console.log(
    `[telemetry:96h] daemon started interval=${intervalSec}s duration=${durationHours}h → ${OUT_PATH}`,
  );

  const timer = setInterval(() => {
    if (Date.now() >= endsAtMs) {
      clearInterval(timer);
      console.log("[telemetry:96h] 96h window complete — exiting");
      return;
    }
    void tick();
  }, intervalSec * 1000);

  const shutdown = () => {
    clearInterval(timer);
    persistDoc(doc);
    void flushPersistDoc().then(() => {
      console.log("[telemetry:96h] shutdown — snapshot flushed");
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const isMain = process.argv[1]?.includes("live-96h-telemetry-daemon");
if (isMain) {
  main().catch((err) => {
    console.error("[telemetry:96h] fatal:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
