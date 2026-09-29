#!/usr/bin/env tsx
/**
 * Q1 — Mainnet Stylus SoilCoprocessor telemetry: dry-run probe + live evaluate emit.
 * Broadcast: BROADCAST=1 (+ MAINNET_PK | WALLET_A_PK · USE_WALLET_A_PK=1)
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { resolveMainnetBroadcastPrivateKey } from "./_shared/gate-broadcast-env";
import { loadMainnetEnv } from "./_shared/mainnet-env";
import {
  appendStylusTxManifest,
  emitStylusSoilCoprocessorEval,
  probeStylusDryRun,
  resolveStylusContractAddress,
} from "./_shared/stylus-telemetry-emit";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  loadMainnetEnv();
  const env = process.env as Record<string, string>;
  const contract = resolveStylusContractAddress(env);
  const rpc = (env.ARB_MAINNET_RPC_URL ?? "https://arb1.arbitrum.io/rpc").trim();
  const client = createPublicClient({ chain: arbitrum, transport: http(rpc) });
  const [chainId, latest] = await Promise.all([client.getChainId(), client.getBlockNumber()]);
  console.log("[Q1] Stylus Telemetry (Mainnet SoilCoprocessor)");
  console.log("[Q1] rpc", rpc, "chainId", chainId, "contract", contract, "head", latest.toString());
  const probe = await probeStylusDryRun(client, contract);
  console.log("[Q1] dry-run evaluate_soil_coprocessor", probe);
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
  const hash = await emitStylusSoilCoprocessorEval(wallet, contract);
  const receipt = await client.waitForTransactionReceipt({ hash });
  appendStylusTxManifest(ROOT, {
    tx_hash: hash,
    contract,
    chain_id: chainId,
    block_number: receipt.blockNumber.toString(),
    emitted_at: new Date().toISOString(),
    passed: probe.passed,
  });
  console.log("[Q1] SoilCoprocessorEval tx", hash);
  console.log("[Q1] arbiscan", `https://arbiscan.io/tx/${hash}`);
}

main().catch((err) => {
  console.error("[Q1] fail-closed", err);
  process.exit(1);
});
