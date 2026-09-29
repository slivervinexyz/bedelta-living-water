#!/usr/bin/env tsx
/** Security matrix types + paths SSOT. */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const GATE = join(ROOT, "SliverVineGate");
export const AUDIT = join(ROOT, "docs/audit");
export const SCORECARD = join(AUDIT, "security-scorecard.json");
export const STATIC = join(AUDIT, "static-analysis-report.json");
export const NARRATIVE = "behavioral_pass_does_not_imply_web3_security" as const;

export type Tier = "fast" | "security" | "nightly";
export type GateVerdict = "PASS" | "FAIL" | "SKIPPED";
export interface SecurityGateResult {
  id: string;
  label: string;
  verdict: GateVerdict;
  exitCode: number | null;
  elapsedMs: number;
  detail: string;
  counterexamples?: string[];
}
export interface SecurityScorecard {
  schema: "silvervine.security-scorecard.v4";
  protocol: "SliverVine / BeΔLivingWater";
  tier: Tier;
  generatedAt: string;
  narrative: typeof NARRATIVE;
  overallVerdict: "PASS" | "REVIEW";
  gates: SecurityGateResult[];
  summary: { pass: number; fail: number; skipped: number };
  reports: { securityScorecard: string; staticAnalysisReport?: string };
  zeroKeyCommand: string;
}
