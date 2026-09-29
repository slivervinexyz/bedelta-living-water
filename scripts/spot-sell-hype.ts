#!/usr/bin/env tsx
/** Wallet A — market sell all Spot HYPE → USDC. */
import { HL_WALLET_A_DEFAULT } from "../src/services/gmx-cross-wallet-hedge";
import { refreshSoilArbitrumProbesWithFallback } from "../src/services/risk-control";
import { loadEnvProduction, mask, requireEnv } from "./_shared/mainnet-env";
import {
  executeSpotMarketSell,
  fetchSpotCoinBalance,
  fetchSpotUsdcBalance,
} from "./_shared/hl-spot-order";
import { probeL2FailClosed } from "./mainnet-ignition/l2-probe-ws";

const COIN = "HYPE";

async function main(): Promise<void> {
  loadEnvProduction();
  const user = (process.env.HYPERLIQUID_MAINNET_USER_ADDRESS ?? HL_WALLET_A_DEFAULT).trim();
  const sessionPk = requireEnv("HYPERLIQUID_MAINNET_SESSION_PK");
  const live = process.argv.includes("--live");

  console.log("═══ Wallet A Spot HYPE Liquidation ═══");
  console.log(`Mode: ${live ? "LIVE" : "DRY_RUN"}`);
  console.log(`Wallet A: ${mask(user)}`);

  const hypeBefore = await fetchSpotCoinBalance(user, COIN);
  const usdcBefore = await fetchSpotUsdcBalance(user);
  console.log(`Spot before: HYPE=${hypeBefore.toFixed(6)} · USDC=$${usdcBefore.toFixed(2)}`);

  if (!(hypeBefore > 0)) {
    console.log("RESULT: SKIP — no Spot HYPE balance");
    process.exit(0);
  }

  if (!live) {
    console.log(`DRY_RUN: would market-sell ${hypeBefore.toFixed(6)} HYPE`);
    process.exit(0);
  }

  await refreshSoilArbitrumProbesWithFallback();
  const probe = await probeL2FailClosed(COIN);
  const fill = await executeSpotMarketSell({
    coin: COIN,
    size: hypeBefore,
    sessionPk,
    userAddress: user,
    preTrade: {
      symbol: COIN,
      hlSpot: probe.midPx,
      hlPerp: probe.midPx,
      dydxPerp: probe.midPx,
      depthUsd: Math.max(probe.depthUsd, 100_000),
      latencyMs: Math.min(probe.probeMs, 50),
      expectedSlippage: 0.0005,
      accountBalanceUsd: Math.max(usdcBefore, 100),
      isTestnet: false,
    },
  });

  await new Promise((r) => setTimeout(r, 1500));
  const hypeAfter = await fetchSpotCoinBalance(user, COIN);
  const usdcAfter = await fetchSpotUsdcBalance(user);

  console.log(
    `Spot sold: ${fill.soldSize.toFixed(6)} HYPE · USDC recv ~$${fill.usdcReceivedUsd.toFixed(2)} · oid=${fill.oid ?? "n/a"}`,
  );
  console.log(
    `Spot after: HYPE=${hypeAfter.toFixed(6)} · USDC=$${usdcAfter.toFixed(2)} (+$${(usdcAfter - usdcBefore).toFixed(2)})`,
  );
  console.log(`RESULT: ${fill.ok ? "LIVE OK" : "LIVE FAIL"} ${fill.reason ?? ""}`);
  process.exit(fill.ok ? 0 : 1);
}

main().catch((err) => {
  console.error("[spot:sell-hype] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
