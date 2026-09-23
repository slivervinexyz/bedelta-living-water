#!/usr/bin/env tsx
/**
 * Arbitrum One (42161) — Pendle PT Fixed Yield dust via Convert API (Wallet A EOA).
 * Guard lane: `pnpm demo:pendle -- --trip`. This script: market selector + funding preflight only.
 * Dry-run default. Live: CONFIRM_PENDLE_DUST=YES BROADCAST=1 WALLET_A_PRIVATE_KEY=0x… [--amount-usd=1]
 */
import { createPublicClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { refreshPendleArbitrumDiscovery } from "../src/adapters/pendle/pendle-api-discovery";
import { pickBestPendlePtMarket } from "../src/adapters/pendle/pendle-pt-selector";
import { loadMainnetEnv, resolveMainnetPrivateKey } from "./_shared/mainnet-env";
import { printLiveHarnessBypassBanner } from "./_shared/live-harness-warning";
import { broadcastPendleDustPlan } from "./_shared/pendle-dust-broadcast";
import { printVenuePreflightFail, runVenuePreflight } from "./_shared/venue-preflight-report";
import {
  buildPendleDustConvertPlan,
  resolvePendleDustTokenIn,
} from "./pendle-dust-convert";

const CHAIN_ID = 42161;
const DEFAULT_RPC = "https://arb1.arbitrum.io/rpc";

function resolveRpc(): string {
  return (process.env.ARB_MAINNET_RPC_URL ?? DEFAULT_RPC).trim();
}

function armed(): boolean {
  return process.env.BROADCAST === "1" && process.env.CONFIRM_PENDLE_DUST === "YES";
}

function parseAmountUsd(argv: string[]): number {
  const flag = argv.find((a) => a.startsWith("--amount-usd="));
  const raw = flag ? flag.split("=")[1] : process.env.PENDLE_DUST_AMOUNT_USD ?? "1";
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 20) throw new Error("PENDLE_DUST_AMOUNT_INVALID");
  return n;
}

async function main(): Promise<void> {
  loadMainnetEnv();
  printLiveHarnessBypassBanner();
  const argv = process.argv.slice(2);
  const amountUsd = parseAmountUsd(argv);
  const rpc = resolveRpc();
  const pk = resolveMainnetPrivateKey();
  const account = privateKeyToAccount(pk);
  const publicClient = createPublicClient({ chain: arbitrum, transport: http(rpc) });
  if ((await publicClient.getChainId()) !== CHAIN_ID) throw new Error(`refuse: expected chain ${CHAIN_ID}`);

  const preflight = await runVenuePreflight({
    matrixId: "pendle-pt-dust",
    signer: account.address,
    amountUsd,
    rpc,
    client: publicClient,
  });
  if (!preflight.ok) {
    printVenuePreflightFail(preflight);
    process.exit(1);
  }

  const discovery = await refreshPendleArbitrumDiscovery();
  const nowMs = Date.now();
  const pick = pickBestPendlePtMarket({
    nowMs,
    preferredSymbols: ["sUSDai"],
    protocolFilter: ["USD.AI"],
    dustAmountUsd: amountUsd,
  });
  if (!pick.selected) {
    console.log(JSON.stringify({ event: "PENDLE_DUST_ABORT", rejected: pick.rejected }, null, 2));
    process.exit(1);
  }

  const entry = pick.selected.entry;
  const tokenIn = resolvePendleDustTokenIn(entry);
  const decimals = 18;
  const amountIn = parseUnits(amountUsd.toFixed(6), decimals);
  const plan = await buildPendleDustConvertPlan({
    receiver: account.address,
    entry,
    tokenIn,
    amountIn,
    slippage: 0.02,
  });

  console.log(
    JSON.stringify(
      {
        event: "PENDLE_DUST_PREFLIGHT_OK",
        discoveryCount: discovery.count,
        market: entry.symbol,
        marketAddress: entry.marketAddress,
        pt: entry.ptAddress,
        tokenIn,
        amountUsd,
        router: plan.router,
        action: plan.action,
        dryRun: !armed(),
      },
      null,
      2,
    ),
  );

  if (!armed()) {
    console.log("[pendle-dust] dry-run — set CONFIRM_PENDLE_DUST=YES BROADCAST=1 to broadcast");
    return;
  }

  const hash = await broadcastPendleDustPlan({ plan, account, publicClient, rpc });
  console.log(JSON.stringify({ event: "PENDLE_DUST_BROADCAST_OK", hash }, null, 2));
}

main().catch((err) => {
  console.error("[pendle-dust] fatal", err instanceof Error ? err.message : err);
  process.exit(1);
});
