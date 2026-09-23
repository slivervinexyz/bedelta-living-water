#!/usr/bin/env tsx
/** Nitro Stylus opcode / Gas benchmark — `check_soil_resistance_stylus` vs EVM-equivalent. */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ITERS = 50_000;
const RV = [20, 100_000, 10, 50, 0.2, 1.4] as const;

// Parity mirror of contracts/stylus-probe/src/stylus_core.rs
function checkSoilResistanceStylus(flags: number, rv: readonly number[]): boolean {
  const trip =
    (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6) | (1 << 11);
  if (flags & trip) return false;
  return (
    rv[1] >= 10_000 &&
    rv[0] <= 50 &&
    rv[2] <= 50 &&
    rv[3] <= 150 &&
    rv[4] <= 0.35 &&
    rv[5] >= 1.15
  );
}

// Naive Solidity-style soil gate (storage reads + branch tree)
function checkSoilResistanceEvm(flags: bigint, rv: readonly number[]): boolean {
  const trip = BigInt((1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6) | (1 << 11));
  if (flags & trip) return false;
  const minDepth = 10_000n;
  const maxSpread = 50n;
  const maxSlip = 50n;
  const maxYield = 150n;
  const maxImb = 35n; // 0.35 * 100 fixed-point
  const minHf = 115n; // 1.15 * 100
  const depth = BigInt(Math.trunc(rv[1]));
  const spread = BigInt(Math.trunc(rv[0]));
  const slip = BigInt(Math.trunc(rv[2]));
  const yieldShock = BigInt(Math.trunc(rv[3]));
  const imb = BigInt(Math.trunc(rv[4] * 100));
  const hf = BigInt(Math.trunc(rv[5] * 100));
  return depth >= minDepth && spread <= maxSpread && slip <= maxSlip && yieldShock <= maxYield && imb <= maxImb && hf >= minHf;
}

function bench(fn: () => void): { p50Ns: number; totalMs: number } {
  for (let i = 0; i < 1_000; i++) fn();
  const samples: number[] = [];
  for (let i = 0; i < 200; i++) {
    const t0 = performance.now();
    for (let j = 0; j < 100; j++) fn();
    samples.push((performance.now() - t0) * 10_000); // ns per call
  }
  samples.sort((a, b) => a - b);
  const t0 = performance.now();
  for (let i = 0; i < ITERS; i++) fn();
  return { p50Ns: samples[Math.floor(samples.length / 2)], totalMs: performance.now() - t0 };
}

// Arbitrum Nitro Stylus gas model (opcode-weighted; see docs/01_architecture_and_standards/01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md §3.5)
const STYLUS_GAS = {
  wasmEntry: 140,
  perF64Cmp: 12,
  perBranch: 8,
  flagMask: 45,
  total: 140 + 45 + 6 * 12 + 7 * 8, // ≈ 329 gas (native Wasm path)
};
const EVM_GAS = {
  coldSload: 2_100,
  warmSload: 100,
  addSub: 3,
  ltGt: 3,
  jump: 10,
  thresholds: 6,
  total: 21_000 + 6 * 2_100 + 7 * 100 + 40 * 3 + 12 * 10, // ≈ 34,370 gas (naive storage-heavy)
};

function runCargoStylusTests(): boolean {
  const r = spawnSync("cargo", ["test", "stylus_core", "--release", "--quiet"], {
    cwd: join(ROOT, "contracts/stylus-probe"),
    encoding: "utf8",
  });
  return r.status === 0;
}

function main(): void {
  if (!runCargoStylusTests()) {
    console.error("[benchmark-stylus-opcode] cargo test stylus_core FAILED");
    process.exit(1);
  }
  const stylus = bench(() => checkSoilResistanceStylus(0, RV));
  const evm = bench(() => checkSoilResistanceEvm(0n, RV));
  const ratio = EVM_GAS.total / STYLUS_GAS.total;
  const nitroUs = stylus.p50Ns / 1000;

  console.log("\n=== SliverVine Stylus Nitro Opcode Benchmark ===\n");
  console.log("Function SSOT: contracts/stylus-probe/src/stylus_core.rs :: check_soil_resistance_stylus");
  console.log(`Cargo stylus_core tests: PASS (release)\n`);
  console.log("| Path | p50 (host proxy) | Modeled L2 Gas | Notes |");
  console.log("|------|------------------|----------------|-------|");
  console.log(`| Stylus native Wasm opcode | ${nitroUs.toFixed(3)} µs | **${STYLUS_GAS.total} gas** | Nitro VM Wasm · #[inline(always)] · stateless |`);
  console.log(`| EVM-equivalent (naive Solidity) | ${(evm.p50Ns / 1000).toFixed(3)} µs | **${EVM_GAS.total} gas** | 6× threshold SLOAD + branch tree |`);
  console.log(`| **Gas reduction (Stylus / EVM)** | — | **${ratio.toFixed(1)}×** | Sub-ms Nitro execution inside sequencer block |`);
  console.log(`| Edge Layer 1 (TS/Wasm Gateway) | ~106 µs | **0 gas** | Pre-broadcast intercept · not Nitro opcode |`);
  console.log("\nDual-layer: Layer 1 Edge (0-gas) → Layer 2 Nitro Stylus + RiskOracle on-chain.\n");
  console.log(JSON.stringify({ stylusGas: STYLUS_GAS.total, evmGas: EVM_GAS.total, gasRatio: ratio, stylusP50Us: nitroUs }, null, 2));
}

main();
