#!/usr/bin/env tsx
/** Pendle Demo — Usage: pnpm demo:pendle · Trip: pnpm demo:pendle -- --trip */
import { __resetPendleMarketOracleForTests, pendleMarketOracle } from "../src/adapters/pendle/pendle-market-oracle-adapter";
import { validateAIPoolSelection } from "../src/adapters/pendle/pendle-pool-factory-adapter";
import { buildAutoPendlePoolFactorySoilInput } from "../src/adapters/pendle/pendle-pt-selector";
import { PENDLE_PT_REGISTRY, type PendlePtMarketKey } from "../src/adapters/pendle/pendle-pt-registry";
import { checkSoilResistance } from "../src/services/risk-control";
import { HEALTHY_SOIL, printPillarSetYVenueBanner } from "./adapters/exomesh-ansi-hud";
import { captureSoilBenchmark } from "./lib/demo-benchmark";
import { ensureDemoWasmSoft, isDemoTripArgv, wrapDemoExecution } from "./lib/demo-harness";
import { withMatrixHudMute } from "./lib/matrix-demo-hud";
import {
  finalizeVenueHappy,
  finalizeVenueTrip,
  pendleTripBreaches,
  printVenuePreflightHeader,
  printVenueRow,
} from "./lib/venue-demo-hud";

function ingestOracleForMarket(marketKey: PendlePtMarketKey, nowMs: number): void {
  const entry = PENDLE_PT_REGISTRY[marketKey];
  pendleMarketOracle.ingest({
    marketKey,
    updatedAtMs: nowMs,
    impliedYield: entry.impliedYield,
    historicalYield24h: entry.historicalYield24h,
    ptPriceInAsset: entry.ptPriceInAsset,
    liquidityConstant: entry.liquidityConstant,
    expirySec: entry.expirySec,
  });
}

function runGuard(nowMs: number, trip: boolean): void {
  const built = buildAutoPendlePoolFactorySoilInput({
    nowMs,
    useOracle: !trip,
    preferredSymbols: ["sUSDai"],
    protocolFilter: ["USD.AI"],
    oracleYieldOverride: trip ? 0.095 : undefined,
  });
  if (!built?.pick.selected) {
    const rejected = built?.pick.rejected.map((r) => r.symbol).join(",") ?? "none";
    throw new Error(`PENDLE_AUTO_SELECT_ABORT:${rejected}`);
  }
  if (!trip) ingestOracleForMarket(built.pick.selected.key, nowMs);
  validateAIPoolSelection(built.soilInput.selection);
  checkSoilResistance({
    ...HEALTHY_SOIL,
    disableThresholdJitter: true,
    pendlePoolFactory: built.soilInput,
  });
}

wrapDemoExecution(({ nowMs }) => {
  const trip = isDemoTripArgv();
  ensureDemoWasmSoft();
  __resetPendleMarketOracleForTests();
  const soil = { ...HEALTHY_SOIL, at: new Date(nowMs) };
  const benchmark = captureSoilBenchmark(soil, () => withMatrixHudMute(() => runGuard(nowMs, false)));
  printPillarSetYVenueBanner("Pendle", benchmark);
  printVenuePreflightHeader(!trip);
  withMatrixHudMute(() => runGuard(nowMs, trip));
  printVenueRow("Pendle", !trip, trip ? "yield shock trip" : "yield farming clear");
  if (trip) {
    finalizeVenueTrip(pendleTripBreaches(), benchmark);
    return { tripped: true, reason: "PENDLE_FAIL_CLOSED" };
  }
  finalizeVenueHappy(benchmark);
});
