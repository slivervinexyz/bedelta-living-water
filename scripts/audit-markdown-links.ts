#!/usr/bin/env tsx
/**
 * Audit relative Markdown links under docs/ + priority root files.
 * Usage: pnpm tsx scripts/audit-markdown-links.ts [--fix-table-pipes]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FIX_PIPES = process.argv.includes("--fix-table-pipes");

const SCAN_ROOTS = [
  "README.md",
  "JUDGE_BRIEF.md",
  "SECURITY.md",
  "docker/README.md",
  "docs/00_ARB_Buildathon/SUBMISSION.md",
  "docs/00_ARB_Buildathon/SUBMISSION_GRANT_APPENDIX.md",
  "docs",
];

function walkMd(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkMd(p, out);
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function collectFiles(): string[] {
  const set = new Set<string>();
  for (const r of SCAN_ROOTS) {
    const abs = path.join(ROOT, r);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) walkMd(abs, []).forEach((f) => set.add(f));
    else set.add(abs);
  }
  return [...set].sort();
}

/** Replace unescaped metric pipes that break GFM table columns. */
function sanitizeTableRow(line: string): string {
  if (!line.trimStart().startsWith("|")) return line;
  return line
    .replace(/(\d+ test files) \| (\d+ PASS[^|]*)/g, "$1 · $2")
    .replace(/(\d+ files) \| (\d+ PASS[^|]*)/g, "$1 · $2")
    .replace(/(\d+\.\d+ KiB raw) \| (\d+\.\d+ KiB gzip)/g, "$1 · $2")
    .replace(/(\*\*\d+ test files) \| (\d+ PASS)/g, "$1 · $2");
}

type Broken = { file: string; href: string; resolved: string };
type ColMismatch = { file: string; line: number; expected: number; got: number; text: string };

function auditFile(file: string): { broken: Broken[]; colMismatch: ColMismatch[]; fixed: string | null } {
  const rel = path.relative(ROOT, file);
  const dir = path.dirname(file);
  let text = fs.readFileSync(file, "utf8");
  const broken: Broken[] = [];
  const colMismatch: ColMismatch[] = [];

  if (FIX_PIPES) {
    text = text
      .split("\n")
      .map((line) => sanitizeTableRow(line))
      .join("\n");
  }

  const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(text))) {
    const raw = m[1].trim();
    const href = raw.split(/\s+/)[0];
    if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) continue;
    const filePart = href.split("#")[0];
    const resolved = path.normalize(path.join(dir, filePart));
    if (!fs.existsSync(resolved)) broken.push({ file: rel, href: raw, resolved: path.relative(ROOT, resolved) });
  }

  const lines = text.split("\n");
  let headerCols = 0;
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) {
      inTable = false;
      continue;
    }
    const cols = line.split("|").length - 2;
    if (/^\|(\s*:?-+:?\s*\|)+\s*$/.test(line.trim())) {
      inTable = true;
      headerCols = cols;
      continue;
    }
    if (inTable && headerCols > 0 && cols !== headerCols) {
      colMismatch.push({
        file: rel,
        line: i + 1,
        expected: headerCols,
        got: cols,
        text: line.slice(0, 140),
      });
    }
  }

  const fixed = FIX_PIPES ? text : null;
  return { broken, colMismatch, fixed };
}

function main(): void {
  const files = collectFiles();
  let brokenTotal = 0;
  let mismatchTotal = 0;

  for (const file of files) {
    const { broken, colMismatch, fixed } = auditFile(file);
    brokenTotal += broken.length;
    mismatchTotal += colMismatch.length;
    broken.forEach((b) => console.error(`BROKEN ${b.file} -> ${b.href} => ${b.resolved}`));
    if (FIX_PIPES && fixed !== null && fixed !== fs.readFileSync(file, "utf8")) {
      fs.writeFileSync(file, fixed);
      console.log(`FIXED table pipes: ${path.relative(ROOT, file)}`);
    }
  }

  console.log(`Scanned ${files.length} markdown files`);
  console.log(`Broken relative links: ${brokenTotal}`);
  console.log(`Table column mismatches: ${mismatchTotal}`);
  process.exit(brokenTotal > 0 ? 1 : mismatchTotal > 0 ? 2 : 0);
}

main();
