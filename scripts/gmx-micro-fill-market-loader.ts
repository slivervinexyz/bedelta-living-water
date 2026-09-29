/** GMX micro-fill market snapshot loader for execute script. */
import { gmxV2ArbitrumAdapter } from "../src/services/adapters/gmx-v2-adapter";
import { fetchGmxLiveContext, resolveGmxMarket } from "../src/services/adapters/gmx-v2-adapter.utils";
import { poolWeightsFromGmxMarket } from "../src/services/yield/gmx-v2-price-impact";
import { calibrateMicroFillExecution, type MicroFillMarketSnapshot } from "./gmx-micro-fill-calibration";

export async function loadGmxMicroFillMarketSnapshot(symbol: string): Promise<MicroFillMarketSnapshot> {
  const [depth, ctx] = await Promise.all([
    gmxV2ArbitrumAdapter.getMarketDepth({ symbol, market: "perp" }),
    fetchGmxLiveContext({}),
  ]);
  const resolved = resolveGmxMarket(ctx, symbol);
  const pool = poolWeightsFromGmxMarket(resolved.info, resolved.midPriceUsd);
  const rawTvl = resolved.poolLiquidityUsd || depth.gmPoolLiquidityUsd || 0;
  const tvlHint = Number.isFinite(rawTvl) && rawTvl > 0 && rawTvl < 1e12 ? rawTvl : 0;
  if (pool.shortTokenUsd < 1 || pool.longTokenUsd < 1 || pool.longTokenUsd + pool.shortTokenUsd < tvlHint * 0.5) {
    const tvl = tvlHint > 0 ? tvlHint : Math.max(pool.longTokenUsd + pool.shortTokenUsd, 1);
    pool.longTokenUsd = tvl * 0.55;
    pool.shortTokenUsd = tvl * 0.45;
  }
  const poolTvlUsd = pool.longTokenUsd + pool.shortTokenUsd;
  const depthUsd = Math.min(depth.bidDepthUsd + depth.askDepthUsd, poolTvlUsd > 0 ? poolTvlUsd : depth.gmPoolLiquidityUsd ?? 0);
  return { symbol, pool, poolTvlUsd, midPriceUsd: resolved.midPriceUsd, depthUsd };
}

export { calibrateMicroFillExecution };
