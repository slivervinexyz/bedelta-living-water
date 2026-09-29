/**
 * Hyperliquid L1 order wire — price/size formatting helpers.
 */

/** Normalize float to Hyperliquid wire price/size string (max 8 decimals) */
export function floatToWire(value: number): string {
  const rounded = value.toFixed(8);
  if (Math.abs(Number(rounded) - value) >= 1e-12) {
    throw new Error(`floatToWire causes rounding: ${value}`);
  }
  const normalized = Number(rounded);
  return Object.is(normalized, -0) ? "0" : normalized.toString();
}

/** HL perp price — ≤5 sig figs and ≤ (6 − szDecimals) decimal places. */
export function formatHlPerpPrice(price: number, szDecimals: number): number {
  const maxDecimals = Math.max(0, 6 - szDecimals);
  if (price > 100_000) return Math.round(price);
  const sig = Number.parseFloat(Number(price).toPrecision(5));
  return Number(sig.toFixed(maxDecimals));
}

/** HL order size — truncate to szDecimals lot size. */
export function formatHlSize(size: number, szDecimals: number): number {
  const factor = 10 ** szDecimals;
  return Math.floor(size * factor) / factor;
}

/** Bump size (integer lot ticks) until notional meets target with post-round safety floor. */
export function ensureHlMinNotionalSize(
  size: number,
  limitPx: number,
  szDecimals: number,
  targetNotionalUsd = 12,
  safetyFloorUsd = 10.5,
): number {
  const safeLimitPx = Math.max(limitPx, 1);
  const factor = 10 ** szDecimals;
  const minSize = targetNotionalUsd / safeLimitPx;
  let ticks = Math.ceil(Math.max(size, minSize) * factor - 1e-9);
  if (ticks <= 0) ticks = 1;

  const maxTicks = ticks + 10_000;
  while (ticks < maxTicks) {
    const adjusted = ticks / factor;
    if (adjusted * safeLimitPx >= safetyFloorUsd) {
      return adjusted;
    }
    ticks += 1;
  }
  throw new Error(
    `Cannot reach HL min notional safety floor $${safetyFloorUsd} at limitPx=${limitPx}`,
  );
}
