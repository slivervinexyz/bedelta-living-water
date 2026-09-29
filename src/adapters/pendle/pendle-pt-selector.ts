/** Pendle PT auto-selector — filter live registry markets, rank lowest risk + highest yield. */
import type { AIPoolSelectionParams, PendlePoolFactorySoilInput } from "../../core/pendle-types";
import { evaluatePendleFlags, FLAGS_YIELD_SHOCK } from "../../core/risk-engine-core";
import {
  evaluatePendlePtExpiryRisk,
  MS_PER_DAY,
  PENDLE_PT_MIN_DAYS_TO_MATURITY,
} from "./pendle-pt-expiry-guard";
import { pendleMarketOracle } from "./pendle-market-oracle-adapter";
import {
  PENDLE_POOL_MIN_INITIAL_LIQUIDITY_USD,
  PENDLE_POOL_UNDERLYING_WHITELIST,
} from "./pendle-pool-factory-adapter";
import { scorePendlePtMarketRisk } from "./pendle-pt-risk-score";
import {
  hydratePendlePtRegistryEntry,
  listPendlePtRegistryEntries,
  type PendlePtMarketKey,
  type PendlePtRegistryEntry,
  toPendlePtMarketState,
} from "./pendle-pt-registry";
import { evaluatePendleUsdAiPreflight } from "./pendle-usdai-preflight";

export { scorePendlePtMarketRisk } from "./pendle-pt-risk-score";

export const PENDLE_PT_EXPIRED = "PENDLE_PT_EXPIRED" as const;
export const PENDLE_PT_ORACLE_STALE = "PENDLE_PT_ORACLE_STALE" as const;
export const PENDLE_PT_YIELD_SHOCK = "PENDLE_PT_YIELD_SHOCK" as const;
export const PENDLE_PT_MATURITY_CLIFF = "PENDLE_PT_MATURITY_CLIFF" as const;
export const PENDLE_PT_ASSET_NOT_WHITELISTED = "PENDLE_PT_ASSET_NOT_WHITELISTED" as const;

export interface PendlePtSelectOptions {
  nowMs?: number;
  hydrateFromOracle?: boolean;
  requireOracle?: boolean;
  minDaysToMaturity?: number;
  minLiquidityConstant?: number;
  /** Prefer symbol match (e.g. sUSDai) when multiple candidates survive filters. */
  preferredSymbols?: string[];
  /** Restrict to protocol label from discovery (e.g. USD.AI). */
  protocolFilter?: string[];
  dustAmountUsd?: number;
}

export interface PendlePtCandidate {
  key: PendlePtMarketKey;
  entry: PendlePtRegistryEntry;
  oracleOk: boolean;
  daysToMaturity: number;
  riskScore: number;
  impliedYield: number;
}

export interface PendlePtRejected {
  key: PendlePtMarketKey;
  symbol: string;
  reasons: string[];
}

export interface PendlePtSelectResult {
  selected: PendlePtCandidate | null;
  candidates: PendlePtCandidate[];
  rejected: PendlePtRejected[];
}

function underlyingFromSymbol(symbol: string): string {
  return symbol.startsWith("PT-") ? symbol.slice(3) : symbol;
}

function isWhitelisted(asset: string): boolean {
  const n = asset.trim().toUpperCase();
  return PENDLE_POOL_UNDERLYING_WHITELIST.some((e) => e.trim().toUpperCase() === n);
}

function pushReject(
  bucket: PendlePtRejected[],
  key: PendlePtMarketKey,
  symbol: string,
  reason: string,
): void {
  const row = bucket.find((r) => r.key === key);
  if (row) row.reasons.push(reason);
  else bucket.push({ key, symbol, reasons: [reason] });
}

function applyPreferenceFilters(
  candidates: PendlePtCandidate[],
  options: PendlePtSelectOptions,
): PendlePtCandidate[] {
  let out = candidates;
  if (options.protocolFilter?.length) {
    const allowed = new Set(options.protocolFilter.map((p) => p.toUpperCase()));
    const filtered = out.filter((c) => allowed.has((c.entry.protocol ?? "").toUpperCase()));
    if (filtered.length > 0) out = filtered;
  }
  if (options.preferredSymbols?.length) {
    const prefs = new Set(options.preferredSymbols.map((s) => s.toUpperCase()));
    const filtered = out.filter((c) => prefs.has(underlyingFromSymbol(c.entry.symbol).toUpperCase()));
    if (filtered.length > 0) out = filtered;
  }
  return out;
}

/** Filter registry PT markets; rank by lowest riskScore then highest impliedYield. */
export function pickBestPendlePtMarket(
  options: PendlePtSelectOptions = {},
): PendlePtSelectResult {
  const nowMs = options.nowMs ?? Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const minDays = options.minDaysToMaturity ?? PENDLE_PT_MIN_DAYS_TO_MATURITY;
  const minLiq = options.minLiquidityConstant ?? PENDLE_POOL_MIN_INITIAL_LIQUIDITY_USD;
  const rejected: PendlePtRejected[] = [];
  const candidates: PendlePtCandidate[] = [];

  for (const base of listPendlePtRegistryEntries()) {
    const key = base.key;
    const hydrated = options.hydrateFromOracle
      ? hydratePendlePtRegistryEntry(base, nowMs)
      : { entry: base, oracleOk: false };
    const entry = hydrated.entry;
    const underlying = underlyingFromSymbol(entry.symbol);

    if (entry.expirySec <= nowSec) {
      pushReject(rejected, key, entry.symbol, PENDLE_PT_EXPIRED);
      continue;
    }
    const daysToMaturity = (entry.expirySec * 1000 - nowMs) / MS_PER_DAY;
    if (daysToMaturity < minDays) {
      pushReject(rejected, key, entry.symbol, PENDLE_PT_MATURITY_CLIFF);
      continue;
    }
    if (!isWhitelisted(underlying)) {
      pushReject(rejected, key, entry.symbol, PENDLE_PT_ASSET_NOT_WHITELISTED);
      continue;
    }
    if (entry.liquidityConstant < minLiq) continue;
    if (options.requireOracle && !pendleMarketOracle.resolve(key, nowMs).ok) {
      pushReject(rejected, key, entry.symbol, PENDLE_PT_ORACLE_STALE);
      continue;
    }
    const usdai = evaluatePendleUsdAiPreflight(entry, nowMs, options.dustAmountUsd ?? 0);
    if (!usdai.passed) {
      pushReject(rejected, key, entry.symbol, usdai.reasons.join("|"));
      continue;
    }
    const jitterBps = Math.round(
      Math.abs(entry.historicalYield24h - entry.impliedYield) * 10_000,
    );
    const expiry = evaluatePendlePtExpiryRisk(entry.expirySec, jitterBps, nowMs);
    if (expiry.failClosed) {
      pushReject(rejected, key, entry.symbol, expiry.reasons.join("|"));
      continue;
    }
    if (evaluatePendleFlags(entry.impliedYield, entry.historicalYield24h) & FLAGS_YIELD_SHOCK) {
      pushReject(rejected, key, entry.symbol, PENDLE_PT_YIELD_SHOCK);
      continue;
    }

    candidates.push({
      key,
      entry,
      oracleOk: hydrated.oracleOk,
      daysToMaturity,
      riskScore: scorePendlePtMarketRisk(toPendlePtMarketState(entry), nowMs),
      impliedYield: entry.impliedYield,
    });
  }

  const ranked = applyPreferenceFilters(candidates, options).sort((a, b) =>
    a.riskScore !== b.riskScore ? a.riskScore - b.riskScore : b.impliedYield - a.impliedYield,
  );
  return { selected: ranked[0] ?? null, candidates: ranked, rejected };
}

export function buildAutoPendlePoolFactorySoilInput(
  options: PendlePtSelectOptions & { oracleYieldOverride?: number; useOracle?: boolean } = {},
): { soilInput: PendlePoolFactorySoilInput; pick: PendlePtSelectResult } | null {
  const pick = pickBestPendlePtMarket(options);
  if (!pick.selected) return null;
  const nowMs = options.nowMs ?? Date.now();
  const c = pick.selected;
  const selection: AIPoolSelectionParams = {
    intent: "PENDLE_CREATE_POOL",
    underlyingAsset: underlyingFromSymbol(c.entry.symbol),
    maturityTimestampSec: c.entry.expirySec,
    impliedYield: c.entry.impliedYield,
    oracleYield: options.oracleYieldOverride ?? c.entry.historicalYield24h,
    initialLiquidityUsd: PENDLE_POOL_MIN_INITIAL_LIQUIDITY_USD + c.entry.liquidityConstant,
    nowMs,
  };
  return {
    pick,
    soilInput: {
      selection,
      marketKeyOrAddress: c.key,
      useOracle: options.useOracle ?? options.hydrateFromOracle ?? false,
      nowMs,
    },
  };
}
