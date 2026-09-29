#!/usr/bin/env tsx
/**
 * One-shot treasury tx — GMX v2 ExchangeRouter.setUiFeeFactor(10 bps).
 *
 * Usage: npx tsx scripts/set-gmx-ui-fee-factor.ts
 *
 * Reads SLIVERVINE_TREASURY_KEY from process.env / .env. Never prints the key.
 * Live ExchangeRouter (GMX docs Arbitrum): 0x7dE39FF2e232A2203196788d37e234cF8F1b83f1
 * (0x7C68C7866A64FA726979D8E1602BEE14e8689531 has no bytecode on Arbitrum One.)
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Contract, JsonRpcProvider, Wallet, getAddress } from "ethers";
import { ARBITRUM_RPC_URL } from "../src/services/adapters/gmx-v2-rpc-constants";
import { GMX_DEFAULT_UI_FEE_RECEIVER } from "../src/services/adapters/gmx-v2-order-payload";

/** Current GMX v2 ExchangeRouter — Arbitrum One (docs.gmx.io/contracts/addresses). */
export const GMX_V2_EXCHANGE_ROUTER =
  "0x7dE39FF2e232A2203196788d37e234cF8F1b83f1" as const;

/** 10 bps = 0.10% at GMX FLOAT_PRECISION 1e30. */
export const UI_FEE_FACTOR_10_BPS = 1000000000000000000000000000n;

const SET_UI_FEE_FACTOR_ABI = [
  "function setUiFeeFactor(uint256 uiFeeFactor) payable",
] as const;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadDotEnv(): void {
  const path = join(ROOT, ".env");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split("\n")) {
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

function shortAddr(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function readTreasuryKey(): string {
  const raw = process.env.SLIVERVINE_TREASURY_KEY?.trim();
  if (!raw) throw new Error("SLIVERVINE_TREASURY_KEY missing");
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

function expectedTreasury(): string {
  return getAddress(
    process.env.GMX_UI_FEE_RECEIVER?.trim() || GMX_DEFAULT_UI_FEE_RECEIVER,
  );
}

function verifyCheck(stdout: string): void {
  if (!stdout.includes("(10 bps)")) {
    throw new Error("POST_CHECK_MISMATCH: on-chain factor is not 10 bps");
  }
}

async function main(): Promise<void> {
  loadDotEnv();
  const pk = readTreasuryKey();
  const provider = new JsonRpcProvider(ARBITRUM_RPC_URL, 42161);
  const wallet = new Wallet(pk, provider);
  const signer = getAddress(wallet.address);
  const treasury = expectedTreasury();
  const router = getAddress(
    process.env.GMX_EXCHANGE_ROUTER?.trim() || GMX_V2_EXCHANGE_ROUTER,
  );

  if (signer !== treasury) {
    throw new Error(
      `SIGNER_TREASURY_MISMATCH signer=${shortAddr(signer)} expected=${shortAddr(treasury)}`,
    );
  }

  console.log(`[GMX UI FEE SET] Treasury: ${shortAddr(signer)}`);
  console.log(`[GMX UI FEE SET] Router: ${router}`);
  console.log(`[GMX UI FEE SET] Factor: ${UI_FEE_FACTOR_10_BPS.toString()} (10 bps)`);

  const code = await provider.getCode(router);
  if (!code || code === "0x") {
    throw new Error(`EXCHANGE_ROUTER_EMPTY: ${shortAddr(router)}`);
  }

  const contract = new Contract(router, SET_UI_FEE_FACTOR_ABI, wallet);
  const tx = await contract.setUiFeeFactor(UI_FEE_FACTOR_10_BPS, { value: 0n });
  console.log(`[GMX UI FEE SET] Tx: ${tx.hash}`);
  const receipt = await tx.wait();
  if (receipt?.status !== 1) {
    throw new Error(`TX_REVERTED: ${tx.hash}`);
  }
  console.log(`[GMX UI FEE SET] Confirmed block ${receipt.blockNumber}`);

  process.env.GMX_UI_FEE_RECEIVER = signer;
  const check = spawnSync("npx", ["tsx", "scripts/check-gmx-ui-fee-factor.ts"], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  if (check.stdout) process.stdout.write(check.stdout);
  if (check.stderr) process.stderr.write(check.stderr);
  if (check.status !== 0) {
    throw new Error("POST_CHECK_FAILED");
  }
  verifyCheck(check.stdout ?? "");
  console.log("[GMX UI FEE SET] Verified on-chain: 10 bps");
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[GMX UI FEE SET] FAIL", msg.replace(/0x[0-9a-fA-F]{64}/g, "0x***"));
  process.exitCode = 1;
});
