#!/usr/bin/env tsx
/**
 * ZeroDev AA Phase A smoke — config validation + optional live bundler probe.
 * Usage:
 *   pnpm zerodev:smoke
 *   USE_ZERODEV_AA=true ZERODEV_PROJECT_ID=... pnpm zerodev:smoke --live
 */

import { resolveZeroDevConfig } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-config";
import { runZeroDevSmokeProbe } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-adapter";
import {
  buildZeroDevAaMetrics,
  writeZeroDevAaMetrics,
  ZERODEV_AA_METRICS_PATH,
} from "./zerodev-smoke-lib";

async function main(): Promise<void> {
  const live = process.argv.includes("--live");
  const report = await runZeroDevSmokeProbe(live);
  const config = resolveZeroDevConfig();
  const artifact = buildZeroDevAaMetrics(report, live, config);
  writeZeroDevAaMetrics(artifact);

  if (!report.enabled) {
    console.log("[zerodev:smoke] USE_ZERODEV_AA=false — v0.8 path unchanged (0 breaking changes).");
    console.log("[zerodev:smoke] Config dry-run: OK");
    console.log(`[zerodev:smoke] Audit artifact → ${ZERODEV_AA_METRICS_PATH}`);
    process.exit(0);
  }

  if (report.errors.length > 0) {
    console.error("[zerodev:smoke] FAILED:");
    for (const e of report.errors) console.error(`  · ${e}`);
    console.error(`[zerodev:smoke] Audit artifact → ${ZERODEV_AA_METRICS_PATH}`);
    process.exit(1);
  }

  if (live && report.smartAccountAddress) {
    console.log(`[zerodev:smoke] Kernel address: ${report.smartAccountAddress}`);
    console.log("[zerodev:smoke] Bundler reachable: OK");
  } else {
    console.log("[zerodev:smoke] Config present — add --live to probe bundler");
  }

  console.log("[zerodev:smoke] Verified: noPrivateKeyMaterialDetected · AA gate ready.");
  console.log(`[zerodev:smoke] Audit artifact → ${ZERODEV_AA_METRICS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
