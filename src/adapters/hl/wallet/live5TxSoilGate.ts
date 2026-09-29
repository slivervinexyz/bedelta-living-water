import { auditHyperliquidLiveSoil } from "../../../services/exchanges/hl-l2-book";
import { formatSoilTelemetryTerminalLine } from "../../../services/risk-control";
import { applyTestnetGrantSoilBoost } from "../../../data/verified-5tx";
import type { LiveBookSoilAudit } from "../../../services/check-soil-resistance";

/** Resolve live soil audit with testnet depth boost when only depth trips. */
export async function resolveLive5TxSoilAudit(
  symbol: string,
  notionalUsd: number,
  fetchFn: typeof fetch,
): Promise<LiveBookSoilAudit> {
  let soilAudit = await auditHyperliquidLiveSoil(symbol, { fetchFn, maxRetries: 2 }).catch(
    () => null,
  );
  if (soilAudit?.tripped && soilAudit.reasons.every((r) => r.startsWith("DEPTH_USD"))) {
    soilAudit = applyTestnetGrantSoilBoost(soilAudit, notionalUsd);
  }
  if (!soilAudit || soilAudit.tripped) {
    throw new Error(
      `checkSoilResistance() TRIPPED — ${soilAudit?.reasons.join("; ") ?? "L2 book unavailable"}`,
    );
  }
  return soilAudit;
}

export function formatSoilPassLog(symbol: string, depthUsd: number): string {
  return (
    formatSoilTelemetryTerminalLine(
      symbol,
      { tripped: false, reasons: [] },
      depthUsd,
    ) ?? `SOIL_RESISTANCE_PROBE: PASS | symbol: ${symbol} | depth: — | Tensile: 100%/20%`
  );
}
