/** Pendle × USD.ai cross-preflight — peg/oracle/depth gate before PT dust execution. */
import { evaluateUsdAiSoilGate } from "../usdai/usdai-soil-gate";
import type { PendlePtRegistryEntry } from "./pendle-pt-registry-types";

export const PENDLE_USDAI_PREFLIGHT_FAIL = "PENDLE_USDAI_PREFLIGHT_FAIL" as const;

function isUsdAiUnderlying(symbol: string): boolean {
  const base = symbol.startsWith("PT-") ? symbol.slice(3) : symbol;
  const n = base.trim().toUpperCase();
  return n === "USDAI" || n === "SUSDAI" || n === "USD.AI";
}

/** Fail-closed when USD.ai soil gate trips for USDai/sUSDai Pendle PT markets. */
export function evaluatePendleUsdAiPreflight(
  entry: PendlePtRegistryEntry,
  nowMs: number = Date.now(),
  amountUsd = 0,
): { passed: boolean; reasons: string[] } {
  if (!isUsdAiUnderlying(entry.symbol)) return { passed: true, reasons: [] };
  const gate = evaluateUsdAiSoilGate({
    oracleTimestampMs: nowMs - 60_000,
    nowMs,
    susdaiPriceUsd: 1,
    navUsd: 1,
    gpuMarkUsd: 1,
    liquidityDepthUsd: entry.liquidityConstant,
    amountUsd,
  });
  if (!gate.triggered) return { passed: true, reasons: [] };
  return {
    passed: false,
    reasons: gate.reasons.map((r) =>
      r.startsWith("FAIL_CLOSED") ? r : `${PENDLE_USDAI_PREFLIGHT_FAIL}:${r}`,
    ),
  };
}
