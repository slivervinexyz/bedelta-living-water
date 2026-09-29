#!/usr/bin/env node
/**
 * BFS import graph from entry points → list unreachable src/ and tests/ files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const TESTS = path.join(ROOT, "tests");

const EXTENSIONS = [".ts", ".tsx", ".json"];
const INDEX_CANDIDATES = ["index.ts", "index.tsx"];

function walkDir(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkDir(full, acc);
    else if (/\.(ts|tsx|json)$/.test(ent.name)) acc.push(full);
  }
  return acc;
}

function readSafe(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

/** Extract import specifiers from TS/TSX source */
function extractImports(source) {
  const specs = new Set();
  // static import/export from
  const reStatic =
    /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;
  // dynamic import()
  const reDynamic = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  // require() fallback
  const reRequire = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const re of [reStatic, reDynamic, reRequire]) {
    let m;
    while ((m = re.exec(source))) specs.add(m[1]);
  }
  return [...specs];
}

function resolveImport(fromFile, spec) {
  if (spec.startsWith("node:") || (!spec.startsWith(".") && !spec.startsWith("/"))) {
    return null; // external / bare specifier
  }

  const base = spec.startsWith("/")
    ? path.join(ROOT, spec.slice(1))
    : path.resolve(path.dirname(fromFile), spec);

  // exact file with extension
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return path.normalize(base);

  for (const ext of EXTENSIONS) {
    const p = base + ext;
    if (fs.existsSync(p)) return path.normalize(p);
  }

  // directory index
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    for (const idx of INDEX_CANDIDATES) {
      const p = path.join(base, idx);
      if (fs.existsSync(p)) return path.normalize(p);
    }
  }

  // implicit index for paths like ./foo/bar without extension
  for (const idx of INDEX_CANDIDATES) {
    const p = path.join(base, idx);
    if (fs.existsSync(p)) return path.normalize(p);
  }

  return null;
}

function bfs(entryPoints) {
  const visited = new Set();
  const queue = [...entryPoints];
  const unresolved = [];

  while (queue.length) {
    const file = queue.shift();
    if (!file || visited.has(file)) continue;
    visited.add(file);

    const source = readSafe(file);
    if (source == null) continue;

    for (const spec of extractImports(source)) {
      const resolved = resolveImport(file, spec);
      if (resolved) {
        if (!visited.has(resolved)) queue.push(resolved);
      } else if (spec.startsWith(".") || spec.startsWith("/")) {
        unresolved.push({ from: file, spec });
      }
    }
  }

  return { visited, unresolved };
}

// --- Entry points ---
const entries = [];

// 1. index.html → apps/dashboard/main.tsx
entries.push(path.join(ROOT, "apps/dashboard/main.tsx"));
// Also trace apps/dashboard/* imported by main
const appsDashboard = walkDir(path.join(ROOT, "apps/dashboard"));
for (const f of appsDashboard) {
  if (/\.(tsx?)$/.test(f)) entries.push(f);
}

// 2. Worker
entries.push(path.join(SRC, "index.ts"));

// 3. All tests
for (const f of walkDir(TESTS)) {
  if (f.endsWith(".test.ts")) entries.push(f);
}

// 4. vitest setup
entries.push(path.join(ROOT, "vitest.setup.ts"));

// 5. package.json scripts (tsx only)
const pkgScripts = [
  "scripts/verify-hl-testnet.ts",
  "scripts/verify-5tx.ts",
  "scripts/verify-5tx-runner.ts",
];
for (const s of pkgScripts) entries.push(path.join(ROOT, s));

// 6. SDK export
entries.push(path.join(SRC, "sdk/risk-sdk/index.ts"));

const allSrc = walkDir(SRC);
const allTests = walkDir(TESTS);
const allTarget = [...allSrc, ...allTests];

const { visited, unresolved } = bfs(entries);

const reachable = new Set(
  [...visited].filter((f) => f.startsWith(SRC + path.sep) || f.startsWith(TESTS + path.sep))
);

const orphaned = allTarget.filter((f) => !reachable.has(path.normalize(f)));

// Classify
const DEAD_CODE_PATTERNS = [
  /[/\\]v2[/\\]main\.tsx$/,
  /print-demo-data\.ts$/,
  /[/\\]archive[/\\]/,
  /legacy/i,
  /stub/i,
  /mock/i,
  /demo-data/i,
];

function rel(p) {
  return path.relative(ROOT, p);
}

function classify(p) {
  for (const re of DEAD_CODE_PATTERNS) {
    if (re.test(p)) return "dead-code-flag";
  }
  if (p.includes("/stubs/")) return "stub";
  if (p.includes("/mocks/")) return "mock";
  if (p.endsWith(".json")) return "json-data";
  if (p.includes("/data/")) return "data";
  return "other";
}

// Test-only: reachable only from tests (not worker/spa/scripts/sdk)
const entriesNoTests = entries.filter((e) => !e.includes("/tests/") && !e.includes("vitest.setup"));
const { visited: visitedProd } = bfs(entriesNoTests);
const testOnlyReachable = [...reachable].filter(
  (f) =>
    !visitedProd.has(f) &&
    (f.startsWith(SRC + path.sep) || f.startsWith(TESTS + path.sep))
);

// Orphaned tests (test files not imported - tests ARE entry points so shouldn't happen)
const orphanedTests = orphaned.filter((f) => f.startsWith(TESTS));

console.log(JSON.stringify({
  summary: {
    totalSrc: allSrc.length,
    totalTests: allTests.length,
    reachable: reachable.size,
    orphaned: orphaned.length,
    testOnlyFromSrc: testOnlyReachable.filter((f) => f.startsWith(SRC)).length,
    unresolvedCount: unresolved.length,
  },
  entryPoints: entries.map(rel),
  orphaned: orphaned.map(rel).sort(),
  orphanedByClass: Object.fromEntries(
    ["dead-code-flag", "stub", "mock", "json-data", "data", "other"].map((k) => [
      k,
      orphaned.filter((f) => classify(f) === k).map(rel),
    ])
  ),
  testOnlyReachableFromTests: testOnlyReachable.map(rel).sort(),
  deadCodeFlags: {
    v2Main: {
      path: rel(path.join(SRC, "v2/main.tsx")),
      reachable: reachable.has(path.normalize(path.join(SRC, "v2/main.tsx"))),
    },
    printDemoData: {
      path: rel(path.join(SRC, "print-demo-data.ts")),
      reachable: reachable.has(path.normalize(path.join(SRC, "print-demo-data.ts"))),
    },
  },
  unresolvedSample: unresolved.slice(0, 30).map((u) => ({ from: rel(u.from), spec: u.spec })),
}, null, 2));
