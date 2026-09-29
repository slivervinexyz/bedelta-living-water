/**
 * Pendle Core API discovery — Arbitrum Fixed Yield PT markets (fetch-only, off hot path).
 */
import { fetchAllowlisted } from "../../services/defense/rpc-whitelist";
import type { PendleApiMarket, PendleApiMarketsResponse } from "./pendle-api-types";
import { mergePendleDiscoveryEntries } from "./pendle-pt-registry-store";
import { PENDLE_PT_REGISTRY_CHAIN_ID } from "./pendle-pt-registry-constants";
import type { PendlePtRegistryEntry } from "./pendle-pt-registry-types";

export const PENDLE_API_BASE = "https://api-v2.pendle.finance/core" as const;
export const PENDLE_API_HOST = "api-v2.pendle.finance" as const;

export function stripPendleChainAddress(id: string): `0x${string}` {
  const trimmed = id.trim();
  const idx = trimmed.indexOf("-0x");
  if (idx >= 0) return trimmed.slice(idx + 1) as `0x${string}`;
  return trimmed as `0x${string}`;
}

export function pendleRegistryKeyFromMarket(market: PendleApiMarket): string {
  const date = market.expiry.slice(0, 10);
  return `PT-${market.name}-${date}`;
}

export function mapPendleApiMarketToRegistryEntry(
  market: PendleApiMarket,
): PendlePtRegistryEntry {
  const expirySec = Math.floor(Date.parse(market.expiry) / 1000);
  const implied = market.details.impliedApy;
  const underlyingApy = market.details.underlyingApy;
  const driftBps = Math.abs(underlyingApy - implied) * 10_000;
  const historicalYield24h = driftBps > 150 ? implied : underlyingApy > 0 ? underlyingApy : implied;
  return {
    key: pendleRegistryKeyFromMarket(market),
    symbol: `PT-${market.name}`,
    chainId: PENDLE_PT_REGISTRY_CHAIN_ID,
    marketAddress: market.address as `0x${string}`,
    ptAddress: stripPendleChainAddress(market.pt),
    syAddress: stripPendleChainAddress(market.sy),
    underlyingAddress: stripPendleChainAddress(market.underlyingAsset),
    inputTokenAddresses: market.inputTokens.map(stripPendleChainAddress),
    protocol: market.protocol,
    expirySec,
    impliedYield: implied,
    historicalYield24h,
    ptPriceInAsset: 0.95,
    liquidityConstant: Math.max(market.details.totalTvl, market.details.liquidity),
    dynamicFeeRate: market.details.feeRate,
    underlyingAssetUsdRef: 1,
    discoverySource: "api",
  };
}

export async function fetchPendleMarkets(
  chainId = PENDLE_PT_REGISTRY_CHAIN_ID,
  opts: { isActive?: boolean; limit?: number } = {},
): Promise<PendleApiMarket[]> {
  const params = new URLSearchParams({
    chainId: String(chainId),
    isActive: String(opts.isActive ?? true),
    limit: String(opts.limit ?? 100),
  });
  const url = `${PENDLE_API_BASE}/v2/markets/all?${params}`;
  const res = await fetchAllowlisted(url, { method: "GET" });
  if (!res.ok) throw new Error(`PENDLE_API_FAIL:${res.status}`);
  const body = (await res.json()) as PendleApiMarketsResponse;
  return body.results ?? [];
}

/** Fetch Arbitrum active markets and merge into runtime registry overlay. */
export async function refreshPendleArbitrumDiscovery(
  chainId = PENDLE_PT_REGISTRY_CHAIN_ID,
): Promise<{ count: number; entries: PendlePtRegistryEntry[] }> {
  const markets = await fetchPendleMarkets(chainId, { isActive: true, limit: 100 });
  const entries = markets.map(mapPendleApiMarketToRegistryEntry);
  mergePendleDiscoveryEntries(entries);
  return { count: entries.length, entries };
}
