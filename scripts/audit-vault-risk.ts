#!/usr/bin/env tsx
/**
 * 15-Minute Vault Risk Audit CLI — B2B outbound template.
 *
 * Usage:
 *   pnpm audit:vault
 *   pnpm audit:vault 0xVaultAddress
 *   pnpm audit:vault --vault=0xVaultAddress --equity=100000
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HL_L2_STALE_THRESHOLD_MS } from "../src/config/constants";
import { computeEffectiveMaxSlUsd } from "../src/services/effective-max-sl";
import {
  isL2BookFailClosed,
  type LiveL2BookSnapshot,
} from "../src/services/exchanges/hl-l2-book-lib/hl-l2-book-types";
import { SESSION_KEY_NOTIONAL_CAP_USD } from "../src/services/session-key-adapter";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEGATIVE_PROOFS_PATH = join(ROOT, "docs/audit/negative-proofs-artifact.json");

interface AuditCheck {
  id: string;
  label: string;
  status: "PASS" | "FAIL";
  detail: string;
}

function probeSnapshot(ageMs: number): LiveL2BookSnapshot {
  return {
    coin: "ETH",
    book: { coin: "ETH", levels: [[], []] },
    fetchedAt: new Date(Date.now() - ageMs).toISOString(),
    live: true,
    source: "testnet",
  };
}

function parseArgs(argv: string[]): { vaultAddress: string; equityUsd: number } {
  let vaultAddress = "0xREFERENCE_DEPLOYMENT_VAULT";
  let equityUsd = 100_000;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith("--vault=")) {
      vaultAddress = arg.slice("--vault=".length);
    } else if (arg.startsWith("--equity=")) {
      equityUsd = Number(arg.slice("--equity=".length));
    } else if (arg === "--vault" && argv[i + 1]) {
      vaultAddress = argv[++i]!;
    } else if (arg === "--equity" && argv[i + 1]) {
      equityUsd = Number(argv[++i]!);
    } else if (!arg.startsWith("-") && arg !== "tsx" && !arg.endsWith(".ts")) {
      vaultAddress = arg;
    }
  }

  return { vaultAddress, equityUsd: Number.isFinite(equityUsd) ? equityUsd : 100_000 };
}

function loadNegativeProofsAnchor(): string | null {
  if (!existsSync(NEGATIVE_PROOFS_PATH)) return null;
  try {
    const artifact = JSON.parse(readFileSync(NEGATIVE_PROOFS_PATH, "utf8")) as {
      sha256Anchor?: string;
      proofsPassed?: string;
    };
    return artifact.sha256Anchor ?? null;
  } catch {
    return null;
  }
}

function runChecks(equityUsd: number): AuditCheck[] {
  const staleMs = HL_L2_STALE_THRESHOLD_MS + 100;
  const staleTrips = isL2BookFailClosed(probeSnapshot(staleMs));
  const freshPasses = !isL2BookFailClosed(probeSnapshot(0));
  const dynamicMaxSl = computeEffectiveMaxSlUsd(equityUsd);
  const expectedDynamicSl = equityUsd * 0.01 + 100;

  return [
    {
      id: "fail-closed-stale-l2-book",
      label: "500ms Fail-Closed depth posture (stale L2 book)",
      status: staleTrips ? "PASS" : "FAIL",
      detail: staleTrips
        ? `Stale snapshot (${staleMs}ms) trips isL2BookFailClosed`
        : "Expected stale book to trip fail-closed gate",
    },
    {
      id: "fail-closed-fresh-l2-book",
      label: "500ms Fail-Closed depth posture (fresh L2 book)",
      status: freshPasses ? "PASS" : "FAIL",
      detail: freshPasses
        ? "Fresh snapshot passes fail-closed probe"
        : "Fresh book incorrectly tripped fail-closed",
    },
    {
      id: "session-key-notional-cap",
      label: "EIP-712 Session Key per-order notional cap",
      status: SESSION_KEY_NOTIONAL_CAP_USD === 5_000 ? "PASS" : "FAIL",
      detail: `SESSION_KEY_NOTIONAL_CAP_USD = $${SESSION_KEY_NOTIONAL_CAP_USD.toLocaleString()} (TRADE_ONLY envelope)`,
    },
    {
      id: "dynamic-max-sl-envelope",
      label: "Dynamic Max SL formula (Equity × 1% + $100)",
      status: dynamicMaxSl === expectedDynamicSl ? "PASS" : "FAIL",
      detail: `computeEffectiveMaxSlUsd($${equityUsd.toLocaleString()}) = $${dynamicMaxSl.toFixed(2)}`,
    },
  ];
}

function sha256Anchor(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload);
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

function main(): void {
  const { vaultAddress, equityUsd } = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const checks = runChecks(equityUsd);
  const passed = checks.filter((c) => c.status === "PASS").length;
  const overallVerdict = passed === checks.length ? "PASS" : "FAIL";

  const body = {
    schema: "silvervine.vault-risk-audit.v1",
    reportTitle: "15-Minute Risk Audit Report",
    protocol: "SliverVine / BeΔ Living Water",
    architect: "qum0x (Solo System Architect)",
    generatedAt,
    auditDurationTargetMinutes: 15,
    vaultAddress,
    accountEquityUsd: equityUsd,
    overallVerdict,
    checksPassed: `${passed}/${checks.length}`,
    command: "pnpm audit:vault",
    negativeProofsArtifact: loadNegativeProofsAnchor(),
    recommendedFollowUp: [
      "pnpm verify:negative",
      "curl -s https://bedeltawater.slivervine.xyz/api/telemetry/health",
    ],
    checks,
  };

  const report = {
    ...body,
    sha256Anchor: sha256Anchor(body),
  };

  console.log(JSON.stringify(report, null, 2));
  console.error(
    `[audit:vault] verdict: ${overallVerdict} | checks: ${report.checksPassed} | vault: ${vaultAddress}`,
  );

  if (overallVerdict !== "PASS") {
    process.exitCode = 1;
  }
}

main();
