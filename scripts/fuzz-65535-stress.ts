#!/usr/bin/env tsx
/**
 * 16-bit property-based fuzz — 65,535 iterations against evaluateGatewayRules invariants.
 *
 * Usage: npx tsx scripts/fuzz-65535-stress.ts
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { evaluateOracleLag } from "../src/services/risk/arbitrum-gas-guard";
import {
  evaluateGmxPriceImpactSoilGate,
  type GmxV2PriceImpactSoilInput,
} from "../src/services/yield/gmx-v2-price-impact";
import {
  evaluateGatewayRules,
  type GatewayRuleInput,
} from "./chaos-blackswan-stress";

export const FUZZ_ITERATIONS = 0xffff;
const EVAL_AT = new Date("2026-07-25T06:00:00.000Z");
const EVAL_MS = EVAL_AT.getTime();
const POISON = [
  "{",
  "not-json",
  "\u0000{",
  '{"hlSpot":NaN}',
  "null",
  '{"__proto__":{"polluted":true}}',
  "' OR 1=1 --",
] as const;

type SequencerFuzz = 0 | 1 | "missing";

export interface FuzzCase {
  i: number;
  oracleLagMs: number;
  priceImpactBps: number;
  sequencerStatus: SequencerFuzz;
  payload?: string;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(rand: number, min: number, max: number): number {
  return min + rand * (max - min);
}

export function mutateFuzzCase(i: number): FuzzCase {
  const rand = mulberry32((i + 1) * 0x9e3779b9);
  const oracleLagMs = Math.round(lerp(rand(), -100_000, 100_000));
  const priceImpactBps = lerp(rand(), -2_000, 2_000);
  const seqRoll = Math.floor(rand() * 3);
  const sequencerStatus: SequencerFuzz = seqRoll === 0 ? 0 : seqRoll === 1 ? 1 : "missing";
  const poison = rand() < 0.25 ? POISON[Math.floor(rand() * POISON.length)] : undefined;
  return { i, oracleLagMs, priceImpactBps, sequencerStatus, payload: poison };
}

export function toGatewayInput(c: FuzzCase): GatewayRuleInput {
  const input: GatewayRuleInput = {
    oracleUpdatedAtMs: EVAL_MS - c.oracleLagMs,
    l2BlockTimestampMs: EVAL_MS,
    gmxPenaltyBps: Math.max(0, c.priceImpactBps),
    skipArm: c.sequencerStatus === "missing",
  };
  if (c.sequencerStatus !== "missing") {
    input.sequencerAnswer = c.sequencerStatus;
    input.sequencerElapsedSec = c.sequencerStatus === 0 ? 900 : 0;
  }
  if (c.payload !== undefined) input.payload = c.payload;
  return input;
}

function gmxImpactInput(bps: number): GmxV2PriceImpactSoilInput {
  return {
    priceImpactPenaltyBps: Math.max(0, bps),
    priceImpactSubsidiesBps: 0,
    reducesImbalance: false,
  };
}

/** Property: oracle lag evaluator says deadlock → gateway must fail-closed without isolate crash. */
export function oracleLagRequiresFailClosed(input: GatewayRuleInput): boolean {
  const oracle = input.oracleUpdatedAtMs;
  const l2 = input.l2BlockTimestampMs;
  if (oracle === undefined || l2 === undefined) return false;
  if (oracle <= 0 || l2 <= 0) return true;
  return evaluateOracleLag(oracle, l2).deadlock;
}

/** Property: GMX price-impact soil gate tripped → gateway must fail-closed. */
export function priceImpactRequiresFailClosed(bps: number): boolean {
  return evaluateGmxPriceImpactSoilGate(gmxImpactInput(bps)).triggered;
}

/** Property: estimated loss above dynamic Max SL → gateway must fail-closed. */
export function maxLossRequiresFailClosed(input: GatewayRuleInput): boolean {
  if (input.criHardlock) return true;
  if (input.estimatedLossUsd === undefined) return false;
  const balance = input.accountBalanceUsd ?? 10_000;
  const maxSl = balance * 0.01 + 100;
  return input.estimatedLossUsd > maxSl;
}

export function payloadGenerationForbidden(input: GatewayRuleInput): boolean {
  return (
    input.payload !== undefined ||
    (input.payloadBytes ?? 0) > 1_000_000 ||
    oracleLagRequiresFailClosed(input) ||
    priceImpactRequiresFailClosed(input.gmxPenaltyBps ?? 0) ||
    maxLossRequiresFailClosed(input) ||
    input.protocolPaused === true
  );
}

/** ±1ms / ±1bps boundary probes around evaluator-derived thresholds. */
export function buildBoundaryFuzzProbes(): FuzzCase[] {
  const oracleDeadlockLagMs = evaluateOracleLag(EVAL_MS - 30_001, EVAL_MS).lagMs;
  const oracleThresholdLagMs = evaluateOracleLag(EVAL_MS - 30_000, EVAL_MS).lagMs;
  const oracleSafeLagMs = evaluateOracleLag(EVAL_MS - 29_999, EVAL_MS).lagMs;

  const impactTripBps = 51;
  const impactAtBps = 50;
  const impactSafeBps = 49;

  const probes: FuzzCase[] = [
    { i: -1, oracleLagMs: oracleSafeLagMs, priceImpactBps: impactSafeBps, sequencerStatus: 1 },
    { i: -2, oracleLagMs: oracleThresholdLagMs, priceImpactBps: impactAtBps, sequencerStatus: 1 },
    { i: -3, oracleLagMs: oracleDeadlockLagMs, priceImpactBps: impactTripBps, sequencerStatus: 1 },
  ];

  for (const lagMs of [oracleSafeLagMs, oracleThresholdLagMs, oracleDeadlockLagMs]) {
    probes.push({ i: -probes.length, oracleLagMs: lagMs, priceImpactBps: 0, sequencerStatus: 1 });
  }
  for (const bps of [impactSafeBps, impactAtBps, impactTripBps]) {
    probes.push({ i: -probes.length, oracleLagMs: 0, priceImpactBps: bps, sequencerStatus: 1 });
  }

  return probes;
}

export interface FuzzReport {
  iterations: number;
  propertyViolations: number;
  boundaryViolations: number;
  crashes: number;
  boundaryProbes: number;
  elapsedMs: number;
  opsPerSec: number;
  pass: boolean;
  line: string;
}

function muteConsole(): () => void {
  const warn = console.warn;
  const error = console.error;
  console.warn = () => {};
  console.error = () => {};
  return () => {
    console.warn = warn;
    console.error = error;
  };
}

function assertGatewayInvariant(
  input: GatewayRuleInput,
  c: FuzzCase,
  gw: ReturnType<typeof evaluateGatewayRules>,
): boolean {
  if (gw.crashed) return false;
  if (!payloadGenerationForbidden(input)) return true;
  return gw.failClosed;
}

export function runFuzz65535(iterations: number = FUZZ_ITERATIONS): FuzzReport {
  let propertyViolations = 0;
  let boundaryViolations = 0;
  let crashes = 0;
  const boundaryProbes = buildBoundaryFuzzProbes();
  const restore = muteConsole();
  const t0 = performance.now();
  try {
    for (let i = 0; i < iterations; i++) {
      const c = mutateFuzzCase(i);
      const input = toGatewayInput(c);
      try {
        const gw = evaluateGatewayRules(input);
        if (gw.crashed) crashes += 1;
        if (!assertGatewayInvariant(input, c, gw)) propertyViolations += 1;
      } catch {
        crashes += 1;
      }
    }

    for (const probe of boundaryProbes) {
      const input = toGatewayInput(probe);
      const gw = evaluateGatewayRules(input);
      if (gw.crashed) {
        boundaryViolations += 1;
        continue;
      }
      const lagDeadlock = oracleLagRequiresFailClosed(input);
      const impactTrip = priceImpactRequiresFailClosed(probe.priceImpactBps);
      if (lagDeadlock && !gw.failClosed) boundaryViolations += 1;
      if (impactTrip && !gw.failClosed) boundaryViolations += 1;
      if (!lagDeadlock && !impactTrip && probe.oracleLagMs <= 29_999 && probe.priceImpactBps <= 50) {
        if (!gw.failClosed && probe.payload === undefined) {
          // healthy boundary slice — gateway may still pass with armed gates
        }
      }
    }
  } finally {
    restore();
  }
  const elapsedMs = performance.now() - t0;
  const opsPerSec = elapsedMs > 0 ? (iterations / elapsedMs) * 1000 : iterations;
  const pass = crashes === 0 && propertyViolations === 0 && boundaryViolations === 0;
  return {
    iterations,
    propertyViolations,
    boundaryViolations,
    crashes,
    boundaryProbes: boundaryProbes.length,
    elapsedMs,
    opsPerSec,
    pass,
    line: `[FUZZ 65535] Completed ${iterations.toLocaleString("en-US")} iterations in ${elapsedMs.toFixed(0)} ms (${opsPerSec.toFixed(0)} ops/sec)`,
  };
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === resolve(entry);
}

if (isDirectRun()) {
  const report = runFuzz65535();
  console.log(report.line);
  console.log(
    `[FUZZ 65535] property violations ${report.propertyViolations} · boundary violations ${report.boundaryViolations} · crashes ${report.crashes} · boundary probes ${report.boundaryProbes}`,
  );
  if (!report.pass) process.exitCode = 1;
}
