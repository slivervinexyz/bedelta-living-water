import type { HlL2BookResponse } from "../../src/services/exchanges/hyperliquid-adapter";
import {
  COIN,
  type Candle,
  type FundingPoint,
  type HlAssetCtx,
} from "./hl-benchmark-types";

const OFFLINE_ETH_MID_PX = 3_500;
const OFFLINE_HOURLY_FUNDING_APR: Record<string, number> = {
  ETH: 0.128,
  SOL: 0.11,
  BTC: 0.095,
};

export function buildOfflineFundingSnapshot(
  coin: string,
  startMs: number,
  endMs: number,
): FundingPoint[] {
  const apr = OFFLINE_HOURLY_FUNDING_APR[coin] ?? OFFLINE_HOURLY_FUNDING_APR.ETH;
  const hourlyRate = apr / (365 * 24);
  const hourMs = 3_600_000;
  const first = Math.ceil(startMs / hourMs) * hourMs;
  const out: FundingPoint[] = [];
  for (let t = first; t < endMs; t += hourMs) {
    out.push({
      coin,
      fundingRate: hourlyRate.toFixed(10),
      premium: "0",
      time: t,
    });
  }
  return out;
}

export function buildOfflineL2Book(midPx = OFFLINE_ETH_MID_PX): HlL2BookResponse {
  const spread = midPx * 0.0001;
  const bestBid = midPx - spread / 2;
  const bestAsk = midPx + spread / 2;
  const levelSz = "50";
  const mkLevels = (startPx: number, dir: -1 | 1) =>
    Array.from({ length: 12 }, (_, i) => ({
      px: (startPx + dir * i * spread * 0.25).toFixed(2),
      sz: levelSz,
      n: 1,
    }));
  return {
    coin: COIN,
    levels: [mkLevels(bestBid, -1), mkLevels(bestAsk, 1)],
    time: Date.now(),
  };
}

export function buildOfflineCandles(
  interval: "1m" | "1h",
  startMs: number,
  endMs: number,
  midPx = OFFLINE_ETH_MID_PX,
): Candle[] {
  const stepMs = interval === "1m" ? 60_000 : 3_600_000;
  const px = midPx.toFixed(2);
  const out: Candle[] = [];
  for (let t = startMs; t < endMs; t += stepMs) {
    out.push({
      t,
      o: px,
      h: px,
      l: px,
      c: px,
      v: "1000",
      n: 10,
    });
  }
  return out;
}

export function buildOfflineEthMeta(midPx = OFFLINE_ETH_MID_PX): {
  maxLeverage: number;
  assetCtx: HlAssetCtx;
} {
  const px = midPx.toFixed(2);
  return {
    maxLeverage: 50,
    assetCtx: {
      funding: "0.00001",
      openInterest: "1000000",
      oraclePx: px,
      markPx: px,
      midPx: px,
      premium: "0",
      impactPxs: [px, px],
    },
  };
}
