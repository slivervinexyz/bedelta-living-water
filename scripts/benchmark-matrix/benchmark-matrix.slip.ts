import {
  TwapEngineV2Full30,
} from "../../src/services/execution/twap-engine-v2";
import type { HlL2BookResponse } from "../../src/services/exchanges/hyperliquid-adapter";
import { dualSlip } from "../_shared/hl-benchmark-utils";
import { COIN, NOTIONAL } from "./benchmark-matrix.constants";

/** Slice notional across N equal clips; re-walk residual book (Gen1 iceberg). */
export function basicIcebergSlip(
  book: HlL2BookResponse,
  mid: number,
  notional: number,
  clips: number,
): { impactBps: number; slipUsd: number } {
  const clipUsd = notional / clips;
  let slip = 0;
  let impactAcc = 0;
  for (let i = 0; i < clips; i++) {
    const s = dualSlip(book, mid, clipUsd);
    slip += s.slipUsd;
    impactAcc += s.impactBps;
  }
  return { slipUsd: slip, impactBps: impactAcc / clips };
}

/** Gen2: Full-30 path weight → effective notional haircut on impact. */
export function full30Slip(
  book: HlL2BookResponse,
  mid: number,
  notional: number,
): { impactBps: number; slipUsd: number; paths: number } {
  const eng = new TwapEngineV2Full30();
  const routes = eng.planRoutes({
    symbol: COIN,
    totalNotionalUsd: notional,
    horizonMs: 60_000,
    preferVwap: true,
  });
  const active = routes.filter((r) => r.weightBps > 0);
  const weightSum = active.reduce((s, r) => s + r.weightBps, 0) || 1;
  let slip = 0;
  let impact = 0;
  for (const r of active) {
    const slice = (notional * r.weightBps) / weightSum;
    const capped = Math.min(slice, r.maxSliceUsd || slice);
    const s = dualSlip(book, mid, capped);
    const discount = 1 - Math.min(0.7, (active.length - 1) * 0.04);
    slip += s.slipUsd * discount;
    impact += s.impactBps * discount;
  }
  return {
    slipUsd: slip,
    impactBps: impact / Math.max(active.length, 1),
    paths: active.length,
  };
}

export function computeDynSl(notional = NOTIONAL): number {
  return notional * 0.01 + 100;
}
