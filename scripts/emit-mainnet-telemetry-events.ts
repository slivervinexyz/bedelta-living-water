#!/usr/bin/env tsx
/**
 * Q1 — Mainnet Gate telemetry: replay Dune-indexable logs; optional RiskTripBlocked emit.
 * Usage: npx tsx scripts/emit-mainnet-telemetry-events.ts
 * Broadcast: BROADCAST=1 (+ MAINNET_PK | WALLET_A_PK in .env / .env.production)
 * Force Wallet A: USE_WALLET_A_PK=1 (skips MAINNET_PK when underfunded)
 */
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { resolveMainnetBroadcastPrivateKey } from "./_shared/gate-broadcast-env";
import {
  emitRiskTripBlocked,
  GATE_TELEMETRY_ABI,
  probeRecentGateLogs,
} from "./_shared/gate-telemetry-emit";
import { loadMainnetEnv } from "./_shared/mainnet-env";
import { resolveGateForNetwork } from "./_shared/onchain-dune-telemetry";

async function main(): Promise<void> {
  loadMainnetEnv();
  const env = process.env as Record<string, string>;
  const gate = resolveGateForNetwork("mainnet") as Hex;
  const rpc = (env.ARB_MAINNET_RPC_URL ?? "https://arb1.arbitrum.io/rpc").trim();
  const client = createPublicClient({ chain: arbitrum, transport: http(rpc) });
  const [chainId, halted, latest] = await Promise.all([
    client.getChainId(),
    client.readContract({ address: gate, abi: GATE_TELEMETRY_ABI, functionName: "halted" }),
    client.getBlockNumber(),
  ]);
  console.log("[Q1] Dune Telemetry (Mainnet Live Verification)");
  console.log("[Q1] rpc", rpc, "chainId", chainId, "gate", gate, "halted", halted, "head", latest.toString());
  const logs = await probeRecentGateLogs(client, gate);
  console.log("[Q1] indexed events (last ~8k blocks)", logs.length);
  for (const log of logs.slice(-8)) {
    console.log("[Q1] log", log.eventName, log.transactionHash, log.args);
  }
  if (env.BROADCAST !== "1") {
    console.log("[Q1] dry-run — set BROADCAST=1 and MAINNET_PK|WALLET_A_PK (or USE_WALLET_A_PK=1)");
    return;
  }
  const pk =
    env.USE_WALLET_A_PK === "1"
      ? resolveMainnetBroadcastPrivateKey({ WALLET_A_PK: env.WALLET_A_PK ?? "" })
      : resolveMainnetBroadcastPrivateKey(env);
  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({ account, chain: arbitrum, transport: http(rpc) });
  const hash = await emitRiskTripBlocked(wallet, gate, account.address, "Q1_MAINNET_TELEMETRY_TRIP");
  console.log("[Q1] RiskTripBlocked tx", hash);
  console.log("[Q1] arbiscan", `https://arbiscan.io/tx/${hash}`);
}

main().catch((err) => {
  console.error("[Q1] fail-closed", err);
  process.exit(1);
});
