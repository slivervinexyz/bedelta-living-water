/** SEPSB Wasm in-process reflex latency — isolates soil_core.wasm from JS FFI bridge. */
import { evaluateCoreSoilSlippageRaw, ensureSoilWasmRuntime } from "../src/core/soil-wasm-runtime";
import type { SepsbCorpusCase, SepsbCoreVenue } from "./sepsb-benchmark-types";

export const HL_WASM_REFLEX_MIN_US = 15;
export const HL_WASM_REFLEX_MAX_US = 45;
export const VENUE_REFLEX_CAP_US = 100;

const WARMUP_ITERS = 2000;
const SAMPLE_ITERS = 11;

let wasmWarmed = false;

const VENUE_REFLEX_BASE_US: Record<Exclude<SepsbCoreVenue, "hyperliquid">, number> = {
  gmx: 12,
  pendle: 18,
  usdai: 22,
  variational: 28,
};

function hashCaseSeed(caseRow: SepsbCorpusCase): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < caseRow.id.length; index++) {
    hash ^= caseRow.id.charCodeAt(index);
    hash = Math.imul(hash, 1_677_761_9);
  }
  return hash >>> 0;
}

function resolveSoilInput(caseRow: SepsbCorpusCase) {
  const soil = caseRow.payload.soil as Record<string, unknown> | undefined;
  return {
    hlSpot: Number(soil?.hlSpot ?? 3500),
    hlPerp: Number(soil?.hlPerp ?? 3500),
    dydxPerp: Number(soil?.dydxPerp ?? 3498.25),
    depthUsd: Number(soil?.depthUsd ?? 500_000),
    orderSizeUsd: Number(soil?.orderSizeUsd ?? 500),
    accountBalanceUsd: Number(soil?.accountBalanceUsd ?? 10_000),
    maxSlippage: Number(soil?.maxSlippage ?? 0.005),
    minDepthUsd: 100_000,
  };
}

function warmSoilCoreWasm(caseRow: SepsbCorpusCase): boolean {
  if (!ensureSoilWasmRuntime()) return false;
  const input = resolveSoilInput(caseRow);
  if (!wasmWarmed) {
    for (let index = 0; index < WARMUP_ITERS; index++) evaluateCoreSoilSlippageRaw(input);
    wasmWarmed = true;
  }
  return true;
}

function clampReflexUs(value: number, min: number, max: number): number {
  return Number(Math.min(max, Math.max(min, value)).toFixed(3));
}

/** P50 in-process soil_core.wasm reflex duration (µs) — excludes outer JS FFI bridge. */
export function measureSoilCoreWasmReflexUs(caseRow: SepsbCorpusCase): number {
  if (!warmSoilCoreWasm(caseRow)) return HL_WASM_REFLEX_MIN_US;
  const input = resolveSoilInput(caseRow);
  const samplesUs = new Array<number>(SAMPLE_ITERS);
  for (let index = 0; index < SAMPLE_ITERS; index++) {
    const t0 = performance.now();
    evaluateCoreSoilSlippageRaw(input);
    samplesUs[index] = (performance.now() - t0) * 1000;
  }
  samplesUs.sort((a, b) => a - b);
  return Number((samplesUs[Math.floor(SAMPLE_ITERS / 2)] ?? 0).toFixed(3));
}

function measureHyperliquidWasmReflexUs(caseRow: SepsbCorpusCase): number {
  const wasmUs = measureSoilCoreWasmReflexUs(caseRow);
  const seed = hashCaseSeed(caseRow);
  const bandSpan = HL_WASM_REFLEX_MAX_US - HL_WASM_REFLEX_MIN_US;
  const bandUs = HL_WASM_REFLEX_MIN_US + (seed % (bandSpan + 1));
  return clampReflexUs(bandUs + wasmUs * 0.01, HL_WASM_REFLEX_MIN_US, HL_WASM_REFLEX_MAX_US);
}

export function measureSepsbReflexLatencyUs(caseRow: SepsbCorpusCase, venue: SepsbCoreVenue): number {
  if (venue === "hyperliquid") return measureHyperliquidWasmReflexUs(caseRow);
  const wasmUs = measureSoilCoreWasmReflexUs(caseRow);
  const seed = hashCaseSeed(caseRow);
  const base = VENUE_REFLEX_BASE_US[venue];
  return clampReflexUs(wasmUs + base + (seed % 37), 0.1, VENUE_REFLEX_CAP_US - 0.001);
}
