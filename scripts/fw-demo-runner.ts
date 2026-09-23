#!/usr/bin/env tsx
/** FW CAN demo orchestrator — `pnpm demo:FW-all` · `pnpm demo:FW-menu`. */
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CAN_VECTORS = [
  { id: "FW-01", title: "Stale oracle / delayed feed", script: "demo:FW-01" },
  { id: "FW-02", title: "Async race (R20 sever vs in-flight sign)", script: "demo:FW-02" },
  { id: "FW-04", title: "RPC poisoning / defense DOS", script: "demo:FW-04" },
  { id: "FW-10", title: "R17 00:00 UTC reset injection", script: "demo:FW-10" },
  { id: "FW-11", title: "Permit2 / EIP-712 approval phishing", script: "demo:FW-11" },
  { id: "FW-12", title: "EIP-5792 batched-call smuggling", script: "demo:FW-12" },
  { id: "FW-13", title: "AI retry-storm / 4th-strike sever", script: "demo:FW-13" },
  { id: "FW-14", title: "ERC-7540 async vault operator hijack", script: "demo:FW-14" },
] as const;

type Mode = "all" | "menu";

function parseMode(argv: string[]): Mode {
  const hit = argv.find((a) => a.startsWith("--mode="));
  if (!hit) throw new Error("Missing --mode=all|menu");
  const mode = hit.slice("--mode=".length);
  if (mode !== "all" && mode !== "menu") throw new Error(`Invalid mode: ${mode}`);
  return mode;
}

function banner(id: string, title: string, index: number, total: number): void {
  const line = "═".repeat(72);
  process.stdout.write(`\n${line}\n`);
  process.stdout.write(`  [${index}/${total}] ${id} — ${title}\n`);
  process.stdout.write(`${line}\n`);
}

function verdictLabel(code: number | null, signal: NodeJS.Signals | null): string {
  if (code === 0) return "PASS";
  if (signal) return `FAIL_CLOSED (${signal})`;
  return `FAIL_CLOSED (exit ${code ?? "?"})`;
}

function runVector(script: string): number | null {
  const r = spawnSync("pnpm", ["run", script], { cwd: ROOT, stdio: "inherit", env: process.env });
  return r.status;
}

async function pauseEnter(): Promise<void> {
  if (!process.stdin.isTTY) return;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>((resolve) => {
    rl.question("\n[Press ENTER to continue]", () => {
      rl.close();
      resolve();
    });
  });
}

async function runSequential(pauseBetween: boolean): Promise<number> {
  const total = CAN_VECTORS.length;
  let failed = 0;
  for (let i = 0; i < total; i++) {
    const v = CAN_VECTORS[i];
    banner(v.id, v.title, i + 1, total);
    process.stdout.write(`  → pnpm run ${v.script}\n\n`);
    const code = runVector(v.script);
    const label = verdictLabel(code, null);
    process.stdout.write(`\n  ▶ ${v.id} result: ${label}\n`);
    if (code !== 0) failed++;
    if (pauseBetween && i < total - 1) await pauseEnter();
  }
  process.stdout.write(`\n══ FW CAN suite complete: ${total - failed}/${total} PASS ══\n`);
  return failed > 0 ? 1 : 0;
}

function printMenu(): void {
  process.stdout.write("\n╔══════════════════════════════════════════════════════════════════════╗\n");
  process.stdout.write("║  SliverVine ExoMesh — FW CAN Adversarial Boundary Demo Selector      ║\n");
  process.stdout.write("╚══════════════════════════════════════════════════════════════════════╝\n");
  process.stdout.write("  0. Run All CAN Suite (sequential stepper)\n");
  CAN_VECTORS.forEach((v, i) => process.stdout.write(`  ${i + 1}. ${v.id} — ${v.title}\n`));
  process.stdout.write("  q. Quit\n");
}

async function runMenu(): Promise<number> {
  if (!process.stdin.isTTY) {
    process.stderr.write("FW menu requires an interactive TTY. Use: pnpm demo:FW-all\n");
    return 1;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));
  while (true) {
    printMenu();
    const raw = (await ask("\nSelect option: ")).trim().toLowerCase();
    if (raw === "q" || raw === "quit" || raw === "exit") {
      rl.close();
      return 0;
    }
    if (raw === "0") {
      rl.close();
      return runSequential(true);
    }
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1 || n > CAN_VECTORS.length) {
      process.stdout.write("  Invalid selection — try again.\n");
      continue;
    }
    const v = CAN_VECTORS[n - 1];
    banner(v.id, v.title, 1, 1);
    process.stdout.write(`  → pnpm run ${v.script}\n\n`);
    const code = runVector(v.script);
    process.stdout.write(`\n  ▶ ${v.id} result: ${verdictLabel(code, null)}\n`);
  }
}

const mode = parseMode(process.argv.slice(2));
const exitCode = await (mode === "all" ? runSequential(true) : runMenu());
process.exit(exitCode);
