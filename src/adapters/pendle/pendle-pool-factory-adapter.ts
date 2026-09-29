/**
 * Pendle AI Guarded Pool Factory — sync pre-flight validation for agent pool selection.
 * Gates PENDLE_CREATE_POOL / PENDLE_ADD_LIQUIDITY intents before mempool broadcast.
 */
import type {
  AIPoolSelectionParams,
  AIPoolSelectionVerdict,
  PendlePoolFactorySoilInput,
} from "../../core/pendle-types";
import { FLAGS_YIELD_SHOCK, PENDLE_YIELD_SHOCK_MAX_BPS, evaluatePendleFlags } from "../../core/risk-engine-core";
import { PENDLE_PT_MIN_DAYS_TO_MATURITY, MS_PER_DAY } from "./pendle-pt-expiry-guard";
import {
  evaluatePendleOracleSoilGate,
  pendleMarketOracle,
} from "./pendle-market-oracle-adapter";
import { resolvePendlePtRegistryEntry } from "./pendle-pt-registry";

export const PENDLE_IMPLIED_YIELD_SHOCK_MAX_BPS = PENDLE_YIELD_SHOCK_MAX_BPS;
export const PENDLE_POOL_YIELD_DRIFT_MAX_BPS = PENDLE_IMPLIED_YIELD_SHOCK_MAX_BPS;
export const PENDLE_POOL_MIN_INITIAL_LIQUIDITY_USD = 100_000 as const;

export const PENDLE_POOL_MATURITY_CLIFF = "PENDLE_POOL_MATURITY_CLIFF" as const;
export const PENDLE_POOL_YIELD_DRIFT_BREACH = "PENDLE_POOL_YIELD_DRIFT_BREACH" as const;
export const PENDLE_POOL_LOW_INITIAL_LIQUIDITY = "PENDLE_POOL_LOW_INITIAL_LIQUIDITY" as const;
export const PENDLE_POOL_ASSET_NOT_WHITELISTED = "PENDLE_POOL_ASSET_NOT_WHITELISTED" as const;

export const PENDLE_POOL_UNDERLYING_WHITELIST = [
  "eETH",
  "ETH",
  "USDC",
  "USDai",
  "sUSDai",
  "USD.AI",
] as const;

const POOL_FACTORY_INTENTS = new Set<AIPoolSelectionParams["intent"]>([
  "PENDLE_CREATE_POOL",
  "PENDLE_ADD_LIQUIDITY",
]);

function toMillis(timestamp: number): number {
  return timestamp < 1e12 ? timestamp * 1000 : timestamp;
}

function normalizeUnderlying(asset: string): string {
  return asset.trim().toUpperCase();
}

function isWhitelistedUnderlying(asset: string): boolean {
  const normalized = normalizeUnderlying(asset);
  return PENDLE_POOL_UNDERLYING_WHITELIST.some(
    (entry) => normalizeUnderlying(entry) === normalized,
  );
}

/** Validate AI-selected Pendle pool parameters against ExoMesh safety invariants. */
export function validateAIPoolSelection(
  params: AIPoolSelectionParams,
): AIPoolSelectionVerdict {
  const nowMs = params.nowMs ?? Date.now();
  const maturityMs = toMillis(params.maturityTimestampSec);
  const daysToMaturity = (maturityMs - nowMs) / MS_PER_DAY;
  const yieldDriftBps = Math.abs(params.impliedYield - params.oracleYield) * 10_000;
  const reasons: string[] = [];

  if (!POOL_FACTORY_INTENTS.has(params.intent)) {
    reasons.push(`FAIL_CLOSED: Unsupported pool-factory intent ${params.intent}`);
  }
  if (!isWhitelistedUnderlying(params.underlyingAsset)) {
    reasons.push(PENDLE_POOL_ASSET_NOT_WHITELISTED);
  }
  if (daysToMaturity < PENDLE_PT_MIN_DAYS_TO_MATURITY) {
    reasons.push(PENDLE_POOL_MATURITY_CLIFF);
  }
  if (evaluatePendleFlags(params.impliedYield, params.oracleYield) & FLAGS_YIELD_SHOCK) {
    reasons.push(PENDLE_POOL_YIELD_DRIFT_BREACH);
  }
  if (params.initialLiquidityUsd < PENDLE_POOL_MIN_INITIAL_LIQUIDITY_USD) {
    reasons.push(PENDLE_POOL_LOW_INITIAL_LIQUIDITY);
  }

  return {
    passed: reasons.length === 0,
    daysToMaturity,
    yieldDriftBps,
    reasons,
  };
}

/** Soil gate — optional pre-flight for PENDLE_CREATE_POOL / PENDLE_ADD_LIQUIDITY intents. */
export function evaluatePendlePoolFactorySoilGate(
  input: PendlePoolFactorySoilInput,
): { triggered: boolean; reasons: string[] } {
  const nowMs = input.nowMs ?? Date.now();
  const selection = { ...input.selection, nowMs };

  if (input.useOracle && input.marketKeyOrAddress) {
    const entry = resolvePendlePtRegistryEntry(input.marketKeyOrAddress);
    if (!entry) {
      return {
        triggered: true,
        reasons: [`FAIL_CLOSED: Unknown Pendle PT market ${input.marketKeyOrAddress}`],
      };
    }
    const oracleGate = evaluatePendleOracleSoilGate(
      pendleMarketOracle.resolve(entry.key, nowMs),
    );
    if (oracleGate.triggered) return oracleGate;
  }

  const verdict = validateAIPoolSelection(selection);
  if (verdict.passed) return { triggered: false, reasons: [] };
  return {
    triggered: true,
    reasons: verdict.reasons.map((r) =>
      r.startsWith("FAIL_CLOSED") ? r : `FAIL_CLOSED: ${r}`,
    ),
  };
}
