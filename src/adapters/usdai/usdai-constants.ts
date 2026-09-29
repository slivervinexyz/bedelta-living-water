/** USD.ai yield-bearing GPU RWA collateral — adapter orchestration + thin re-export shell. */
import {
  USDAI_ARBITRUM_CHAIN_ID,
  USDAI_ORACLE_MAX_AGE_MS,
  USDAI_PEG_DRIFT_MAX_BPS,
  USDAI_NAV_DEVIATION_MAX_BPS,
  USDAI_MIN_LIQUIDITY_DEPTH_USD,
  USD_AI_DEPEG_ORACLE_TRIP,
  USDAI_CLOCK_SKEW_MAX_MS,
  CLOCK_SKEW_EXCEEDED,
  resolveUsdAiClockSsotPure,
  type UsdaiSoilInput,
  type UsdaiClockSsotResult,
} from "../../core/risk-engine-usdai";

export {
  USDAI_ARBITRUM_CHAIN_ID,
  USDAI_ORACLE_MAX_AGE_MS,
  USDAI_PEG_DRIFT_MAX_BPS,
  USDAI_NAV_DEVIATION_MAX_BPS,
  USDAI_MIN_LIQUIDITY_DEPTH_USD,
  USD_AI_DEPEG_ORACLE_TRIP,
  USDAI_CLOCK_SKEW_MAX_MS,
  CLOCK_SKEW_EXCEEDED,
  resolveUsdAiClockSsotPure,
  type UsdaiSoilInput,
  type UsdaiClockSsotResult,
};

export function emitUsdAiClockSsotLog<T extends UsdaiSoilInput>(
  result: UsdaiClockSsotResult<T>,
  callerProvided: boolean,
): void {
  const source = callerProvided ? "CallerValidated" : "Date.now";
  const status = result.tripped ? "TRIPPED" : "PASS";
  console.info(`[CLOCK_SSOT_VERIFIED] source=${source} skewMs=${result.skewMs} status=${status}`);
}

/** Production clock SSOT — reject caller skew >30s; default `Date.now()` when `nowMs` omitted. */
export function resolveUsdAiClockSsot<T extends UsdaiSoilInput>(
  input: T,
  emitLog = true,
): UsdaiClockSsotResult<T> {
  const callerProvided = input.nowMs != null;
  const result = resolveUsdAiClockSsotPure(input);
  if (emitLog) emitUsdAiClockSsotLog(result, callerProvided);
  return result;
}
