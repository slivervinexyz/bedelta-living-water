/** Re-export GMX micro-fill router encoder from adapter SSOT. */
export {
  GMX_ORDER_VAULT_ARBITRUM,
  GMX_ORACLE_TICKERS_URL,
  MICRO_FILL_SLIPPAGE_BPS,
  applyMicroFillOrderPricing,
  bindGmxOrderReceiver,
  computeMicroFillAcceptablePrice,
  computeGmxAcceptablePriceFromOracleRaw,
  encodeGmxV2RouterCreateOrderMulticall,
  fetchGmxIndexOracleTicker,
  oracleHumanUsdFromTicker,
  type GmxOracleTicker,
} from "../src/services/adapters/gmx-micro-fill-router-encode";
