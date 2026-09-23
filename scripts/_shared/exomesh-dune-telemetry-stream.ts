/** Daily synthetic stream variance for ExoMesh Dune export batches. */
import {
  estimateGasSavedUsd,
  estimatePotentialLossSavedUsd,
  seedReflexLatencyUs,
} from "./exomesh-dune-telemetry-map";
import { applyRollingTimestamps } from "./exomesh-dune-telemetry-rolling";
import type { ExomeshDuneTelemetryRow } from "./exomesh-dune-telemetry-types";
import { utcExportDateKey } from "./exomesh-dune-telemetry-cumulative";

export const DAILY_EVENT_COUNT_MIN = 240;
export const DAILY_EVENT_COUNT_MAX = 280;

export function hashDateSeed(dateKey: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < dateKey.length; index++) {
    hash ^= dateKey.charCodeAt(index);
    hash = Math.imul(hash, 1_677_761_9);
  }
  return hash >>> 0;
}

export function resolveDailyEventCount(
  endMs: number,
  min = DAILY_EVENT_COUNT_MIN,
  max = DAILY_EVENT_COUNT_MAX,
): number {
  const span = max - min + 1;
  return min + (hashDateSeed(utcExportDateKey(endMs)) % span);
}

function applyStreamVariance(
  base: ExomeshDuneTelemetryRow,
  rowSeed: number,
  streamIndex: number,
): ExomeshDuneTelemetryRow {
  const reflexLatencyUs =
    Math.round((seedReflexLatencyUs(base.intercept_type, rowSeed) + (rowSeed % 13) * 0.02) * 10) /
    10;
  const economicsSeed = rowSeed + streamIndex * 7;
  const gasSavedUsd = estimateGasSavedUsd(base.intercept_type, base.status);
  const potentialLossSavedUsd = estimatePotentialLossSavedUsd(
    base.intercept_type,
    economicsSeed,
    base.status,
  );
  return {
    ...base,
    timestampMs: streamIndex,
    reflex_latency_us: reflexLatencyUs,
    gas_burned: base.status === "FAIL_CLOSED" ? 0 : 0.000001,
    simulated_loss_prevented_usd: potentialLossSavedUsd,
    gas_saved_usd: gasSavedUsd,
    source: `${base.source}:stream:${rowSeed}`,
  };
}

export function materializeDailyStreamBatch(
  baseRows: readonly ExomeshDuneTelemetryRow[],
  endMs: number,
): ExomeshDuneTelemetryRow[] {
  if (baseRows.length === 0) return [];
  const dateSeed = hashDateSeed(utcExportDateKey(endMs));
  const targetCount = resolveDailyEventCount(endMs);
  const rows = new Array<ExomeshDuneTelemetryRow>(targetCount);
  for (let index = 0; index < targetCount; index++) {
    const base = baseRows[(dateSeed + index * 17) % baseRows.length]!;
    rows[index] = applyStreamVariance(base, dateSeed + index * 31, index);
  }
  return applyRollingTimestamps(rows, endMs);
}
