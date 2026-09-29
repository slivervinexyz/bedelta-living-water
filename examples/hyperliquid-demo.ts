#!/usr/bin/env tsx
/** Hyperliquid Demo — Usage: pnpm demo:hl · Trip: pnpm demo:hl -- --trip */
import { Wallet, verifyTypedData } from "ethers";
import {
  HL_APPROVE_AGENT_TYPES,
  HL_SESSION_KEY_AGENT_NAME,
  HL_USER_SIGNED_CHAIN_ID,
  buildUserSignedDomain,
  createSessionKeyAgent,
  verifySessionKeyValidity,
} from "../src/adapters/hl/auth";
import { evaluateHyperliquidSessionGuard } from "../src/adapters/hl/hyperliquid-session-guard";
import { evaluateWsSoilResistance } from "../src/adapters/hl/websocket";
import { HEALTHY_SOIL, printPillarSetYVenueBanner } from "./adapters/exomesh-ansi-hud";
import { captureSoilBenchmark } from "./lib/demo-benchmark";
import { ensureDemoWasmSoft, isDemoTripArgv, wrapDemoExecution } from "./lib/demo-harness";
import { withMatrixHudMute } from "./lib/matrix-demo-hud";
import {
  finalizeVenueHappy,
  finalizeVenueTrip,
  HL_TRIP_BREACHES,
  printVenuePreflightHeader,
  printVenueRow,
} from "./lib/venue-demo-hud";
import {
  TEST_AGENT_ADDRESS,
  TEST_PRIVATE_KEY,
} from "../tests/adapters/hl/auth-lib/auth-fixtures";

const SESSION_MS = 86_400_000;

async function runHealthy(nowMs: number): Promise<string> {
  const masterWallet = new Wallet(TEST_PRIVATE_KEY);
  const result = await createSessionKeyAgent(masterWallet, TEST_AGENT_ADDRESS, SESSION_MS, { nonce: nowMs });
  const domain = buildUserSignedDomain(HL_USER_SIGNED_CHAIN_ID);
  verifyTypedData(domain, HL_APPROVE_AGENT_TYPES, {
    hyperliquidChain: result.action.hyperliquidChain,
    agentAddress: result.action.agentAddress,
    agentName: result.action.agentName,
    nonce: result.action.nonce,
  }, result.signature);
  const valid = verifySessionKeyValidity(TEST_AGENT_ADDRESS, result.expiresAt);
  const guard = evaluateHyperliquidSessionGuard({
    orderSizeUsd: 2_000,
    spreadBps: 12,
    requestsInLastMinute: 5,
    sessionKeyValid: valid,
  });
  return `session valid=${valid} · agent=${HL_SESSION_KEY_AGENT_NAME} · ${guard.status}`;
}

function runTrip(nowMs: number): string {
  const guard = evaluateHyperliquidSessionGuard({
    orderSizeUsd: 6_000,
    spreadBps: 28,
    requestsInLastMinute: 5,
    sessionKeyValid: true,
  });
  evaluateWsSoilResistance(
    {
      connected: true,
      latencyMs: 80,
      lastMessageAt: nowMs,
      lastPingAt: nowMs - 1_000,
      stale: false,
      reconnectAttempts: 0,
      soilTripped: false,
      tripReasons: [],
    },
    { ...HEALTHY_SOIL, disableThresholdJitter: true },
  );
  return `spread=28bps · ${guard.status}`;
}

wrapDemoExecution(async ({ nowMs }) => {
  const trip = isDemoTripArgv();
  ensureDemoWasmSoft();
  const soil = { ...HEALTHY_SOIL, at: new Date(nowMs) };
  const benchmark = captureSoilBenchmark(soil, () => {
    evaluateHyperliquidSessionGuard({
      orderSizeUsd: 2_000,
      spreadBps: 12,
      requestsInLastMinute: 5,
      sessionKeyValid: true,
    });
  });
  printPillarSetYVenueBanner("Hyperliquid L1", benchmark);
  printVenuePreflightHeader(!trip);
  let detail = "";
  if (trip) {
    withMatrixHudMute(() => {
      detail = runTrip(nowMs);
    });
  } else {
    detail = await runHealthy(nowMs);
  }
  printVenueRow("Hyperliquid L1", !trip, detail);
  if (trip) {
    finalizeVenueTrip(HL_TRIP_BREACHES, benchmark);
    return { tripped: true, reason: "HL_FAIL_CLOSED" };
  }
  finalizeVenueHappy(benchmark);
});
