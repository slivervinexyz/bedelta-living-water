#!/usr/bin/env tsx
/** Read-only audit: public docs match SYSTEM_METRICS_SSOT vitest + bundle metrics. */
import fs from "node:fs";
import path from "node:path";
import { collectPublicDocs } from "./fix-public-doc-links-lib";
import { loadSystemMetricsSsot } from "./_shared/sync-ssot-docs-lib";

const ROOT = path.resolve(import.meta.dirname, "..");
const STALE_VITEST = /\b238 test files\b|\b239 test files\b|\b247 test files\b|\b251 test files\b|\b252 test files\b|\b1108 PASS\b|\b1111 PASS\b|\b1141 PASS\b|\b1176 PASS\b|\b1190 PASS\b|\b238 files\b|\b1108 PASS \(238 files\)/;
const STALE_BUNDLE = /166\.51 KiB raw|166\.8 KiB raw|111\.11 KiB raw|58\.72 KiB gzip|58\.88 KiB gzip|40\.46 KiB gzip/;

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

function walkBrandFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkBrandFiles(p, out);
    else if (/\.(md|ts|py|mjs|json|csv|sol)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function scanDeprecatedBrand(paths: string[]): string[] {
  const hits: string[] = [];
  const pattern = new RegExp(["c", "i", "t", "a", "d", "e", "l"].join(""), "i");
  for (const file of paths) {
    const text = fs.readFileSync(file, "utf8");
    if (pattern.test(text)) hits.push(`${path.relative(ROOT, file)}: deprecated legacy brand token`);
  }
  return hits;
}

function main(): void {
  const ssot = loadSystemMetricsSsot(ROOT);
  const files = collectPublicDocs(ROOT, walkMd);
  const violations: string[] = [];
  const brandFiles = ["docs", "scripts"].flatMap((rel) => walkBrandFiles(path.join(ROOT, rel)));
  violations.push(...scanDeprecatedBrand(brandFiles));

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const text = fs.readFileSync(file, "utf8");
    if (STALE_VITEST.test(text)) violations.push(`${rel}: stale vitest 238/1108`);
    if (STALE_BUNDLE.test(text)) violations.push(`${rel}: stale bundle 166.51/58.72`);
  }

  const v = ssot.badges.vitest;
  const b = ssot.bundle_telemetry;
  console.log(`SSOT vitest: ${v.test_files_passed} files / ${v.total_tests_passed} PASS`);
  console.log(`SSOT bundle: ${b.rawKiB} KiB raw / ${b.gzipKiB} KiB gzip`);
  console.log(`Scanned ${files.length} public markdown files`);
  console.log(`Stale metric violations: ${violations.length}`);
  violations.forEach((v) => console.error(`STALE ${v}`));

  if (v.test_files_passed !== 254 || v.total_tests_passed !== 1206) {
    console.error(`SSOT vitest mismatch — expected 254/1206`);
    process.exit(1);
  }
  if (b.gzipKiB !== 40.5 || b.rawKiB !== 111.19) {
    console.error(`SSOT bundle mismatch — expected 111.19/40.5`);
    process.exit(1);
  }

  process.exit(violations.length > 0 ? 1 : 0);
}

main();
