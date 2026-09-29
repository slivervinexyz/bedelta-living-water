/** Human PASS lines for venue Wallet×Token preflight. */
import { getVenueRequirement } from "../../src/core/venue-execution-matrix";
import type { VenueBalanceProbeResult } from "./venue-balance-preflight";

export interface VenuePreflightPassInput {
  ok: boolean;
  matrixId: string;
  probe: VenueBalanceProbeResult | null;
}

function formatPassLine(report: VenuePreflightPassInput): string {
  const row = getVenueRequirement(report.matrixId);
  if (!row) return `[preflight] PASS ${report.matrixId}`;
  if (row.probeKind === "intent_only") {
    return `[preflight] PASS · Wallet ${row.walletRole} · intent-only (${report.matrixId})`;
  }
  const probe = report.probe;
  if (!probe) {
    return `[preflight] PASS · Wallet ${row.walletRole} · ${report.matrixId}`;
  }
  const parts: string[] = [`Wallet ${row.walletRole}`];
  if (probe.actual.hlPerpsEquityUsd !== undefined) {
    parts.push(`HL margin $${probe.actual.hlPerpsEquityUsd}`);
  }
  if (probe.actual.USDC !== undefined && row.primaryToken.symbol === "USDC") {
    parts.push(`USDC $${probe.actual.USDC}`);
  }
  if (probe.actual.USDai !== undefined && row.primaryToken.symbol === "USDai") {
    parts.push(`USDai $${probe.actual.USDai}`);
  }
  if (probe.actual.eth !== undefined && Number(row.gasEthMin) > 0) {
    parts.push(`ETH ${probe.actual.eth}`);
  }
  if (row.id === "usdai-collateral") {
    parts.push("gas-only probe (BH-25)");
  }
  let line = `[preflight] PASS · ${parts.join(" · ")} · (${report.matrixId})`;
  if (probe.hlApiOk === false) {
    line += " · WARN: HL API unavailable — margin not verified";
  }
  return line;
}

export function printVenuePreflightPass(report: VenuePreflightPassInput): void {
  console.log(formatPassLine(report));
}

export function printVenuePreflightSummary(reports: VenuePreflightPassInput[], ok: boolean): void {
  const passed = reports.filter((r) => r.ok);
  console.log(`\n[preflight] ${ok ? "ALL CLEAR" : "INCOMPLETE"} · ${passed.length}/${reports.length} rows PASS`);
  for (const r of passed) printVenuePreflightPass(r);
  if (ok) {
    console.log("[preflight] Funding wedge ready — guard demos remain: pnpm demo:gmx -- --trip");
  }
}
