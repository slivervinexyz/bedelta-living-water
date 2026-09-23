/** RTT / jitter classification helpers. */
import type { TelemetryStatus, TelemetryVenue } from "./types";

const lastRttByVenue = new Map<TelemetryVenue, number>();

export function classifyTelemetryStatus(
  rttMs: number | null,
  jitterMs: number | null,
  tripThresholdMs: number,
): TelemetryStatus {
  if (rttMs === null || !Number.isFinite(rttMs)) return "Trip";
  if (rttMs > tripThresholdMs) return "Trip";
  const degradedFloor = Math.round(tripThresholdMs * 0.7);
  if (rttMs > degradedFloor) return "Degraded";
  if (jitterMs !== null && jitterMs > Math.round(tripThresholdMs * 0.5)) return "Degraded";
  return "OK";
}

export function computeJitterMs(venue: TelemetryVenue, rttMs: number | null): number | null {
  if (rttMs === null || !Number.isFinite(rttMs)) return null;
  const prev = lastRttByVenue.get(venue);
  lastRttByVenue.set(venue, rttMs);
  return prev === undefined ? 0 : Math.abs(rttMs - prev);
}
