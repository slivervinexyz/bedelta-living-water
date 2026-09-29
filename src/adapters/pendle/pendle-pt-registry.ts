/** Arbitrum One Pendle PT market registry — static SSOT + discovery overlay. */
import type { PTMarketState } from "../../core/pendle-types";
import {
  pendleMarketOracle,
  type PendleMarketOracleFields,
} from "./pendle-market-oracle-adapter";
import {
  PENDLE_PT_MARKET_PT_EETH,
  PENDLE_PT_MARKET_PT_SUSDAI_OCT26,
  PENDLE_PT_MARKET_PT_USDAI_OCT26,
  PENDLE_PT_MARKET_PT_USDC,
  PENDLE_PT_REGISTRY_CHAIN_ID,
  REF_EXPIRY_SEC,
  SUSDAI_OCT26_EXPIRY_SEC,
} from "./pendle-pt-registry-constants";
import { overlayDiscoveryOnStatic, resolvePendleDiscoveryEntry } from "./pendle-pt-registry-store";
import type { PendlePtMarketKey, PendlePtRegistryEntry } from "./pendle-pt-registry-types";

export {
  PENDLE_PT_REGISTRY_CHAIN,
  PENDLE_PT_REGISTRY_CHAIN_ID,
  PENDLE_PT_MARKET_PT_EETH,
  PENDLE_PT_MARKET_PT_USDC,
  PENDLE_PT_MARKET_PT_SUSDAI_OCT26,
  PENDLE_PT_MARKET_PT_USDAI_OCT26,
} from "./pendle-pt-registry-constants";
export type { PendlePtMarketKey, PendlePtRegistryEntry } from "./pendle-pt-registry-types";
export {
  clearPendleDiscoveryForTests,
  listPendleDiscoveryEntries,
  mergePendleDiscoveryEntries,
} from "./pendle-pt-registry-store";

const STATIC_REGISTRY: Record<string, PendlePtRegistryEntry> = {
  [PENDLE_PT_MARKET_PT_EETH]: {
    key: PENDLE_PT_MARKET_PT_EETH,
    symbol: "PT-eETH",
    chainId: PENDLE_PT_REGISTRY_CHAIN_ID,
    marketAddress: "0x8B330d3A50a624f1fE1744d037048BdBc9664E5D",
    expirySec: REF_EXPIRY_SEC,
    impliedYield: 0.042,
    historicalYield24h: 0.044,
    ptPriceInAsset: 0.94,
    liquidityConstant: 12_000_000,
    dynamicFeeRate: 0.008,
    underlyingAssetUsdRef: 3_500,
    discoverySource: "static",
  },
  [PENDLE_PT_MARKET_PT_USDC]: {
    key: PENDLE_PT_MARKET_PT_USDC,
    symbol: "PT-USDC",
    chainId: PENDLE_PT_REGISTRY_CHAIN_ID,
    marketAddress: "0x156291C6e10E8a1B9f95475A9C0c5E3eCe1d1e44",
    expirySec: REF_EXPIRY_SEC + 365 * 86_400,
    impliedYield: 0.058,
    historicalYield24h: 0.059,
    ptPriceInAsset: 0.97,
    liquidityConstant: 25_000_000,
    dynamicFeeRate: 0.006,
    underlyingAssetUsdRef: 1,
    discoverySource: "static",
  },
  [PENDLE_PT_MARKET_PT_SUSDAI_OCT26]: {
    key: PENDLE_PT_MARKET_PT_SUSDAI_OCT26,
    symbol: "PT-sUSDai",
    chainId: PENDLE_PT_REGISTRY_CHAIN_ID,
    marketAddress: "0xcbf629c8d396b1261f81f55175afa010e94787d8",
    ptAddress: "0xb459db106f645d698e74027eef6019a26a0675cc",
    syAddress: "0x30ccf4bbee313fcd19f3e295b3ba2920a24e2f62",
    underlyingAddress: "0x0b2b2b2076d95dda7817e785989fe353fe955ef9",
    inputTokenAddresses: [
      "0x0a1a1a107e45b7ced86833863f482bc5f4ed82ef",
      "0x0b2b2b2076d95dda7817e785989fe353fe955ef9",
    ],
    protocol: "USD.AI",
    expirySec: SUSDAI_OCT26_EXPIRY_SEC,
    impliedYield: 0.1117,
    historicalYield24h: 0.108,
    ptPriceInAsset: 0.96,
    liquidityConstant: 66_000_000,
    dynamicFeeRate: 0.0022,
    underlyingAssetUsdRef: 1,
    discoverySource: "static",
  },
  [PENDLE_PT_MARKET_PT_USDAI_OCT26]: {
    key: PENDLE_PT_MARKET_PT_USDAI_OCT26,
    symbol: "PT-USDai",
    chainId: PENDLE_PT_REGISTRY_CHAIN_ID,
    marketAddress: "0xa8a0dea40174cfc30fea9e3a77f182ab33f46e25",
    ptAddress: "0xc9d24ad0bb25f34098e226a8c5192dea7bacccae",
    syAddress: "0x5edcbc20cac67adc2e724d4348ff85132b085b82",
    underlyingAddress: "0x0a1a1a107e45b7ced86833863f482bc5f4ed82ef",
    inputTokenAddresses: ["0x0a1a1a107e45b7ced86833863f482bc5f4ed82ef"],
    protocol: "USD.AI",
    expirySec: SUSDAI_OCT26_EXPIRY_SEC,
    impliedYield: 0.0948,
    historicalYield24h: 0.0948,
    ptPriceInAsset: 0.96,
    liquidityConstant: 66_000_000,
    dynamicFeeRate: 0.0018,
    underlyingAssetUsdRef: 1,
    discoverySource: "static",
  },
};

export const PENDLE_PT_REGISTRY: Record<PendlePtMarketKey, PendlePtRegistryEntry> =
  STATIC_REGISTRY;

const STATIC_ADDRESS_INDEX = new Map<string, PendlePtRegistryEntry>(
  Object.values(STATIC_REGISTRY).map((entry) => [entry.marketAddress.toLowerCase(), entry]),
);

export function listPendlePtRegistryEntries(): PendlePtRegistryEntry[] {
  return overlayDiscoveryOnStatic(Object.values(STATIC_REGISTRY));
}

export function normalizePendlePtAddress(address: string): string {
  const trimmed = address.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return trimmed.toLowerCase();
  return trimmed.toLowerCase();
}

export function resolvePendlePtRegistryEntry(
  keyOrAddress: PendlePtMarketKey | string,
): PendlePtRegistryEntry | null {
  const discovered = resolvePendleDiscoveryEntry(keyOrAddress);
  if (discovered) return discovered;
  const direct = STATIC_REGISTRY[keyOrAddress];
  if (direct) return direct;
  return STATIC_ADDRESS_INDEX.get(normalizePendlePtAddress(keyOrAddress)) ?? null;
}

export function toPendlePtMarketState(
  entry: PendlePtRegistryEntry,
  overrides: Partial<PTMarketState> = {},
): PTMarketState {
  return {
    expiry: entry.expirySec,
    impliedYield: entry.impliedYield,
    historicalYield24h: entry.historicalYield24h,
    ptPriceInAsset: entry.ptPriceInAsset,
    liquidityConstant: entry.liquidityConstant,
    dynamicFeeRate: entry.dynamicFeeRate,
    ...overrides,
  };
}

export interface PendlePtResolveOptions {
  hydrateFromOracle?: boolean;
  nowMs?: number;
}

export function hydratePendlePtRegistryEntry(
  entry: PendlePtRegistryEntry,
  nowMs = Date.now(),
): { entry: PendlePtRegistryEntry; oracleOk: boolean } {
  const oracle = pendleMarketOracle.resolve(entry.key, nowMs);
  if (!oracle.ok || !oracle.fields) return { entry, oracleOk: false };
  const f: PendleMarketOracleFields = oracle.fields;
  return {
    oracleOk: true,
    entry: {
      ...entry,
      expirySec: f.expirySec,
      impliedYield: f.impliedYield,
      historicalYield24h: f.historicalYield24h,
      ptPriceInAsset: f.ptPriceInAsset,
      liquidityConstant: f.liquidityConstant,
    },
  };
}

export function logPendlePtRegistryVerification(entry: PendlePtRegistryEntry): void {
  console.info(`[PENDLE_PT_REGISTRY] Verified Arbitrum One PT Market: ${entry.symbol}.`);
}

export function resolvePendlePtMarketState(
  keyOrAddress: PendlePtMarketKey | string,
  overrides: Partial<PTMarketState> = {},
  options: PendlePtResolveOptions = {},
): { entry: PendlePtRegistryEntry; market: PTMarketState; oracleOk: boolean } | null {
  const base = resolvePendlePtRegistryEntry(keyOrAddress);
  if (!base) return null;
  const nowMs = options.nowMs ?? Date.now();
  const hydrated = options.hydrateFromOracle
    ? hydratePendlePtRegistryEntry(base, nowMs)
    : { entry: base, oracleOk: false };
  logPendlePtRegistryVerification(hydrated.entry);
  return {
    entry: hydrated.entry,
    market: toPendlePtMarketState(hydrated.entry, overrides),
    oracleOk: hydrated.oracleOk,
  };
}
