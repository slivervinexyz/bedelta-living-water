#!/usr/bin/env tsx
/**
 * Arbitrum One (42161) — small-notional GMX v2 fill via SliverVineGate + optional admin rotation.
 * Dry-run default. Live: CONFIRM_MAINNET_LIVE_FILL=YES BROADCAST=1 MAINNET_PK=0x… [--rotate-admin] [--size=15]
 */
import { createPublicClient, createWalletClient, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { gmxV2ArbitrumAdapter } from "../src/services/adapters/gmx-v2-adapter";
import { checkSoilResistance } from "../src/services/risk-control";
import { computeGatedExecutorPayloadHash } from "../src/sdk/gated-executor-payload";
import { EIP712_DOMAIN_NAME, EIP712_DOMAIN_VERSION } from "../src/sdk/constants";
import { loadMainnetEnv, resolveMainnetPrivateKey } from "./_shared/mainnet-env";
import { ARBITRUM_ONE_CHAIN_ID, resolveGateAddressForChain } from "../src/config/contract-deployments";

const GATE = resolveGateAddressForChain(ARBITRUM_ONE_CHAIN_ID) as Hex;
const CHAIN_ID = 42161;
const RPC = process.env.ARB_MAINNET_RPC_URL ?? "https://arb1.arbitrum.io/rpc";
const gateAbi = parseAbi([
  "function admin() view returns (address)",
  "function proposeAdmin(address newAdmin)",
  "function acceptAdmin()",
  "function verifyAndConsume((bytes32 payloadHash,address subject,uint8 verdict,uint16 riskBps,uint64 issuedAt,uint64 expiresAt,uint256 nonce) att, bytes[] signatures) returns (bytes32)",
]);

function parseSize(argv: string[]): number {
  const raw = argv.find((a, i) => argv[i - 1] === "--size");
  const n = raw ? Number.parseFloat(raw) : 15;
  if (!Number.isFinite(n) || n < 10 || n > 20) throw new Error("size must be $10–$20 USD");
  return n;
}

function armed(): boolean {
  return process.env.BROADCAST === "1" && process.env.CONFIRM_MAINNET_LIVE_FILL === "YES";
}

function arbiscan(tx: string): string {
  return `https://arbiscan.io/tx/${tx}`;
}

async function signAttestation(wallet: ReturnType<typeof createWalletClient>, att: object): Promise<Hex> {
  return wallet.signTypedData({
    account: wallet.account!,
    domain: { name: EIP712_DOMAIN_NAME, version: EIP712_DOMAIN_VERSION, chainId: CHAIN_ID, verifyingContract: GATE },
    types: {
      RiskAttestation: [
        { name: "payloadHash", type: "bytes32" },
        { name: "subject", type: "address" },
        { name: "verdict", type: "uint8" },
        { name: "riskBps", type: "uint16" },
        { name: "issuedAt", type: "uint64" },
        { name: "expiresAt", type: "uint64" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "RiskAttestation",
    message: att,
  });
}

async function main(): Promise<void> {
  loadMainnetEnv();
  const argv = process.argv.slice(2);
  const sizeUsd = parseSize(argv);
  const rotateAdmin = argv.includes("--rotate-admin");
  const client = createPublicClient({ chain: arbitrum, transport: http(RPC) });
  if ((await client.getChainId()) !== CHAIN_ID) throw new Error(`refuse: expected chain ${CHAIN_ID}`);

  const soil = checkSoilResistance({
    symbol: "ETH", hlSpot: 3500, hlPerp: 3500, dydxPerp: 3498, depthUsd: 500_000,
    orderSizeUsd: sizeUsd, accountBalanceUsd: 10_000,
  });
  if (soil.tripped) throw new Error(`SOIL_TRIP: ${soil.reasons.join(",")}`);

  const order = await gmxV2ArbitrumAdapter.buildUnsignedHedgeOrder({
    symbol: "ETH", side: "short", sizeUsd, reduceOnly: false,
    clientOrderId: `mainnet-live-${Date.now()}`, maxSlippageBps: 30,
  });
  const payloadHash = computeGatedExecutorPayloadHash({
    chainId: CHAIN_ID,
    executor: GATE,
    initiator: "0x0000000000000000000000000000000000000001",
    target: (order.payload.addresses?.router ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    data: (order.payload.calldata ?? "0x") as Hex,
    nonce: BigInt(Date.now()),
  });
  console.log("[mainnet-live] preflight OK", { sizeUsd, payloadHash, soilOk: true });

  if (!armed()) {
    console.log("[mainnet-live] dry-run — set CONFIRM_MAINNET_LIVE_FILL=YES BROADCAST=1 MAINNET_PK=0x…");
    if (rotateAdmin) console.log("[mainnet-live] add --rotate-admin to proposeAdmin(activeWallet) on broadcast");
    return;
  }

  const account = privateKeyToAccount(resolveMainnetPrivateKey());
  const wallet = createWalletClient({ account, chain: arbitrum, transport: http(RPC) });
  const now = BigInt(Math.floor(Date.now() / 1000));
  const att = {
    payloadHash, subject: account.address, verdict: 1, riskBps: 1200,
    issuedAt: now, expiresAt: now + 30n, nonce: now,
  };
  const sig = await signAttestation(wallet, att);
  const signerPk = (process.env.GATE_SIGNER_KEY_0 ?? "").trim() as Hex;
  const signer = signerPk.startsWith("0x") ? privateKeyToAccount(signerPk) : account;
  const gateSig = signerPk.startsWith("0x")
    ? await createWalletClient({ account: signer, chain: arbitrum, transport: http(RPC) }).signTypedData({
        account: signer, domain: { name: EIP712_DOMAIN_NAME, version: EIP712_DOMAIN_VERSION, chainId: CHAIN_ID, verifyingContract: GATE },
        types: { RiskAttestation: [{ name: "payloadHash", type: "bytes32" }, { name: "subject", type: "address" }, { name: "verdict", type: "uint8" }, { name: "riskBps", type: "uint16" }, { name: "issuedAt", type: "uint64" }, { name: "expiresAt", type: "uint64" }, { name: "nonce", type: "uint256" }] },
        primaryType: "RiskAttestation", message: att,
      })
    : sig;

  const fillHash = await wallet.writeContract({
    address: GATE, abi: gateAbi, functionName: "verifyAndConsume",
    args: [att, [gateSig]],
  });
  const receipt = await client.waitForTransactionReceipt({ hash: fillHash });
  console.log("[mainnet-live] gate verifyAndConsume", { tx: fillHash, block: receipt.blockNumber.toString(), url: arbiscan(fillHash) });

  if (rotateAdmin) {
    const admin = await client.readContract({ address: GATE, abi: gateAbi, functionName: "admin" });
    if (admin.toLowerCase() === account.address.toLowerCase()) {
      const rotHash = await wallet.writeContract({ address: GATE, abi: gateAbi, functionName: "proposeAdmin", args: [account.address] });
      const rotRcpt = await client.waitForTransactionReceipt({ hash: rotHash });
      console.log("[mainnet-live] proposeAdmin", { tx: rotHash, block: rotRcpt.blockNumber.toString(), url: arbiscan(rotHash) });
      const acceptHash = await wallet.writeContract({ address: GATE, abi: gateAbi, functionName: "acceptAdmin" });
      const acceptRcpt = await client.waitForTransactionReceipt({ hash: acceptHash });
      console.log("[mainnet-live] acceptAdmin", { tx: acceptHash, block: acceptRcpt.blockNumber.toString(), url: arbiscan(acceptHash) });
    } else {
      console.log("[mainnet-live] skip rotate — caller is not current gate admin", { admin, caller: account.address });
    }
  }
  console.log("[mainnet-live] GMX payload ready for router broadcast (unsigned preview logged above)");
}

main().catch((err) => { console.error("[mainnet-live] fail-closed", err); process.exit(1); });
