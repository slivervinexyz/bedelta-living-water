/** Pendle PT registry entry types — shared by static + discovery overlays. */
import type { PENDLE_PT_REGISTRY_CHAIN_ID } from "./pendle-pt-registry-constants";

export type PendlePtMarketKey = string;

export interface PendlePtRegistryEntry {
  key: PendlePtMarketKey;
  symbol: string;
  chainId: typeof PENDLE_PT_REGISTRY_CHAIN_ID;
  marketAddress: `0x${string}`;
  ptAddress?: `0x${string}`;
  syAddress?: `0x${string}`;
  underlyingAddress?: `0x${string}`;
  inputTokenAddresses?: readonly `0x${string}`[];
  protocol?: string;
  expirySec: number;
  impliedYield: number;
  historicalYield24h: number;
  ptPriceInAsset: number;
  liquidityConstant: number;
  dynamicFeeRate: number;
  underlyingAssetUsdRef: number;
  discoverySource?: "static" | "api";
}
