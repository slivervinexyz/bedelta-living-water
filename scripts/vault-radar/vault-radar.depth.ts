import { HL_L2_STALE_THRESHOLD_MS } from "../../src/config/constants";
import { postInfo } from "./vault-radar.fetch";
import type { DepthProbe, HlL2Book } from "./vault-radar.types";

function computeBookDepthUsd(book: HlL2Book): number {
  const bids = book.levels[0] ?? [];
  const asks = book.levels[1] ?? [];
  const bestBid = parseFloat(bids[0]?.px ?? "0");
  const bestAsk = parseFloat(asks[0]?.px ?? "0");
  const mid = (bestBid + bestAsk) / 2;
  if (!Number.isFinite(mid) || mid <= 0) return 0;
  const band = mid * 0.005;
  let depth = 0;
  for (const level of [...bids, ...asks]) {
    const px = parseFloat(level.px);
    const sz = parseFloat(level.sz);
    if (!Number.isFinite(px) || !Number.isFinite(sz)) continue;
    if (Math.abs(px - mid) <= band) depth += px * sz;
  }
  return depth;
}

export async function probeL2Depth(coin: string): Promise<DepthProbe> {
  const t0 = performance.now();
  const book = await postInfo<HlL2Book>({ type: "l2Book", coin });
  const latencyMs = performance.now() - t0;
  const bookTimeMs = book.time ?? Date.now();
  const ageMs = Date.now() - bookTimeMs;
  const stale = ageMs > HL_L2_STALE_THRESHOLD_MS;
  const depthUsd = computeBookDepthUsd(book);
  return {
    coin,
    depthUsd,
    latencyMs: Math.round(latencyMs * 10) / 10,
    stale,
    failClosedWouldTrip: stale || latencyMs > 500,
  };
}
