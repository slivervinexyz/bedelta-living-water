#!/usr/bin/env tsx
/**
 * BeDelta / SliverVine chaos harness — 255-case black-swan & fail-closed matrix.
 * Modular entry — re-exports from ./chaos-blackswan/*.
 */
export {
  CHAOS_ATTACK_COUNT,
  ORACLE_LAG_SPIKE_MS,
  PRICE_IMPACT_TOXIC_BPS,
  SEQUENCER_DOWN_ANSWER,
  CHAOS_METRICS_PATH,
  BME_CHAOS_AUDIT_LINE,
} from "./chaos-blackswan/chaos-context";
export type {
  ChaosGroup,
  ChaosScenarioId,
  ChaosAttackResult,
  ChaosAuditReport,
  GatewayRuleInput,
} from "./chaos-blackswan/chaos-types";
export { evaluateGatewayRules } from "./chaos-blackswan/chaos-gateway-rules";
export {
  injectOracleLagSpike,
  injectPriceImpactToxicity,
  injectSequencerDown,
  injectMalformedTelemetry,
} from "./chaos-blackswan/chaos-matrix-inject";
export {
  expectedMalformedPayloadPrefix,
  expectedReasonPrefixForId,
  reasonMatchesExpectedPrefix,
} from "./chaos-blackswan/chaos-matrix-expected";
export { runMatrixCase } from "./chaos-blackswan/chaos-matrix-run";
export {
  runChaosBlackSwanStress,
  writeChaosMetrics,
  compileNotebookLmExports,
  printChaosAudit,
} from "./chaos-blackswan/chaos-runner";

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runChaosBlackSwanStress, writeChaosMetrics, compileNotebookLmExports, printChaosAudit } from "./chaos-blackswan/chaos-runner";

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === resolve(entry);
}

if (isDirectRun()) {
  const report = runChaosBlackSwanStress();
  printChaosAudit(report);
  writeChaosMetrics(report);
  compileNotebookLmExports();
  if (!report.pass) process.exitCode = 1;
}
