#!/usr/bin/env tsx
/** USD.ai Demo — Usage: pnpm demo:usdai · Trip: pnpm demo:usdai -- --trip */
import { evaluateUsdAiCollateralGuard, USDAI_ARBITRUM_CHAIN_ID } from "../src/adapters/usdai/usdai-adapter";
import { HEALTHY_SOIL, printPillarSetYVenueBanner } from "./adapters/exomesh-ansi-hud";
import { captureSoilBenchmark } from "./lib/demo-benchmark";
import { ensureDemoWasmSoft, isDemoTripArgv, wrapDemoExecution } from "./lib/demo-harness";
import { collectUsdaiBreachLines, withMatrixHudMute } from "./lib/matrix-demo-hud";
import { finalizeVenueHappy, finalizeVenueTrip, printVenuePreflightHeader, printVenueRow } from "./lib/venue-demo-hud";

const HEALTHY_BASE = {
  chainId: USDAI_ARBITRUM_CHAIN_ID,
  collateralSymbol: "sUSDai",
  susdaiPriceUsd: 1,
  navUsd: 102_500,
  gpuMarkUsd: 102_500,
  liquidityDepthUsd: 2_500_000,
  amountUsd: 75_000,
};

function tripSoil(nowMs: number) {
  return {
    ...HEALTHY_BASE,
    susdaiPriceUsd: 0.993,
    oracleTimestampMs: nowMs - 8_500_000,
    liquidityDepthUsd: 120_000,
    amountUsd: 50_000,
    nowMs,
  };
}

function runGuard(nowMs: number, trip: boolean): string {
  const input = trip
    ? tripSoil(nowMs)
    : { ...HEALTHY_BASE, oracleTimestampMs: Date.now() - 180_000 };
  const r = evaluateUsdAiCollateralGuard({ ...input, at: new Date(trip ? nowMs : Date.now()) });
  return trip ? "de-peg / oracle lag breach" : `oracleOk=${r.oracleOk} depthOk=${r.depthOk}`;
}

wrapDemoExecution(({ nowMs }) => {
  const trip = isDemoTripArgv();
  ensureDemoWasmSoft();
  const soil = { ...HEALTHY_SOIL, at: new Date(nowMs) };
  const benchmark = captureSoilBenchmark(soil, () => withMatrixHudMute(() => runGuard(nowMs, false)));
  printPillarSetYVenueBanner("USD.ai", benchmark);
  printVenuePreflightHeader(!trip);
  let detail = "";
  withMatrixHudMute(() => {
    detail = runGuard(nowMs, trip);
  });
  printVenueRow("USD.ai", !trip, detail);
  if (trip) {
    finalizeVenueTrip(collectUsdaiBreachLines(tripSoil(nowMs), nowMs), benchmark);
    return { tripped: true, reason: "USDAI_FAIL_CLOSED" };
  }
  finalizeVenueHappy(benchmark);
});
