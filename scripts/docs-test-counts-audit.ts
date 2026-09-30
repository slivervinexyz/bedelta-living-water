#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { collectPublicDocs } from "./fix-public-doc-links-lib";
import {
  auditPublicDocTestCounts,
  loadVitestScopedSsot,
  SCOPED_SSOT_REL,
} from "./_shared/vitest-scoped-ssot-lib";

const ROOT = path.resolve(import.meta.dirname, "..");

function walkMd(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkMd(p, out);
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function main(): void {
  const ssotPath = path.join(ROOT, SCOPED_SSOT_REL);
  if (!fs.existsSync(ssotPath)) {
    console.error(`Missing ${SCOPED_SSOT_REL} — run pnpm vitest:scoped-ssot first`);
    process.exit(1);
  }
  const ssot = loadVitestScopedSsot(ROOT);
  const files = collectPublicDocs(ROOT, walkMd);
  const violations = auditPublicDocTestCounts(ROOT, ssot, files);
  console.log(`Scanned ${files.length} public markdown files`);
  console.log(`Scoped SSOT suites: ${Object.keys(ssot.suites).length} (generated ${ssot.generatedAt})`);
  console.log(`Test-count violations: ${violations.length}`);
  violations.forEach((v) => console.error(`COUNT ${v}`));
  process.exit(violations.length > 0 ? 1 : 0);
}

main();
