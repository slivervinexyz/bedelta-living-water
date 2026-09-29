#!/usr/bin/env tsx
/**
 * Hyperliquid mainnet — micro perp hedge (Wallet A session key).
 * Dry-run default. Live: CONFIRM_HL_MICRO_HEDGE=YES BROADCAST=1 WALLET_A_PRIVATE_KEY=0x… [--size-usd=1]
 */
import { privateKeyToAccount } from "viem/accounts";
import { loadMainnetEnv, resolveMainnetPrivateKey } from "./_shared/mainnet-env";
import { printLiveHarnessBypassBanner } from "./_shared/live-harness-warning";
import { printVenuePreflightFail, runVenuePreflight } from "./_shared/venue-preflight-report";
import {
  buildHlExecutionContext,
  buildHlMicroHedgePlan,
  healthyHlPreTrade,
  runHlMicroHedgeDryOrLive,
} from "./_shared/hl-micro-hedge";

function armed(): boolean {
  return process.env.BROADCAST === "1" && process.env.CONFIRM_HL_MICRO_HEDGE === "YES";
}

function parseSizeUsd(argv: string[]): number {
  const flag = argv.find((a) => a.startsWith("--size-usd="));
  const raw = flag ? flag.split("=")[1] : process.env.HL_MICRO_HEDGE_SIZE_USD ?? "1";
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 5) throw new Error("HL_MICRO_HEDGE_SIZE_INVALID");
  return n;
}

async function main(): Promise<void> {
  loadMainnetEnv();
  printLiveHarnessBypassBanner();
  const argv = process.argv.slice(2);
  const sizeUsd = parseSizeUsd(argv);
  const pk = resolveMainnetPrivateKey();
  const account = privateKeyToAccount(pk);

  const preflight = await runVenuePreflight({
    matrixId: "hyperliquid-hedge",
    signer: account.address,
    amountUsd: sizeUsd,
  });
  if (!preflight.ok) {
    printVenuePreflightFail(preflight);
    process.exit(1);
  }

  const plan = await buildHlMicroHedgePlan(sizeUsd);
  const ctx = buildHlExecutionContext(pk, account.address, !armed());
  const result = await runHlMicroHedgeDryOrLive(plan, ctx, healthyHlPreTrade(sizeUsd));

  console.log(
    JSON.stringify(
      {
        event: "HL_MICRO_HEDGE_PREFLIGHT_OK",
        symbol: plan.symbol,
        size: plan.size,
        limitPx: plan.limitPx,
        dryRun: !armed(),
        hlResponse: result.response ?? null,
      },
      null,
      2,
    ),
  );

  if (!armed()) {
    console.log("[hl-micro-hedge] dry-run — set CONFIRM_HL_MICRO_HEDGE=YES BROADCAST=1 to broadcast");
  }
}

main().catch((err) => {
  console.error("[hl-micro-hedge] fatal", err instanceof Error ? err.message : err);
  process.exit(1);
});
