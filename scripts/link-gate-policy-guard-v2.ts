#!/usr/bin/env tsx
/**
 * Arbitrum One (42161) — bind PolicyGuardV2 to SliverVineGate (native or PolicyLink sidecar).
 * Dry-run: pnpm tsx scripts/link-gate-policy-guard-v2.ts
 * Live: CONFIRM_GATE_POLICY_LINK=YES BROADCAST=1 MAINNET_PK=0x…
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient, createWalletClient, http, keccak256, toHex, type Address, type Hash, type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { loadMainnetEnv, resolveMainnetPrivateKey } from "./_shared/mainnet-env";

import { resolveGateAddressForChain, ARBITRUM_ONE_CHAIN_ID } from "../src/config/contract-deployments";

const CHAIN_ID = 42161;

function resolveGate(): Address {
  const raw = (process.env.SLIVERVINE_GATE_ADDRESS ?? process.env.GATE_ADDRESS ?? "").trim();
  if (raw) return raw as Address;
  return resolveGateAddressForChain(ARBITRUM_ONE_CHAIN_ID);
}

function resolvePolicyGuardV2(): Address {
  const raw = (process.env.POLICY_GUARD_V2_ADDRESS ?? process.env.POLICY_GUARD_V2 ?? "").trim();
  if (raw) return raw as Address;
  throw new Error("POLICY_GUARD_V2_ADDRESS required for gate link");
}
const DEFAULT_RPC = "https://arb1.arbitrum.io/rpc";
const SET_POLICY_GUARD = keccak256(toHex("setPolicyGuard(address)")).slice(0, 10);
const gateAbi = [
  { type: "function", name: "admin", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "policyGuard", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "setPolicyGuard", stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [] },
] as const;
const linkAbi = [
  { type: "function", name: "gate", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "policyGuard", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "setPolicyGuard", stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [] },
] as const;

function arbiscanTx(tx: Hash): string { return `https://arbiscan.io/tx/${tx}`; }
function armed(): boolean { return process.env.BROADCAST === "1" && process.env.CONFIRM_GATE_POLICY_LINK === "YES"; }
function resolveRpc(): string {
  const wss = (process.env.ARBITRUM_WSS_URL ?? "").trim();
  if (!process.env.ARB_MAINNET_RPC_URL?.trim() && wss.startsWith("wss://")) return wss.replace("wss://", "https://");
  return (process.env.ARB_MAINNET_RPC_URL ?? DEFAULT_RPC).trim();
}
function log(payload: Record<string, unknown>): void { console.log("[GATE_LINK]", JSON.stringify(payload)); }

async function gateHasNativeSetter(
  client: ReturnType<typeof createPublicClient>,
  gate: Address,
): Promise<boolean> {
  const code = await client.getBytecode({ address: gate });
  return Boolean(code?.includes(SET_POLICY_GUARD.slice(2)));
}

async function main(): Promise<void> {
  loadMainnetEnv();
  const GATE = resolveGate();
  const POLICY_GUARD_V2 = resolvePolicyGuardV2();
  const rpc = resolveRpc();
  const client = createPublicClient({ chain: arbitrum, transport: http(rpc) });
  if ((await client.getChainId()) !== CHAIN_ID) throw new Error(`refuse: expected chain ${CHAIN_ID}`);

  const native = await gateHasNativeSetter(client, GATE);
  log({ phase: "preflight", gate: GATE, policyGuardV2: POLICY_GUARD_V2, nativeSetter: native, armed: armed() });

  if (!armed()) {
    log({ dryRun: true, hint: "CONFIRM_GATE_POLICY_LINK=YES BROADCAST=1 MAINNET_PK=0x…" });
    return;
  }

  const account = privateKeyToAccount(resolveMainnetPrivateKey());
  const wallet = createWalletClient({ account, chain: arbitrum, transport: http(rpc) });
  const gateAdmin = await client.readContract({ address: GATE, abi: gateAbi, functionName: "admin" });
  if (gateAdmin.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(`refuse: deployer ${account.address} is not gate admin ${gateAdmin}`);
  }

  let target: Address = GATE;
  let abi: typeof gateAbi | typeof linkAbi = gateAbi;
  if (!native) {
    const envLink = (process.env.GATE_POLICY_LINK ?? "").trim() as Address;
    if (envLink) {
      target = envLink;
    } else {
      const art = JSON.parse(readFileSync(join(process.cwd(), "out/SliverVineGatePolicyLink.sol/SliverVineGatePolicyLink.json"), "utf8"));
      const deployHash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode.object as Hex, args: [GATE] });
      const rcpt = await client.waitForTransactionReceipt({ hash: deployHash });
      if (!rcpt.contractAddress) throw new Error("PolicyLink deploy missing contractAddress");
      target = rcpt.contractAddress;
      log({ deployPolicyLink: true, address: target, tx: deployHash, url: arbiscanTx(deployHash) });
    }
    abi = linkAbi;
  }

  const linked = await client.readContract({ address: target, abi, functionName: "policyGuard" }).catch(() => null);
  if (linked && linked.toLowerCase() === POLICY_GUARD_V2.toLowerCase()) {
    log({ status: "already_linked", target, policyGuard: POLICY_GUARD_V2 });
    return;
  }

  const hash = await wallet.writeContract({ address: target, abi, functionName: "setPolicyGuard", args: [POLICY_GUARD_V2] });
  const rcpt = await client.waitForTransactionReceipt({ hash });
  log({
    status: "linked",
    target,
    nativeSetter: native,
    policyGuardV2: POLICY_GUARD_V2,
    tx: hash,
    block: rcpt.blockNumber.toString(),
    url: arbiscanTx(hash),
  });
}

main().catch((err) => { console.error("[GATE_LINK] fail-closed", err); process.exit(1); });
