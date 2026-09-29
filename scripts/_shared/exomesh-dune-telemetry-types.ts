/** ExoMesh Dune telemetry — types and economic constants. */

export type DuneVenue = "gmx" | "pendle" | "usdai" | "hyperliquid" | "variational";

export type DuneInterceptType =
  | "SOIL_RESISTANCE_TRIP"
  | "HONEYPOT_DECOY"
  | "OBSERVATORY_HAIRCUT"
  | "MAX_ATTEMPTS_SEVERED";

export type DuneInterceptStatus = "FAIL_CLOSED" | "ALLOW";

export interface ExomeshDuneTelemetryRow {
  timestamp: string;
  timestampMs: number;
  venue: DuneVenue;
  intercept_type: DuneInterceptType;
  reflex_latency_us: number;
  gas_burned: number;
  simulated_loss_prevented_usd: number;
  gas_saved_usd: number;
  status: DuneInterceptStatus;
  source: string;
  reason?: string;
}

export const DUNE_TELEMETRY_CSV_COMMENT =
  "# silvervine.exomesh.dune-telemetry.v1 | simulated_loss_prevented_usd: counterfactual notional protected (USD)";

export const DUNE_TELEMETRY_CSV_HEADER =
  "timestamp,venue,intercept_type,reflex_latency_us,gas_burned,simulated_loss_prevented_usd,gas_saved_usd,status";

/** Arbitrum L2 counterfactual gas avoided per fail-closed severance (~$0.25). */
export const L2_GAS_SAVED_USD = 0.25;

export const POTENTIAL_LOSS_SAVED_RANGE_USD: Readonly<Record<DuneInterceptType, readonly [number, number]>> = {
  SOIL_RESISTANCE_TRIP: [5_000, 15_000],
  HONEYPOT_DECOY: [5_000, 10_000],
  OBSERVATORY_HAIRCUT: [20_000, 50_000],
  MAX_ATTEMPTS_SEVERED: [30_000, 50_000],
};

export const LATENCY_SEED_US: Readonly<Record<DuneInterceptType, number>> = {
  SOIL_RESISTANCE_TRIP: 1.4,
  HONEYPOT_DECOY: 12.8,
  OBSERVATORY_HAIRCUT: 38.6,
  MAX_ATTEMPTS_SEVERED: 7.2,
};
