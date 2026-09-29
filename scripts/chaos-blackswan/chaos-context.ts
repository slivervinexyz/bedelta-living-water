/** Chaos evaluation clock + fixture constants. */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { GmxV2PriceImpactSoilInput } from "../../src/services/yield/gmx-v2-price-impact";
import type { ChaosGroup } from "./chaos-types";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const EVAL_AT = new Date("2026-07-25T06:00:00.000Z");
export const EVAL_MS = EVAL_AT.getTime();
export const EVAL_SEC = Math.floor(EVAL_MS / 1000);

export const CHAOS_ATTACK_COUNT = 255;
export const ORACLE_LAG_SPIKE_MS = 31_000;
export const PRICE_IMPACT_TOXIC_BPS = 55;
export const SEQUENCER_DOWN_ANSWER = 0;
export const CHAOS_METRICS_PATH = join(ROOT, "docs/audit/chaos-blackswan-metrics.json");
export const BME_CHAOS_AUDIT_LINE =
  "[BeDelta-Living-Water- SLI\\verVine CHAOS AUDIT] 255 / 255 Simulated Toxic Attacks Blocked (100% Fail-Closed, 0 Capital Loss)";

export const HEALTHY_SOIL = {
  symbol: "ETH",
  hlSpot: 3500,
  hlPerp: 3500,
  dydxPerp: 3500,
  depthUsd: 200_000,
  at: EVAL_AT,
} as const;

export const ILLIQUID_ORDER_IMPACT: GmxV2PriceImpactSoilInput = {
  priceImpactPenaltyBps: PRICE_IMPACT_TOXIC_BPS,
  priceImpactSubsidiesBps: 0,
  reducesImbalance: false,
};

export const MALFORMED_PAYLOADS = [
  "{",
  "not-json",
  "\u0000{\"broken\"}",
  '{"hlSpot":NaN}',
  "null",
  '{"centroids_vector":null,"reynolds_number":"x"}',
  '{"__proto__":{"polluted":true}}',
  "[",
] as const;

export const GROUPS: ChaosGroup[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
