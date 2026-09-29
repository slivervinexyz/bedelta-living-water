#!/usr/bin/env node
/**
 * Pgate production gate — validate, sync Pgate.md metrics, commit & push.
 * Usage: npm run pgate:sync
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PGATE = join(ROOT, "Pgate.md");
const WRANGLER = join(ROOT, "wrangler.toml");

const VERSION = "v1.0";
const EXPECTED_TESTS = 398;
const REQUIRED_DOMAINS = ["silvervinelabs.com", "bedeltawater.slivervine.xyz"];
const COMMIT_MSG = "chore(pgate): sync production gate audit and metrics v1.0";

function log(step, msg) {
  console.log(`[pgate:sync] ${step}: ${msg}`);
}

function exec(cmd, args, { cwd = ROOT } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"], shell: false });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += c; });
    child.stderr.on("data", (c) => { stderr += c; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${cmd} ${args.join(" ")} failed (${code}):\n${stderr || stdout}`));
        return;
      }
      resolve({ stdout, stderr, output: stdout + stderr });
    });
  });
}

function runNpm(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", args, { cwd: ROOT, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (c) => { output += c; });
    child.stderr.on("data", (c) => { output += c; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`npm ${args.join(" ")} failed (${code}):\n${output}`));
      else resolve(output);
    });
  });
}

function parseWranglerKv() {
  const raw = readFileSync(WRANGLER, "utf8");
  const block =
    raw.match(
      /\[\[kv_namespaces\]\][\s\S]*?binding\s*=\s*"BEDELTA_WATER_KV"[\s\S]*?id\s*=\s*"([^"]+)"/,
    ) ??
    raw.match(
      /\[\[kv_namespaces\]\][\s\S]*?binding\s*=\s*"SLIVERVINE_KV"[\s\S]*?id\s*=\s*"([^"]+)"/,
    );
  if (!block?.[1]) {
    throw new Error("BEDELTA_WATER_KV / SLIVERVINE_KV namespace not found in wrangler.toml");
  }
  return { binding: "BEDELTA_WATER_KV", id: block[1] };
}

function parseVitest(output) {
  const pass = output.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
  if (pass) return { passed: Number(pass[1]), total: Number(pass[2]) };
  const alt = output.match(/(\d+)\s+passed\s+\((\d+)\)/);
  if (alt) return { passed: Number(alt[1]), total: Number(alt[2]) };
  throw new Error("Unable to parse Vitest results from test output");
}

function countTestFiles() {
  let count = 0;
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".test.ts")) count += 1;
    }
  }
  walk(join(ROOT, "tests"));
  return count;
}

function formatTimestamp(date = new Date()) {
  return date.toLocaleString("sv-SE", { timeZone: "Asia/Taipei" }).replace("T", " ");
}

function metricsBlock({ passed, total, testFiles, kv, timestamp, tscClean }) {
  return `<!-- pgate:sync:metrics:start -->
| Check | Command | Verified Result |
|---|---|---|
| Vitest master suite | \`npm test\` | **${passed} / ${total}** passed · **${testFiles}** files · 100% green |
| TypeScript | \`npx tsc --noEmit\` | **${tscClean ? "CLEAN" : "FAILED"}** (0 errors) |
| Protocol version | — | **${VERSION}** |
| KV binding | \`BEDELTA_WATER_KV\` | \`${kv.id}\` |
| Domains | — | \`bedeltawater.slivervine.xyz\` · \`silvervinelabs.com\` |
| Last synced | Asia/Taipei | **${timestamp}** |
<!-- pgate:sync:metrics:end -->`;
}

function ensurePgateTemplate() {
  if (existsSync(PGATE)) return readFileSync(PGATE, "utf8");
  return `# Pgate.md — Production Gate Audit & Personal Operations SOP

**Protocol:** SliverVine Protocol · Santenmoku ${VERSION}
**Product:** BeDelta Living Water
**Scope:** Technical audit · domain mapping · KV state · grant reproducibility

---

## Domain & Brand Mapping

| Role | Canonical Name | Domain |
|---|---|---|
| Official Protocol | **SliverVine Protocol** | Code · docs · grant audit |
| BeDelta Worker / DApp | **bedeltawater.slivervine.xyz** | Workers API · telemetry |
| Public PR Brand | **SilverVine Labs** | Grant · brand |
| Public Website Shield | **silvervinelabs.com** | Marketing HUD |

---

## Verified Production Metrics (${VERSION})

${metricsBlock({ passed: EXPECTED_TESTS, total: EXPECTED_TESTS, testFiles: "—", kv: { id: "—" }, timestamp: "—", tscClean: true })}

---

## Grant Reviewer Commands

\`\`\`bash
npm install
npm test
npx tsc --noEmit
npm run test:soak
\`\`\`

**Steel Core:** [bedeltawater.slivervine.xyz](https://bedeltawater.slivervine.xyz)
**PR Shield:** [silvervinelabs.com](https://silvervinelabs.com)
`;
}

function syncMetrics(content, block) {
  const re = /<!-- pgate:sync:metrics:start -->[\s\S]*?<!-- pgate:sync:metrics:end -->/;
  if (re.test(content)) return content.replace(re, block);
  return content.replace(
    /## Verified Production Metrics[^\n]*\n/,
    (m) => `${m}\n${block}\n\n`,
  );
}

function validatePgate(content, { passed, total, kv }) {
  const checks = [
    [VERSION, "protocol version"],
    ["bedeltawater.slivervine.xyz", "core DApp domain"],
    ["silvervinelabs.com", "PR shield domain"],
    ["SliverVine Protocol", "protocol name"],
    [kv.binding, "KV binding name"],
    [kv.id, "KV namespace id"],
    [`${passed} / ${total}`, "test metrics"],
  ];
  for (const [needle, label] of checks) {
    if (!content.includes(needle)) {
      throw new Error(`Pgate.md missing ${label}: "${needle}"`);
    }
  }
  for (const domain of REQUIRED_DOMAINS) {
    if (!content.includes(domain)) throw new Error(`Pgate.md missing domain: ${domain}`);
  }
}

async function main() {
  log("1/4", "Running npm test…");
  const testOut = await runNpm(["test"]);
  const { passed, total } = parseVitest(testOut);
  if (passed !== total) throw new Error(`Tests not 100% green: ${passed}/${total}`);
  if (total !== EXPECTED_TESTS) {
    throw new Error(`Expected ${EXPECTED_TESTS} tests, got ${total} (${passed} passed)`);
  }
  log("1/4", `${passed}/${total} passed`);

  log("2/4", "Running npx tsc --noEmit…");
  await runNpm(["exec", "--", "tsc", "--noEmit"]);
  log("2/4", "tsc CLEAN");

  const kv = parseWranglerKv();
  const testFiles = countTestFiles();
  const timestamp = formatTimestamp();
  const block = metricsBlock({ passed, total, testFiles, kv, timestamp, tscClean: true });

  log("3/4", "Syncing Pgate.md…");
  let content = ensurePgateTemplate();
  content = syncMetrics(content, block);
  if (!content.includes(VERSION)) content = content.replace("Santenmoku", `Santenmoku ${VERSION}`);
  validatePgate(content, { passed, total, kv });
  writeFileSync(PGATE, content, "utf8");
  log("3/4", `Pgate.md updated (${timestamp})`);

  log("4/4", "Git add · commit · push…");
  await exec("git", ["add", "Pgate.md"]);
  const status = await exec("git", ["status", "--porcelain", "Pgate.md"]);
  if (!status.stdout.trim()) {
    log("4/4", "No Pgate.md changes — skipping commit");
    return;
  }
  await exec("git", ["commit", "-m", COMMIT_MSG]);
  await exec("git", ["push", "origin", "main"]);
  log("4/4", "Pushed to origin/main");
}

main().catch((err) => {
  console.error("[pgate:sync] FAILED:", err.message);
  process.exit(1);
});
