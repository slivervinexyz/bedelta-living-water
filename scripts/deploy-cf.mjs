#!/usr/bin/env node
/**
 * Cloudflare deploy gate — preflight checks then `wrangler deploy`.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function assertFile(relPath, hint) {
  const abs = path.join(root, relPath);
  if (!existsSync(abs)) {
    console.error(`[deploy:cf] Missing ${relPath}${hint ? ` — ${hint}` : ""}`);
    process.exit(1);
  }
}

assertFile("wrangler.toml", "Sole Worker SSOT — name=bedelta-living-water");
assertFile("dist/index.html", "Run pnpm run build:assets first");

console.log("[deploy:cf] Typecheck…");
run("pnpm", ["exec", "tsc", "--noEmit"]);

console.log("[deploy:cf] Test suite…");
run("pnpm", ["exec", "vitest", "run"]);

console.log("[deploy:cf] Static assets…");
run("pnpm", ["run", "build:assets"]);

console.log("[deploy:cf] Wrangler deploy…");
run("pnpm", ["exec", "wrangler", "deploy"]);

console.log("[deploy:cf] Post-deploy verification:");
console.log('  curl -s -H "X-Santenmoku-Canary: santenmoku" https://bedeltawater.slivervine.xyz/api/hud-stream | jq .');
console.log("  curl -s https://bedeltawater.slivervine.xyz/api/telemetry/health | jq .");
