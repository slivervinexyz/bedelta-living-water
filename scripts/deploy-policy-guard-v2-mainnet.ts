#!/usr/bin/env tsx
/**
 * Arbitrum One (42161) — GMX invariant stack contract bundle deploy.
 * Dry-run: pnpm tsx scripts/deploy-policy-guard-v2-mainnet.ts
 * Live: CONFIRM_POLICY_GUARD_V2_DEPLOY=YES BROADCAST=1 MAINNET_PK=0x…
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient, createWalletClient, http, zeroAddress, type Address, type Hash, type Hex,
} from "viem";
import { STYLUS_SOIL_COPROCESSOR_MAINNET } from "../src/config/contract-deployments";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { loadMainnetEnv, resolveMainnetPrivateKey } from "./_shared/mainnet-env";

const CHAIN_ID = 42161;
const DEFAULT_RPC = "https://arb1.arbitrum.io/rpc";
const ART = {
  oracleV2: "out/SliverVineRiskOracleV2.sol/SliverVineRiskOracleV2.json",
  matrix: "out/GmxSoilMatrixSwitch.sol/GmxSoilMatrixSwitch.json",
  policyV2: "out/SliverVineAgentPolicyGuardV2.sol/SliverVineAgentPolicyGuardV2.json",
} as const;

type Artifact = { abi: readonly unknown[]; bytecode: Hex };

function arbiscanTx(tx: Hash): string { return `https://arbiscan.io/tx/${tx}`; }
function arbiscanAddr(addr: Address): string { return `https://arbiscan.io/address/${addr}`; }

function log(tag: string, payload: Record<string, unknown>): void {
  console.log(`[MAINNET_DEPLOY] ${tag}`, JSON.stringify(payload));
}

function armed(): boolean {
  return process.env.BROADCAST === "1" && process.env.CONFIRM_POLICY_GUARD_V2_DEPLOY === "YES";
}

function resolveStylusCoprocessor(): Address {
  const raw = (process.env.STYLUS_COPROCESSOR_ADDRESS ?? "").trim();
  if (raw && raw !== "0x" && raw !== zeroAddress) return raw as Address;
  if ((process.env.STYLUS_COPROCESSOR_ACTIVE ?? "").trim() === "1") return STYLUS_SOIL_COPROCESSOR_MAINNET;
  return zeroAddress;
}

function resolveRpc(): string {
  const wss = (process.env.ARBITRUM_WSS_URL ?? "").trim();
  if (!process.env.ARB_MAINNET_RPC_URL?.trim() && wss.startsWith("wss://")) {
    return wss.replace("wss://", "https://");
  }
  return (process.env.ARB_MAINNET_RPC_URL ?? DEFAULT_RPC).trim();
}


function loadArtifact(rel: string): Artifact {
  const raw = JSON.parse(readFileSync(join(process.cwd(), rel), "utf8"));
  return { abi: raw.abi, bytecode: raw.bytecode.object as Hex };
}

function forgeBuild(): void {
  const r = spawnSync("forge", ["build"], { encoding: "utf8", cwd: process.cwd() });
  if (r.status !== 0) throw new Error(`forge build failed:\n${r.stderr ?? r.stdout}`);
  log("forge_build", { status: "ok" });
}

async function deployOne(
  wallet: ReturnType<typeof createWalletClient>,
  client: ReturnType<typeof createPublicClient>,
  name: string,
  art: Artifact,
  args: readonly unknown[],
): Promise<Address> {
  const hash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode, args });
  const rcpt = await client.waitForTransactionReceipt({ hash });
  if (!rcpt.contractAddress) throw new Error(`${name} deploy missing contractAddress`);
  log(name, { address: rcpt.contractAddress, tx: hash, url: arbiscanTx(hash), block: rcpt.blockNumber.toString() });
  return rcpt.contractAddress;
}

async function main(): Promise<void> {
  loadMainnetEnv();
  forgeBuild();

  const rpc = resolveRpc();
  const client = createPublicClient({ chain: arbitrum, transport: http(rpc) });
  if ((await client.getChainId()) !== CHAIN_ID) throw new Error(`refuse: expected chain ${CHAIN_ID}`);

  log("phase_abc_libraries", {
    GmxRiskInvariantLib: "internal library — embedded in PolicyGuardV2 bytecode (no separate deploy)",
    GmxMulticallDecodeLib: "internal library — embedded in PolicyGuardV2 bytecode (no separate deploy)",
  });

  if (!armed()) {
    log("dry_run", {
      hint: "CONFIRM_POLICY_GUARD_V2_DEPLOY=YES BROADCAST=1 MAINNET_PK=0x…",
      deployOrder: ["SliverVineRiskOracleV2", "GmxSoilMatrixSwitch", "SliverVineAgentPolicyGuardV2"],
      stylusCoprocessor: resolveStylusCoprocessor(),
    });
    return;
  }

  const account = privateKeyToAccount(resolveMainnetPrivateKey());
  const wallet = createWalletClient({ account, chain: arbitrum, transport: http(rpc) });
  const balance = await client.getBalance({ address: account.address });
  if (balance < 10n ** 15n) throw new Error("deployer ETH balance too low for mainnet gas");

  const guardian = ((process.env.GUARDIAN ?? account.address).trim()) as Address;
  const oracleSigner = ((process.env.RISK_ORACLE_SIGNER ?? account.address).trim()) as Address;
  const sloWindowSec = BigInt(process.env.SLO_WINDOW_SEC?.trim() || "300");

  log("preflight", { deployer: account.address, guardian, oracleSigner, sloWindowSec: sloWindowSec.toString(), rpc });

  const oracleArt = loadArtifact(ART.oracleV2);
  const matrixArt = loadArtifact(ART.matrix);
  const policyArt = loadArtifact(ART.policyV2);

  const riskOracleV2 = await deployOne(wallet, client, "SliverVineRiskOracleV2", oracleArt, [oracleSigner, sloWindowSec]);
  const matrixSwitch = await deployOne(wallet, client, "GmxSoilMatrixSwitch", matrixArt, [riskOracleV2]);
  const stylusCoprocessor = resolveStylusCoprocessor();
  const policyGuardV2 = await deployOne(wallet, client, "SliverVineAgentPolicyGuardV2", policyArt, [guardian, stylusCoprocessor]);

  log("bundle_summary", {
    chainId: CHAIN_ID,
    SliverVineRiskOracleV2: { address: riskOracleV2, url: arbiscanAddr(riskOracleV2) },
    GmxSoilMatrixSwitch: { address: matrixSwitch, url: arbiscanAddr(matrixSwitch), riskOracle: riskOracleV2 },
    SliverVineAgentPolicyGuardV2: { address: policyGuardV2, url: arbiscanAddr(policyGuardV2), stylusCoprocessor, guardian },
    legacyPolicyGuardV1: "0xc66f96611a737c4e58706d0955594456eab88959",
  });
}

main().catch((err) => { console.error("[MAINNET_DEPLOY] fail-closed", err); process.exit(1); });
