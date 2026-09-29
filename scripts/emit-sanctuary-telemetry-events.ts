#!/usr/bin/env tsx
/**
 * Q1 — SliverVine Sanctuary Gate telemetry: legacy 0xb174… RiskTripBlocked emit.
 * Usage: npx tsx scripts/emit-sanctuary-telemetry-events.ts
 * Broadcast: BROADCAST=1 USE_WALLET_A_PK=1 (+ WALLET_A_PK in .env)
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
import { resolveSanctuaryGate } from "./_shared/onchain-dune-telemetry";

async function main(): Promise<void> {
  loadMainnetEnv();
  const env = process.env as Record<string, string>;
  const gate = resolveSanctuaryGate() as Hex;
  const rpc = (env.ARB_MAINNET_RPC_URL ?? "https://arb1.arbitrum.io/rpc").trim();
  const client = createPublicClient({ chain: arbitrum, transport: http(rpc) });
  const [chainId, halted, latest] = await Promise.all([
    client.getChainId(),
    client.readContract({ address: gate, abi: GATE_TELEMETRY_ABI, functionName: "halted" }),
    client.getBlockNumber(),
  ]);
  console.log("[Q1] Dune Telemetry (SliverVine Sanctuary Gate)");
  console.log("[Q1] rpc", rpc, "chainId", chainId, "gate", gate, "halted", halted, "head", latest.toString());
  const logs = await probeRecentGateLogs(client, gate);
  console.log("[Q1] indexed events (last ~8k blocks)", logs.length);
  for (const log of logs.slice(-8)) {
    console.log("[Q1] log", log.eventName, log.transactionHash, log.args);
  }
  if (env.BROADCAST !== "1") {
    console.log("[Q1] dry-run — set BROADCAST=1 USE_WALLET_A_PK=1 and WALLET_A_PK");
    return;
  }
  const pk =
    env.USE_WALLET_A_PK === "1"
      ? resolveMainnetBroadcastPrivateKey({ WALLET_A_PK: env.WALLET_A_PK ?? "" })
      : resolveMainnetBroadcastPrivateKey(env);
  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({ account, chain: arbitrum, transport: http(rpc) });
  const hash = await emitRiskTripBlocked(wallet, gate, account.address, "Q1_SANCTUARY_TELEMETRY_TRIP");
  console.log("[Q1] RiskTripBlocked tx", hash);
  console.log("[Q1] arbiscan", `https://arbiscan.io/tx/${hash}`);
}

main().catch((err) => {
  console.error("[Q1] fail-closed", err);
  process.exit(1);
});
