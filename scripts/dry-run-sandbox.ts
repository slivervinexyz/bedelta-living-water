#!/usr/bin/env tsx
/**
 * Dry-run sandbox — Hyperliquid testnet panic stress → counter-attack → session-key EIP-712.
 * In-memory only (no network); hot path target < 5ms end-to-end.
 */

import { performance } from "node:perf_hooks";
import { buildSystemState, __setSystemStateForTests } from "../src/core/state";
import {
  ACCOUNT_BALANCE_USD,
  PIPELINE_BUDGET_MS,
  STRESS_PAIRS,
} from "./dry-run-sandbox.types";
import {
  attachEip712Json,
  executeHotPath,
  logPhase,
  printSimulation,
  warmupCrypto,
} from "./dry-run-sandbox.utils";

async function main(): Promise<void> {
  console.log(
    "=== BeDelta Living Water Dry-Run Sandbox · Hyperliquid Testnet Stress ===\n",
  );

  __setSystemStateForTests({
    ...buildSystemState({
      accountBalanceUsd: ACCOUNT_BALANCE_USD,
      currentCri: 100,
      skipHardlockAssert: true,
    }),
    isHedgeActive: false,
  });

  await warmupCrypto();

  const systemState = buildSystemState({
    accountBalanceUsd: ACCOUNT_BALANCE_USD,
    currentCri: 100,
    skipHardlockAssert: true,
  });

  for (const pair of STRESS_PAIRS) {
    await executeHotPath(pair, systemState);
  }

  const pipelineStart = performance.now();
  const simulations = [];
  for (const pair of STRESS_PAIRS) {
    simulations.push(attachEip712Json(await executeHotPath(pair, systemState)));
  }
  const totalMs = performance.now() - pipelineStart;

  for (const sim of simulations) {
    console.log(`--- ${sim.pair.symbol}/USDC testnet pair ---`);
    printSimulation(sim);
    console.log("");
  }

  const budgetOk = totalMs < PIPELINE_BUDGET_MS;
  logPhase(
    "PIPELINE TIMING",
    `total=${totalMs.toFixed(3)}ms pairs=[${simulations.map((s) => s.elapsedMs.toFixed(3)).join(", ")}]ms ` +
      `budget=${PIPELINE_BUDGET_MS}ms ${budgetOk ? "PASS ✓" : "SLOW ✗"}`,
  );

  if (!budgetOk) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[dry-run-sandbox] fatal", err);
  process.exitCode = 1;
});
