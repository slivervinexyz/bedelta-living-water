/** Security matrix orchestrator. */
import { mkdirSync, writeFileSync } from "node:fs";
import { AUDIT, NARRATIVE, SCORECARD, STATIC, type SecurityScorecard, type Tier } from "./types";
import { gatesFor } from "./gates";

export function runSecurityMatrix(tier: Tier): SecurityScorecard {
  console.log(`[security-matrix] tier=${tier} narrative=${NARRATIVE}`);
  const gates = gatesFor(tier);
  const summary = {
    pass: gates.filter((g) => g.verdict === "PASS").length,
    fail: gates.filter((g) => g.verdict === "FAIL").length,
    skipped: gates.filter((g) => g.verdict === "SKIPPED").length,
  };
  // Nightly: exploratory non-zero exits are findings, not REVIEW blockers.
  const overallVerdict: "PASS" | "REVIEW" =
    tier === "nightly" || summary.fail === 0 ? "PASS" : "REVIEW";
  const scorecard: SecurityScorecard = {
    schema: "silvervine.security-scorecard.v4",
    protocol: "SliverVine / BeΔLivingWater",
    tier,
    generatedAt: new Date().toISOString(),
    narrative: NARRATIVE,
    overallVerdict,
    gates,
    summary,
    reports: {
      securityScorecard: "docs/audit/security-scorecard.json",
      ...(tier !== "fast"
        ? { staticAnalysisReport: "docs/audit/static-analysis-report.json" }
        : {}),
    },
    zeroKeyCommand: `pnpm run audit:${tier}`,
  };
  mkdirSync(AUDIT, { recursive: true });
  writeFileSync(SCORECARD, `${JSON.stringify(scorecard, null, 2)}\n`);
  if (tier !== "fast") {
    const findings = Object.fromEntries(
      gates
        .filter((g) => (g.counterexamples?.length ?? 0) > 0 || (g.exitCode ?? 0) !== 0)
        .map((g) => [g.id, {
          exitCode: g.exitCode,
          verdict: g.verdict,
          exploratory: tier === "nightly",
          counterexamples: g.counterexamples ?? [],
          detail: g.detail,
        }]),
    );
    writeFileSync(
      STATIC,
      `${JSON.stringify({
        schema: "silvervine.static-analysis.v3",
        generatedAt: scorecard.generatedAt,
        narrative: NARRATIVE,
        tier,
        tools: Object.fromEntries(gates.map((g) => [g.id, g])),
        exploratoryFindings: findings,
        summary,
        verdict: scorecard.overallVerdict,
        scorecard: "docs/audit/security-scorecard.json",
      }, null, 2)}\n`,
    );
  }
  console.log(
    `[security-matrix] ${scorecard.overallVerdict} pass=${summary.pass} fail=${summary.fail} skipped=${summary.skipped}`,
  );
  for (const g of gates) {
    const cx = g.counterexamples?.length ?? 0;
    console.log(`  · ${g.id}: ${g.verdict} (${g.elapsedMs}ms)${cx ? ` cx=${cx}` : ""}`);
  }
  console.log(`[security-matrix] → ${SCORECARD}`);
  return scorecard;
}
