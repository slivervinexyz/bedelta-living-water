/** Rolling wall-clock timestamps for Dune bulk export (last 24h → now). */
import type { ExomeshDuneTelemetryRow } from "./exomesh-dune-telemetry";

export const ROLLING_EXPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function resolveRollingExportEndMs(nowMs = Date.now()): number {
  return nowMs;
}

export function resolveRollingExportStartMs(
  endMs: number,
  windowMs = ROLLING_EXPORT_WINDOW_MS,
): number {
  return endMs - windowMs;
}

export function distributeRollingTimestamps(
  count: number,
  endMs: number,
  windowMs = ROLLING_EXPORT_WINDOW_MS,
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [endMs];
  const startMs = resolveRollingExportStartMs(endMs, windowMs);
  const span = endMs - startMs;
  return Array.from({ length: count }, (_, index) =>
    Math.round(startMs + (span * index) / (count - 1)),
  );
}

export function applyRollingTimestamps(
  rows: readonly ExomeshDuneTelemetryRow[],
  endMs = resolveRollingExportEndMs(),
  windowMs = ROLLING_EXPORT_WINDOW_MS,
): ExomeshDuneTelemetryRow[] {
  const stamps = distributeRollingTimestamps(rows.length, endMs, windowMs);
  return rows.map((row, index) => {
    const timestampMs = stamps[index]!;
    return {
      ...row,
      timestampMs,
      timestamp: new Date(timestampMs).toISOString(),
    };
  });
}
