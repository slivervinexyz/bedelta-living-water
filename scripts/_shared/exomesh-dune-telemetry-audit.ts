/** Append live CLI demo rows to docs/audit/exomesh-dune-telemetry.csv. */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildTelemetryRow,
  DUNE_TELEMETRY_CSV_HEADER,
  mapReasonToInterceptType,
  rowToDuneTelemetryCsvLine,
  type DuneVenue,
  type ExomeshDuneTelemetryRow,
} from "./exomesh-dune-telemetry";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

export const DEFAULT_DUNE_TELEMETRY_CSV = join(ROOT, "docs/audit/exomesh-dune-telemetry.csv");

/** Wall-clock SSOT for live CLI / KV telemetry (not JUDGE_SAFE demo replay clock). */
export function resolveTelemetryWallClockMs(nowMs = Date.now()): number {
  return nowMs;
}

export function rowToCsvLine(row: ExomeshDuneTelemetryRow): string {
  return rowToDuneTelemetryCsvLine(row);
}

export function appendExomeshDuneTelemetryRow(
  input: {
    timestampMs?: number;
    venue: DuneVenue;
    status: "FAIL_CLOSED" | "ALLOW";
    reason: string;
    reflexLatencyUs?: number;
    source: string;
    /** Set true in unit tests that need deterministic timestamps. */
    preserveTimestamp?: boolean;
  },
  csvPath = DEFAULT_DUNE_TELEMETRY_CSV,
): ExomeshDuneTelemetryRow {
  const timestampMs = input.preserveTimestamp
    ? (input.timestampMs ?? resolveTelemetryWallClockMs())
    : resolveTelemetryWallClockMs(input.timestampMs);
  const interceptType =
    input.status === "ALLOW" ? "SOIL_RESISTANCE_TRIP" : mapReasonToInterceptType(input.reason);
  const row = buildTelemetryRow({
    timestampMs,
    venue: input.venue,
    interceptType,
    reflexLatencyUs: input.reflexLatencyUs ?? (input.status === "FAIL_CLOSED" ? 7.2 : 1.3),
    status: input.status,
    source: input.source,
    reason: input.reason,
  });
  if (!existsSync(csvPath)) {
    writeFileSync(csvPath, `${DUNE_TELEMETRY_CSV_HEADER}\n`, "utf8");
  } else {
    const prior = readFileSync(csvPath, "utf8");
    if (prior.length > 0 && !prior.endsWith("\n")) appendFileSync(csvPath, "\n", "utf8");
  }
  appendFileSync(csvPath, `${rowToCsvLine(row)}\n`, "utf8");
  return row;
}
