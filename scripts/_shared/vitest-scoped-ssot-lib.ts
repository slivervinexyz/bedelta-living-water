import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { collectPublicDocs } from "../fix-public-doc-links-lib";

export const SCOPED_SSOT_REL = "docs/audit/VITEST_SCOPED_SSOT.json";

export interface VitestSuiteEntry {
  command?: string;
  files?: number;
  tests: number;
}

export interface VitestScopedSsot {
  schema: "silvervine.vitest-scoped.ssot.v1";
  generatedAt: string;
  suites: Record<string, VitestSuiteEntry>;
}

const SEED_TARGETS = [
  "tests/sdk/",
  "tests/sdk/retail-guard-provider.test.ts",
  "tests/sdk/eip5792-send-calls.test.ts",
  "tests/core/intent-sinking-audit.test.ts",
  "tests/erc7540-async-escort.test.ts",
  "tests/core/protocol-mask-sync.test.ts",
  "tests/services/api/pendle-shield.test.ts",
  "tests/clock-monotonicity.test.ts",
  "tests/adapters/across-ingress-bridge.test.ts",
  "tests/core/portfolio-cascade-replay.test.ts",
  "tests/wasm/stylus-gmx-parity.test.ts",
] as const;

const TEST_FILE_IN_DOC_RE = /tests\/[\w./-]+\.test\.ts/g;
const SDK_DIR_IN_DOC_RE = /tests\/sdk\//g;

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

export function discoverTargetsFromPublicDocs(root: string): string[] {
  const set = new Set<string>(SEED_TARGETS);
  for (const file of collectPublicDocs(root, walkMd)) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(TEST_FILE_IN_DOC_RE)) set.add(m[0]);
    if (SDK_DIR_IN_DOC_RE.test(text)) set.add("tests/sdk/");
  }
  return [...set].sort();
}

interface VitestJsonReport {
  numPassedTests: number;
  numTotalTests: number;
  success: boolean;
  testResults: { name: string; assertionResults: unknown[] }[];
}

export function runVitestTarget(root: string, target: string): VitestSuiteEntry {
  const cmd = `pnpm exec vitest run ${target} --run --reporter=json`;
  const raw = execSync(cmd, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const line = raw.trim().split("\n").find((l) => l.startsWith("{")) ?? raw.trim();
  const report = JSON.parse(line) as VitestJsonReport;
  if (!report.success) {
    throw new Error(`vitest failed for ${target}`);
  }
  const entry: VitestSuiteEntry = { tests: report.numPassedTests };
  if (target.endsWith("/")) {
    entry.command = `npx vitest run ${target}`;
    entry.files = report.testResults.length;
  }
  return entry;
}

export function generateVitestScopedSsot(root: string): VitestScopedSsot {
  const targets = discoverTargetsFromPublicDocs(root);
  const suites: Record<string, VitestSuiteEntry> = {};
  for (const target of targets) {
    suites[target] = runVitestTarget(root, target);
  }
  return {
    schema: "silvervine.vitest-scoped.ssot.v1",
    generatedAt: new Date().toISOString(),
    suites,
  };
}

export function loadVitestScopedSsot(root: string): VitestScopedSsot {
  const p = path.join(root, SCOPED_SSOT_REL);
  return JSON.parse(fs.readFileSync(p, "utf8")) as VitestScopedSsot;
}

export function writeVitestScopedSsot(root: string, ssot: VitestScopedSsot): void {
  const p = path.join(root, SCOPED_SSOT_REL);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(ssot, null, 2)}\n`);
}

const STALE_SDK_AGG_RE = /48\/48|48\s*\/\s*48|\(5 test files\)|\(5 files\)/i;

const COUNT_CLAIM_RE = /(\d+)\/(\d+)(?:\s*PASS)?/g;
const TEST_PATH_RE = /tests\/[\w./-]+\.test\.ts/;

export function auditPublicDocTestCounts(
  root: string,
  ssot: VitestScopedSsot,
  files: string[],
): string[] {
  const violations: string[] = [];
  const sdk = ssot.suites["tests/sdk/"];
  const sdkDisplay = sdk ? `${sdk.tests}/${sdk.tests} PASS (${sdk.files} test files)` : null;

  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const lines = fs.readFileSync(file, "utf8").split("\n");

    lines.forEach((line, i) => {
      const n = i + 1;
      if (line.includes("tests/sdk/") && STALE_SDK_AGG_RE.test(line)) {
        violations.push(`${rel}:${n}: stale tests/sdk/ aggregate (use ${sdkDisplay ?? "SSOT"})`);
      }
      if (sdk && /vitest run tests\/sdk\/(?=[\s`#]|$)/.test(line)) {
        const agg = line.match(/(\d+)\/(\d+)(?:\s*PASS)?/);
        if (agg && Number(agg[1]) === Number(agg[2]) && Number(agg[1]) !== sdk.tests) {
          violations.push(
            `${rel}:${n}: tests/sdk/ aggregate claims ${agg[1]}/${agg[2]} but SSOT expects ${sdk.tests}/${sdk.tests}`,
          );
        }
      }
      if (!line.includes("vitest run")) return;

      for (const m of line.matchAll(new RegExp(TEST_PATH_RE.source, "g"))) {
        const testPath = m[0];
        const expected = ssot.suites[testPath]?.tests;
        if (expected === undefined) continue;
        const tail = line.slice((m.index ?? 0) + testPath.length);
        const claim = tail.match(/(\d+)\/(\d+)(?:\s*PASS)?/);
        if (!claim) continue;
        const claimed = Number(claim[1]);
        const denom = Number(claim[2]);
        if (claimed !== denom) continue;
        // Chaos-matrix style claims (e.g. 255/255 fail-closed) are not per-file Vitest counts.
        if (claimed > 64) continue;
        if (claimed !== expected) {
          violations.push(
            `${rel}:${n}: ${testPath} claims ${claimed}/${denom} but SSOT expects ${expected}/${expected}`,
          );
        }
      }
    });
  }

  return violations;
}
