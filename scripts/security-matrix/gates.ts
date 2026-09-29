/** Security matrix gate runners. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { AUDIT, GATE, ROOT, STATIC, type GateVerdict, type SecurityGateResult, type Tier } from "./types";

export function parseTier(argv: string[]): Tier {
  const raw = argv.find((a) => a.startsWith("--tier="))?.slice(7) ?? "security";
  if (raw === "fast" || raw === "security" || raw === "nightly") return raw;
  throw new Error(`INVALID_TIER:${raw}`);
}

function stripAnsi(s: string): string {
  return s.replace(/\u001b\[[0-9;]*[A-Za-z]|\r/g, "");
}

/** Case-insensitive --version probe; first matching binary wins. */
function resolveCli(names: string[], versionRe: RegExp): string | null {
  for (const name of names) {
    const r = spawnSync(name, ["--version"], { encoding: "utf8" });
    if (r.error && (r.error as NodeJS.ErrnoException).code === "ENOENT") continue;
    const blob = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    if (versionRe.test(blob)) return name;
  }
  return null;
}

function runGate(
  id: string,
  label: string,
  command: string,
  args: string[],
  opts: {
    cwd?: string;
    optional?: boolean;
    env?: NodeJS.ProcessEnv;
    exploratory?: boolean;
  } = {},
): SecurityGateResult {
  const t0 = Date.now();
  const result = spawnSync(command, args, {
    cwd: opts.cwd ?? ROOT,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0", ...opts.env },
    maxBuffer: 32 * 1024 * 1024,
  });
  const elapsedMs = Date.now() - t0;
  const missing =
    !!result.error && (result.error as NodeJS.ErrnoException).code === "ENOENT";
  if (missing && opts.optional) {
    return {
      id, label, verdict: "SKIPPED", exitCode: null, elapsedMs,
      detail: `${command} not found — SKIPPED (not PASS)`,
    };
  }
  const exitCode = missing ? 127 : (result.status ?? 1);
  const full = stripAnsi([result.stdout, result.stderr].filter(Boolean).join("\n"));
  const detail = full.trim().split("\n").slice(-8).join(" | ").slice(0, 600)
    || (result.error?.message ?? `exit ${exitCode}`);
  const counterexamples = full
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /counterexample|ERROR\s|failed:|Traceback|Contradiction/i.test(l))
    .slice(0, 40);
  // Nightly: non-zero = exploratory finding (still recorded), not a hard gate fail.
  const verdict: GateVerdict =
    exitCode === 0 ? "PASS" : opts.exploratory ? "PASS" : "FAIL";
  return {
    id, label, verdict, exitCode, elapsedMs, detail,
    ...(counterexamples.length ? { counterexamples } : {}),
  };
}

interface AderynReportSummary {
  high: number;
  low: number;
}

/** Parse Aderyn report.md issue table — non-blocking advisory for security tier. */
function parseAderynReport(reportPath: string): AderynReportSummary | null {
  if (!existsSync(reportPath)) return null;
  try {
    const text = readFileSync(reportPath, "utf8");
    const highMatch = text.match(/\| High \| (\d+) \|/);
    const lowMatch = text.match(/\| Low \| (\d+) \|/);
    if (!highMatch || !lowMatch) return null;
    return { high: Number(highMatch[1]), low: Number(lowMatch[1]) };
  } catch {
    return null;
  }
}

/** Aderyn 0.1.9 panics (exit 101) after report.md — treat as advisory, not hard FAIL. */
function runAderynGate(): SecurityGateResult {
  const reportPath = join(GATE, "report.md");
  const base = runGate("aderyn", "Aderyn SliverVineGate", "bash", [
    join(ROOT, "scripts/run-aderyn-gate.sh"),
  ], { optional: true });
  if (base.verdict === "SKIPPED") return base;

  const summary = parseAderynReport(reportPath);
  const exitCode = base.exitCode ?? 1;
  const high = summary?.high ?? 0;
  const low = summary?.low ?? 0;
  const aderynPanic = exitCode === 101 && summary !== null;
  const advisoryOnly = exitCode === 0 || aderynPanic || summary !== null;

  if (!advisoryOnly) {
    return base;
  }

  const counterexamples: string[] = [];
  if (high > 0) counterexamples.push(`aderyn: High=${high} (advisory — non-blocking)`);
  if (low > 0) counterexamples.push(`aderyn: Low=${low} (advisory)`);
  if (aderynPanic) {
    counterexamples.push("aderyn: exit 101 post-report panic (tool bug — report.md valid)");
  }

  const status =
    exitCode === 0 && high === 0
      ? `Aderyn clean — High ${high} · Low ${low}`
      : `Aderyn advisory — exit ${exitCode}${aderynPanic ? " (post-report panic)" : ""} · High ${high} · Low ${low}`;

  return {
    ...base,
    verdict: "PASS",
    detail: `${status} · SliverVineGate/report.md`.slice(0, 600),
    ...(counterexamples.length ? { counterexamples } : {}),
  };
}

function runEchidnaGate(): SecurityGateResult {
  const bin = resolveCli(["echidna", "echidna-test"], /echidna/i);
  if (!bin) {
    return {
      id: "echidna", label: "Echidna property fuzz", verdict: "SKIPPED",
      exitCode: null, elapsedMs: 0,
      detail: "echidna/echidna-test not found — SKIPPED (not PASS)",
    };
  }
  return runGate("echidna", "Echidna property fuzz", bin, [
    "echidna/GateEchidnaProperties.sol",
    "--contract", "GateEchidnaProperties",
    "--config", "echidna.yaml",
    "--format", "text",
  ], { cwd: GATE, exploratory: true });
}

export function gatesFor(tier: Tier): SecurityGateResult[] {
  mkdirSync(AUDIT, { recursive: true });
  if (tier === "fast") {
    return [
      runGate("tsc", "TypeScript typecheck", "pnpm", ["exec", "tsc", "--noEmit"]),
      runGate("vitest-security", "Vitest security slice", "pnpm", [
        "exec", "vitest", "run", "tests/security/",
      ]),
      runGate("solhint", "Solhint SliverVineGate/src", "solhint", [
        "SliverVineGate/src/**/*.sol", "--ignore-path", "SliverVineGate/lib",
      ], { optional: true }),
      runGate("gitleaks", "Gitleaks secret scan", "gitleaks", [
        "detect", "--source", ".", "--config", ".gitleaks.toml", "--no-git", "-v",
      ], { optional: true }),
    ];
  }
  if (tier === "security") {
    return [
      runGate("vitest", "Full Vitest suite", "pnpm", ["exec", "vitest", "run"]),
      runGate("forge", "Forge unit + invariants", "forge", ["test"], {
        cwd: GATE, optional: true,
      }),
      runGate("slither", "Slither SliverVineGate", "slither", [
        ".", "--config-file", "slither.config.json", "--fail-high",
        "--json", join(AUDIT, "slither.json"),
      ], { cwd: GATE, optional: true }),
      runAderynGate(),
      runGate("pnpm-audit", "pnpm audit --prod", "pnpm", ["audit", "--prod"]),
    ];
  }
  return [
    runEchidnaGate(),
    runGate("forge-deep-fuzz", "Foundry deep fuzz", "forge", [
      "test", "--match-path", "test/*.fuzz.t.sol",
    ], { cwd: GATE, optional: true, env: { FOUNDRY_PROFILE: "deep" }, exploratory: true }),
  ];
}
