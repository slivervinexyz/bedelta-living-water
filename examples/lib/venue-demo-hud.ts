/** Standardized Pillar Set Y venue demo HUD — aligned with matrix-cross-venue-demo.ts. */
import { GMX_POOL_IMBALANCE_MAX_RATIO } from "../../src/adapters/gmx/gmx-v2-invariants";
import { HL_SPREAD_MAX_BPS, PENDLE_YIELD_SHOCK_MAX_BPS } from "../../src/core/risk-engine-limits";
import { BOLD, CYAN, GRAY, GREEN, R, RED, YELLOW } from "../adapters/exomesh-ansi-hud";
import { ZERODEV_AA_READY_BADGE } from "./delta-neutral-zerodev";
import {
  CORE_BRIGHT_CYAN,
  formatLatencyLabel,
  GUARD_BRIGHT_GREEN,
  printE2eShieldLatencyBlock,
  type DemoBenchmarkSnapshot,
} from "./demo-timing";
import { type BreachLine } from "./matrix-demo-hud";

export type { BreachLine };

const BOX_W = 74;
const FAIL_TAG = `${RED}${BOLD}[FAILED]${R}`;

export interface VenueTripHud {
  moduleTag?: string;
  title?: string;
  reasonCode?: string;
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

function boxLine(inner: string, color = CYAN): void {
  const pad = Math.max(0, BOX_W - 2 - stripAnsi(inner).length);
  console.log(`${color}│${R}${inner}${" ".repeat(pad)}${color}│${R}`);
}

function boxRule(color = CYAN): void {
  console.log(`${color}├${"─".repeat(BOX_W - 2)}┤${R}`);
}

function boxOpen(color = CYAN): void {
  console.log(`${color}┌${"─".repeat(BOX_W - 2)}┐${R}`);
}

function boxClose(color = CYAN): void {
  console.log(`${color}└${"─".repeat(BOX_W - 2)}┘${R}`);
}

export function printVenueZeroDevAaBadge(): void {
  console.log(`  ${CYAN}${BOLD}[AA]${R} ${GREEN}🟢 ${ZERODEV_AA_READY_BADGE}${R}`);
}

export function printVenuePreflightHeader(pass = true): void {
  const label = pass ? "Step 1 — Pre-flight validation (PASS)" : "Invariant Breach Interception";
  console.log(`\n${pass ? YELLOW : RED}${BOLD}${label}${R}`);
  printVenueZeroDevAaBadge();
}

export function printVenueRow(venue: string, ok: boolean, detail: string): void {
  const color = ok ? GREEN : RED;
  const status = ok ? "ALLOW" : "FAIL_CLOSED";
  console.log(`  ${color}${venue.padEnd(16)} ${status.padEnd(12)}${R} ${GRAY}${detail}${R}`);
}

export function printVenueDispatchAllowed(): void {
  const tag = `${GUARD_BRIGHT_GREEN}${BOLD}[DISPATCH]${R}`;
  console.log(`  ${tag} ${GREEN}ALLOWED${R} ${GRAY}->${R} pre-broadcast clearance ok`);
}

export function printVenueHappyClear(): void {
  console.log(`\n${GREEN}${BOLD}🟢 ALL INVARIANTS CLEAR — Signature Released (Pre-Broadcast Allowed)${R}`);
}

export function finalizeVenueHappy(benchmark: DemoBenchmarkSnapshot): void {
  printVenueDispatchAllowed();
  printVenueHappyClear();
  printE2eShieldLatencyBlock(benchmark.fullMatrixUs);
}

export function finalizeVenueTrip(
  breachLines: BreachLine[],
  benchmark: DemoBenchmarkSnapshot,
  hud: VenueTripHud = {},
): void {
  const moduleTag = hud.moduleTag ?? "[Module A: ExoMesh]";
  const title = hud.title ?? "Soil Resistance Interception";
  const reason = hud.reasonCode ?? "FAIL_CLOSED";
  const reflex = formatLatencyLabel(benchmark.fullMatrixUs);
  boxOpen(RED);
  boxLine(` ${BOLD}${moduleTag} — ${title}${R}`, RED);
  boxLine(` ${GRAY}Zero-Alloc Hot-Path · checkSoilResistance() · V8/Wasm isolate${R}`, RED);
  boxRule(RED);
  for (const line of breachLines) {
    const label = `${line.label}`.padEnd(14);
    boxLine(` ${GRAY}${label}${R}${RED}${BOLD}${line.value}${R} ${GRAY}(${line.limit})${R} ${FAIL_TAG}`, RED);
  }
  boxLine(` ${CORE_BRIGHT_CYAN}${BOLD}⚡ Reflex Core Deadlock: ${reflex}${R}`, RED);
  boxRule(RED);
  boxLine(` ${RED}${BOLD}INTERCEPTION VERIFIED: ${reason}${R}`, RED);
  boxLine(` ${GRAY}0-Gas Intercepted · lostUsd = $0.00 · never reaches sequencer${R}`, RED);
  boxClose(RED);
}

export const GMX_TRIP_BREACHES: BreachLine[] = [
  { label: "Price Impact", value: "> 50.0 bps", limit: "LIMIT: ≤50.0 bps" },
  { label: "Pool Skew", value: "> 0.35", limit: `LIMIT: imbalance ≤${GMX_POOL_IMBALANCE_MAX_RATIO}` },
];

export const HL_TRIP_BREACHES: BreachLine[] = [
  { label: "Orderbook Spread", value: "28.0 bps", limit: `LIMIT: ≤${HL_SPREAD_MAX_BPS}.0 bps` },
];

export function pendleTripBreaches(): BreachLine[] {
  const driftBps = Math.abs(0.05 - 0.095) * 10_000;
  return [
    {
      label: "Yield Shock",
      value: `${driftBps.toFixed(1)} bps`,
      limit: `LIMIT: ≤${PENDLE_YIELD_SHOCK_MAX_BPS}.0 bps`,
    },
  ];
}
