#!/usr/bin/env tsx
/** TS deployment SSOT → SYSTEM_METRICS_SSOT.json mirror → all public markdown files. */
/// <reference types="node" />
import { existsSync, readdirSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";
import { collectPublicDocs } from "./fix-public-doc-links-lib";
import { syncDeploymentsToSystemMetricsSsot } from "./_shared/sync-deployments-ssot-lib";
import { loadSystemMetricsSsot, syncMetricsToPublicDoc } from "./_shared/sync-ssot-docs-lib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function walkMd(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkMd(p, out);
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function main(): void {
  const mirror = syncDeploymentsToSystemMetricsSsot(ROOT);
  const ssot = loadSystemMetricsSsot(ROOT);
  const files = collectPublicDocs(ROOT, walkMd);
  const synced: string[] = [];
  for (const fullPath of files) {
    const rel = relative(ROOT, fullPath);
    if (syncMetricsToPublicDoc(ROOT, rel, ssot)) synced.push(rel);
  }
  const live =
    mirror.chains.arbitrum_one.live.length + mirror.chains.arbitrum_sepolia.live.length;
  console.error(
    `[sync:docs] deployments=${live} live (TS→JSON) generatedAt=${ssot.generatedAt} vitest=${ssot.badges.vitest.total_tests_passed}/${ssot.badges.vitest.test_files_passed} bundle=${ssot.bundle_telemetry.gzipKiB}KiB sepsb_tpr=${ssot.sepsb_benchmark.truePositiveRatePct}% changed=${synced.length}/${files.length}`,
  );
}

main();
