/** ExoMesh off-chain intercept rows — Dune CSV/JSON export SSOT. */
import { buildGrantAuditDuneTelemetry } from "../../src/routes/grant-audit-lib/grant-audit-dune-telemetry";
import { HONEYPOT_RPC_HOSTS } from "../../src/services/defense/rpc-allowlist-hosts";
import { HONEYPOT_ACTIVE } from "../../src/services/defense/rpc-fetch-gate-lib/rpc-fetch-gate-eval";
import {
  estimateGasSavedUsd,
  estimatePotentialLossSavedUsd,
  mapReasonToInterceptType,
  resolveVenueFromSignal,
  seedReflexLatencyUs,
} from "./exomesh-dune-telemetry-map";
import {
  DUNE_TELEMETRY_CSV_COMMENT,
  DUNE_TELEMETRY_CSV_HEADER,
  type DuneInterceptStatus,
  type DuneInterceptType,
  type DuneVenue,
  type ExomeshDuneTelemetryRow,
  L2_GAS_SAVED_USD,
} from "./exomesh-dune-telemetry-types";

export type { DuneVenue, DuneInterceptType, DuneInterceptStatus, ExomeshDuneTelemetryRow };
export {
  DUNE_TELEMETRY_CSV_COMMENT,
  DUNE_TELEMETRY_CSV_HEADER,
  L2_GAS_SAVED_USD,
  POTENTIAL_LOSS_SAVED_RANGE_USD,
  LATENCY_SEED_US,
} from "./exomesh-dune-telemetry-types";
export {
  mapReasonToInterceptType,
  mapRetailCodeToInterceptType,
  resolveVenueFromSignal,
  estimateGasSavedUsd,
  estimatePotentialLossSavedUsd,
  seedReflexLatencyUs,
} from "./exomesh-dune-telemetry-map";

export function buildTelemetryRow(input: {
  timestampMs: number;
  venue: DuneVenue;
  interceptType: DuneInterceptType;
  reflexLatencyUs: number;
  status: DuneInterceptStatus;
  source: string;
  reason?: string;
}): ExomeshDuneTelemetryRow {
  const economicsSeed = Math.max(1, Math.floor(input.timestampMs) || Math.round(input.reflexLatencyUs));
  const gasBurned = input.status === "FAIL_CLOSED" ? 0 : 0.000001;
  const gasSaved = estimateGasSavedUsd(input.interceptType, input.status);
  const potentialLossSaved = estimatePotentialLossSavedUsd(
    input.interceptType,
    economicsSeed,
    input.status,
  );
  return {
    timestamp: new Date(input.timestampMs).toISOString(),
    timestampMs: input.timestampMs,
    venue: input.venue,
    intercept_type: input.interceptType,
    reflex_latency_us: input.reflexLatencyUs,
    gas_burned: gasBurned,
    simulated_loss_prevented_usd: potentialLossSaved,
    gas_saved_usd: gasSaved,
    status: input.status,
    source: input.source,
    reason: input.reason,
  };
}

export function buildChaosMatrixTelemetryRows(
  cases: ReadonlyArray<{
    id?: number;
    scenario: string;
    blocked: boolean;
    reasons: string[];
  }>,
): ExomeshDuneTelemetryRow[] {
  const rows: ExomeshDuneTelemetryRow[] = [];
  for (const caseRow of cases) {
    if (!caseRow.blocked) continue;
    const reason = caseRow.reasons[0] ?? "FAIL_CLOSED";
    const interceptType = mapReasonToInterceptType(reason);
    const venue = resolveVenueFromSignal(reason, caseRow.scenario);
    const seed = caseRow.id ?? rows.length + 1;
    rows.push(
      buildTelemetryRow({
        timestampMs: seed,
        venue,
        interceptType,
        reflexLatencyUs: seedReflexLatencyUs(interceptType, seed),
        status: "FAIL_CLOSED",
        source: `chaos-matrix:${seed}`,
        reason,
      }),
    );
  }
  return rows;
}

export function buildHoneypotDecoyRows(): ExomeshDuneTelemetryRow[] {
  const rows = new Array<ExomeshDuneTelemetryRow>(HONEYPOT_RPC_HOSTS.length);
  for (let index = 0; index < HONEYPOT_RPC_HOSTS.length; index++) {
    const host = HONEYPOT_RPC_HOSTS[index];
    rows[index] = buildTelemetryRow({
      timestampMs: index,
      venue: "variational",
      interceptType: "HONEYPOT_DECOY",
      reflexLatencyUs: seedReflexLatencyUs("HONEYPOT_DECOY", index + 3),
      status: "FAIL_CLOSED",
      source: `honeypot-trap:${host}`,
      reason: HONEYPOT_ACTIVE,
    });
  }
  return rows;
}

export function buildGrantAuditTelemetryRows(fetchedAtMs: number): ExomeshDuneTelemetryRow[] {
  const telemetry = buildGrantAuditDuneTelemetry(new Date(fetchedAtMs).toISOString());
  const log = telemetry.actionLog;
  const rows = new Array<ExomeshDuneTelemetryRow>(log.length);
  for (let index = 0; index < log.length; index++) {
    const entry = log[index];
    if (entry.action === "PASS_GREENLIGHT") {
      rows[index] = buildTelemetryRow({
        timestampMs: index,
        venue: "pendle",
        interceptType: "SOIL_RESISTANCE_TRIP",
        reflexLatencyUs: seedReflexLatencyUs("SOIL_RESISTANCE_TRIP", index + 40),
        status: "ALLOW",
        source: "grant-audit:shadow-margin",
        reason: entry.reason,
      });
      continue;
    }
    const interceptType =
      entry.action === "EMERGENCY_DELEVERAGE_ALLOWED"
        ? "OBSERVATORY_HAIRCUT"
        : "SOIL_RESISTANCE_TRIP";
    rows[index] = buildTelemetryRow({
      timestampMs: index,
      venue: "pendle",
      interceptType,
      reflexLatencyUs: seedReflexLatencyUs(interceptType, index + 40),
      status: "FAIL_CLOSED",
      source: "grant-audit:shadow-margin",
      reason: entry.reason,
    });
  }
  return rows;
}

export function rowToDuneTelemetryCsvLine(row: ExomeshDuneTelemetryRow): string {
  return [
    row.timestamp,
    row.venue,
    row.intercept_type,
    row.reflex_latency_us.toFixed(1),
    row.gas_burned.toFixed(6),
    row.simulated_loss_prevented_usd.toFixed(2),
    row.gas_saved_usd.toFixed(2),
    row.status,
  ].join(",");
}

export function formatDuneTelemetryCsv(rows: readonly ExomeshDuneTelemetryRow[]): string {
  const lines = new Array<string>(rows.length + 1);
  lines[0] = DUNE_TELEMETRY_CSV_HEADER;
  for (let i = 0; i < rows.length; i++) {
    lines[i + 1] = rowToDuneTelemetryCsvLine(rows[i]);
  }
  return lines.join("\n");
}
