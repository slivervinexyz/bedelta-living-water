#!/usr/bin/env tsx
/**
 * Q3 — Arbitrum One (42161) Gate ignition. Default DRY_RUN (no broadcast).
 * Usage: npx tsx scripts/deploy-mainnet-gate-ignition.ts
 * Live:  CONFIRM_MAINNET_IGNITION=YES BROADCAST=1 PRIVATE_KEY=0x… npx tsx scripts/deploy-mainnet-gate-ignition.ts
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";

const ROOT = process.cwd();
const GATE_DIR = join(ROOT, "SliverVineGate");
const RPC = process.env.ARB_MAINNET_RPC_URL ?? "https://arb1.arbitrum.io/rpc";
const CHAIN_ID = 42161;
const SCRIPT = "script/DeployArbitrumOneGate.s.sol:DeployArbitrumOneGate";
const BROADCAST_JSON = join(
  GATE_DIR,
  "broadcast/DeployArbitrumOneGate.s.sol/42161/run-latest.json",
);

function extractDeployTxHash(): string | null {
  if (!existsSync(BROADCAST_JSON)) return null;
  try {
    const data = JSON.parse(readFileSync(BROADCAST_JSON, "utf8")) as {
      transactions?: Array<{ hash?: string | null; transactionType?: string }>;
    };
    const createTx = data.transactions?.find(
      (t) => t.transactionType === "CREATE" && t.hash,
    );
    if (createTx?.hash) return createTx.hash;
    return data.transactions?.find((t) => t.hash)?.hash ?? null;
  } catch {
    return null;
  }
}

function runForgeBroadcast(): void {
  const args = [
    "script",
    SCRIPT,
    "--rpc-url",
    RPC,
    "--broadcast",
    "-vvvv",
  ];
  if (process.env.ARBISCAN_API_KEY) {
    args.push("--verify", "--etherscan-api-key", process.env.ARBISCAN_API_KEY);
  }
  console.log("[Q3] forge", args.join(" "));
  const result = spawnSync("forge", args, {
    cwd: GATE_DIR,
    env: process.env,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`[Q3] forge script failed (exit ${result.status ?? "?"})`);
  }
}

async function main(): Promise<void> {
  const client = createPublicClient({ chain: arbitrum, transport: http(RPC) });
  const chainId = await client.getChainId();
  const head = await client.getBlockNumber();
  console.log("[Q3] Arbitrum One Mainnet Ignition Gate — non-custodial / no proxy / chainId", CHAIN_ID);
  console.log("[Q3] rpc", RPC, "observedChainId", chainId, "head", head.toString());
  if (chainId !== CHAIN_ID) throw new Error(`[Q3] refuse: expected ${CHAIN_ID} got ${chainId}`);
  console.log("[Q3] script", SCRIPT);
  console.log("[Q3] ctor: SliverVineGate(signers ascending, threshold, guardian, admin)");

  const armed =
    process.env.BROADCAST === "1" && process.env.CONFIRM_MAINNET_IGNITION === "YES";
  if (!armed) {
    console.log("[Q3] dry-run — set CONFIRM_MAINNET_IGNITION=YES BROADCAST=1 PRIVATE_KEY=0x… to broadcast");
    console.log(
      "[Q3] optional smoke: RUN_IGNITION_SMOKE=1 IGNITION_SUBJECT=0x… GATE_SIGNER_KEY_0=0x… GATE_SIGNER_KEY_1=0x…",
    );
    return;
  }
  if (!process.env.PRIVATE_KEY?.startsWith("0x")) {
    throw new Error("[Q3] PRIVATE_KEY required");
  }
  for (const key of ["GATE_SIGNERS", "GATE_THRESHOLD", "GUARDIAN", "GATE_ADMIN"] as const) {
    if (!process.env[key]) throw new Error(`[Q3] ${key} required for broadcast`);
  }

  console.log("[Q3] ignition armed — broadcasting DeployArbitrumOneGate on Arbitrum One");
  runForgeBroadcast();

  const txHash = extractDeployTxHash();
  if (txHash) {
    console.log("[Q3] Arbiscan Tx:", `https://arbiscan.io/tx/${txHash}`);
  } else {
    console.log("[Q3] broadcast complete — inspect", BROADCAST_JSON, "for transaction hash");
  }
}

main().catch((err) => {
  console.error("[Q3] fail-closed", err);
  process.exit(1);
});
