/** Matrix cross-venue demo HUD — breach trees, R20 banner, console noise suppression. */
import { GMX_POOL_IMBALANCE_MAX_RATIO, verifyGmxPoolImbalance } from "../../src/adapters/gmx/gmx-v2-invariants";
import { PENDLE_IMPLIED_YIELD_SHOCK_MAX_BPS } from "../../src/adapters/pendle/pendle-pool-factory-adapter";
import {
  USDAI_ARBITRUM_CHAIN_ID,
  USDAI_MIN_LIQUIDITY_DEPTH_USD,
  USDAI_ORACLE_MAX_AGE_MS,
  evaluateUsdAiCollateralGuard,
} from "../../src/adapters/usdai/usdai-adapter";
import type { UsdaiSoilInput } from "../../src/adapters/usdai/usdai-adapter";
import {
  VARIATIONAL_OLP_DEPTH_MAX_UTILIZATION,
  VARIATIONAL_QUOTE_MAX_AGE_MS,
  validateVariationalRFQIntent,
  type VariationalRFQPayload,
} from "../../src/adapters/variational-rfq-adapter";
import { isR20Locked, type SystemState } from "../../src/core/state";
import { BOLD, GRAY, R, RED, YELLOW } from "../adapters/exomesh-ansi-hud";

export interface BreachLine {
  label: string;
  value: string;
  limit: string;
}

const FAIL_TAG = `${RED}${BOLD}[FAILED]${R}`;
const BREACH_VAL = `${RED}${BOLD}`;
const STATUS_REJECT = `${YELLOW}${BOLD}`;

function hudMute(msg: string): boolean {
  return msg.includes("[CLOCK_SSOT_VERIFIED]") || msg.includes("[SOIL_CORE]");
}

export function withMatrixHudMute<T>(fn: () => T): T {
  const info = console.info;
  const warn = console.warn;
  const log = console.log;
  const filter =
    (fn: (...args: unknown[]) => void) =>
    (...args: unknown[]) => {
      const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      if (hudMute(msg)) return;
      fn(...args);
    };
  console.info = filter(info);
  console.warn = filter(warn);
  console.log = filter(log);
  try {
    return fn();
  } finally {
    console.info = info;
    console.warn = warn;
    console.log = log;
  }
}

export function printTripSoilReject(): void {
  console.log(
    `  ${GRAY}checkSoilResistance()${R} ${STATUS_REJECT}→ REJECT (FAIL_CLOSED)${R}`,
  );
}

export function printBreachBreakdown(lines: BreachLine[]): void {
  if (lines.length === 0) return;
  console.log(`\n${RED}${BOLD}INVARIANT BREACH DETECTED:${R}`);
  lines.forEach((line, i) => {
    const branch = i === lines.length - 1 ? "└─" : "├─";
    const label = `${line.label}:`.padEnd(20);
    console.log(
      `  ${branch} ${GRAY}${label}${R}${BREACH_VAL}${line.value}${R} ${GRAY}(${line.limit})${R} ${FAIL_TAG}`,
    );
  });
}

export function printR20DeadlockBanner(state: SystemState): void {
  const locked = isR20Locked(state);
  const channel = state.signingChannelOpen ? "true" : "false";
  const color = locked ? RED : YELLOW;
  console.log(
    `\n${color}${BOLD}🛑 R20 PHYSICAL DEADLOCK — signingChannelOpen=${channel} · severSigningChannel() ENGAGED${R}`,
  );
}

const R20_CASCADE_VENUES = new Set(["USD.ai"]);
const R20_CASCADE_TAG = `${YELLOW}${BOLD}[R20 CASCADING DEADLOCK]${R}`;

export function printTripVenueRows(
  rows: { venue: string; status: string; detail: string }[],
): void {
  for (const row of rows) {
    const cascade =
      R20_CASCADE_VENUES.has(row.venue) && row.detail.includes("R20_DEADLOCK") ? ` ${R20_CASCADE_TAG}` : "";
    console.log(
      `  ${RED}${row.venue.padEnd(14)} ${STATUS_REJECT}${row.status.padEnd(12)}${R} ${GRAY}${row.detail}${R}${cascade}`,
    );
  }
}

export function collectCrossVenueSlippageLine(reasons: string[]): BreachLine | null {
  const raw = reasons.find((r) => r.includes("CROSS_VENUE_SLIPPAGE"));
  if (!raw) return null;
  const match = raw.match(/CROSS_VENUE_SLIPPAGE=([0-9.]+)%>([0-9.]+)%/);
  if (!match) return null;
  return {
    label: "Cross-Venue Slippage",
    value: `${parseFloat(match[1]).toFixed(2)}%`,
    limit: `LIMIT: >${parseFloat(match[2]).toFixed(2)}%`,
  };
}

export function collectUsdaiBreachLines(soil: UsdaiSoilInput, nowMs: number): BreachLine[] {
  const r = evaluateUsdAiCollateralGuard({
    chainId: USDAI_ARBITRUM_CHAIN_ID,
    collateralSymbol: "sUSDai",
    ...soil,
    at: new Date(nowMs),
  });
  const lines: BreachLine[] = [];
  if (!r.oracleOk) {
    const ageMs = Math.max(0, (soil.nowMs ?? nowMs) - soil.oracleTimestampMs);
    lines.push({
      label: "Oracle Age",
      value: `${(ageMs / 3_600_000).toFixed(1)}h`,
      limit: `MAX: ${(USDAI_ORACLE_MAX_AGE_MS / 3_600_000).toFixed(0)}h`,
    });
  }
  if (!r.depthOk) {
    lines.push({
      label: "Liquidity Depth",
      value: `$${(soil.liquidityDepthUsd ?? 0).toLocaleString("en-US")} USD`,
      limit: `MIN: $${USDAI_MIN_LIQUIDITY_DEPTH_USD.toLocaleString("en-US")} USD`,
    });
  }
  if (lines.length === 0 && !r.ok) {
    lines.push({ label: "USD.ai Guard", value: "TRIP", limit: "LIMIT: nominal peg" });
  }
  return lines;
}

export function collectPendleBreachLines(impliedYield: number, oracleYield: number): BreachLine[] {
  const driftBps = Math.abs(impliedYield - oracleYield) * 10_000;
  return [
    {
      label: "Yield Shock",
      value: `${driftBps.toFixed(1)} bps`,
      limit: `LIMIT: >${PENDLE_IMPLIED_YIELD_SHOCK_MAX_BPS}.0 bps`,
    },
  ];
}

export function collectGmxBreachLines(): BreachLine[] {
  const r = verifyGmxPoolImbalance({ oiLongUsd: 4_500_000, oiShortUsd: 500_000, poolTvlUsd: 5_500_000 });
  return [
    {
      label: "Pool Imbalance",
      value: r.imbalanceRatio.toFixed(3),
      limit: `LIMIT: >${GMX_POOL_IMBALANCE_MAX_RATIO}`,
    },
  ];
}

export function collectVariationalBreachLines(payload: VariationalRFQPayload): BreachLine[] {
  const r = validateVariationalRFQIntent(payload);
  const lines: BreachLine[] = [];
  const ageMs = payload.nowMs - payload.quoteTimestampMs;
  if (ageMs > VARIATIONAL_QUOTE_MAX_AGE_MS) {
    lines.push({
      label: "Quote Age",
      value: `${ageMs}ms`,
      limit: `MAX: ${VARIATIONAL_QUOTE_MAX_AGE_MS}ms`,
    });
  }
  const util = payload.tradeSizeUsd / payload.olpDepthUsd;
  if (util > VARIATIONAL_OLP_DEPTH_MAX_UTILIZATION) {
    lines.push({
      label: "OLP Utilization",
      value: `${(util * 100).toFixed(1)}%`,
      limit: `MAX: ${(VARIATIONAL_OLP_DEPTH_MAX_UTILIZATION * 100).toFixed(0)}%`,
    });
  }
  if (lines.length === 0 && !r.ok) {
    lines.push({ label: "Variational RFQ", value: "TRIP", limit: r.reason ?? "LIMIT: nominal" });
  }
  return lines;
}
