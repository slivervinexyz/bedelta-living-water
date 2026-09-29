#!/usr/bin/env tsx
/** Variational RFQ Demo — Usage: pnpm demo:variational · Trip: pnpm demo:variational -- --trip */
import { validateVariationalRFQIntent } from "../src/adapters/variational-rfq-adapter";
import { HEALTHY_SOIL, printPillarSetYVenueBanner } from "./adapters/exomesh-ansi-hud";
import { captureSoilBenchmark } from "./lib/demo-benchmark";
import { ensureDemoWasmSoft, isDemoTripArgv, wrapDemoExecution } from "./lib/demo-harness";
import { collectVariationalBreachLines, withMatrixHudMute } from "./lib/matrix-demo-hud";
import { finalizeVenueHappy, finalizeVenueTrip, printVenuePreflightHeader, printVenueRow } from "./lib/venue-demo-hud";

function payload(nowMs: number, trip: boolean) {
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

function runGuard(nowMs: number, trip: boolean): string {
  const r = validateVariationalRFQIntent(payload(nowMs, trip));
  return trip ? (r.reason ?? "stale quote / OLP depth breach") : (r.detail ?? "OLP depth ok");
}

wrapDemoExecution(({ nowMs }) => {
  const trip = isDemoTripArgv();
  ensureDemoWasmSoft();
  const soil = { ...HEALTHY_SOIL, at: new Date(nowMs) };
  const benchmark = captureSoilBenchmark(soil, () => withMatrixHudMute(() => runGuard(nowMs, false)));
  printPillarSetYVenueBanner("Variational Omni RFQ", benchmark);
  printVenuePreflightHeader(!trip);
  let detail = "";
  withMatrixHudMute(() => {
    detail = runGuard(nowMs, trip);
  });
  printVenueRow("Variational RFQ", !trip, detail);
  if (trip) {
    finalizeVenueTrip(collectVariationalBreachLines(payload(nowMs, true)), benchmark);
    return { tripped: true, reason: "VARIATIONAL_FAIL_CLOSED" };
  }
  finalizeVenueHappy(benchmark);
});
