#!/usr/bin/env tsx
/**
 * ZeroDev AA Phase B/C live smoke — Kernel v3.1 + EntryPoint v0.7 + Paymaster Sponsored.
 * Multi-chain: Arbitrum One (42161), Nova (42170), Sepolia (421614).
 * Usage:
 *   USE_ZERODEV_AA=true ZERODEV_PROJECT_ID=... pnpm test:zerodev
 *   USE_ZERODEV_AA=true ZERODEV_PROJECT_ID=... pnpm test:zerodev -- --live
 */

import { resolveZeroDevConfig } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-config";
import { runZeroDevSmokeProbe } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-adapter";
import {
  assertExoMeshRiskGate,
  canProceedAaProbeRoute,
  isZeroDevAAEnabled,
  resolveAaProbeRouteAsync,
} from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-gate";
import { __resetArbitrumGasGuardForTests } from "../src/services/risk/arbitrum-gas-guard";
import { __resetSequencerGuardCacheForTests, __setSequencerProbeForTests, SEQUENCER_GRACE_SEC } from "../src/services/risk/sequencer-guard";
import { __resetSoftConfirmationGuardForTests, __setSoftConfirmationProbeForTests } from "../src/services/risk/soft-confirmation-guard";
import {
  buildZeroDevAaMetrics,
  writeZeroDevAaMetrics,
  ZERODEV_AA_METRICS_PATH,
} from "./zerodev-smoke-lib";

const HEALTHY_SOIL = {
  symbol: "ETH" as const,
  hlSpot: 3500,
  hlPerp: 3500,
  dydxPerp: 3500,
  depthUsd: 200_000,
  at: new Date(),
};

function seedExomeshProbes(nowMs: number): void {
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

async function main(): Promise<void> {
  const live = process.argv.includes("--live");

  if (!isZeroDevAAEnabled()) {
    console.log("[zerodev:live] USE_ZERODEV_AA=false — v0.8 ExoMesh path unchanged.");
    process.exit(0);
  }

  seedExomeshProbes(Date.now());
  const probeRoute = await resolveAaProbeRouteAsync();

  assertExoMeshRiskGate(HEALTHY_SOIL);
  console.log("[zerodev:live] ExoMesh risk gate: PASS (checkSoilResistance)");

  if (probeRoute.exomeshGmxBlocked) {
    console.log(
      `[zerodev:live] ExoMesh GMX: FAIL-CLOSED (${probeRoute.failoverReason ?? "unhealthy"})`,
    );
  }

  if (canProceedAaProbeRoute(probeRoute)) {
    if (probeRoute.failoverActive) {
      console.log(
        `[zerodev:live] AA failover → chain ${probeRoute.primaryChainId} (${probeRoute.failoverReason})`,
      );
    }
  } else {
    console.error("[zerodev:live] AA probe blocked — no failover route available");
    process.exit(1);
  }

  const report = await runZeroDevSmokeProbe(live);
  const config = resolveZeroDevConfig();
  const artifact = buildZeroDevAaMetrics(report, live, config);
  writeZeroDevAaMetrics(artifact);

  if (report.errors.length > 0) {
    console.error("[zerodev:live] FAILED:");
    for (const e of report.errors) console.error(`  · ${e}`);
    process.exit(1);
  }

  console.log(`[zerodev:live] Kernel: ${report.smartAccountAddress}`);
  console.log(
    `[zerodev:live] Paymaster: SPONSORED (sponsored=${report.sponsored} paymasterAttached=${report.paymasterAttached})`,
  );
  if (report.failover?.active) {
    console.log(
      `[zerodev:live] Failover: chain=${report.failover.primaryChainId} gmxBlocked=${report.failover.exomeshGmxBlocked}`,
    );
  }
  if (report.userOpDraft) {
    console.log(
      `[zerodev:live] UserOp draft: sender=${report.userOpDraft.sender} sponsored=${report.userOpDraft.sponsored} paymaster=${report.userOpDraft.paymasterAttached}`,
    );
  }

  if (report.multichainProbes) {
    console.log("[zerodev:live] Multi-chain probes:");
    for (const probe of report.multichainProbes) {
      const sponsoredLabel = probe.sponsored && probe.paymasterAttached ? "SPONSORED" : "UNSUPPORTED";
      console.log(
        `[zerodev:live]   ${probe.label} (${probe.chainId}) bundler=${probe.bundlerStatus} paymaster=${sponsoredLabel}`,
      );
      for (const e of probe.errors) console.error(`    · ${e}`);
    }
  }

  console.log(`[zerodev:live] Bundler: ${report.bundlerStatus}`);
  console.log(`[zerodev:live] Audit → ${ZERODEV_AA_METRICS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
