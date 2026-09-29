import type { IntentLeg } from "../../../core/intent-ledger";
import {
  ARBITRUM_STABLE_ADDRESSES,
  DEFAULT_GMX_BASE_APY,
  DEFAULT_PENDLE_BASE_APY,
  type ArbitrumStableSymbol,
  type ArbitrumStableYieldSnapshot,
  type ArbitrumYieldIngressOptions,
  type ArbitrumYieldIngressValidation,
} from "./arbitrum-yield-ingress-types";
import {
  fetchGmxMarkets,
  gmxMarketApy,
  gmxPoolDepthUsd,
  normalizeApr,
  pickStableMarket,
} from "./arbitrum-yield-ingress-fetch";

export async function fetchArbitrumStableYield(
  symbol: ArbitrumStableSymbol,
  opts: ArbitrumYieldIngressOptions = {},
): Promise<ArbitrumStableYieldSnapshot> {
  const address = ARBITRUM_STABLE_ADDRESSES[symbol];
  const fetchedAt = new Date().toISOString();
  const markets = await fetchGmxMarkets(opts);
  const stableMarket = pickStableMarket(markets, symbol);
  const proxyMarket =
    stableMarket ?? markets.find((m) => !m.isDisabled) ?? markets[0];

  if (proxyMarket) {
    const rawApy = gmxMarketApy(proxyMarket);
    const baseApy =
      normalizeApr(rawApy) ||
      (stableMarket ? DEFAULT_GMX_BASE_APY[symbol] : DEFAULT_GMX_BASE_APY[symbol] * 0.85);
    const scaledApy = stableMarket ? baseApy : baseApy * 0.25;
    return {
      symbol,
      address,
      baseApy: scaledApy > 0 ? scaledApy : DEFAULT_GMX_BASE_APY[symbol],
      depthUsd: Math.max(gmxPoolDepthUsd(proxyMarket), 250_000),
      source: "gmx",
      fetchedAt,
    };
  }

  return {
    symbol,
    address,
    baseApy: DEFAULT_PENDLE_BASE_APY[symbol],
    depthUsd: 750_000,
    source: "pendle",
    fetchedAt,
  };
}

export async function fetchAllArbitrumStableYields(
  opts: ArbitrumYieldIngressOptions = {},
): Promise<ArbitrumStableYieldSnapshot[]> {
  const symbols: ArbitrumStableSymbol[] = ["USDC", "USDT"];
  return Promise.all(symbols.map((s) => fetchArbitrumStableYield(s, opts)));
}

export function pickBestArbitrumStableIngress(
  snapshots: readonly ArbitrumStableYieldSnapshot[],
  minDepthUsd = 100_000,
): ArbitrumStableYieldSnapshot | null {
  const eligible = snapshots.filter((s) => s.depthUsd >= minDepthUsd && s.baseApy > 0);
  if (eligible.length === 0) return null;
  return eligible.sort((a, b) => b.baseApy - a.baseApy)[0] ?? null;
}

export function buildArbitrumIngressIntentLeg(
  snapshot: ArbitrumStableYieldSnapshot,
  sizeUsd: number,
): IntentLeg {
  return {
    venue: "GMX",
    side: "BUY",
    sizeUsd,
    symbol: snapshot.symbol,
  };
}

export function validateArbitrumYieldIngress(
  snapshot: ArbitrumStableYieldSnapshot,
  minDepthUsd = 100_000,
  sizeUsd?: number,
): ArbitrumYieldIngressValidation {
  const reasons: string[] = [];

  if (snapshot.baseApy <= 0) {
    reasons.push("ARBITRUM_BASE_APY_ZERO");
  }
  if (snapshot.depthUsd < minDepthUsd) {
    reasons.push(`ARBITRUM_DEPTH=${snapshot.depthUsd}<${minDepthUsd}`);
  }

  const allowed = reasons.length === 0;
  return {
    allowed,
    readyFor2Pc: allowed,
    reasons,
    snapshot,
    proposedLeg:
      allowed && sizeUsd !== undefined && sizeUsd > 0
        ? buildArbitrumIngressIntentLeg(snapshot, sizeUsd)
        : null,
  };
}

export async function fetchAndValidateArbitrumYieldIngress(
  symbol: ArbitrumStableSymbol = "USDC",
  opts: ArbitrumYieldIngressOptions = {},
): Promise<ArbitrumYieldIngressValidation> {
  const snapshot = await fetchArbitrumStableYield(symbol, opts);
  return validateArbitrumYieldIngress(snapshot, opts.minDepthUsd);
}

export type { ArbitrumYieldSource } from "./arbitrum-yield-ingress-types";
