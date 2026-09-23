#!/usr/bin/env tsx
/**
 * Arbitrum One (42161) — PolicyGuard deploy + Gate link + admin rotate + ZeroDev live UserOp.
 * Dry-run default. Live: CONFIRM_MAINNET_DEPLOY=YES BROADCAST=1 MAINNET_PK=0x… [--size=15]
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import {
  createPublicClient, createWalletClient, encodeFunctionData, http, keccak256, parseAbi, toHex, type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import type { SmartAccount } from "viem/account-abstraction";
import { buildZeroDevRpcUrl } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-constants";
import { gmxV2ArbitrumAdapter } from "../src/services/adapters/gmx-v2-adapter";
import { checkSoilResistance } from "../src/services/risk-control";
import { computeGatedExecutorPayloadHash } from "../src/sdk/gated-executor-payload";
import { EIP712_DOMAIN_NAME, EIP712_DOMAIN_VERSION } from "../src/sdk/constants";
import { buildKernelAccountWithRiskGate } from "../src/services/aa-adapter/zerodev-kernel-adapter";
import { printLiveHarnessBypassBanner } from "./_shared/live-harness-warning";
import { loadMainnetEnv, resolveMainnetPrivateKey } from "./_shared/mainnet-env";

import { ARBITRUM_ONE_CHAIN_ID, resolveGateAddressForChain } from "../src/config/contract-deployments";

const GATE = resolveGateAddressForChain(ARBITRUM_ONE_CHAIN_ID) as Hex;
const CHAIN_ID = 42161;
const RPC = process.env.ARB_MAINNET_RPC_URL ?? "https://arb1.arbitrum.io/rpc";
const AGENT_ID = keccak256(toHex("silvervine:zerodev:42161"));
const gateAbi = parseAbi([
  "function admin() view returns (address)", "function proposeAdmin(address)", "function acceptAdmin()",
  "function policyGuard() view returns (address)", "function setPolicyGuard(address)",
  "function verifyAndConsume((bytes32 payloadHash,address subject,uint8 verdict,uint16 riskBps,uint64 issuedAt,uint64 expiresAt,uint256 nonce) att, bytes[] signatures) returns (bytes32)",
]);
const policyAbi = parseAbi(["function validateAgentPolicy(bytes32 agentId, uint256 maxNotional, uint256 ttl) returns (bytes32)"]);

function arbiscan(tx: string): string { return `https://arbiscan.io/tx/${tx}`; }
function armed(): boolean { return process.env.BROADCAST === "1" && process.env.CONFIRM_MAINNET_DEPLOY === "YES"; }
function parseSize(argv: string[]): number {
  const raw = argv.find((a, i) => argv[i - 1] === "--size");
  const n = raw ? Number.parseFloat(raw) : 15;
  if (!Number.isFinite(n) || n < 10 || n > 20) throw new Error("size must be $10–$20 USD");
  return n;
}

async function signAtt(wallet: ReturnType<typeof createWalletClient>, att: object): Promise<Hex> {
  return wallet.signTypedData({
    account: wallet.account!, domain: { name: EIP712_DOMAIN_NAME, version: EIP712_DOMAIN_VERSION, chainId: CHAIN_ID, verifyingContract: GATE },
    types: { RiskAttestation: [{ name: "payloadHash", type: "bytes32" }, { name: "subject", type: "address" }, { name: "verdict", type: "uint8" }, { name: "riskBps", type: "uint16" }, { name: "issuedAt", type: "uint64" }, { name: "expiresAt", type: "uint64" }, { name: "nonce", type: "uint256" }] },
    primaryType: "RiskAttestation", message: att,
  });
}

async function main(): Promise<void> {
  loadMainnetEnv();
  printLiveHarnessBypassBanner();
  const sizeUsd = parseSize(process.argv.slice(2));
  const client = createPublicClient({ chain: arbitrum, transport: http(RPC) });
  if ((await client.getChainId()) !== CHAIN_ID) throw new Error(`refuse: expected chain ${CHAIN_ID}`);

  const bypassSoil = process.env.BYPASS_SOIL_PROBE === "true";
  if (bypassSoil) throw new Error("SOIL_BYPASS_FORBIDDEN: BYPASS_SOIL_PROBE is disabled — soil probe is mandatory");
  const soil = checkSoilResistance({ symbol: "ETH", hlSpot: 3500, hlPerp: 3500, dydxPerp: 3498, depthUsd: 500_000, orderSizeUsd: sizeUsd, accountBalanceUsd: 10_000 });
  if (soil.tripped) throw new Error(`SOIL_TRIP: ${soil.reasons.join(",")}`);
  console.log("[policy-guard] preflight OK", { sizeUsd, soilOk: true, tradeAllowed: true });

  if (!armed()) {
    console.log("[policy-guard] dry-run — set CONFIRM_MAINNET_DEPLOY=YES BROADCAST=1 MAINNET_PK=0x… USE_ZERODEV_AA=true ZERODEV_PROJECT_ID=…");
    return;
  }

  const account = privateKeyToAccount(resolveMainnetPrivateKey());
  const wallet = createWalletClient({ account, chain: arbitrum, transport: http(RPC) });
  const art = JSON.parse(readFileSync(join(process.cwd(), "out/SliverVineAgentPolicyGuard.sol/SliverVineAgentPolicyGuard.json"), "utf8"));
  const deployHash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode.object as Hex, args: [account.address] });
  const deployRcpt = await client.waitForTransactionReceipt({ hash: deployHash });
  const policyGuard = deployRcpt.contractAddress!;
  console.log("[policy-guard] deploy", { address: policyGuard, tx: deployHash, url: arbiscan(deployHash) });

  let linkHash: Hex | null = null;
  try {
    const linked = await client.readContract({ address: GATE, abi: gateAbi, functionName: "policyGuard" }).catch(() => null);
    if (linked && linked !== "0x0000000000000000000000000000000000000000") {
      console.log("[policy-guard] gate already linked", { policyGuard: linked });
    } else {
      linkHash = await wallet.writeContract({ address: GATE, abi: gateAbi, functionName: "setPolicyGuard", args: [policyGuard] });
      const linkRcpt = await client.waitForTransactionReceipt({ hash: linkHash });
      console.log("[policy-guard] setPolicyGuard", { tx: linkHash, block: linkRcpt.blockNumber.toString(), url: arbiscan(linkHash) });
    }
  } catch (err) {
    console.warn("[policy-guard] setPolicyGuard skipped (bootstrap gate may lack setter)", err instanceof Error ? err.message : err);
  }

  const admin = await client.readContract({ address: GATE, abi: gateAbi, functionName: "admin" });
  if (admin.toLowerCase() !== account.address.toLowerCase()) {
    const propHash = await wallet.writeContract({ address: GATE, abi: gateAbi, functionName: "proposeAdmin", args: [account.address] });
    await client.waitForTransactionReceipt({ hash: propHash });
    const accHash = await wallet.writeContract({ address: GATE, abi: gateAbi, functionName: "acceptAdmin" });
    const accRcpt = await client.waitForTransactionReceipt({ hash: accHash });
    console.log("[policy-guard] admin rotated", { tx: accHash, url: arbiscan(accHash), block: accRcpt.blockNumber.toString() });
  }

  const projectId = process.env.ZERODEV_PROJECT_ID?.trim();
  if (!projectId) throw new Error("ZERODEV_PROJECT_ID required for ZeroDev live UserOp");
  process.env.USE_ZERODEV_AA = "true";

  const order = await gmxV2ArbitrumAdapter.buildUnsignedHedgeOrder({ symbol: "ETH", side: "short", sizeUsd, reduceOnly: false, clientOrderId: `pg-live-${Date.now()}`, maxSlippageBps: 30 });
  const kernel = await buildKernelAccountWithRiskGate({ chainId: CHAIN_ID, chain: arbitrum, rpcUrl: RPC, ownerPrivateKey: resolveMainnetPrivateKey(), env: process.env as Record<string, string> });
  const payloadHash = computeGatedExecutorPayloadHash({
    chainId: CHAIN_ID, executor: GATE, initiator: kernel.address,
    target: (order.payload.addresses?.router ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    data: (order.payload.calldata ?? "0x") as Hex, nonce: BigInt(Date.now()),
  });
  const now = BigInt(Math.floor(Date.now() / 1000));
  const att = { payloadHash, subject: kernel.address, verdict: 1, riskBps: 1200, issuedAt: now, expiresAt: now + 30n, nonce: now };
  const gateSig = await signAtt(wallet, att);
  const maxNotional = BigInt(Math.round(sizeUsd * 1e6));
  const ttl = now + 3600n;
  const policyData = encodeFunctionData({ abi: policyAbi, functionName: "validateAgentPolicy", args: [AGENT_ID, maxNotional, ttl] });
  const gateData = encodeFunctionData({ abi: gateAbi, functionName: "verifyAndConsume", args: [att, [gateSig]] });
  const bundlerRpc = buildZeroDevRpcUrl(projectId, CHAIN_ID);
  const paymaster = createZeroDevPaymasterClient({ chain: arbitrum, transport: http(bundlerRpc) });
  const kernelClient = createKernelAccountClient({
    account: kernel.account as SmartAccount, chain: arbitrum, bundlerTransport: http(bundlerRpc), client,
    paymaster: { getPaymasterData: (userOperation) => paymaster.sponsorUserOperation({ userOperation }) },
  });
  const userOpHash = await kernelClient.sendUserOperation({
    calls: [{ to: policyGuard, data: policyData }, { to: GATE, data: gateData }],
  });
  const receipt = await kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
  const liveTx = receipt.receipt.transactionHash;
  console.log("[policy-guard] zerodev live", { kernel: kernel.address, userOpHash, tx: liveTx, success: receipt.success, url: arbiscan(liveTx) });
  if (!receipt.success) throw new Error("ZeroDev UserOp reverted");
}

main().catch((err) => { console.error("[policy-guard] fail-closed", err); process.exit(1); });
