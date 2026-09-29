#!/usr/bin/env tsx
/**
 * ZeroDev Kernel v3 (ERC-7579) — Arbitrum One PolicyGuard validation UserOp (no GMX pool probe).
 * Dry-run default. Live: CONFIRM_ZERODEV_MAINNET=YES BROADCAST=1 MAINNET_PK=0x… ZERODEV_PROJECT_ID=…
 */
import { createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import {
  createPublicClient, createWalletClient, encodeFunctionData, http, keccak256, parseAbi, toHex, type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import type { SmartAccount } from "viem/account-abstraction";
import { buildZeroDevRpcUrl } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-constants";
import { buildKernelAccount } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-kernel";
import { computeGatedExecutorPayloadHash } from "../src/sdk/gated-executor-payload";
import { EIP712_DOMAIN_NAME, EIP712_DOMAIN_VERSION } from "../src/sdk/constants";
import { loadMainnetEnv, resolveMainnetPrivateKey } from "./_shared/mainnet-env";

const POLICY_GUARD = "0x3e4298e2b8d4e30396a54c1817eb71c9272ffb4b" as Hex;
import { ARBITRUM_ONE_CHAIN_ID, resolveGateAddressForChain } from "../src/config/contract-deployments";

const GATE = resolveGateAddressForChain(ARBITRUM_ONE_CHAIN_ID) as Hex;
const CHAIN_ID = 42161;
const RPC = process.env.ARB_MAINNET_RPC_URL ?? "https://arb1.arbitrum.io/rpc";
const AGENT_ID = keccak256(toHex("silvervine:zerodev:42161:aa-proof"));
const policyAbi = parseAbi(["function validateAgentPolicy(bytes32 agentId, uint256 maxNotional, uint256 ttl) returns (bytes32)"]);
const gateAbi = parseAbi([
  "function verifyAndConsume((bytes32 payloadHash,address subject,uint8 verdict,uint16 riskBps,uint64 issuedAt,uint64 expiresAt,uint256 nonce) att, bytes[] signatures) returns (bytes32)",
]);

function arbiscan(tx: string): string { return `https://arbiscan.io/tx/${tx}`; }
function armed(): boolean { return process.env.BROADCAST === "1" && process.env.CONFIRM_ZERODEV_MAINNET === "YES"; }

async function signAtt(wallet: ReturnType<typeof createWalletClient>, att: object): Promise<Hex> {
  return wallet.signTypedData({
    account: wallet.account!,
    domain: { name: EIP712_DOMAIN_NAME, version: EIP712_DOMAIN_VERSION, chainId: CHAIN_ID, verifyingContract: GATE },
    types: { RiskAttestation: [{ name: "payloadHash", type: "bytes32" }, { name: "subject", type: "address" }, { name: "verdict", type: "uint8" }, { name: "riskBps", type: "uint16" }, { name: "issuedAt", type: "uint64" }, { name: "expiresAt", type: "uint64" }, { name: "nonce", type: "uint256" }] },
    primaryType: "RiskAttestation", message: att,
  });
}

async function main(): Promise<void> {
  loadMainnetEnv();
  const client = createPublicClient({ chain: arbitrum, transport: http(RPC) });
  if ((await client.getChainId()) !== CHAIN_ID) throw new Error(`refuse: expected chain ${CHAIN_ID}`);

  const projectId = process.env.ZERODEV_PROJECT_ID?.trim();
  if (!projectId) throw new Error("ZERODEV_PROJECT_ID required");
  console.log("[zerodev:mainnet] preflight OK", { chainId: CHAIN_ID, policyGuard: POLICY_GUARD, gmxBypass: true });

  if (!armed()) {
    console.log("[zerodev:mainnet] dry-run — set CONFIRM_ZERODEV_MAINNET=YES BROADCAST=1 MAINNET_PK=0x… ZERODEV_PROJECT_ID=…");
    return;
  }

  const pk = resolveMainnetPrivateKey();
  const kernel = await buildKernelAccount({ chainId: CHAIN_ID, chain: arbitrum, rpcUrl: RPC, ownerPrivateKey: pk });
  const now = BigInt(Math.floor(Date.now() / 1000));
  const maxNotional = 15_000_000n; // $15 USDC-scale test notional — no GMX pool probe
  const ttl = now + 3600n;
  const policyData = encodeFunctionData({ abi: policyAbi, functionName: "validateAgentPolicy", args: [AGENT_ID, maxNotional, ttl] });
  const calls: { to: Hex; data: Hex }[] = [{ to: POLICY_GUARD, data: policyData }];

  const signerPk = (process.env.GATE_SIGNER_KEY_0 ?? "").trim() as Hex;
  if (signerPk.startsWith("0x")) {
    const nonce = BigInt(Date.now());
    const payloadHash = computeGatedExecutorPayloadHash({
      chainId: CHAIN_ID, executor: GATE, initiator: kernel.address,
      target: "0x0000000000000000000000000000000000000001", data: "0x", nonce,
    });
    const att = { payloadHash, subject: kernel.address, verdict: 1, riskBps: 1200, issuedAt: now, expiresAt: now + 30n, nonce };
    const signer = privateKeyToAccount(signerPk);
    const gateWallet = createWalletClient({ account: signer, chain: arbitrum, transport: http(RPC) });
    const gateSig = await signAtt(gateWallet, att);
    const gateData = encodeFunctionData({ abi: gateAbi, functionName: "verifyAndConsume", args: [att, [gateSig]] });
    calls.push({ to: GATE, data: gateData });
  }

  const bundlerRpc = buildZeroDevRpcUrl(projectId, CHAIN_ID);
  const paymaster = createZeroDevPaymasterClient({ chain: arbitrum, transport: http(bundlerRpc) });
  const kernelClient = createKernelAccountClient({
    account: kernel.account as SmartAccount, chain: arbitrum, bundlerTransport: http(bundlerRpc), client,
    paymaster: { getPaymasterData: (userOperation) => paymaster.sponsorUserOperation({ userOperation }) },
  });
  const userOpHash = await kernelClient.sendUserOperation({ calls });
  const receipt = await kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
  const tx = receipt.receipt.transactionHash;
  console.log("[zerodev:mainnet] ERC-7579 UserOp", {
    kernel: kernel.address, userOpHash, tx, success: receipt.success, calls: calls.length, url: arbiscan(tx),
  });
  if (!receipt.success) throw new Error("ZeroDev UserOp reverted");
}

main().catch((err) => { console.error("[zerodev:mainnet] fail-closed", err); process.exit(1); });
