/**
 * Pendle PT market oracle — synchronous in-memory cache for hot-path guards.
 * Async feeders call ingest(); checkSoilResistance() reads resolve() only.
 */
import type { PendlePtMarketKey } from "./pendle-pt-registry";

export const DEFAULT_PENDLE_ORACLE_TTL_MS = 60_000 as const;
export const PENDLE_ORACLE_STALE = "PENDLE_ORACLE_STALE" as const;

export interface PendleMarketOracleFields {
  impliedYield: number;
  historicalYield24h: number;
  ptPriceInAsset: number;
  liquidityConstant: number;
  expirySec: number;
}

export interface PendleMarketOracleSnapshot extends PendleMarketOracleFields {
  marketKey: PendlePtMarketKey;
  updatedAtMs: number;
}

export interface PendleOracleAdapterConfig {
  ttlMs?: number;
}

export interface PendleOracleResolveResult {
  ok: boolean;
  stale: boolean;
  invalid: boolean;
  fields: PendleMarketOracleFields | null;
  ageMs: number | null;
  reason: string | null;
}

function isValidOracleFields(fields: PendleMarketOracleFields): boolean {
  return (
    fields.ptPriceInAsset > 0 &&
    fields.liquidityConstant > 0 &&
    fields.expirySec > 0 &&
    Number.isFinite(fields.impliedYield) &&
    Number.isFinite(fields.historicalYield24h)
  );
}

export class PendleMarketOracleAdapter {
  private readonly cache = new Map<PendlePtMarketKey, PendleMarketOracleSnapshot>();
  private ttlMs: number;

  constructor(config: PendleOracleAdapterConfig = {}) {
    this.ttlMs = config.ttlMs ?? DEFAULT_PENDLE_ORACLE_TTL_MS;
  }

  setTtlMs(ttlMs: number): void {
    this.ttlMs = ttlMs;
  }

  ingest(snapshot: PendleMarketOracleSnapshot): boolean {
    if (!isValidOracleFields(snapshot)) return false;
    this.cache.set(snapshot.marketKey, snapshot);
    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  resolve(marketKey: PendlePtMarketKey, nowMs = Date.now()): PendleOracleResolveResult {
    const cached = this.cache.get(marketKey);
    if (!cached) {
      return {
        ok: false,
        stale: true,
        invalid: false,
        fields: null,
        ageMs: null,
        reason: `${PENDLE_ORACLE_STALE}:${marketKey}:MISSING_FEED`,
      };
    }

    const ageMs = Math.max(0, nowMs - cached.updatedAtMs);
    if (ageMs > this.ttlMs) {
      return {
        ok: false,
        stale: true,
        invalid: false,
        fields: null,
        ageMs,
        reason: `${PENDLE_ORACLE_STALE}:${marketKey}:age=${ageMs}ms>ttl=${this.ttlMs}ms`,
      };
    }

    if (!isValidOracleFields(cached)) {
      return {
        ok: false,
        stale: false,
        invalid: true,
        fields: null,
        ageMs,
        reason: `${PENDLE_ORACLE_STALE}:${marketKey}:INVALID_FIELDS`,
      };
    }

    return {
      ok: true,
      stale: false,
      invalid: false,
      fields: {
        impliedYield: cached.impliedYield,
        historicalYield24h: cached.historicalYield24h,
        ptPriceInAsset: cached.ptPriceInAsset,
        liquidityConstant: cached.liquidityConstant,
        expirySec: cached.expirySec,
      },
      ageMs,
      reason: null,
    };
  }
}

export const pendleMarketOracle = new PendleMarketOracleAdapter();

export function __resetPendleMarketOracleForTests(): void {
  pendleMarketOracle.clear();
  pendleMarketOracle.setTtlMs(DEFAULT_PENDLE_ORACLE_TTL_MS);
}

export function evaluatePendleOracleSoilGate(
  oracle: PendleOracleResolveResult,
): { triggered: boolean; reasons: string[] } {
  if (oracle.ok) return { triggered: false, reasons: [] };
  return {
    triggered: true,
    reasons: [oracle.reason ?? PENDLE_ORACLE_STALE],
  };
}
