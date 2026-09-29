#!/usr/bin/env tsx
/** Wallet A GMX v2 ETH Short fallback — balance probe · simulate · fork trace JSON (HL primary · GMX fallback). */
import { mkdirSync, writeFileSync } from "node:fs";
import { createPublicClient, getAddress, http, type Hex } from "viem";
import { arbitrum } from "viem/chains";
import { GMX_V2_EXCHANGE_ROUTER_ARBITRUM } from "../src/config/gmx-revenue";
import { HL_WALLET_A_DEFAULT } from "../src/services/gmx-cross-wallet-hedge-fetch";
import {
  buildGmxWalletAShortOrder,
  GMX_WALLET_A_SHORT_MIN_COLLATERAL_USD,
} from "../src/services/adapters/gmx-v2-wallet-a-short-builder";
import { loadGmxMicroFillMarketSnapshot } from "./gmx-micro-fill-market-loader";
import { printVenuePreflightFail, runVenuePreflight } from "./_shared/venue-preflight-report";

const CHAIN_ID = 42161;
const DEFAULT_RPC = "https://arb1.arbitrum.io/rpc";
const ARTIFACT_PATH = "artifacts/gmx_short_fallback_fork_trace.json";
const FIXTURE_PATH = "contracts/test/fixtures/gmx-wallet-a-short-multicall.json";
const routerAbi = [
  {
    type: "function",
    name: "multicall",
    stateMutability: "payable",
    inputs: [{ name: "data", type: "bytes[]" }],
    outputs: [{ type: "bytes[]" }],
  },
] as const;

function resolveRpc(): string {
  return (process.env.ANVIL_RPC_URL ?? process.env.ARB_MAINNET_RPC_URL ?? DEFAULT_RPC).trim();
}

function resolveWalletA(): Hex {
  return getAddress((process.env.HYPERLIQUID_MAINNET_USER_ADDRESS ?? HL_WALLET_A_DEFAULT).trim());
}

function parseSizeUsd(argv: string[]): number {
  const raw = argv.find((a, i) => argv[i - 1] === "--size") ?? "10";
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < GMX_WALLET_A_SHORT_MIN_COLLATERAL_USD) {
    throw new Error(`[GMX_SHORT_HEDGE] size must be >= $${GMX_WALLET_A_SHORT_MIN_COLLATERAL_USD}`);
  }
  return n;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const rpc = resolveRpc();
  const walletA = resolveWalletA();
  const sizeUsd = parseSizeUsd(argv);
  const forkMode = Boolean(process.env.ANVIL_RPC_URL?.trim());

  const client = createPublicClient({ chain: arbitrum, transport: http(rpc) });
  const chainId = await client.getChainId();
  if (chainId !== CHAIN_ID) throw new Error(`[GMX_SHORT_HEDGE] refuse chain ${chainId}`);

  const blockNumber = await client.getBlockNumber();
  const preflight = await runVenuePreflight({
    matrixId: "gmx-short",
    signer: walletA,
    amountUsd: sizeUsd,
    rpc,
    client,
  });
  if (!preflight.ok) {
    printVenuePreflightFail(preflight);
    process.exit(1);
  }
  const usdcBal = BigInt(
    Math.floor(Number(preflight.probe?.actual.USDC ?? "0") * 1_000_000),
  );
  const ethBalStr = preflight.probe?.actual.eth ?? "0";
  const minCollateral = BigInt(Math.floor(sizeUsd * 1_000_000));
  console.log("[GMX_SHORT_HEDGE] balance_probe", {
    walletA,
    ethWei: ethBalStr,
    usdcRaw: usdcBal.toString(),
    minCollateral: minCollateral.toString(),
    sufficient: usdcBal >= minCollateral,
    forkMode,
    rpc: forkMode ? "anvil" : "mainnet",
  });

  const market = await loadGmxMicroFillMarketSnapshot("ETH");
  const built = buildGmxWalletAShortOrder({
    walletA,
    sizeUsd,
    midPriceUsd: market.midPriceUsd,
    pool: market.pool,
    maxSlippageBps: 100,
  });

  const telemetry = {
    acceptablePrice: built.payload.numbers.acceptablePrice,
    executionFee: built.executionFee.toString(),
    collateral: built.collateral.toString(),
    sizeDeltaUsd: built.payload.numbers.sizeDeltaUsd,
    isLong: built.payload.isLong,
    multicallLegs: built.calls.length,
    router: GMX_V2_EXCHANGE_ROUTER_ARBITRUM,
  };
  console.log("[GMX_SHORT_HEDGE] telemetry", telemetry);

  mkdirSync("contracts/test/fixtures", { recursive: true });
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(FIXTURE_PATH, `${JSON.stringify({
    eoa: walletA,
    router: GMX_V2_EXCHANGE_ROUTER_ARBITRUM,
    market: built.payload.addresses.market,
    multicallData: built.multicallData,
    msgValue: built.msgValue.toString(),
    calls: built.calls,
    executionFee: built.executionFee.toString(),
    collateral: built.collateral.toString(),
    isLong: built.payload.isLong,
  }, null, 2)}\n`);

  let simulate: { ok: boolean; error?: string };
  if (usdcBal < minCollateral) {
    simulate = { ok: false, error: "INSUFFICIENT_USDC" };
    console.log("[GMX_SHORT_HEDGE] simulate_skipped", simulate);
  } else {
    try {
      await client.simulateContract({
        address: getAddress(GMX_V2_EXCHANGE_ROUTER_ARBITRUM),
        abi: routerAbi,
        functionName: "multicall",
        args: [built.calls],
        value: built.msgValue,
        account: walletA,
      });
      simulate = { ok: true };
      console.log("[GMX_SHORT_HEDGE] simulate_ok", { walletA, dryRun: true });
    } catch (err) {
      simulate = { ok: false, error: err instanceof Error ? err.message : String(err) };
      console.warn("[GMX_SHORT_HEDGE] simulate_revert", simulate);
    }
  }

  const trace = {
    balances: { ethWei: ethBalStr, usdc: usdcBal.toString(), minCollateral: minCollateral.toString() },
    meta: {
      blockNumber: blockNumber.toString(),
      chainId: CHAIN_ID,
      walletA,
      fixture: FIXTURE_PATH,
      msgValue: built.msgValue.toString(),
      router: GMX_V2_EXCHANGE_ROUTER_ARBITRUM,
      forkMode,
    },
    telemetry,
    simulate,
    audit: { isLong: built.wire.isLong, acceptablePrice: built.wire.numbers.acceptablePrice.toString() },
  };
  writeFileSync(ARTIFACT_PATH, `${JSON.stringify(trace, null, 2)}\n`);
  console.log("[GMX_SHORT_HEDGE] wrote", ARTIFACT_PATH);

  if (!simulate.ok && usdcBal < minCollateral) process.exit(1);
}

main().catch((err) => {
  console.error("[GMX_SHORT_HEDGE] fatal", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
