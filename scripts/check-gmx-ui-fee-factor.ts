#!/usr/bin/env tsx
/**
 * Temporary read-only probe — GMX v2 DataStore UI_FEE_FACTOR for treasury.
 *
 * Usage: npx tsx scripts/check-gmx-ui-fee-factor.ts
 */

import { getAddress } from "ethers";
import { GMX_V2_DATASTORE } from "../src/adapters/gmx";
import { postArbitrumJsonRpc } from "../src/services/adapters/arbitrum-rpc-fallback";
import { DATASTORE_GET_UINT_SELECTOR } from "../src/services/adapters/gmx-v2-live-delta-reader";
import { hashData, hashString } from "../src/services/adapters/gmx-v2-datastore";
import { GMX_DEFAULT_UI_FEE_RECEIVER } from "../src/services/adapters/gmx-v2-order-payload";

/** GMX v2 FLOAT_PRECISION — UI fee factor is stored as 1e30-scaled ratio. */
const GMX_FLOAT_PRECISION = 10n ** 30n;
const UI_FEE_FACTOR = hashString("UI_FEE_FACTOR");

function resolveTreasury(): string {
  const raw = process.env.GMX_UI_FEE_RECEIVER?.trim() || GMX_DEFAULT_UI_FEE_RECEIVER;
  return getAddress(raw);
}

function shortAddr(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function uiFeeFactorDataStoreKey(account: string): string {
  return hashData(["bytes32", "address"], [UI_FEE_FACTOR, getAddress(account)]);
}

function encodeGetUint(key: string): string {
  return DATASTORE_GET_UINT_SELECTOR + key.slice(2).padStart(64, "0");
}

function factorToBps(raw: bigint): number {
  return Number(raw) / Number(GMX_FLOAT_PRECISION / 10_000n);
}

function formatBps(bps: number): string {
  if (!Number.isFinite(bps)) return "0 bps";
  const rounded = Math.round(bps * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded} bps` : `${rounded.toFixed(2)} bps`;
}

async function readUiFeeFactor(key: string): Promise<bigint> {
  const json = (await postArbitrumJsonRpc({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [{ to: GMX_V2_DATASTORE, data: encodeGetUint(key) }, "latest"],
  })) as { result?: string; error?: { message?: string } } | null;
  if (!json) throw new Error("ARBITRUM_RPC_FAIL: DataStore getUint exhausted");
  if (json.error) throw new Error(`DATASTORE_RPC_ERROR: ${json.error.message ?? "eth_call"}`);
  const hex = json.result ?? "0x";
  return hex === "0x" ? 0n : BigInt(hex);
}

async function main(): Promise<void> {
  const treasury = resolveTreasury();
  const key = uiFeeFactorDataStoreKey(treasury);
  const raw = await readUiFeeFactor(key);
  const bps = formatBps(factorToBps(raw));
  console.log(`[GMX UI FEE CHECK] Treasury: ${shortAddr(treasury)}`);
  console.log(`[GMX UI FEE CHECK] Raw Key: ${key}`);
  console.log(`[GMX UI FEE CHECK] On-Chain Factor: ${raw.toString()} (${bps})`);
}

main().catch((err) => {
  console.error("[GMX UI FEE CHECK] FAIL", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
