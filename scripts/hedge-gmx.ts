#!/usr/bin/env tsx
/** GMX Wallet B ETH delta → Wallet A HL ETH perp short (cross-wallet 0-Δ). */
import {
  HL_WALLET_A_DEFAULT,
  runGmxCrossWalletEthHedge,
} from "../src/services/gmx-cross-wallet-hedge";
import {
  fetchGmxEthDeltaForWallet,
  GMX_WALLET_B_DEFAULT,
  GmxLiveDeltaReaderError,
} from "../src/services/gmx-eth-delta";
import { loadEnvProduction, mask, requireEnv } from "./_shared/mainnet-env";
import { buildClearinghouseStateRequest } from "../src/adapters/hl/wallet/marginChecker";
import { postHlInfoDirect } from "./mainnet-ignition/hl-account";

async function fetchEthShort(user: string): Promise<number> {
  const res = await postHlInfoDirect(buildClearinghouseStateRequest(user));
  if (!res.ok) return 0;
  const ch = (await res.json()) as {
    assetPositions?: Array<{ position?: { coin?: string; szi?: string } }>;
  };
  for (const row of ch.assetPositions ?? []) {
    if ((row.position?.coin ?? "").toUpperCase() !== "ETH") continue;
    const szi = parseFloat(row.position?.szi ?? "0") || 0;
    return szi < 0 ? Math.abs(szi) : 0;
  }
  return 0;
}

async function main(): Promise<void> {
  loadEnvProduction();
  const walletA = (process.env.HYPERLIQUID_MAINNET_USER_ADDRESS ?? HL_WALLET_A_DEFAULT).trim();
  const walletB = (process.env.ARB_MAINNET_USER_ADDRESS ?? GMX_WALLET_B_DEFAULT).trim();
  const sessionPk = requireEnv("HYPERLIQUID_MAINNET_SESSION_PK");
  const live = process.argv.includes("--live");
  const dryRun = !live || process.argv.includes("--dry-run");

  console.log("═══ GMX Cross-Wallet ETH Delta Hedge ═══");
  console.log(`Mode: ${dryRun ? "DRY_RUN" : "LIVE"}`);
  console.log(`Wallet B (GMX): ${mask(walletB)}`);
  console.log(`Wallet A (HL):  ${mask(walletA)}`);

  const delta = await fetchGmxEthDeltaForWallet(walletB);
  console.log(
    `GMX GM (live): ${delta.gmBalance.toFixed(6)} GM · TVL=$${delta.gmLiquidityUsd.toFixed(2)} · source=${delta.live.source}`,
  );
  console.log(
    `Pool (DataStore): long=${delta.live.poolLongEth.toFixed(4)} ETH · short=$${delta.live.poolShortUsdc.toFixed(2)} USDC`,
  );
  console.log(
    `ETH Delta (live): ${delta.ethDeltaSize.toFixed(6)} ETH · $${delta.ethDeltaUsd.toFixed(2)} · share=${(delta.poolShare * 100).toFixed(4)}%`,
  );

  const existing = await fetchEthShort(walletA);
  const targetShort = Math.max(0, delta.ethDeltaSize - existing);
  console.log(`Wallet A existing ETH short: ${existing.toFixed(6)} ETH`);
  console.log(`Target HL ETH Short: ${targetShort.toFixed(6)} ETH · ~$${(targetShort * delta.ethMidUsd).toFixed(2)}`);

  if (dryRun) {
    console.log("RESULT: DRY_RUN OK — no Hyperliquid order submitted");
    process.exit(0);
  }

  const result = await runGmxCrossWalletEthHedge({
    sessionPk,
    walletA,
    walletB,
    dryRun: false,
  });

  console.log(
    `Hedge order: ${result.orderEthSize.toFixed(6)} ETH · $${result.orderUsd.toFixed(2)} · ok=${result.ok} oid=${result.exchangeOid ?? "n/a"}`,
  );
  if (result.reason) console.log(`Reason: ${result.reason}`);

  if (result.ok) {
    await new Promise((r) => setTimeout(r, 1500));
    const ethShort = await fetchEthShort(walletA);
    console.log(`Wallet A final ETH short: ${ethShort.toFixed(6)} ETH (target ${delta.ethDeltaSize.toFixed(6)})`);
  }

  console.log(`RESULT: ${result.ok ? "LIVE OK" : "FAIL"}`);
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  if (err instanceof GmxLiveDeltaReaderError) {
    console.error(`[hedge:gmx] CIRCUIT_TRIP ${err.code}: ${err.message}`);
  } else {
    console.error("[hedge:gmx] fatal:", err instanceof Error ? err.message : err);
  }
  process.exit(1);
});
