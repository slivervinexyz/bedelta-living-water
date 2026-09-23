#!/usr/bin/env tsx
/**
 * Strategy loop harness — Loop A (perp) and Loop B (spot) cross-venue guards.
 * Usage:
 *   pnpm demo:perp-loop                   # Loop A: GMX / Pendle / Hyperliquid (+ Variational hedge default)
 *   pnpm demo:perp-loop -- --trip         # Loop A FAIL_CLOSED · p50 ~15µs rootProtection()
 *   pnpm demo:perp-loop -- --hedge=variational
 *   pnpm demo:perp-loop -- --hedge=hyperliquid
 *   pnpm demo:spot-loop                   # Loop B: USD.ai collateral lane
 *   pnpm demo:spot-loop -- --trip         # Loop B FAIL_CLOSED · p50 ~15µs rootProtection()
 *   pnpm demo:spot-loop -- --usdai        # Spot anomaly variant (default trip target)
 *   pnpm demo:perp-loop -- --healthy-only # Nominal PASS (no R20 sever)
 * Live:  pnpm demo:perp-loop -- --livingwater
 */
import { verifyGmxPoolImbalance } from "../src/adapters/gmx/gmx-v2-invariants";
import { evaluateHyperliquidSessionGuard } from "../src/adapters/hl/hyperliquid-session-guard";
import {
  PENDLE_POOL_MIN_INITIAL_LIQUIDITY_USD,
  validateAIPoolSelection,
} from "../src/adapters/pendle/pendle-pool-factory-adapter";
import { PENDLE_PT_MARKET_PT_EETH } from "../src/adapters/pendle/pendle-pt-registry";
import {
  evaluateUsdAiCollateralGuard,
  USDAI_ARBITRUM_CHAIN_ID,
} from "../src/adapters/usdai/usdai-adapter";
import type { UsdaiSoilInput } from "../src/adapters/usdai/usdai-adapter";
import {
  validateVariationalRFQIntent,
  type VariationalRFQPayload,
} from "../src/adapters/variational-rfq-adapter";
import {
  __setSystemStateForTests,
  buildSystemState,
  isR20Locked,
  readActiveSystemState,
  type SystemState,
} from "../src/core/state";
import { ensureSoilWasm } from "../src/sdk";
import { checkSoilResistance, type SoilResistanceInput } from "../src/services/risk-control";
import {
  CYAN,
  GREEN,
  GRAY,
  RED,
  R,
  YELLOW,
  BOLD,
  printPillarSetYStrategyBanner,
} from "./adapters/exomesh-ansi-hud";
import {
  hrtimeElapsedUs,
  hrtimeStart,
  GUARD_BRIGHT_GREEN,
  printE2eShieldLatencyBlock,
  printReflexCoreDeadlockBlock,
  type DemoBenchmarkSnapshot,
} from "./lib/demo-timing";
import {
  type BreachLine,
  collectCrossVenueSlippageLine,
  collectGmxBreachLines,
  collectPendleBreachLines,
  collectUsdaiBreachLines,
  collectVariationalBreachLines,
  printBreachBreakdown,
  printR20DeadlockBanner,
  printTripSoilReject,
  printTripVenueRows,
  withMatrixHudMute,
} from "./lib/matrix-demo-hud";
import { captureSoilBenchmark } from "./lib/demo-benchmark";
import { isDemoTripArgv, wrapDemoExecution } from "./lib/demo-harness";

type VenueStatus = "ALLOW" | "FAIL_CLOSED";
type MatrixLoop = "perp" | "spot" | "all";
type PerpHedge = "hyperliquid" | "variational" | "both";
type PerpAnomaly = "pendle" | "gmx" | "variational";
type VenueKey = "pendle" | "gmx" | "hl" | "variational" | "usdai" | "soil";

interface VenueRow {
  venue: string;
  status: VenueStatus;
  detail: string;
}

interface TripContext {
  active: boolean;
  perpPendle: boolean;
  perpGmx: boolean;
  perpVariational: boolean;
  spotUsdai: boolean;
}

interface LoopEvalResult {
  rows: VenueRow[];
  soilProbe: ReturnType<typeof checkSoilResistance>;
  soilLatencyUs: number;
}

interface PrintMatrixOpts {
  nowMs: number;
  ctx: TripContext;
  hedge: PerpHedge;
  loop: MatrixLoop;
}

const SPOT_KEYS: VenueKey[] = ["usdai", "soil"];

const HEALTHY_SOIL: SoilResistanceInput = {
  symbol: "ETH",
  hlSpot: 3500,
  hlPerp: 3500,
  dydxPerp: 3500,
  depthUsd: 500_000,
  disableThresholdJitter: true,
};

function parseLoop(argv: string[]): MatrixLoop {
  const raw = argv.find((a) => a.startsWith("--loop="))?.split("=")[1]?.toLowerCase();
  if (raw === "perp" || raw === "spot") return raw;
  return "all";
}

function parseHedge(argv: string[]): PerpHedge {
  const raw = argv.find((a) => a.startsWith("--hedge="))?.split("=")[1]?.toLowerCase();
  if (raw === "hyperliquid" || raw === "hl") return "hyperliquid";
  if (raw === "variational") return "variational";
  return "both";
}

function parsePerpAnomaly(argv: string[], gmxTrip: boolean, hedge: PerpHedge): PerpAnomaly {
  if (gmxTrip) return "gmx";
  if (hedge === "variational") return "variational";
  return "pendle";
}

function perpKeysForHedge(hedge: PerpHedge): VenueKey[] {
  const base: VenueKey[] = ["pendle", "gmx"];
  if (hedge === "hyperliquid") return [...base, "hl", "soil"];
  if (hedge === "variational") return [...base, "variational", "soil"];
  return [...base, "hl", "variational", "soil"];
}

function allKeysForHedge(hedge: PerpHedge): VenueKey[] {
  const perp = perpKeysForHedge(hedge).filter((k) => k !== "soil");
  const spot = SPOT_KEYS.filter((k) => k !== "soil");
  return [...perp, ...spot, "soil"];
}

function buildTripContext(
  loop: MatrixLoop,
  trip: boolean,
  gmxTrip: boolean,
  perpAnomaly: PerpAnomaly,
): TripContext {
  const perpActive = trip && loop !== "spot";
  const spotActive = trip && loop !== "perp";
  return {
    active: trip,
    perpPendle: perpActive && perpAnomaly === "pendle",
    perpGmx: perpActive && perpAnomaly === "gmx",
    perpVariational: perpActive && perpAnomaly === "variational",
    spotUsdai: spotActive,
  };
}

function variationalPayload(nowMs: number, trip: boolean): VariationalRFQPayload {
  return {
    symbol: "LONG_TAIL_PERP",
    quotePriceUsd: trip ? 3520 : 3500,
    oracleMarkUsd: 3500,
    quoteTimestampMs: trip ? nowMs - 800 : nowMs - 100,
    nowMs,
    tradeSizeUsd: trip ? 50_000 : 5_000,
    olpDepthUsd: 100_000,
    longTailAsset: true,
  };
}

function pendleSelection(nowMs: number, trip: boolean) {
  return {
    intent: "PENDLE_CREATE_POOL" as const,
    underlyingAsset: "eETH",
    maturityTimestampSec: Math.floor(nowMs / 1000) + 30 * 86_400,
    impliedYield: trip ? 0.095 : 0.05,
    oracleYield: 0.062,
    initialLiquidityUsd: PENDLE_POOL_MIN_INITIAL_LIQUIDITY_USD + 100_000,
    nowMs,
  };
}

function usdaiSoilInput(nowMs: number, trip: boolean): UsdaiSoilInput {
  const wallMs = Date.now();
  const clockMs = trip ? nowMs : wallMs;
  return {
    oracleTimestampMs: trip ? clockMs - 9_000_000 : wallMs - 300_000,
    ...(trip ? { nowMs: clockMs } : {}),
    susdaiPriceUsd: trip ? 0.992 : 1,
    navUsd: trip ? 95_000 : 102_500,
    gpuMarkUsd: 102_500,
    liquidityDepthUsd: trip ? 120_000 : 2_500_000,
    amountUsd: trip ? 50_000 : 25_000,
  };
}

function soilForStep(nowMs: number, ctx: TripContext): SoilResistanceInput {
  if (ctx.perpGmx) {
    return { ...HEALTHY_SOIL, at: new Date(nowMs), depthUsd: 1, hlPerp: 4200 };
  }
  if (ctx.perpVariational) {
    const payload = variationalPayload(nowMs, true);
    return {
      ...HEALTHY_SOIL,
      at: new Date(nowMs),
      symbol: payload.symbol,
      depthUsd: payload.olpDepthUsd,
      hlPerp: payload.quotePriceUsd,
      hlSpot: payload.oracleMarkUsd,
      orderSizeUsd: payload.tradeSizeUsd,
    };
  }
  if (ctx.perpPendle) {
    const selection = pendleSelection(nowMs, true);
    return {
      ...HEALTHY_SOIL,
      at: new Date(nowMs),
      pendlePoolFactory: { selection, marketKeyOrAddress: PENDLE_PT_MARKET_PT_EETH, useOracle: false },
    };
  }
  if (ctx.spotUsdai) {
    return {
      ...HEALTHY_SOIL,
      at: new Date(nowMs),
      symbol: "sUSDai",
      usdai: usdaiSoilInput(nowMs, true),
    };
  }
  return { ...HEALTHY_SOIL, at: new Date(nowMs) };
}

function gateStatus(state: SystemState, innerOk: boolean): VenueStatus {
  if (isR20Locked(state)) return "FAIL_CLOSED";
  return innerOk ? "ALLOW" : "FAIL_CLOSED";
}

function evaluateVenue(
  key: VenueKey,
  nowMs: number,
  ctx: TripContext,
  state: SystemState,
  soilProbe: ReturnType<typeof checkSoilResistance>,
): VenueRow | null {
  switch (key) {
    case "pendle": {
      const r = validateAIPoolSelection(pendleSelection(nowMs, ctx.perpPendle));
      return { venue: "Pendle", status: gateStatus(state, r.passed), detail: r.passed ? "yield farming clear" : "yield shock trip" };
    }
    case "gmx": {
      const r = verifyGmxPoolImbalance({
        oiLongUsd: ctx.perpGmx ? 4_500_000 : 3_000_000,
        oiShortUsd: ctx.perpGmx ? 500_000 : 2_500_000,
        poolTvlUsd: 5_500_000,
      });
      const detail = !r.ok
        ? "pool imbalance trip"
        : ctx.active && isR20Locked(state)
          ? "FAIL_CLOSED: R20_DEADLOCK"
          : "shadow margin ok";
      return { venue: "GMX v2", status: gateStatus(state, r.ok), detail };
    }
    case "hl": {
      const r = evaluateHyperliquidSessionGuard({
        orderSizeUsd: 2_000,
        spreadBps: ctx.perpPendle ? 25 : 10,
        sessionKeyValid: !isR20Locked(state),
        requestsInLastMinute: 5,
        skipSoilProbe: !ctx.active,
      });
      return { venue: "Hyperliquid", status: gateStatus(state, r.ok), detail: r.status };
    }
    case "variational": {
      const r = validateVariationalRFQIntent(variationalPayload(nowMs, ctx.perpVariational));
      const detail = !r.ok
        ? r.reason ?? "variational guard trip"
        : ctx.active && isR20Locked(state)
          ? "FAIL_CLOSED: R20_DEADLOCK"
          : r.detail ?? "OLP depth ok";
      return { venue: "Variational RFQ", status: gateStatus(state, r.ok), detail };
    }
    case "usdai": {
      const soil = usdaiSoilInput(nowMs, ctx.spotUsdai);
      const r = evaluateUsdAiCollateralGuard({
        chainId: USDAI_ARBITRUM_CHAIN_ID,
        collateralSymbol: "sUSDai",
        ...soil,
        at: new Date(nowMs),
      });
      const detail = !r.ok && ctx.spotUsdai
        ? "FAIL_CLOSED: USD_AI_DEPEG_ORACLE_TRIP"
        : !r.ok
          ? r.reasons.join("|") || "yield collateral trip"
          : ctx.active && isR20Locked(state)
            ? "FAIL_CLOSED: R20_DEADLOCK"
            : `oracleOk=${r.oracleOk} depthOk=${r.depthOk}`;
      return { venue: "USD.ai", status: gateStatus(state, r.ok), detail };
    }
    case "soil":
      return {
        venue: "Soil Fuse",
        status: gateStatus(state, !soilProbe.tripped),
        detail: soilProbe.tripped
          ? soilProbe.reasons.join("|")
          : ctx.active && isR20Locked(state)
            ? "FAIL_CLOSED: R20_DEADLOCK"
            : "nominal",
      };
    default:
      return null;
  }
}

function evaluateLoop(
  keys: VenueKey[],
  nowMs: number,
  ctx: TripContext,
  state: SystemState,
): LoopEvalResult {
  return withMatrixHudMute(() => {
    const soil = soilForStep(nowMs, ctx);
    const tSoil = hrtimeStart();
    const soilProbe = checkSoilResistance(soil);
    const soilLatencyUs = hrtimeElapsedUs(tSoil);
    const rows = keys
      .map((k) => evaluateVenue(k, nowMs, ctx, state, soilProbe))
      .filter((r): r is VenueRow => r != null);
    return { rows, soilProbe, soilLatencyUs };
  });
}

const SPOT_DISPATCH_TARGETS = "[USD.ai]";
const PERP_DISPATCH_TARGETS = "[GMX v2 | Pendle | Hyperliquid L1 | Variational RFQ]";

function printHappyMatrix(title: string, result: LoopEvalResult, opts: PrintMatrixOpts): void {
  console.log(`\n${YELLOW}${title}${R}`);
  for (const row of result.rows) {
    const color = row.status === "ALLOW" ? GREEN : RED;
    console.log(`  ${color}${row.venue.padEnd(14)} ${row.status.padEnd(12)}${R} ${GRAY}${row.detail}${R}`);
  }
  const dispatchTag = `${GUARD_BRIGHT_GREEN}${BOLD}[DISPATCH]${R}`;
  const targets = opts.loop === "spot" ? SPOT_DISPATCH_TARGETS : PERP_DISPATCH_TARGETS;
  console.log(
    `  ${dispatchTag} ${GREEN}ALLOWED${R} ${GRAY}|${R} targets: ${targets} ${GRAY}->${R} pre-broadcast clearance ok`,
  );
}

function resetState(): void {
  __setSystemStateForTests(buildSystemState({ accountBalanceUsd: 10_000, currentCri: 100, skipHardlockAssert: true }));
}

function collectBreachForTrip(
  matrixLoop: "perp" | "spot",
  nowMs: number,
  perpAnomaly: PerpAnomaly,
): BreachLine[] {
  if (matrixLoop === "spot") {
    return collectUsdaiBreachLines(usdaiSoilInput(nowMs, true), nowMs);
  }
  if (perpAnomaly === "gmx") return collectGmxBreachLines();
  if (perpAnomaly === "variational") return collectVariationalBreachLines(variationalPayload(nowMs, true));
  return collectPendleBreachLines(0.095, 0.062);
}

function happyPathSuccess(rows: VenueRow[]): boolean {
  return rows.length > 0 && rows.every((r) => r.status === "ALLOW");
}

function tripSuccess(rows: VenueRow[], hedge: PerpHedge, loop: MatrixLoop): boolean {
  if (loop !== "spot" && hedge === "variational") {
    const v = rows.find((r) => r.venue === "Variational RFQ");
    return v?.status === "FAIL_CLOSED";
  }
  return rows.every((r) => r.status === "FAIL_CLOSED");
}

function appendBreachLines(
  matrixLoop: "perp" | "spot",
  nowMs: number,
  perpAnomaly: PerpAnomaly,
  soilReasons: string[],
): BreachLine[] {
  const lines = collectBreachForTrip(matrixLoop, nowMs, perpAnomaly);
  const crossVenue = collectCrossVenueSlippageLine(soilReasons);
  if (crossVenue) lines.push(crossVenue);
  return lines;
}

function runTripInterception(
  label: string,
  keys: VenueKey[],
  matrixLoop: "perp" | "spot",
  hedge: PerpHedge,
  nowMs: number,
  gmxTrip: boolean,
  perpAnomaly: PerpAnomaly,
  benchmark: DemoBenchmarkSnapshot,
): boolean {
  resetState();
  const tripCtx = buildTripContext(matrixLoop, true, gmxTrip, perpAnomaly);
  console.log(`\n${RED}${BOLD}${label} — Invariant Breach Interception${R}`);

  const soil = soilForStep(nowMs, tripCtx);
  const soilProbe = withMatrixHudMute(() => checkSoilResistance(soil));

  printTripSoilReject();
  printBreachBreakdown(appendBreachLines(matrixLoop, nowMs, perpAnomaly, soilProbe.reasons));
  printR20DeadlockBanner(readActiveSystemState());

  const finalResult = evaluateLoop(keys, nowMs, tripCtx, readActiveSystemState());
  printTripVenueRows(finalResult.rows);

  const ok = tripSuccess(finalResult.rows, hedge, matrixLoop);
  if (ok) {
    const n = finalResult.rows.filter((r) => r.status === "FAIL_CLOSED").length;
    console.log(`\n${RED}${BOLD}${label} — ${n}/${finalResult.rows.length} venues FAIL_CLOSED${R}`);
    printReflexCoreDeadlockBlock(benchmark.fullMatrixUs);
  } else {
    console.log(`${RED}${label} INCOMPLETE — expected universal FAIL_CLOSED${R}`);
  }
  return ok;
}

function main(): void {
  wrapDemoExecution(({ nowMs, livingwater }) => {
  const argv = process.argv.slice(2);
  const loop = parseLoop(argv);
  const hedge = parseHedge(argv);
  const isTrip = isDemoTripArgv(argv);
  const gmxTrip = argv.includes("--gmx");
  const perpAnomaly = parsePerpAnomaly(argv, gmxTrip, hedge);
  const perpKeys = perpKeysForHedge(hedge);
  const allKeys = allKeysForHedge(hedge);
  const strategyBasket: "perp" | "spot" | "all" =
    loop === "perp" ? "perp" : loop === "spot" ? "spot" : "all";
  resetState();

  if (livingwater) {
    console.log(`${CYAN}Matrix clock: LIVING_WATER · nowMs=${nowMs}${R}`);
  }

  const benchCtx = buildTripContext(loop, false, false, perpAnomaly);
  const benchKeys = loop === "perp" ? perpKeys : loop === "spot" ? SPOT_KEYS : allKeys;
  const benchSoil = { ...HEALTHY_SOIL, at: new Date(nowMs) };
  const benchmark = captureSoilBenchmark(benchSoil, () => {
    withMatrixHudMute(() => evaluateLoop(benchKeys, nowMs, benchCtx, readActiveSystemState()));
  });
  printPillarSetYStrategyBanner(strategyBasket, benchmark);
  resetState();

  const printOpts = (ctx: TripContext, matrixLoop: MatrixLoop = loop): PrintMatrixOpts => ({
    nowMs,
    ctx,
    hedge,
    loop: matrixLoop,
  });

  if (!isTrip) {
    const keys = loop === "perp" ? perpKeys : loop === "spot" ? SPOT_KEYS : allKeys;
    const ctx = buildTripContext(loop, false, false, perpAnomaly);
    let allAllowed = true;
    if (loop === "all") {
      const perpResult = evaluateLoop(perpKeys, nowMs, ctx, readActiveSystemState());
      printHappyMatrix("Loop A — Perp Stack pre-flight", perpResult, printOpts(ctx, "perp"));
      allAllowed = happyPathSuccess(perpResult.rows) && allAllowed;
      const spotResult = evaluateLoop(SPOT_KEYS, nowMs, ctx, readActiveSystemState());
      printHappyMatrix("Loop B — Spot Collateral pre-flight", spotResult, printOpts(ctx, "spot"));
      allAllowed = happyPathSuccess(spotResult.rows) && allAllowed;
    } else {
      const result = evaluateLoop(keys, nowMs, ctx, readActiveSystemState());
      printHappyMatrix("Step 1 — Nominal pre-flight (PASS)", result, printOpts(ctx));
      allAllowed = happyPathSuccess(result.rows);
    }
    if (allAllowed) {
      console.log(`\n${GREEN}${BOLD}🟢 ALL INVARIANTS CLEAR — Signature Released (Pre-Broadcast Allowed)${R}`);
    } else {
      console.log(`\n${RED}${BOLD}🔴 HAPPY PATH INCOMPLETE — expected universal ALLOW${R}`);
      process.exitCode = 1;
    }
    printE2eShieldLatencyBlock(benchmark.fullMatrixUs);
    if (!ensureSoilWasm()) console.log(`${YELLOW}Wasm: offline (TS soil path)${R}`);
    return;
  }

  let allOk = true;
  if (loop === "perp" || loop === "all") {
    allOk =
      runTripInterception(
        loop === "all" ? "Loop A · Perp Stack" : "Perp Stack",
        perpKeys,
        "perp",
        hedge,
        nowMs,
        gmxTrip,
        perpAnomaly,
        benchmark,
      ) && allOk;
  }
  if (loop === "spot" || loop === "all") {
    allOk =
      runTripInterception(
        loop === "all" ? "Loop B · Spot Collateral" : "Spot Collateral",
        SPOT_KEYS,
        "spot",
        hedge,
        nowMs,
        gmxTrip,
        perpAnomaly,
        benchmark,
      ) && allOk;
  }

  if (!ensureSoilWasm()) console.log(`${YELLOW}Wasm: offline (TS soil path)${R}`);
  if (!allOk) process.exitCode = 1;
  return { tripped: allOk, reason: "CROSS_VENUE_FAIL_CLOSED" };
  });
}

main();
