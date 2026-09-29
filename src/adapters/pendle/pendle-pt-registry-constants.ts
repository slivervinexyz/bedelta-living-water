/** Pendle PT registry constants — chain + static market keys. */
export const PENDLE_PT_REGISTRY_CHAIN = "arbitrum-one" as const;
export const PENDLE_PT_REGISTRY_CHAIN_ID = 42161 as const;

export const PENDLE_PT_MARKET_PT_EETH = "PT-eETH" as const;
export const PENDLE_PT_MARKET_PT_USDC = "PT-USDC" as const;
export const PENDLE_PT_MARKET_PT_SUSDAI_OCT26 = "PT-sUSDai-2026-10-15" as const;
export const PENDLE_PT_MARKET_PT_USDAI_OCT26 = "PT-USDai-2026-10-15" as const;

/** Reference expiry anchors — legacy guards; live API overrides discovery entries. */
export const REF_EXPIRY_SEC = 1_782_508_800; // 2026-06-26T00:00:00Z
export const SUSDAI_OCT26_EXPIRY_SEC = 1_790_496_000; // 2026-10-15T00:00:00Z
