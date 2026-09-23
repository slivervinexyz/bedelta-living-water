/**
 * SPDX-License-Identifier: BUSL-1.1
 * Copyright (c) 2026 SilverVine Labs. All Rights Reserved.
 *
 * Pendle PT expiry risk guard — fail-closed near maturity when yield jitter is elevated.
 * Prevents wrapping unsettled GMX async GM into PT without soil-aligned expiry checks.
 */

import {
  logPendlePtRegistryVerification,
  resolvePendlePtRegistryEntry,
} from "./pendle-pt-registry";

export const PENDLE_PT_MIN_DAYS_TO_MATURITY = 7 as const;
export const PENDLE_IMPLICIT_YIELD_JITTER_FAIL_BPS = 200 as const;
export const MS_PER_DAY = 86_400_000 as const;

export const PENDLE_PT_NEAR_EXPIRY = "PENDLE_PT_NEAR_EXPIRY" as const;
export const PENDLE_YIELD_JITTER_BREACH = "PENDLE_YIELD_JITTER_BREACH" as const;

export interface PendlePtExpiryRiskVerdict {
  failClosed: boolean;
  daysToMaturity: number;
  impliedYieldJitterBps: number;
  reasons: string[];
  registrySymbol?: string;
}

function toMillis(timestamp: number): number {
  return timestamp < 1e12 ? timestamp * 1000 : timestamp;
}

/** Fail-closed when PT matures in <7 days AND implied yield jitter exceeds 200 bps. */
export function evaluatePendlePtExpiryRisk(
  ptMaturityTimestamp: number,
  currentYieldBps: number,
  nowMs: number = Date.now(),
): PendlePtExpiryRiskVerdict {
  const maturityMs = toMillis(ptMaturityTimestamp);
  const daysToMaturity = (maturityMs - nowMs) / MS_PER_DAY;
  const impliedYieldJitterBps = Math.abs(currentYieldBps);
  const reasons: string[] = [];

  const nearExpiry = daysToMaturity < PENDLE_PT_MIN_DAYS_TO_MATURITY;
  const jitterBreached = impliedYieldJitterBps > PENDLE_IMPLICIT_YIELD_JITTER_FAIL_BPS;

  if (nearExpiry) reasons.push(PENDLE_PT_NEAR_EXPIRY);
  if (jitterBreached) reasons.push(PENDLE_YIELD_JITTER_BREACH);

  return {
    failClosed: nearExpiry && jitterBreached,
    daysToMaturity,
    impliedYieldJitterBps,
    reasons,
  };
}

/** Resolve PT maturity from Arbitrum One registry, then run expiry guard. */
export function evaluatePendlePtExpiryRiskFromRegistry(
  marketKeyOrAddress: string,
  currentYieldBps?: number,
  nowMs: number = Date.now(),
  maturityOverrideSec?: number,
): PendlePtExpiryRiskVerdict | null {
  const entry = resolvePendlePtRegistryEntry(marketKeyOrAddress);
  if (!entry) return null;
  logPendlePtRegistryVerification(entry);
  const yieldBps =
    currentYieldBps ??
    Math.round(
      Math.abs(entry.historicalYield24h - entry.impliedYield) * 10_000,
    );
  const maturity = maturityOverrideSec ?? entry.expirySec;
  const verdict = evaluatePendlePtExpiryRisk(maturity, yieldBps, nowMs);
  return { ...verdict, registrySymbol: entry.symbol };
}
