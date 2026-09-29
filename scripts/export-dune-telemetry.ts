#!/usr/bin/env tsx
/**
 * ExoMesh off-chain telemetry → Dune-compatible CSV/JSON.
 * Usage: pnpm tsx scripts/export-dune-telemetry.ts [--json] [--out path]
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadCumulativeDuneTelemetry,
  mergeCumulativeDuneBatches,
  readDuneTelemetryExportMeta,
  writeDuneTelemetryExportMeta,
} from "./_shared/exomesh-dune-telemetry-cumulative";
import {
  buildChaosMatrixTelemetryRows,
  buildGrantAuditTelemetryRows,
  buildHoneypotDecoyRows,
  buildTelemetryRow,
  formatDuneTelemetryCsv,
  mapRetailCodeToInterceptType,
  type ExomeshDuneTelemetryRow,
} from "./_shared/exomesh-dune-telemetry";
import { resolveRollingExportEndMs } from "./_shared/exomesh-dune-telemetry-rolling";
import { materializeDailyStreamBatch } from "./_shared/exomesh-dune-telemetry-stream";
import { CHAOS_ATTACK_COUNT, runMatrixCase } from "./chaos-blackswan-stress";
import { writeSepsbStressTelemetryCsv } from "./sepsb-dune-csv-export";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function buildExomeshDemoRows(): ExomeshDuneTelemetryRow[] {
  const demoRows: Array<{
    venue: ExomeshDuneTelemetryRow["venue"];
    code: string;
    wasmUs: number;
    status: ExomeshDuneTelemetryRow["status"];
    source: string;
  }> = [
    {
      venue: "gmx",
      code: "VENUE_DRIFT_REJECTED",
      wasmUs: 6.8,
      status: "FAIL_CLOSED",
      source: "demo:exomesh:C",
    },
    {
      venue: "hyperliquid",
      code: "MAX_ATTEMPTS_EXCEEDED_SEVERED",
      wasmUs: 7.2,
      status: "FAIL_CLOSED",
      source: "demo:exomesh:D",
    },
    {
      venue: "gmx",
      code: "ALLOW",
      wasmUs: 1.3,
      status: "ALLOW",
      source: "demo:exomesh:A",
    },
  ];
  return demoRows.map((row, index) =>
    buildTelemetryRow({
      timestampMs: index,
      venue: row.venue,
      interceptType: row.status === "ALLOW" ? "SOIL_RESISTANCE_TRIP" : mapRetailCodeToInterceptType(row.code),
      reflexLatencyUs: row.wasmUs,
      status: row.status,
      source: row.source,
      reason: row.code,
    }),
  );
}

function muteConsole(): () => void {
  const warn = console.warn;
  const error = console.error;
  console.warn = () => {};
  console.error = () => {};
  return () => {
    console.warn = warn;
    console.error = error;
  };
}

function buildExomeshTelemetryBasePool(endMs: number): ExomeshDuneTelemetryRow[] {
  const restore = muteConsole();
  let chaosCases: ReturnType<typeof runMatrixCase>[];
  try {
    chaosCases = Array.from({ length: CHAOS_ATTACK_COUNT }, (_, index) => runMatrixCase(index + 1));
  } finally {
    restore();
  }
  return [
    ...buildChaosMatrixTelemetryRows(chaosCases),
    ...buildHoneypotDecoyRows(),
    ...buildGrantAuditTelemetryRows(endMs),
    ...buildExomeshDemoRows(),
  ];
}

export function buildExomeshDuneTelemetryExport(endMs = resolveRollingExportEndMs()): ExomeshDuneTelemetryRow[] {
  return materializeDailyStreamBatch(buildExomeshTelemetryBasePool(endMs), endMs);
}

function writeCumulativeDuneCsv(
  csvPath: string,
  newBatch: ExomeshDuneTelemetryRow[],
  endMs: number,
): { rows: ExomeshDuneTelemetryRow[]; action: string } {
  const metaPath = `${csvPath}.meta.json`;
  const historical = loadCumulativeDuneTelemetry(csvPath);
  const merged = mergeCumulativeDuneBatches(
    historical,
    newBatch,
    endMs,
    readDuneTelemetryExportMeta(metaPath),
  );
  writeFileSync(csvPath, formatDuneTelemetryCsv(merged.rows));
  writeDuneTelemetryExportMeta(metaPath, merged.meta);
  return { rows: merged.rows, action: merged.action };
}

function main(): void {
  const jsonMode = process.argv.includes("--json");
  const outIdx = process.argv.indexOf("--out");
  const outPath = outIdx >= 0 ? process.argv[outIdx + 1] : undefined;
  const endMs = resolveRollingExportEndMs();
  const newBatch = buildExomeshDuneTelemetryExport(endMs);
  const failClosed = newBatch.filter((row) => row.status === "FAIL_CLOSED").length;
  const batchGasSavedUsd = newBatch.reduce((sum, row) => sum + row.gas_saved_usd, 0);
  const batchSimulatedLossPreventedUsd = newBatch.reduce(
    (sum, row) => sum + row.simulated_loss_prevented_usd,
    0,
  );

  if (jsonMode) {
    const payload = JSON.stringify(
      {
        schema: "silvervine.exomesh.dune-telemetry.v1",
        generatedAt: new Date().toISOString(),
        rowCount: newBatch.length,
        failClosedCount: failClosed,
        gasSavedUsdTotal: Math.round(batchGasSavedUsd * 100) / 100,
        simulatedLossPreventedUsdTotal: Math.round(batchSimulatedLossPreventedUsd * 100) / 100,
        rows: newBatch,
      },
      null,
      2,
    );
    if (outPath) writeFileSync(outPath, payload);
    else console.log(payload);
  } else if (outPath) {
    writeFileSync(outPath, formatDuneTelemetryCsv(newBatch));
  }

  const defaultOut = join(ROOT, "docs/audit/exomesh-dune-telemetry.csv");
  const cumulative = !outPath
    ? writeCumulativeDuneCsv(defaultOut, newBatch, endMs)
    : { rows: newBatch, action: "batch-only" };
  const cumulativeGasSavedUsd = cumulative.rows.reduce((sum, row) => sum + row.gas_saved_usd, 0);
  const cumulativeSimulatedLossPreventedUsd = cumulative.rows.reduce(
    (sum, row) => sum + row.simulated_loss_prevented_usd,
    0,
  );

  const sepsbCsv = writeSepsbStressTelemetryCsv(ROOT);
  console.error(
    `[dune-export] action=${cumulative.action} batch_rows=${newBatch.length} total_rows=${cumulative.rows.length} fail_closed=${failClosed}/${CHAOS_ATTACK_COUNT} batch_simulated_loss_prevented_usd=${batchSimulatedLossPreventedUsd.toFixed(2)} cumulative_simulated_loss_prevented_usd=${cumulativeSimulatedLossPreventedUsd.toFixed(2)} cumulative_gas_saved_usd=${cumulativeGasSavedUsd.toFixed(2)} -> ${outPath ?? defaultOut}`,
  );
  console.error(`[dune-export] sepsb_stress_csv -> ${sepsbCsv}`);
}

main();
