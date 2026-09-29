/** Doc merge + atomic persist. */
import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  OUT_PATH,
  SCHEMA,
  type Live96hTelemetryDoc,
  type TelemetrySample,
  type TelemetryVenue,
} from "./types";

function loadDoc(
  startedAt: string,
  daemonEndsAt: string,
  intervalSec: number,
  durationHours: number,
): Live96hTelemetryDoc {
  try {
    const raw = readFileSync(OUT_PATH, "utf8");
    const parsed = JSON.parse(raw) as Live96hTelemetryDoc;
    if (parsed.schema === SCHEMA) return parsed;
  } catch {
    /* auto-create */
  }
  return {
    schema: SCHEMA,
    startedAt,
    lastUpdatedAt: startedAt,
    daemonEndsAt,
    intervalSec,
    durationHours,
    snapshot: {},
    recentSamples: [],
    totals: { probes: 0, ok: 0, degraded: 0, trip: 0 },
  };
}

export function mergeSamples(
  doc: Live96hTelemetryDoc,
  samples: TelemetrySample[],
): Live96hTelemetryDoc {
  const now = new Date().toISOString();
  for (const s of samples) {
    doc.snapshot[s.venue] = s;
    doc.recentSamples.push(s);
    doc.totals.probes += 1;
    if (s.status === "OK") doc.totals.ok += 1;
    else if (s.status === "Degraded") doc.totals.degraded += 1;
    else doc.totals.trip += 1;
  }
  doc.lastUpdatedAt = now;
  return doc;
}

let persistChain: Promise<void> = Promise.resolve();

async function persistDocAsync(payload: string): Promise<void> {
  await mkdir(dirname(OUT_PATH), { recursive: true });
  const tmp = `${OUT_PATH}.tmp`;
  await writeFile(tmp, payload, "utf8");
  await rename(tmp, OUT_PATH);
}

/** Non-blocking chained write — snapshots JSON at enqueue time. */
export function persistDoc(doc: Live96hTelemetryDoc): void {
  const payload = `${JSON.stringify(doc, null, 2)}\n`;
  persistChain = persistChain
    .then(() => persistDocAsync(payload))
    .catch((err) => {
      console.error(
        "[telemetry:96h] persist error (fail-safe):",
        err instanceof Error ? err.message : err,
      );
    });
}

export async function flushPersistDoc(): Promise<void> {
  await persistChain;
}

export async function runTelemetryTick(): Promise<TelemetrySample[]> {
  return Promise.all([
    probeArbitrumSepolia(),
    probeHyperliquidTestnet(),
    probeRobinhoodWorker(),
  ]);
}
