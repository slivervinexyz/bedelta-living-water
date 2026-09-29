/** Chaos matrix batch runner + metrics export. */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAuditArtifactBinding } from "../audit-artifact-bindings";
import { resetGates } from "./chaos-gate-helpers";
import {
  BME_CHAOS_AUDIT_LINE,
  CHAOS_ATTACK_COUNT,
  CHAOS_METRICS_PATH,
  GROUPS,
  ROOT,
} from "./chaos-context";
import { groupForId } from "./chaos-matrix-spec";
import { runMatrixCase } from "./chaos-matrix-run";
import type { ChaosAttackResult, ChaosAuditReport, ChaosGroup } from "./chaos-types";

function emptyScenarioTally(): ChaosAuditReport["byScenario"] {
  return {
    oracle_lag_spike: { blocked: 0, total: 0, crashed: 0 },
    price_impact_toxicity: { blocked: 0, total: 0, crashed: 0 },
    sequencer_down: { blocked: 0, total: 0, crashed: 0 },
    malformed_telemetry: { blocked: 0, total: 0, crashed: 0 },
    A: { blocked: 0, total: 0, crashed: 0 },
    B: { blocked: 0, total: 0, crashed: 0 },
    C: { blocked: 0, total: 0, crashed: 0 },
    D: { blocked: 0, total: 0, crashed: 0 },
    E: { blocked: 0, total: 0, crashed: 0 },
    F: { blocked: 0, total: 0, crashed: 0 },
    G: { blocked: 0, total: 0, crashed: 0 },
    H: { blocked: 0, total: 0, crashed: 0 },
    I: { blocked: 0, total: 0, crashed: 0 },
    J: { blocked: 0, total: 0, crashed: 0 },
  };
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

export function runChaosBlackSwanStress(
  attacks: number = CHAOS_ATTACK_COUNT,
): ChaosAuditReport {
  const byScenario = emptyScenarioTally();
  let blocked = 0;
  let crashed = 0;
  let prefixMismatches = 0;
  let capitalLossUsd = 0;
  const restore = muteConsole();
  try {
    for (let i = 1; i <= attacks; i++) {
      resetGates();
      let result: ChaosAttackResult;
      try {
        result = runMatrixCase(i);
      } catch {
        result = {
          scenario: groupForId(i),
          id: i,
          blocked: true,
          trigger: "FAIL_CLOSED",
          capitalLossUsd: 0,
          crashed: true,
          reasons: ["ISOLATE_CRASH_CAUGHT"],
        };
      }
      const bucket = byScenario[result.scenario];
      bucket.total += 1;
      if (result.crashed) {
        bucket.crashed += 1;
        crashed += 1;
      }
      if (result.reasonPrefixMatched === false) {
        prefixMismatches += 1;
      }
      if (result.blocked && !result.crashed) {
        bucket.blocked += 1;
        blocked += 1;
      } else {
        capitalLossUsd += result.capitalLossUsd;
      }
    }
  } finally {
    restore();
    resetGates();
  }

  const timestamp = new Date().toISOString();
  const pass = blocked === attacks && crashed === 0 && capitalLossUsd === 0 && prefixMismatches === 0;
  return {
    blocked,
    total: attacks,
    crashed,
    prefixMismatches,
    capitalLossUsd,
    line: pass
      ? BME_CHAOS_AUDIT_LINE
      : `[BeDelta-Living-Water- SLI\\verVine CHAOS AUDIT] ${blocked} / ${attacks} Simulated Toxic Attacks Blocked (${((blocked / attacks) * 100).toFixed(2)}% Fail-Closed, ${capitalLossUsd} Capital Loss)`,
    pass,
    byScenario,
    timestamp,
  };
}

export function writeChaosMetrics(report: ChaosAuditReport): void {
  const binding = resolveAuditArtifactBinding(new Date(report.timestamp));
  mkdirSync(dirname(CHAOS_METRICS_PATH), { recursive: true });
  writeFileSync(
    CHAOS_METRICS_PATH,
    `${JSON.stringify(
      {
        ...binding,
        totalScenarios: report.total,
        blockedToxicAttacks: report.blocked,
        failClosedRate: `${((report.blocked / report.total) * 100).toFixed(2)}%`,
        reasonPrefixMismatches: report.prefixMismatches,
        isolateCrashes: report.crashed,
        capitalLossUsd: report.capitalLossUsd,
      },
      null,
      2,
    )}\n`,
  );
}

export function compileNotebookLmExports(): void {
  const compiled = spawnSync("python3", ["scripts/compile_notebooklm_exports.py"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (compiled.stdout) process.stdout.write(compiled.stdout);
  if (compiled.stderr) process.stderr.write(compiled.stderr);
  if (compiled.status !== 0) {
    throw new Error("compile_notebooklm_exports.py failed");
  }
}

export function printChaosAudit(report: ChaosAuditReport): void {
  const labels: Record<ChaosGroup, string> = {
    A: "A001-025 ORACLE/CLOCK",
    B: "B026-050 IMPACT/LIQ",
    C: "C051-075 SEQUENCER/GAS",
    D: "D076-100 DOUBLE-FAULT",
    E: "E101-125 SIZING/SAGA",
    F: "F126-150 POISON",
    G: "G151-175 MARKET SWAN",
    H: "H176-200 L2/REORG",
    I: "I201-225 ISOLATE/RACE",
    J: "J226-255 R17/R20/CASCADE",
  };
  for (const g of GROUPS) {
    const row = report.byScenario[g];
    console.log(`[${labels[g]}] ${row.blocked}/${row.total} BLOCKED`);
  }
  console.log(report.line);
}
