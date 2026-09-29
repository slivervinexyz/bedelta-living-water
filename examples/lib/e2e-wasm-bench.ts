/** Wasm soil latency bench helpers for E2E Step 1. */
import { evaluateSoilCore } from "../../src/sdk";

const WASM_SOIL_P50_HEALTHY_MIN_US = 95;
const WASM_SOIL_P50_HEALTHY_MAX_US = 120;
const WASM_SOIL_SAMPLE_ITERATIONS = 100;
const WASM_SOIL_WARMUP_ITERATIONS = 5;

function percentile(sorted: number[], p: number): number {
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index]!;
}

export function sampleWasmSoilLatencyUs(
  input: Parameters<typeof evaluateSoilCore>[0],
): { p50Us: number; minUs: number } {
  for (let i = 0; i < WASM_SOIL_WARMUP_ITERATIONS; i++) evaluateSoilCore(input);
  const samples: number[] = [];
  for (let i = 0; i < WASM_SOIL_SAMPLE_ITERATIONS; i++) {
    samples.push(evaluateSoilCore(input).elapsedUs);
  }
  samples.sort((a, b) => a - b);
  return { p50Us: percentile(samples, 50), minUs: samples[0]! };
}

export function formatWasmP50BandStatus(p50Us: number): string {
  if (p50Us >= WASM_SOIL_P50_HEALTHY_MIN_US && p50Us <= WASM_SOIL_P50_HEALTHY_MAX_US) {
    return "IN_BAND";
  }
  if (p50Us < WASM_SOIL_P50_HEALTHY_MIN_US) return "FAST_LOCAL";
  return "OUT_OF_BAND";
}
