/** 96h telemetry — shared types and constants. */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const OUT_PATH = join(ROOT, "docs/audit/live-96h-telemetry.json");
export const FETCH_TIMEOUT_MS = 5_000;
export const DEFAULT_INTERVAL_SEC = 30;
export const DEFAULT_DURATION_HOURS = 96;
export const SCHEMA = "silvervine.live-96h-telemetry.v1" as const;

export type TelemetryStatus = "OK" | "Degraded" | "Trip";
export type TelemetryVenue =
  | "arbitrum-sepolia"
  | "hyperliquid-testnet"
  | "robinhood-worker";

export interface TelemetrySample {
  timestamp: string;
  venue: TelemetryVenue;
  rttMs: number | null;
  jitterMs: number | null;
  status: TelemetryStatus;
  detail?: string;
}

export interface Live96hTelemetryDoc {
  schema: typeof SCHEMA;
  startedAt: string;
  lastUpdatedAt: string;
  daemonEndsAt: string;
  intervalSec: number;
  durationHours: number;
  snapshot: Partial<Record<TelemetryVenue, TelemetrySample>>;
  recentSamples: TelemetrySample[];
  totals: { probes: number; ok: number; degraded: number; trip: number };
}
