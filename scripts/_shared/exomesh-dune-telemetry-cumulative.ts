/** Cumulative historical append for ExoMesh Dune CSV export. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  DUNE_TELEMETRY_CSV_HEADER,
  type DuneInterceptStatus,
  type DuneInterceptType,
  type DuneVenue,
  type ExomeshDuneTelemetryRow,
} from "./exomesh-dune-telemetry-types";

export interface DuneTelemetryExportMeta {
  lastExportDate: string;
  lastBatchSize: number;
  batchCount: number;
  totalRows: number;
}

export type DuneCumulativeMergeAction = "created" | "appended";

export function utcExportDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function parseDuneTelemetryCsv(content: string): ExomeshDuneTelemetryRow[] {
  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  if (lines.length <= 1) return [];
  const rows = new Array<ExomeshDuneTelemetryRow>(lines.length - 1);
  for (let index = 1; index < lines.length; index++) {
    rows[index - 1] = parseDuneTelemetryCsvLine(lines[index]!);
  }
  return rows;
}

function parseDuneTelemetryCsvLine(line: string): ExomeshDuneTelemetryRow {
  const [
    timestamp,
    venue,
    interceptType,
    reflexLatencyUs,
    gasBurned,
    potentialLossSavedUsd,
    gasSavedUsd,
    status,
  ] = line.split(",");
  const timestampMs = Date.parse(timestamp);
  return {
    timestamp,
    timestampMs,
    venue: venue as DuneVenue,
    intercept_type: interceptType as DuneInterceptType,
    reflex_latency_us: Number.parseFloat(reflexLatencyUs),
    gas_burned: Number.parseFloat(gasBurned),
    simulated_loss_prevented_usd: Number.parseFloat(potentialLossSavedUsd),
    gas_saved_usd: Number.parseFloat(gasSavedUsd),
    status: status as DuneInterceptStatus,
    source: "csv:historical",
  };
}

export function readDuneTelemetryExportMeta(metaPath: string): DuneTelemetryExportMeta | null {
  if (!existsSync(metaPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(metaPath, "utf8")) as Partial<DuneTelemetryExportMeta> & {
      batchSize?: number;
    };
    const lastBatchSize = parsed.lastBatchSize ?? parsed.batchSize;
    if (!parsed.lastExportDate || !lastBatchSize) return null;
    return {
      lastExportDate: parsed.lastExportDate,
      lastBatchSize,
      batchCount: parsed.batchCount ?? 1,
      totalRows: parsed.totalRows ?? lastBatchSize,
    };
  } catch {
    return null;
  }
}

export function writeDuneTelemetryExportMeta(
  metaPath: string,
  meta: DuneTelemetryExportMeta,
): void {
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
}

export function mergeCumulativeDuneBatches(
  historical: readonly ExomeshDuneTelemetryRow[],
  newBatch: readonly ExomeshDuneTelemetryRow[],
  endMs: number,
  meta: DuneTelemetryExportMeta | null,
): { rows: ExomeshDuneTelemetryRow[]; action: DuneCumulativeMergeAction; meta: DuneTelemetryExportMeta } {
  const exportDate = utcExportDateKey(endMs);
  const lastBatchSize = newBatch.length;

  if (historical.length === 0) {
    return {
      rows: [...newBatch],
      action: "created",
      meta: {
        lastExportDate: exportDate,
        lastBatchSize,
        batchCount: 1,
        totalRows: lastBatchSize,
      },
    };
  }

  const batchCount = (meta?.batchCount ?? 0) + 1;
  const totalRows = historical.length + lastBatchSize;
  return {
    rows: [...historical, ...newBatch],
    action: "appended",
    meta: {
      lastExportDate: exportDate,
      lastBatchSize,
      batchCount,
      totalRows,
    },
  };
}

export function loadCumulativeDuneTelemetry(
  csvPath: string,
): ExomeshDuneTelemetryRow[] {
  if (!existsSync(csvPath)) return [];
  const content = readFileSync(csvPath, "utf8");
  const trimmed = content.trim();
  if (!trimmed.includes(DUNE_TELEMETRY_CSV_HEADER)) return [];
  return parseDuneTelemetryCsv(content);
}
