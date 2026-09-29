import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { TwapEngineV2Stub } from "../../src/services/execution/twap-engine-v2";
import {
  computeLiveBookMetrics,
  type HlL2BookResponse,
} from "../../src/services/exchanges/hyperliquid-adapter";
import { MIN_DEPTH_USD, checkSoilResistance } from "../../src/services/risk-control";
import { planIcebergClips } from "../../src/core/weapons/defensive/adaptiveIceberg";
import {
  clamp01,
  dualSlip,
  fetchCandles,
  fetchFundingHistory,
  fmtPct,
  fmtUsd,
  postHl,
} from "../_shared/hl-benchmark-utils";
import {
  COIN,
  LOOKBACK_MS,
  NOTIONAL,
  OUT,
} from "./benchmark-matrix.constants";
import { evaluateRadarGen1VsGen2 } from "./benchmark-matrix.radar";
import { buildWeaponComparisonMarkdown } from "./benchmark-matrix.report";
import {
  basicIcebergSlip,
  computeDynSl,
  full30Slip,
} from "./benchmark-matrix.slip";
import { compareSystemV08VsV15 } from "./benchmark-matrix.system";

export async function main(): Promise<void> {
  console.log("[matrix] fetching HL mainnet L1 for ETH…");
  const end = Date.now();
  const start = end - LOOKBACK_MS;

  const [funding, candles1h, book, meta] = await Promise.all([
    fetchFundingHistory(COIN, start, end),
    fetchCandles("1h", start, end),
    postHl<HlL2BookResponse>({ type: "l2Book", coin: COIN }),
    postHl<[unknown[], Array<{ midPx?: string; funding?: string }>]>({
      type: "metaAndAssetCtxs",
    }),
  ]);

  const metrics =
    computeLiveBookMetrics(book, NOTIONAL) ??
    ({
      midPx: Number(meta[1]?.[1]?.midPx ?? 3000),
      bestBid: 2999,
      bestAsk: 3001,
      depthUsd: MIN_DEPTH_USD,
      bidDepthUsd: MIN_DEPTH_USD,
      askDepthUsd: MIN_DEPTH_USD,
      spreadBps: 2,
      priceImpactBps: 5,
    } as const);

  const mid = metrics.midPx;
  const depth = metrics.depthUsd;
  const rates = funding.map((f) => Number(f.fundingRate));
  const closes = candles1h.map((c) => Number(c.c));

  const soil = checkSoilResistance({
    symbol: COIN,
    hlSpot: metrics.bestBid,
    hlPerp: mid,
    dydxPerp: mid,
    depthUsd: depth,
    orderSizeUsd: NOTIONAL,
    accountBalanceUsd: NOTIONAL,
  });
  const soilScore = soil.ok ? 90 : soil.tripped ? 25 : 55;
  const imb =
    metrics.bidDepthUsd + metrics.askDepthUsd > 0
      ? clamp01(
          50 +
            50 *
              ((metrics.bidDepthUsd - metrics.askDepthUsd) /
                (metrics.bidDepthUsd + metrics.askDepthUsd)),
        )
      : 50;

  const hours = Math.min(rates.length, 720);
  const radar = evaluateRadarGen1VsGen2({
    rates,
    closes,
    soilScore,
    imbalanceScore: imb,
    hours,
  });

  const hard = dualSlip(book, mid, NOTIONAL);
  const iceberg = basicIcebergSlip(book, mid, NOTIONAL, 5);
  const clips = planIcebergClips({ totalNotionalUsd: NOTIONAL });
  const sri = {
    index: soil.ok ? 85 : soil.tripped ? 25 : 55,
    band: soil.ok ? "CLEAR" : soil.tripped ? "TRIP" : "ELEVATED",
  };
  const stub = new TwapEngineV2Stub();
  void stub.planRoutes({
    symbol: COIN,
    totalNotionalUsd: NOTIONAL,
    horizonMs: 60_000,
    preferVwap: false,
  });
  const gen2 = full30Slip(book, mid, NOTIONAL);
  const dynSl = computeDynSl();
  const rootWouldTrip = hard.slipUsd > dynSl * 0.15;
  const gen1Slip = iceberg.slipUsd;
  const gen2Slip = gen2.slipUsd;

  const system = compareSystemV08VsV15({
    hours,
    rates,
    funding,
    start,
    composites: radar.composites,
    toxicCut: radar.toxicCut,
    gen1Slip,
    gen2Slip,
  });

  const md = buildWeaponComparisonMarkdown({
    hours,
    mid,
    depth,
    soilOk: soil.ok,
    sriIndex: sri.index,
    sriBand: sri.band,
    radar,
    hardSlipUsd: hard.slipUsd,
    hardImpactBps: hard.impactBps,
    gen1Slip,
    gen1ImpactBps: iceberg.impactBps,
    gen2Slip,
    gen2ImpactBps: gen2.impactBps,
    gen2Paths: gen2.paths,
    clipCount: clips.length,
    rootWouldTrip,
    dynSl,
    system,
    slipSaved08: Math.max(0, hard.slipUsd - gen1Slip),
    slipSaved15: Math.max(0, hard.slipUsd - gen2Slip),
  });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, md, "utf8");
  console.log(`[matrix] wrote ${OUT}`);
  console.log(
    `[testA] FAR gen1=${fmtPct(radar.gen1Far, 2)} gen2=${fmtPct(radar.gen2Far, 2)} latencyH gen1=${Number.isFinite(radar.gen1LatencyH) ? radar.gen1LatencyH.toFixed(2) : "n/a"} gen2=${Number.isFinite(radar.gen2LatencyH) ? radar.gen2LatencyH.toFixed(2) : "n/a"}`,
  );
  console.log(
    `[testB] hard=${fmtUsd(hard.slipUsd)} gen1=${fmtUsd(gen1Slip)} gen2=${fmtUsd(gen2Slip)} saved=${fmtUsd(Math.max(0, gen1Slip - gen2Slip))}`,
  );
  console.log(
    `[testC] apy08=${fmtPct(system.apy08, 2)} apy15=${fmtPct(system.apy15, 2)} mdd08=${fmtPct(system.mdd08, 4)} mdd15=${fmtPct(system.mdd15, 4)} sharpe08=${system.sharpe08.toFixed(2)} sharpe15=${system.sharpe15.toFixed(2)}`,
  );
}
