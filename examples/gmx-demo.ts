#!/usr/bin/env tsx
/** GMX v2 Demo — Usage: pnpm demo:gmx · Trip: pnpm demo:gmx -- --trip */
import {
  assertGmxPayloadFailClosed,
  GMX_PAYLOAD_PRICE_IMPACT_TRIP,
} from "../src/services/adapters/gmx-v2-order-payload-guards";
import {
  buildGmxV2UnsignedOrderPayload,
  DEFAULT_GMX_EXECUTION_FEE_WEI,
} from "../src/services/adapters/gmx-v2-order-payload";
import { checkSoilResistance, RiskLimitExceeded } from "../src/services/risk-control";
import {
  estimatePreliminaryImpact,
  evaluateGmxPriceImpactSoilGate,
  gmxPriceImpactForSoil,
} from "../src/services/yield/gmx-v2-price-impact";
import { HEALTHY_SOIL, printPillarSetYVenueBanner } from "./adapters/exomesh-ansi-hud";
import { captureSoilBenchmark } from "./lib/demo-benchmark";
import { printOpSecFootnote } from "./lib/demo-module-banners";
import { ensureDemoWasmSoft, isDemoTripArgv, wrapDemoExecution } from "./lib/demo-harness";
import { withMatrixHudMute } from "./lib/matrix-demo-hud";
import {
  finalizeVenueHappy,
  finalizeVenueTrip,
  GMX_TRIP_BREACHES,
  printVenuePreflightHeader,
  printVenueRow,
} from "./lib/venue-demo-hud";

const ETH_GM = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336" as const;
const TOXIC_POOL = { longTokenUsd: 3_000_000, shortTokenUsd: 1_000_000 };

function runHealthy(at: Date): void {
  buildGmxV2UnsignedOrderPayload({ side: "long", sizeUsd: 100, marketToken: ETH_GM, midPriceUsd: 3500 });
  assertGmxPayloadFailClosed({
    sizeUsd: 100,
    isLong: true,
    executionFee: DEFAULT_GMX_EXECUTION_FEE_WEI,
    pool: { longTokenUsd: 5_000_000, shortTokenUsd: 2_500_000 },
    collateralReserveRatio: 1.08,
  });
  checkSoilResistance({ ...HEALTHY_SOIL, at, disableThresholdJitter: true });
}

function runTrip(at: Date): void {
  const impact = estimatePreliminaryImpact({ orderSizeUsd: 2_000_000, isLong: true, pool: TOXIC_POOL });
  evaluateGmxPriceImpactSoilGate(gmxPriceImpactForSoil(impact));
  checkSoilResistance({
    ...HEALTHY_SOIL,
    disableThresholdJitter: true,
    gmxPriceImpact: gmxPriceImpactForSoil(impact),
    at,
  });
  try {
    buildGmxV2UnsignedOrderPayload({
      side: "long",
      sizeUsd: 5_000_000,
      marketToken: ETH_GM,
      midPriceUsd: 3500,
      pool: { longTokenUsd: 1_000_000, shortTokenUsd: 500_000 },
    });
  } catch (err) {
    if (!(err instanceof RiskLimitExceeded) || !String(err.message).includes(GMX_PAYLOAD_PRICE_IMPACT_TRIP)) {
      throw err;
    }
  }
}

wrapDemoExecution(({ at }) => {
  const trip = isDemoTripArgv();
  ensureDemoWasmSoft();
  const soil = { ...HEALTHY_SOIL, at };
  const benchmark = captureSoilBenchmark(soil, () => withMatrixHudMute(() => runHealthy(at)));
  printPillarSetYVenueBanner("GMX v2", benchmark);
  printVenuePreflightHeader(!trip);
  withMatrixHudMute(() => (trip ? runTrip(at) : runHealthy(at)));
  printVenueRow("GMX v2", !trip, trip ? "price impact trip · pool skew breach" : "shadow margin ok · cross-venue slippage clear");
  if (trip) {
    finalizeVenueTrip(GMX_TRIP_BREACHES, benchmark, {
      moduleTag: "[Module A: ExoMesh]",
      title: "GMX v2 Soil Resistance Interception",
      reasonCode: "GMX_FAIL_CLOSED",
    });
    printOpSecFootnote();
    return { tripped: true, reason: "GMX_FAIL_CLOSED" };
  }
  finalizeVenueHappy(benchmark);
  printOpSecFootnote();
});
