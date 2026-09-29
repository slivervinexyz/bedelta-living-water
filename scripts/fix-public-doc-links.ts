#!/usr/bin/env tsx
/** Fix public markdown: [`label`](url) → [label](url) + SSOT explorer links. */
import fs from "node:fs";
import path from "node:path";
import {
  buildRegistry,
  collectPublicDocs,
  fixBacktickLinks,
  fixExplorerLinks,
} from "./fix-public-doc-links-lib";

const ROOT = path.resolve(import.meta.dirname, "..");
const DRY = process.argv.includes("--dry-run");

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
  const registry = buildRegistry();
  const files = collectPublicDocs(ROOT, walkMd);
  let changedFiles = 0;
  let backtickFixes = 0;
  let explorerFixes = 0;

  for (const file of files) {
    const before = fs.readFileSync(file, "utf8");
    const phase1 = fixBacktickLinks(before);
    backtickFixes += (before.match(/\[`[^`]+`\]\(/g) ?? []).length;
    const after = fixExplorerLinks(phase1, registry);
    explorerFixes += phase1 === after ? 0 : 1;
    if (after !== before) {
      changedFiles++;
      if (!DRY) fs.writeFileSync(file, after);
      console.log(`${DRY ? "WOULD FIX" : "FIXED"}: ${path.relative(ROOT, file)}`);
    }
  }

  console.log(`Scanned ${files.length} public markdown files`);
  console.log(`Backtick-in-link patterns processed: ${backtickFixes}`);
  console.log(`Files ${DRY ? "to change" : "changed"}: ${changedFiles}`);
  if (DRY) console.log("Re-run without --dry-run to write.");
}

main();
