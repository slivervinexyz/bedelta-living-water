/** Dune CSV rollup + doc drift scanners for docs:dune-reconcile. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import type { OnchainRollup } from "./dune-reconcile-onchain";
import type { DuneInterceptType, ExomeshDuneTelemetryRow } from "./exomesh-dune-telemetry-types";
import { parseDuneTelemetryCsv } from "./exomesh-dune-telemetry-cumulative";

const MOAT_TYPES: readonly DuneInterceptType[] = [
  "SOIL_RESISTANCE_TRIP",
  "HONEYPOT_DECOY",
  "OBSERVATORY_HAIRCUT",
  "MAX_ATTEMPTS_SEVERED",
];

export interface ExomeshRollup {
  total_rows: number;
  fail_closed_count: number;
  allow_count: number;
  simulated_loss_prevented_usd_total: number;
  gas_saved_usd_total: number;
  intercept_type_breakdown: Record<DuneInterceptType, { count: number; pct: number }>;
  venue_p50_latency_us: Record<string, number>;
  csv_sha256: string;
  csv_mtime_iso: string;
}

export interface SepsbRollup {
  case_count: number;
  tpr_pct: number;
  fpr_pct: number;
  min_latency_us: number;
  p50_latency_us: number;
}

export interface DuneTelemetryRollup {
  schema: "silvervine.dune-reconcile.v1";
  generatedAt: string;
  exomesh: ExomeshRollup;
  sepsb: SepsbRollup;
  onchain?: OnchainRollup;
}

export const STALE_PUBLIC_PATTERNS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\$6\.57M/, label: "stale $6.57M Dune anchor" },
  { pattern: /\$32[,.]?\d{3}[,.]?\d{3}/, label: "stale live Dune $32M drift" },
  { pattern: /\b1[,.]?268\b.*intercept/i, label: "stale 1268 intercept count" },
  { pattern: /Total Capital Protected/, label: "undemoted Total Capital Protected" },
  { pattern: /Real-Time Pre-Consensus/, label: "undemoted Real-Time Pre-Consensus" },
  { pattern: /Dynamic operational feed/, label: "undemoted Dynamic operational feed" },
  { pattern: /\blive off-chain pre-consensus\b/i, label: "undemoted live off-chain pre-consensus" },
  { pattern: /\bLive volume\b/, label: "undemoted Live volume" },
  { pattern: /\bdaily cumulative append\b/i, label: "undemoted daily cumulative append" },
  { pattern: /\bDune Live Telemetry Dashboard\b/i, label: "undemoted Dune Live Telemetry Dashboard" },
];

const SPEC_WIDGET_LOSS = /\*\*\$([\d.]+)M\*\*.*simulated_loss_prevented_usd/;
const SPEC_WIDGET_GAS = /\*\*\$([\d.]+)\*\*.*gas_saved_usd/;
const SPEC_WIDGET_INTERCEPTS = /\*\*(\d+)\*\*.*FAIL_CLOSED/;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return round2(sorted[idx]!);
}

export function rollupExomeshCsv(content: string, csvPath = ""): ExomeshRollup {
  const rows = parseDuneTelemetryCsv(content);
  const sha256 = createHash("sha256").update(content).digest("hex");
  const mtimeIso = csvPath && existsSync(csvPath)
    ? statSync(csvPath).mtime.toISOString()
    : new Date(0).toISOString();
  let failClosed = 0;
  let allow = 0;
  let lossTotal = 0;
  let gasTotal = 0;
  const typeCounts: Record<string, number> = {};
  const venueLatencies: Record<string, number[]> = {};

  for (const row of rows) {
    if (row.status === "FAIL_CLOSED") failClosed++;
    else allow++;
    lossTotal += row.simulated_loss_prevented_usd;
    gasTotal += row.gas_saved_usd;
    typeCounts[row.intercept_type] = (typeCounts[row.intercept_type] ?? 0) + 1;
    const bucket = venueLatencies[row.venue] ?? [];
    bucket.push(row.reflex_latency_us);
    venueLatencies[row.venue] = bucket;
  }

  const breakdown = {} as ExomeshRollup["intercept_type_breakdown"];
  for (const t of MOAT_TYPES) {
    const count = typeCounts[t] ?? 0;
    breakdown[t] = { count, pct: rows.length ? round2((100 * count) / rows.length) : 0 };
  }

  const venueP50: Record<string, number> = {};
  for (const [venue, vals] of Object.entries(venueLatencies)) {
    venueP50[venue] = percentile([...vals].sort((a, b) => a - b), 0.5);
  }

  return {
    total_rows: rows.length,
    fail_closed_count: failClosed,
    allow_count: allow,
    simulated_loss_prevented_usd_total: round2(lossTotal),
    gas_saved_usd_total: round2(gasTotal),
    intercept_type_breakdown: breakdown,
    venue_p50_latency_us: venueP50,
    csv_sha256: sha256,
    csv_mtime_iso: mtimeIso,
  };
}

export function rollupSepsbCsv(content: string): SepsbRollup {
  const lines = content.trim().split("\n").filter((l) => l.length > 0);
  if (lines.length <= 1) {
    return { case_count: 0, tpr_pct: 0, fpr_pct: 0, min_latency_us: 0, p50_latency_us: 0 };
  }
  const latencies: number[] = [];
  let tpr = 0;
  let fpr = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",");
    const latency = Number.parseFloat(cols[6] ?? "0");
    latencies.push(latency);
    tpr = Number.parseFloat(cols[7] ?? "0");
    fpr = Number.parseFloat(cols[8] ?? "0");
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    case_count: lines.length - 1,
    tpr_pct: tpr,
    fpr_pct: fpr,
    min_latency_us: sorted.length ? round2(sorted[0]!) : 0,
    p50_latency_us: percentile(sorted, 0.5),
  };
}

export function validateExomeshRows(rows: ExomeshDuneTelemetryRow[]): string[] {
  const violations: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    if (Number.isNaN(row.simulated_loss_prevented_usd) || Number.isNaN(row.gas_saved_usd)) {
      violations.push(`row ${i + 1}: NaN economics`);
    }
    if (row.status === "FAIL_CLOSED" && row.gas_burned !== 0) {
      violations.push(`row ${i + 1}: FAIL_CLOSED with gas_burned != 0`);
    }
  }
  return violations;
}

export function scanSpecDocDrift(specText: string, rollup: ExomeshRollup): string[] {
  const violations: string[] = [];
  const lossM = specText.match(SPEC_WIDGET_LOSS);
  if (lossM) {
    const specUsd = Number.parseFloat(lossM[1]!) * 1_000_000;
    if (Math.abs(specUsd - rollup.simulated_loss_prevented_usd_total) > 1) {
      violations.push(
        `spec simulated_loss: $${lossM[1]}M vs rollup $${rollup.simulated_loss_prevented_usd_total}`,
      );
    }
  }
  const gasM = specText.match(SPEC_WIDGET_GAS);
  if (gasM) {
    const specGas = Number.parseFloat(gasM[1]!);
    if (Math.abs(specGas - rollup.gas_saved_usd_total) > 1) {
      violations.push(`spec gas_saved: $${gasM[1]} vs rollup $${rollup.gas_saved_usd_total}`);
    }
  }
  const interceptM = specText.match(SPEC_WIDGET_INTERCEPTS);
  if (interceptM) {
    const specCount = Number.parseInt(interceptM[1]!, 10);
    if (specCount !== rollup.fail_closed_count) {
      violations.push(`spec fail_closed: ${specCount} vs rollup ${rollup.fail_closed_count}`);
    }
  }
  return violations;
}

export function scanPublicDocStaleKpis(relPath: string, text: string): string[] {
  const violations: string[] = [];
  if (relPath.includes("DUNE_DASHBOARD_COPY_DEMOTED")) return violations;
  for (const { pattern, label } of STALE_PUBLIC_PATTERNS) {
    if (pattern.test(text)) violations.push(`${relPath}: ${label}`);
  }
  return violations;
}

export function buildRollupJson(
  exomesh: ExomeshRollup,
  sepsb: SepsbRollup,
  onchain?: OnchainRollup,
): DuneTelemetryRollup {
  const rollup: DuneTelemetryRollup = {
    schema: "silvervine.dune-reconcile.v1",
    generatedAt: new Date().toISOString(),
    exomesh,
    sepsb,
  };
  if (onchain) rollup.onchain = onchain;
  return rollup;
}

export function readCsvRollup(
  exomeshPath: string,
  sepsbPath: string,
  onchainPath?: string,
  onchain?: OnchainRollup,
): DuneTelemetryRollup {
  const exomeshContent = readFileSync(exomeshPath, "utf8");
  const sepsbContent = readFileSync(sepsbPath, "utf8");
  const exomesh = rollupExomeshCsv(exomeshContent, exomeshPath);
  const sepsb = rollupSepsbCsv(sepsbContent);
  return buildRollupJson(exomesh, sepsb, onchain);
}
