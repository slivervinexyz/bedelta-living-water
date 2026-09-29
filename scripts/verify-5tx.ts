#!/usr/bin/env tsx
/**
 * Hyperliquid Testnet — 5× $10 USDT hedge/market orders with checkSoilResistance + W01 defense.
 *
 * Dry-run by default. Live posts require HL_TESTNET_PRIVATE_KEY + HL_LIVE=1.
 *
 * Usage:
 *   pnpm verify:5tx
 *   HL_LIVE=1 pnpm verify:5tx   # reads HL_TESTNET_PRIVATE_KEY from .env.local
 *   SKIP_SOIL_CHECK=1 pnpm verify:5tx --skip-soil   # testnet smoke: bypass soil probe abort
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runVerify5Tx } from "../src/data/verify-5tx-runner";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "../src/data/verified_5tx_results.json");
const ENV_LOCAL_PATH = join(__dirname, "../.env.local");

function loadEnvLocal(): void {
  if (!existsSync(ENV_LOCAL_PATH)) return;
  for (const raw of readFileSync(ENV_LOCAL_PATH, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function isSkipSoilRequested(argv: string[]): boolean {
  if (argv.includes("--skip-soil")) return true;
  const envKeys = ["SKIP_SOIL_PROBE_CHECK", "SKIP_SOIL_CHECK"] as const;
  return envKeys.some((k) => process.env[k] === "1" || process.env[k] === "true");
}

async function main(): Promise<void> {
  loadEnvLocal();
  const argv = process.argv.slice(2);
  const skipSoil = isSkipSoilRequested(argv);
  if (skipSoil) {
    console.error("[verify:5tx] soil probe abort bypassed (--skip-soil / SKIP_SOIL_CHECK)");
  }
  const report = await runVerify5Tx({
    abortOnSoilTrip: skipSoil ? false : undefined,
    skipSoilProbe: skipSoil,
  });
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(report, null, 2));
  console.error(`\n[verify:5tx] wrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("[verify:5tx] failed", err);
  process.exitCode = 1;
});
