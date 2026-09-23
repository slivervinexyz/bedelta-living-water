#!/usr/bin/env tsx
/**
 * Arbitrum Sepolia — live 1× UserOp (Kernel v3.1 + EntryPoint v0.7).
 * Usage:
 *   pnpm test:zerodev:sepolia
 *   USE_ZERODEV_AA=true ZERODEV_PROJECT_ID=... pnpm test:zerodev:sepolia -- --sponsored
 */

import { arbitrumSepolia } from "viem/chains";
import { formatEther, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { assertExoMeshRiskGate, isZeroDevAAEnabled } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-gate";
import { ARBITRUM_SEPOLIA_CHAIN_ID, resolveSepoliaRpcUrl } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-chain";
import { sendZeroDevUserOp } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-send-userop";
import { __resetArbitrumGasGuardForTests } from "../src/services/risk/arbitrum-gas-guard";
import { __resetSequencerGuardCacheForTests, __setSequencerProbeForTests, SEQUENCER_GRACE_SEC } from "../src/services/risk/sequencer-guard";
import { __resetSoftConfirmationGuardForTests, __setSoftConfirmationProbeForTests } from "../src/services/risk/soft-confirmation-guard";
import { loadDotEnv, mergeEnv, resolveOwnerPrivateKey } from "./zerodev-env";

const HEALTHY_SOIL = {
  symbol: "ETH" as const,
  hlSpot: 3500,
  hlPerp: 3500,
  dydxPerp: 3500,
  depthUsd: 200_000,
  at: new Date(),
};

function seedExomeshProbes(nowMs: number): void {
  const nowSec = Math.floor(nowMs / 1000);
  __resetArbitrumGasGuardForTests();
  __resetSequencerGuardCacheForTests();
  __resetSoftConfirmationGuardForTests();
  __setSequencerProbeForTests({
    answer: 0,
    startedAtSec: nowSec - SEQUENCER_GRACE_SEC - 1,
    updatedAtSec: nowSec,
    fetchedAtMs: nowMs,
    safe: true,
    reason: null,
  });
  __setSoftConfirmationProbeForTests({
    l2LatestBlock: 1_000_020,
    l1FinalizedBatchBlock: 1_000_000,
    driftBlocks: 20,
    fetchedAtMs: nowMs,
    safe: true,
    reason: null,
  });
}

async function main(): Promise<void> {
  const env = mergeEnv(loadDotEnv());
  Object.assign(process.env, env);

  if (!isZeroDevAAEnabled(env)) {
    console.error("[zerodev:sepolia] USE_ZERODEV_AA must be true");
    process.exit(1);
  }

  const projectId = env.ZERODEV_PROJECT_ID;
  if (!projectId) {
    console.error("[zerodev:sepolia] ZERODEV_PROJECT_ID missing");
    process.exit(1);
  }

  const sponsored = process.argv.includes("--sponsored");
  const ownerKey = resolveOwnerPrivateKey(env);
  const owner = privateKeyToAccount(ownerKey);
  const rpcUrl = resolveSepoliaRpcUrl(env);
  const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl) });
  const ownerBal = await publicClient.getBalance({ address: owner.address });

  if (ownerBal === 0n && !sponsored) {
    console.error(`[zerodev:sepolia] owner ${owner.address} has 0 Sepolia ETH — fund or use --sponsored`);
    process.exit(1);
  }

  seedExomeshProbes(Date.now());
  assertExoMeshRiskGate(HEALTHY_SOIL);
  console.log("[zerodev:sepolia] ExoMesh risk gate: PASS");

  const result = await sendZeroDevUserOp({
    chain: arbitrumSepolia,
    chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
    rpcUrl,
    projectId,
    ownerPrivateKey: ownerKey,
    sponsored,
  });

  console.log(`[zerodev:sepolia] owner=${owner.address} balance=${formatEther(ownerBal)} ETH`);
  console.log(`[zerodev:sepolia] kernel=${result.kernelAddress}`);
  console.log(`[zerodev:sepolia] userOpHash=${result.userOpHash}`);
  console.log(`[zerodev:sepolia] txHash=${result.txHash}`);
  console.log(`[zerodev:sepolia] success=${result.success} sponsored=${result.sponsored}`);
  console.log(`[zerodev:sepolia] explorer=https://sepolia.arbiscan.io/tx/${result.txHash}`);

  if (!result.success) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
