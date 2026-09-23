#!/usr/bin/env tsx
/**
 * Negative-path fail-closed proof runner — auditor CLI artifact generator.
 *
 * Usage:
 *   pnpm verify:negative
 */

import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT_PATH = join(ROOT, "docs/audit/negative-proofs-artifact.json");

interface NegativeProofSpec {
  id: string;
  label: string;
  expectedSignal: string;
  testFile: string;
  testName: string;
}

interface NegativeProofResult extends NegativeProofSpec {
  status: "PASS" | "FAIL";
  durationMs: number;
  error?: string;
}

const PROOFS: NegativeProofSpec[] = [
  {
    id: "stale-book-fail-closed",
    label: "500ms Stale Book → FAIL_CLOSED",
    expectedSignal: "FAIL_CLOSED",
    testFile: "tests/v2/fail-closed.test.ts",
    testName: "isL2BookFailClosed trips when snapshot age exceeds 500ms",
  },
  {
    id: "depth-soil-resistance-trip",
    label: "Orderbook Depth Insufficient → SOIL_RESISTANCE_TRIP",
    expectedSignal: "SOIL_RESISTANCE_TRIP",
    testFile: "tests/risk-control.test.ts",
    testName: "trips when explicit depthUsd is below MIN_DEPTH_USD",
  },
  {
    id: "saga-ttl-reduce-only-flatten",
    label: "Saga TTL Expiry → REDUCE_ONLY_FLATTEN",
    expectedSignal: "REDUCE_ONLY_FLATTEN",
    testFile: "tests/integration/hl-2pc-execution.test.ts",
    testName: "flattens HL reduce-only when second leg TTL expires on commit",
  },
  {
    id: "flatten-failure-r20-deadlock",
    label: "Flatten Failure → R20_FLATTEN_FAILED Physical Deadlock",
    expectedSignal: "R20_FLATTEN_FAILED",
    testFile: "tests/core/intent-ledger.test.ts",
    testName:
      "triggers R20 hardlock when compensating flatten fails on commit rollback",
  },
  {
    id: "session-cap-rejection",
    label: "Order Cap Exceeded → $5,000 Cap Rejection",
    expectedSignal: "$5,000 Cap Rejection",
    testFile: "tests/v2/session-cap.test.ts",
    testName: "$5,001 order triggers PHYSICALLY_SEVERED and severs signing channel",
  },
];

function runProof(proof: NegativeProofSpec): NegativeProofResult {
  const started = Date.now();
  const testPath = join(ROOT, proof.testFile);
  try {
    execSync(
      `pnpm exec vitest run "${testPath}" -t "${proof.testName}" --reporter=dot`,
      {
        cwd: ROOT,
        stdio: "pipe",
        encoding: "utf8",
        env: { ...process.env, CI: "1" },
      },
    );
    return {
      ...proof,
      status: "PASS",
      durationMs: Date.now() - started,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "vitest execution failed";
    return {
      ...proof,
      status: "FAIL",
      durationMs: Date.now() - started,
      error: message.slice(0, 2_000),
    };
  }
}

function sha256Anchor(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload);
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

function main(): void {
  console.log("[verify:negative] Running fail-closed negative path proofs…");

  const results = PROOFS.map((proof) => {
    console.log(`[verify:negative] · ${proof.label}`);
    const result = runProof(proof);
    console.log(
      `[verify:negative]   ${result.status} (${result.durationMs}ms)`,
    );
    return result;
  });

  const passed = results.filter((r) => r.status === "PASS").length;
  const generatedAt = new Date().toISOString();
  const overallVerdict = passed === results.length ? "PASS" : "FAIL";

  const body = {
    schema: "silvervine.negative-proofs.v1",
    protocol: "SliverVine / BeΔ Living Water",
    generatedAt,
    overallVerdict,
    proofsPassed: `${passed}/${results.length}`,
    command: "pnpm verify:negative",
    proofs: results,
  };

  const artifact = {
    ...body,
    sha256Anchor: sha256Anchor(body),
  };

  mkdirSync(dirname(ARTIFACT_PATH), { recursive: true });
  writeFileSync(ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`);

  console.log(`[verify:negative] artifact → ${ARTIFACT_PATH}`);
  console.log(
    `[verify:negative] verdict: ${overallVerdict} | proofs: ${artifact.proofsPassed}`,
  );
  console.log(`[verify:negative] sha256Anchor: ${artifact.sha256Anchor}`);

  if (overallVerdict !== "PASS") {
    process.exitCode = 1;
  }
}

main();
