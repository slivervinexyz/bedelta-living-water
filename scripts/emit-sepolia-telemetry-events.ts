#!/usr/bin/env tsx
/**
 * Q1 — Sepolia Gate telemetry: replay Dune-indexable logs; optional RiskTripBlocked emit.
 * Usage: npx tsx scripts/emit-sepolia-telemetry-events.ts
 * Broadcast: BROADCAST=1 (+ PRIVATE_KEY | ARB_SEPOLIA_PRIVATE_KEY | WALLET_A_PK in .env)
 */
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { resolveSepoliaBroadcastPrivateKey } from "./_shared/gate-broadcast-env";
import {
  emitRiskTripBlocked,
  GATE_TELEMETRY_ABI,
  probeRecentGateLogs,
} from "./_shared/gate-telemetry-emit";
import { resolveGateForNetwork } from "./_shared/onchain-dune-telemetry";
import { loadDotEnv, mergeEnv } from "./zerodev-env";

async function main(): Promise<void> {
  const env = mergeEnv(loadDotEnv());
  const gate = resolveGateForNetwork("sepolia") as Hex;
  const rpc = (env.ARB_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc").trim();
  const client = createPublicClient({ chain: arbitrumSepolia, transport: http(rpc) });
  const [chainId, halted, latest] = await Promise.all([
    client.getChainId(),
    client.readContract({ address: gate, abi: GATE_TELEMETRY_ABI, functionName: "halted" }),
    client.getBlockNumber(),
  ]);
  console.log("[Q1] Dune Telemetry (Sepolia Live Verification & Production SQL Spec)");
  console.log("[Q1] rpc", rpc, "chainId", chainId, "gate", gate, "halted", halted, "head", latest.toString());
  const logs = await probeRecentGateLogs(client, gate);
  console.log("[Q1] indexed events (last ~8k blocks)", logs.length);
  for (const log of logs.slice(-8)) {
    console.log("[Q1] log", log.eventName, log.transactionHash, log.args);
  }
  if (env.BROADCAST !== "1") {
    console.log("[Q1] dry-run — set BROADCAST=1 and PRIVATE_KEY|ARB_SEPOLIA_PRIVATE_KEY|WALLET_A_PK");
    return;
  }
  const account = privateKeyToAccount(resolveSepoliaBroadcastPrivateKey(env));
  const wallet = createWalletClient({ account, chain: arbitrumSepolia, transport: http(rpc) });
  const hash = await emitRiskTripBlocked(wallet, gate, account.address, "Q1_SEPOLIA_TELEMETRY_TRIP");
  console.log("[Q1] RiskTripBlocked tx", hash);
  console.log("[Q1] arbiscan", `https://sepolia.arbiscan.io/tx/${hash}`);
}

main().catch((err) => {
  console.error("[Q1] fail-closed", err);
  process.exit(1);
});
