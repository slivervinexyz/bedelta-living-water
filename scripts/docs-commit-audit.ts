#!/usr/bin/env tsx
/** Read-only audit: public verified-commit markers match SYSTEM_METRICS_SSOT release_anchor. */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  VERIFIED_COMMIT_MARKER_PATHS,
  loadSystemMetricsSsot,
  resolveReleaseAnchor,
} from "./_shared/sync-ssot-docs-lib";

const ROOT = path.resolve(import.meta.dirname, "..");
const STALE_VERIFIED = /\be489d34\b/;
const VERIFIED_CONTEXT =
  /Verified Commit|Verified commit|verified HEAD|release_anchor|git rev-parse HEAD/i;

function readMarkerBody(rel: string, marker: string): string | null {
  const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const start = `<!-- SSOT:${marker}_START -->`;
  const end = `<!-- SSOT:${marker}_END -->`;
  const i = text.indexOf(start);
  const j = text.indexOf(end);
  if (i < 0 || j < i) return null;
  return text.slice(i + start.length, j);
}

function markerForPath(rel: string): string {
  if (rel === "JUDGE_BRIEF.md") return "JUDGE_VERIFIED_COMMIT";
  if (rel === "docs/00_ARB_Buildathon/SUBMISSION.md") return "SUBMISSION_VERIFIED_COMMIT";
  if (rel === "docs/03_product_verifications/01_VERIFICATION_MATRIX.md") return "VERIFICATION_VERIFIED_COMMIT";
  if (rel === "docs/PRODUCTION_WORKFLOW_DEEP_DIVE.md") return "PRODUCTION_VERIFIED_COMMIT";
  return "ONCHAIN_VERIFIED_COMMIT";
}

function main(): void {
  const strict = process.argv.includes("--strict");
  const strictHead = process.argv.includes("--strict-head");
  const ssot = loadSystemMetricsSsot(ROOT);
  const anchor = resolveReleaseAnchor(ssot);
  const verified = anchor.verified_commit;
  const violations: string[] = [];

  if (!/^[0-9a-f]{7,40}$/.test(verified)) {
    violations.push(`SSOT release_anchor.verified_commit invalid: ${verified}`);
  }

  for (const rel of VERIFIED_COMMIT_MARKER_PATHS) {
    const marker = markerForPath(rel);
    const body = readMarkerBody(rel, marker);
    if (body === null) {
      violations.push(`${rel}: missing SSOT marker ${marker}`);
      continue;
    }
    if (!body.includes(verified)) {
      violations.push(`${rel}: marker ${marker} missing verified_commit ${verified}`);
    }
  }

  const productionFooter = readMarkerBody("docs/PRODUCTION_WORKFLOW_DEEP_DIVE.md", "PRODUCTION_VERIFIED_FOOTER");
  if (productionFooter === null) {
    violations.push("docs/PRODUCTION_WORKFLOW_DEEP_DIVE.md: missing PRODUCTION_VERIFIED_FOOTER marker");
  } else if (!productionFooter.includes(verified)) {
    violations.push(`docs/PRODUCTION_WORKFLOW_DEEP_DIVE.md: footer missing verified_commit ${verified}`);
  }

  for (const rel of VERIFIED_COMMIT_MARKER_PATHS) {
    const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
    for (const line of text.split("\n")) {
      if (!STALE_VERIFIED.test(line) || !VERIFIED_CONTEXT.test(line)) continue;
      if (line.includes("<!-- SSOT:")) continue;
      violations.push(`${rel}: stale e489d34 in verified context — ${line.trim().slice(0, 120)}`);
    }
  }

  let head = "";
  try {
    head = execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    violations.push("git rev-parse HEAD failed");
  }

  console.log(`SSOT verified_commit: ${verified} (baseline ${anchor.baseline_commit})`);
  if (head) console.log(`git HEAD: ${head}`);
  console.log(`Strict mode: ${strict}`);
  console.log(`Strict HEAD check: ${strictHead}`);

  if (strictHead && head && head !== verified && !head.startsWith(verified) && !verified.startsWith(head)) {
    violations.push(`HEAD ${head} !== SSOT verified_commit ${verified} (--strict-head)`);
  }

  console.log(`Verified-commit violations: ${violations.length}`);
  violations.forEach((v) => console.error(`COMMIT_AUDIT ${v}`));
  process.exit(violations.length > 0 ? 1 : 0);
}

main();
