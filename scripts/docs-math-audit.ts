#!/usr/bin/env tsx
/** Read-only audit: GitHub KaTeX math delimiters + SSOT invariants in public docs. */
import fs from "node:fs";
import path from "node:path";
import katex from "katex";
import { collectPublicDocs } from "./fix-public-doc-links-lib";

const ROOT = path.resolve(import.meta.dirname, "..");
const BRACKET_OPEN = /\\\[/;
const BRACKET_CLOSE = /\\\]/;
const BAD_MU = /106\\mu s/;
const MATH_BLOCK_RE = /\$\$([\s\S]*?)\$\$/g;
const TEXT_OR_MATTT_RE = /\\(?:text|mathtt)\{([^}]*)\}/g;
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

function hasIllegalUnderscoreInTextMacro(inner: string): boolean {
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] !== "_") continue;
    if (i > 0 && inner[i - 1] === "\\") continue;
    return true;
  }
  return false;
}

function renderKatex(rel: string, line: number, block: string, label: string, violations: string[]): void {
  const trimmed = block.trim();
  if (!trimmed) return;
  try {
    katex.renderToString(trimmed, { throwOnError: true, displayMode: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    violations.push(`${rel}:${line}: KaTeX ${label}: ${msg}`);
  }
}

function auditMathBlock(rel: string, line: number, block: string, violations: string[]): void {
  if (/\\_/.test(block)) {
    violations.push(`${rel}:${line}: \\\\_ in $$ block (prefer camelCase \\text{} or \\mathrm{})`);
  }
  for (const m of block.matchAll(TEXT_OR_MATTT_RE)) {
    if (hasIllegalUnderscoreInTextMacro(m[1])) {
      violations.push(`${rel}:${line}: underscore in \\text/\\mathtt{${m[1].slice(0, 32)}…}`);
    }
  }
  if (/\blostUsd\b/.test(block) && !/\\text\{lostUsd\}/.test(block)) {
    violations.push(`${rel}:${line}: bare lostUsd in $$ block (use \\text{lostUsd})`);
  }
  renderKatex(rel, line, block, "raw", violations);
  // GitHub / VS Code markdown often turns \_ → _ before KaTeX runs.
  const markdownUnescaped = block.replace(/\\_/g, "_");
  renderKatex(rel, line, markdownUnescaped, "after markdown \\_ unescape", violations);
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
      auditMathBlock(rel, line, block, violations);
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
