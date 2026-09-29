#!/usr/bin/env tsx
/** Read-only audit: GitHub KaTeX math delimiters + SSOT invariants in public docs. */
import fs from "node:fs";
import path from "node:path";
import { collectPublicDocs } from "./fix-public-doc-links-lib";

const ROOT = path.resolve(import.meta.dirname, "..");
const BRACKET_OPEN = /\\\[/;
const BRACKET_CLOSE = /\\\]/;
const BAD_MU = /106\\mu s/;
const MATH_BLOCK_RE = /\$\$([\s\S]*?)\$\$/g;

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

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

function auditMath(files: string[]): string[] {
  const violations: string[] = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const text = fs.readFileSync(file, "utf8");
    const lines = text.split("\n");

    lines.forEach((line, i) => {
      if (BRACKET_OPEN.test(line)) violations.push(`${rel}:${i + 1}: non-GitHub delimiter \\[`);
      if (BRACKET_CLOSE.test(line)) violations.push(`${rel}:${i + 1}: non-GitHub delimiter \\]`);
      if (BAD_MU.test(line)) violations.push(`${rel}:${i + 1}: bad mu spacing (use 106\\,\\mu\\mathrm{s})`);
    });

    for (const m of text.matchAll(MATH_BLOCK_RE)) {
      const block = m[1];
      const line = lineOf(text, m.index ?? 0);
      if (/\blostUsd\b/.test(block) && !/\\text\{lostUsd\}/.test(block)) {
        violations.push(`${rel}:${line}: bare lostUsd in $$ block (use \\text{lostUsd})`);
      }
    }
  }
  return violations;
}

function main(): void {
  const files = collectPublicDocs(ROOT, walkMd);
  const violations = auditMath(files);
  console.log(`Scanned ${files.length} public markdown files`);
  console.log(`Math violations: ${violations.length}`);
  violations.forEach((v) => console.error(`MATH ${v}`));
  process.exit(violations.length > 0 ? 1 : 0);
}

main();
