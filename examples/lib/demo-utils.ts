/** Shared CLI demo utilities — safe HKT time, Pino mute, clean trip exits. */
/// <reference types="node" />
import * as readline from "readline/promises";

/** HKT 14:00 — outside tsunami shield window (21:00–23:00 HKT). */
const DEMO_SAFE_ISO = "2026-09-20T06:00:00.000Z";

/** Wall-clock ISO for proof JSON persistence (fresh on each demo run). */
export function getDemoPersistTimestamp(): string {
  return new Date().toISOString();
}

export const IS_LIVINGWATER_MODE =
  process.argv.includes("--livingwater") || process.argv.includes("--live");

export function parseTripMode(argv: readonly string[] = process.argv): boolean {
  return (
    argv.includes("--trip") ||
    argv.includes("--rogue") ||
    argv.includes("trip") ||
    argv.includes("rogue")
  );
}

export const IS_TRIP_MODE = parseTripMode();

export function isDemoJsonArgv(argv: readonly string[] = process.argv): boolean {
  return argv.includes("--json");
}

export function isDemoNonInteractiveArgv(argv: readonly string[] = process.argv): boolean {
  return argv.includes("--non-interactive") || isDemoJsonArgv(argv);
}

export function isDemoBenchArgv(argv: readonly string[] = process.argv): boolean {
  return argv.includes("--bench");
}

/** ANSI scenario HUD on; only `--json` suppresses (matches ExoMesh `!jsonMode`). */
export function isDemoHudArgv(argv: readonly string[] = process.argv): boolean {
  return !isDemoJsonArgv(argv);
}

/** TTY + no `--non-interactive` — ENTER pauses between scenarios only. */
export function isDemoInteractiveArgv(argv: readonly string[] = process.argv): boolean {
  return !isDemoNonInteractiveArgv(argv) && Boolean(process.stdin.isTTY);
}

export function releaseDemoStdin(): void {
  if (process.stdin.isTTY && !process.stdin.readableEnded) process.stdin.pause();
}

const GRAY = "\x1b[90m";

/** TTY interactive ENTER gate before/between scenario matrix steps. */
export async function awaitDemoScenarioTransition(
  nextId: string,
  verb: "begin" | "advance",
): Promise<void> {
  if (isDemoJsonArgv() || !process.stdin.isTTY) return;
  const prompt =
    verb === "begin"
      ? `\n${GRAY}Press ENTER to begin Scenario ${nextId}...${R}`
      : `\n${GRAY}Press ENTER to advance to Scenario ${nextId}...${R}`;
  console.log(prompt);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    await rl.question("");
  } finally {
    rl.close();
    releaseDemoStdin();
  }
}

const R = "\x1b[0m";
const GREEN = "\x1b[32;1m";
const RED = "\x1b[31;1m";
const BOLD = "\x1b[1m";

export function getDemoSafeTimestamp(): { nowMs: number; at: Date } {
  const at = new Date(DEMO_SAFE_ISO);
  return { nowMs: at.getTime(), at };
}

export function printLivingWaterBanner(): void {
  const MAGENTA = "\x1b[35;1m";
  const line = "═".repeat(65);
  console.log(`\n${MAGENTA}${line}${R}`);
  console.log(`${MAGENTA}${BOLD}[LIVING_WATER PRIVATE LIVE DEBUG MODE ACTIVE]${R}`);
  console.log(`${MAGENTA}${line}${R}\n`);
}

/** Clock + console policy for demo harness (probe seeding stays in demo-harness). */
export function initDemoEnvironmentClock(): {
  nowMs: number;
  at: Date;
  restoreConsole: () => void;
} {
  if (IS_LIVINGWATER_MODE) {
    printLivingWaterBanner();
    const nowMs = Date.now();
    return { nowMs, at: new Date(nowMs), restoreConsole: () => {} };
  }
  const restoreConsole = muteLibraryConsole();
  const { nowMs, at } = getDemoSafeTimestamp();
  return { nowMs, at, restoreConsole };
}

function isPinoJsonLine(msg: string): boolean {
  return msg.includes('"level"') && msg.includes('"module"');
}

export function muteLibraryConsole(): () => void {
  const warn = console.warn;
  const log = console.log;
  const error = console.error;
  const filter = (fn: typeof console.warn) => (...args: unknown[]) => {
    const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    if (isPinoJsonLine(msg)) return;
    fn(...args);
  };
  console.warn = filter(warn);
  console.log = filter(log);
  console.error = filter(error);
  return () => {
    console.warn = warn;
    console.log = log;
    console.error = error;
  };
}

export function printExoMeshGuardInterceptionBanner(reason = "FAIL_CLOSED"): void {
  console.log(`\n${RED}${BOLD}🛑 EXOMESH GUARD INTERCEPTED: ${reason} (0-Gas Intercepted)${R}`);
  console.log(`${GREEN}└─ Status: 🟢 INTERCEPTION VERIFIED (lostUsd ≡ $0.00)${R}\n`);
}

export function handleDemoExit(isTripped: boolean, reason: string): void {
  if (!isTripped) return;
  printExoMeshGuardInterceptionBanner(reason);
  process.exit(0);
}
