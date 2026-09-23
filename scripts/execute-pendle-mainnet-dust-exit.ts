#!/usr/bin/env tsx
/**
 * Arbitrum One (42161) — Pendle PT dust redeem via Convert API (Wallet A EOA).
 * Guard lane: `pnpm demo:pendle -- --trip`. This script: market selector + funding preflight only.
 * Redeem outputs sUSDai (not USDai). Dry-run default. Live: CONFIRM_PENDLE_DUST_EXIT=YES BROADCAST=1 WALLET_A_PRIVATE_KEY=0x… [--redeem-all]
 */
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { pickBestPendlePtMarket } from "../src/adapters/pendle/pendle-pt-selector";
import { loadMainnetEnv, resolveMainnetPrivateKey } from "./_shared/mainnet-env";
import { printLiveHarnessBypassBanner } from "./_shared/live-harness-warning";
import { assertPtBalanceNonZero, readPtBalance } from "./_shared/pendle-pt-balance";
import { broadcastPendleDustPlan } from "./_shared/pendle-dust-broadcast";
import { printVenuePreflightFail, runVenuePreflight } from "./_shared/venue-preflight-report";
import {
  buildPendleDustRedeemPlan,
  resolvePendleDustTokenOut,
} from "./pendle-dust-convert";

const CHAIN_ID = 42161;
const DEFAULT_RPC = "https://arb1.arbitrum.io/rpc";

function resolveRpc(): string {
  return (process.env.ARB_MAINNET_RPC_URL ?? DEFAULT_RPC).trim();
}

function armed(): boolean {
  return process.env.BROADCAST === "1" && process.env.CONFIRM_PENDLE_DUST_EXIT === "YES";
}

function redeemAll(argv: string[]): boolean {
  return argv.includes("--redeem-all") || process.env.PENDLE_DUST_REDEEM_ALL === "1";
}

async function main(): Promise<void> {
  loadMainnetEnv();
  printLiveHarnessBypassBanner();
  const argv = process.argv.slice(2);
  const rpc = resolveRpc();
  const pk = resolveMainnetPrivateKey();
  const account = privateKeyToAccount(pk);
  const publicClient = createPublicClient({ chain: arbitrum, transport: http(rpc) });
  if ((await publicClient.getChainId()) !== CHAIN_ID) throw new Error(`refuse: expected chain ${CHAIN_ID}`);

  const preflight = await runVenuePreflight({
    matrixId: "pendle-pt-dust",
    signer: account.address,
    amountUsd: 0,
    rpc,
    client: publicClient,
  });
  if (!preflight.ok) {
    printVenuePreflightFail(preflight);
    process.exit(1);
  }

  const nowMs = Date.now();
  const pick = pickBestPendlePtMarket({
    nowMs,
    preferredSymbols: ["sUSDai"],
    protocolFilter: ["USD.AI"],
    dustAmountUsd: 1,
  });
  if (!pick.selected) {
    console.log(JSON.stringify({ event: "PENDLE_DUST_EXIT_ABORT", rejected: pick.rejected }, null, 2));
    process.exit(1);
  }

  const entry = pick.selected.entry;
  const pt = entry.ptAddress;
  if (!pt) throw new Error("PENDLE_DUST_MISSING_PT_ADDRESS");
  const ptBalance = await readPtBalance(publicClient, pt, account.address);
  assertPtBalanceNonZero(ptBalance);
  const ptAmount = redeemAll(argv) ? ptBalance : ptBalance;

  const tokenOut = resolvePendleDustTokenOut(entry);
  const plan = await buildPendleDustRedeemPlan({
    receiver: account.address,
    entry,
    ptAmount,
    tokenOut,
    slippage: 0.02,
  });

  console.log(
    JSON.stringify(
      {
        event: "PENDLE_DUST_EXIT_PREFLIGHT_OK",
        market: entry.symbol,
        pt,
        tokenOut,
        ptAmount: ptAmount.toString(),
        router: plan.router,
        action: plan.action,
        dryRun: !armed(),
      },
      null,
      2,
    ),
  );

  if (!armed()) {
    console.log("[pendle-dust-exit] dry-run — set CONFIRM_PENDLE_DUST_EXIT=YES BROADCAST=1 to broadcast");
    return;
  }

  const hash = await broadcastPendleDustPlan({
    plan,
    account,
    publicClient,
    rpc,
  });
  console.log(JSON.stringify({ event: "PENDLE_DUST_EXIT_BROADCAST_OK", hash }, null, 2));
}

main().catch((err) => {
  console.error("[pendle-dust-exit] fatal", err instanceof Error ? err.message : err);
  process.exit(1);
});
