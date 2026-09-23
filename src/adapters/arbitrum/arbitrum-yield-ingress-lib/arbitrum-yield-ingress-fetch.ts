import { fetchAllowlisted } from "../../../services/defense/rpc-whitelist";
import {
  GMX_ALLOWED_HOSTS,
  GMX_MARKETS_INFO_URL,
  type GmxMarketInfo,
} from "../../gmx";
import type { ArbitrumStableSymbol, ArbitrumYieldIngressOptions } from "./arbitrum-yield-ingress-types";

const STABLE_NAME_HINTS: Record<ArbitrumStableSymbol, string[]> = {
  USDC: ["USDC", "USDC/USD"],
  USDT: ["USDT", "USDT/USD"],
};

function normalizeApr(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.abs(raw) > 1 ? raw / 100 : raw;
}

function gmxMarketApy(market: GmxMarketInfo): number {
  const borrow = parseFloat(market.borrowingFactorPerSecondForLongs ?? "0");
  const funding = parseFloat(market.fundingFactorPerSecond ?? "0");
  return Math.min(Math.abs(borrow + funding) * 31_536_000, 2);
}

function gmxPoolDepthUsd(market: GmxMarketInfo): number {
  const max = parseFloat(market.poolValueMax ?? "0");
  const min = parseFloat(market.poolValueMin ?? "0");
  if (max > 0) return max;
  if (min > 0) return min;
  return (
    Math.max(
      parseFloat(market.longPoolAmount ?? "0"),
      parseFloat(market.shortPoolAmount ?? "0"),
    ) / 1e6
  );
}

async function fetchGmxMarkets(
  opts: ArbitrumYieldIngressOptions,
): Promise<GmxMarketInfo[]> {
  const url = opts.marketsUrl ?? GMX_MARKETS_INFO_URL;
  try {
    const res = opts.fetchFn
      ? await opts.fetchFn(url)
      : await fetchAllowlisted(url, undefined, GMX_ALLOWED_HOSTS);
    if (!res.ok) return [];
    const body = (await res.json()) as { markets?: GmxMarketInfo[] } | GmxMarketInfo[];
    return Array.isArray(body) ? body : (body.markets ?? []);
  } catch {
    return [];
  }
}

function pickStableMarket(
  markets: GmxMarketInfo[],
  symbol: ArbitrumStableSymbol,
): GmxMarketInfo | undefined {
  const hints = STABLE_NAME_HINTS[symbol];
  return markets.find(
    (m) =>
      !m.isDisabled &&
      hints.some((h) => m.name?.toUpperCase().includes(h.toUpperCase())),
  );
}

export {
  normalizeApr,
  gmxMarketApy,
  gmxPoolDepthUsd,
  fetchGmxMarkets,
  pickStableMarket,
};
