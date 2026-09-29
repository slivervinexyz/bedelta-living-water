#!/usr/bin/env tsx
/**
 * Reference B2B Agent Interceptor Harness (framework-agnostic · ExoMesh pre-broadcast gate)
 *
 * Simulates AI Agent UserOp lifecycle intercepted by SliverVine ExoMesh on Cloudflare Edge.
 * Usage: pnpm tsx examples/agent-interceptor-demo.ts
 * Rogue: pnpm tsx examples/agent-interceptor-demo.ts --trip
 */
import { assertExoMeshRiskGate, type ExoMeshRiskGateInput } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-gate";
import { printBenchmarkBanner, printExecutionLatencyBlock, printGuardTimeBlock, formatExecutionLatency } from "./lib/demo-timing";
import { captureSoilBenchmark } from "./lib/demo-benchmark";
import { isDemoTripArgv, withDemoSoil, wrapDemoExecution } from "./lib/demo-harness";
import { checkSoilResistance } from "../src/services/risk-control";
import { __resetArbitrumGasGuardForTests } from "../src/services/risk/arbitrum-gas-guard";
import {
  __resetSequencerGuardCacheForTests,
  __setSequencerProbeForTests,
  SEQUENCER_GRACE_SEC,
} from "../src/services/risk/sequencer-guard";
import { __resetSoftConfirmationGuardForTests, __setSoftConfirmationProbeForTests } from "../src/services/risk/soft-confirmation-guard";

const HEALTHY: ExoMeshRiskGateInput = {
  symbol: "ETH",
  hlSpot: 3500,
  hlPerp: 3500,
  dydxPerp: 3500,
  depthUsd: 200_000,
  at: new Date(),
};

const TOXIC: ExoMeshRiskGateInput = {
  ...HEALTHY,
  depthUsd: 1,
  hlPerp: 4200,
  hlSpot: 3500,
};

const R = "\x1b[0m";
const RED = "\x1b[31;1m";
const GREEN = "\x1b[32;1m";
const YELLOW = "\x1b[33;1m";
const CYAN = "\x1b[36;1m";
const GRAY = "\x1b[90m";
const BOLD = "\x1b[1m";

const BANNER_INNER = "🛡️  SliverVine ExoMesh · Agent Pre-Broadcast Lifecycle";
const BOX_W = 63;

let hudEnabled = false;

export interface AgentUserOpDraft {
  agentId: string;
  framework: "B2B-Agent-A" | "B2B-Agent-B";
  intent: string;
  soil?: ExoMeshRiskGateInput;
}

function seedDemoProbes(nowMs: number): void {
  const nowSec = Math.floor(nowMs / 1000);
  __resetArbitrumGasGuardForTests();
  __resetSequencerGuardCacheForTests();
  __resetSoftConfirmationGuardForTests();
  __setSequencerProbeForTests({
    answer: 0,
    startedAtSec: nowSec - SEQUENCER_GRACE_SEC - 1,
    updatedAtSec: nowSec,
    fetchedAtMs: nowMs,
    safe: true,
    reason: null,
  });
  __setSoftConfirmationProbeForTests({
    l2LatestBlock: 1_000_020,
    l1FinalizedBatchBlock: 1_000_000,
    driftBlocks: 20,
    fetchedAtMs: nowMs,
    safe: true,
    reason: null,
  });
}

function padBanner(text: string): string {
  const inner = ` ${text} `;
  const pad = Math.max(0, BOX_W - inner.length);
  return `${"─".repeat(Math.floor(pad / 2))}${inner}${"─".repeat(Math.ceil(pad / 2))}`;
}

function printBanner(): void {
  console.log(`${CYAN}┌${"─".repeat(BOX_W)}┐${R}`);
  console.log(`${CYAN}│${R}${BOLD}${padBanner(BANNER_INNER)}${R}${CYAN}│${R}`);
  console.log(`${CYAN}└${"─".repeat(BOX_W)}┘${R}`);
  printBenchmarkBanner(captureSoilBenchmark(HEALTHY));
}

function printMode(trip: boolean): void {
  const label = trip ? "ROGUE_TOXIC_INTENT (--trip)" : "NORMAL_INTENT";
  const color = trip ? RED : GREEN;
  console.log(`${BOLD}MODE:${R} ${color}${label}${R}\n`);
}

function printResult(pass: boolean): void {
  const line = "═".repeat(BOX_W + 2);
  if (pass) {
    console.log(`\n${GREEN}${line}${R}`);
    console.log(`${GREEN}${BOLD}RESULT: ✅ LIFECYCLE COMPLETE: PASS (Pre-Broadcast Allowed)${R}`);
    console.log(`${GREEN}${line}${R}`);
  } else {
    console.log(`\n${RED}${line}${R}`);
    console.log(`${RED}${BOLD}RESULT: 🛑 LIFECYCLE COMPLETE: FAIL_CLOSED (0-Gas Intercepted)${R}`);
    console.log(`${RED}${line}${R}`);
  }
}

function formatTripAlert(reasons: string[]): string {
  const primary = reasons.find((r) => r.includes("CROSS_VENUE_SLIPPAGE")) ?? reasons[0] ?? "SOIL_RESISTANCE_TRIP";
  const match = primary.match(/CROSS_VENUE_SLIPPAGE=([0-9.]+)%>([0-9.]+)%/);
  if (match) {
    return `SOIL_RESISTANCE_TRIP: CROSS_VENUE_SLIPPAGE (${parseFloat(match[1]).toFixed(2)}% > ${match[2]}%)`;
  }
  return `SOIL_RESISTANCE_TRIP: ${primary.replace(/=/g, " ")}`;
}

function hudLine(tag: string, body: string, color: string): void {
  console.log(`${color}${BOLD}[${tag}]${R}    ${body}`);
}

function log(phase: string, payload: Record<string, unknown>): void {
  const line = JSON.stringify({ phase, ts: new Date().toISOString(), ...payload });
  if (hudEnabled) process.stderr.write(`${line}\n`);
  else console.log(line);
}

function hudIntent(agentId: string, framework: string, intent: string, venue: string): void {
  hudLine("INTENT", `agentId: ${CYAN}${agentId}${R} | framework: ${CYAN}${framework}${R}`, CYAN);
  hudLine("INTENT", `intent: ${intent} | venue: ${venue}`, GRAY);
}

function hudSoilFuse(pass: boolean, latencyUs: number, reasons: string[]): void {
  if (!pass) hudLine("ALERT", formatTripAlert(reasons), RED);
  const verdict = pass ? `${GREEN}PASS${R}` : `${RED}REJECT${R}`;
  hudLine("FUSE", `checkSoilResistance() -> ${verdict}`, pass ? GREEN : YELLOW);
  printExecutionLatencyBlock(latencyUs, "    ");
}

function hudSevered(trigger: string): void {
  hudLine("SEVERED", `EIP-712 Signature Channel: ${RED}CLOSED${R} (Fail-Closed · ${trigger})`, RED);
}

function hudBlocked(): void {
  hudLine(
    "BLOCKED",
    `UserOp Dispatch: ${RED}REJECTED${R} | Gas Cost: ${CYAN}0-Gas (Pre-Broadcast)${R}`,
    RED,
  );
}

function hudGate(sponsored: boolean, sequencerSafe: boolean, dailySpentUsd: number): void {
  hudLine(
    "GATE",
    `sequencerSafe: ${sequencerSafe ? GREEN : RED}${sequencerSafe}${R} | sponsored: ${sponsored} | dailySpentUsd: ${dailySpentUsd}`,
    CYAN,
  );
}

function hudChannelOpen(): void {
  hudLine("CHANNEL", `EIP-712 Signature Channel: ${GREEN}OPEN${R}`, GREEN);
}

function hudDispatched(target: string, latencyUs: number): void {
  hudLine("DISPATCH", `UserOp Dispatch: ${GREEN}ALLOWED${R} | target: ${target}`, GREEN);
  printGuardTimeBlock(latencyUs, "    ");
}

export async function agentExecutionHook(userOpDraft: AgentUserOpDraft) {
  const soil = userOpDraft.soil ?? HEALTHY;
  log("AGENT_INTENT_EMITTED", {
    agentId: userOpDraft.agentId,
    framework: userOpDraft.framework,
    intent: userOpDraft.intent,
    venue: "GMX v2 ETH/USDC GM",
  });
  if (hudEnabled) {
    hudIntent(userOpDraft.agentId, userOpDraft.framework, userOpDraft.intent, "GMX v2 ETH/USDC GM");
  }

  const t0 = performance.now();
  const soilResult = checkSoilResistance(soil);
  const measuredUs = (performance.now() - t0) * 1000;
  const soilPass = soilResult.ok;
  log("EXOMESH_SOIL_FUSE", {
    fn: "checkSoilResistance()",
    latencyUs: measuredUs,
    edgeP50Us: 106,
    pass: soilPass,
    reasons: soilResult.reasons,
  });
  if (hudEnabled) hudSoilFuse(soilPass, measuredUs, soilResult.reasons);

  if (!soilPass) {
    log("SIGNING_CHANNEL_SEVERED", { signingChannelOpen: false, trigger: "SOIL_FUSE_TRIP" });
    log("USEROP_BLOCKED", { status: "FAIL_CLOSED_PRE_BROADCAST", gasCost: "0-Gas (no Bundler dispatch)" });
    if (hudEnabled) {
      hudSevered("SOIL_FUSE_TRIP");
      hudBlocked();
    }
    throw new Error("[ExoMesh] Blocked Rogue Agent UserOp: RiskLimitExceeded");
  }

  if (!hudEnabled) {
    console.log(`[ExoMesh] Soil Check PASS | ${formatExecutionLatency(measuredUs)}`);
  }

  const gate = assertExoMeshRiskGate(soil);
  const signingChannelOpen = gate.chainHealth?.sequencerSafe !== false;
  log("EXOMESH_GATE_EVAL", {
    sponsored: gate.sponsored,
    sequencerSafe: signingChannelOpen,
    dailySpentUsd: gate.dailySpentUsd,
  });
  if (hudEnabled) hudGate(gate.sponsored, signingChannelOpen, gate.dailySpentUsd);

  if (!signingChannelOpen) {
    log("SIGNING_CHANNEL_SEVERED", { signingChannelOpen: false, trigger: "SEQUENCER_UNSAFE" });
    log("USEROP_BLOCKED", { status: "FAIL_CLOSED_PRE_BROADCAST", gasCost: "0-Gas (no Bundler dispatch)" });
    if (hudEnabled) {
      hudSevered("SEQUENCER_UNSAFE");
      hudBlocked();
    }
    throw new Error("[ExoMesh] Blocked Rogue Agent UserOp: RiskLimitExceeded");
  }

  log("SIGNING_CHANNEL_OPEN", { signingChannelOpen: true });
  log("USEROP_DISPATCHED", {
    status: "ALLOW_PRE_BROADCAST",
    target: "ZeroDev Bundler → EntryPoint v0.7",
    latencyUs: measuredUs,
  });
  if (hudEnabled) {
    hudChannelOpen();
    hudDispatched("ZeroDev Bundler → EntryPoint v0.7", measuredUs);
  }
  return { ...gate, signingChannelOpen, soilLatencyUs: measuredUs };
}

wrapDemoExecution(async ({ nowMs, at }) => {
  const trip = isDemoTripArgv();
  hudEnabled = true;
  seedDemoProbes(nowMs);
  printBanner();
  printMode(trip);

  const draft: AgentUserOpDraft = trip
    ? {
        agentId: "rogue-agent-0xdead",
        framework: "B2B-Agent-B",
        intent: "PROMPT_INJECTION_HIGH_SLIPPAGE_OPEN",
        soil: withDemoSoil(TOXIC, at),
      }
    : {
        agentId: "demo-agent-0xbeef",
        framework: "B2B-Agent-A",
        intent: "DELTA_NEUTRAL_GM_DEPOSIT",
        soil: withDemoSoil(HEALTHY, at),
      };

  try {
    await agentExecutionHook(draft);
    printResult(true);
  } catch (err) {
    printResult(false);
    if (err instanceof Error) console.error(`${RED}${err.message}${R}`);
    if (trip) return { tripped: true, reason: "SOIL_FUSE_TRIP" };
    throw err;
  }
});
