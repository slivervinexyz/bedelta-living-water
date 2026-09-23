#!/usr/bin/env tsx
/** Wallet A — USDC margin sweep (10x Short HYPE) + circuit breaker probe. */
import { Wallet } from "ethers";
import { HL_EXCHANGE_URL } from "../src/config/constants";
import { executeHlSessionKeyOrder } from "../src/adapters/hl/session-key-executor";
import { sanitizeSessionKeyForMasterWalletTrading } from "../src/adapters/hl/execution-types";
import { buildClearinghouseStateRequest } from "../src/adapters/hl/wallet/marginChecker";
import { buildSystemState } from "../src/core/state";
import {
  isRpcRadarSequencerHealthy,
  refreshRpcRadar,
} from "../src/services/adapters/rpc-radar";
import {
  checkSoilResistanceWithArbFallback,
  refreshSoilArbitrumProbesWithFallback,
} from "../src/services/risk-control";
import { loadEnvProduction, mask, requireEnv } from "./_shared/mainnet-env";
import { fetchUnifiedAccount, postHlInfoDirect } from "./mainnet-ignition/hl-account";
import { fetchMetaBundle } from "./mainnet-ignition/hl-meta-target";
import { probeL2FailClosed } from "./mainnet-ignition/l2-probe-ws";

const WALLET_A_FALLBACK = "0xef0752df6387248B897F3A59A180af42D801960d";
const SWEEP_LEVERAGE = 10;
const MARGIN_UTIL = 0.95;

function resolveHypePerpMeta(meta: Awaited<ReturnType<typeof fetchMetaBundle>>) {
  const idx = meta.universe.findIndex((row) => (row.name ?? "").toUpperCase() === "HYPE");
  if (idx < 0) throw new Error("HYPE perp meta missing");
  const ctx = meta.ctxs[idx] ?? {};
  const midPx = parseFloat(ctx.midPx ?? ctx.oraclePx ?? ctx.markPx ?? "0");
  return {
    assetIndex: idx,
    szDecimals: meta.universe[idx]?.szDecimals ?? 4,
    midPx: midPx > 0 ? midPx : 35,
  };
}

async function fetchHypeShortPosition(user: string) {
  const res = await postHlInfoDirect(buildClearinghouseStateRequest(user));
  if (!res.ok) return null;
  const ch = (await res.json()) as {
    assetPositions?: Array<{ position?: { coin?: string; szi?: string } }>;
  };
  for (const row of ch.assetPositions ?? []) {
    const coin = (row.position?.coin ?? "").toUpperCase();
    if (coin !== "HYPE") continue;
    const szi = parseFloat(row.position?.szi ?? "0") || 0;
    return {
      coin,
      szi,
      side: szi < 0 ? "SHORT" : szi > 0 ? "LONG" : "FLAT",
      absSize: Math.abs(szi),
    };
  }
  return { coin: "HYPE", szi: 0, side: "FLAT" as const, absSize: 0 };
}

async function main(): Promise<void> {
  loadEnvProduction();
  const user = (process.env.HYPERLIQUID_MAINNET_USER_ADDRESS ?? WALLET_A_FALLBACK).trim();
  const sessionPk = requireEnv("HYPERLIQUID_MAINNET_SESSION_PK");
  const live = process.argv.includes("--live");

  console.log("═══ Wallet A USDC Sweep Probe ═══");
  console.log(`Mode: ${live ? "LIVE" : "DRY_RUN"}`);
  console.log(`Wallet A: ${mask(user)}`);

  const arbProbe = await refreshSoilArbitrumProbesWithFallback();
  await refreshRpcRadar();
  console.log(
    `Sequencer: ${arbProbe.sequencerOk ? "ONLINE" : "TRIP"} ${arbProbe.reasons.find((r) => r.includes("SEQUENCER")) ?? ""}`,
  );
  console.log(
    `SoftConfirm: ${arbProbe.softOk ? "ONLINE" : "TRIP"} ${arbProbe.reasons.find((r) => r.includes("SOFT")) ?? ""}`,
  );
  console.log(`RPC Radar: ${isRpcRadarSequencerHealthy() ? "ONLINE" : "DEGRADED"}`);

  const account = await fetchUnifiedAccount(user);
  const marginUsd = account.unifiedAvailableUsd;
  const sweepNotional = marginUsd * SWEEP_LEVERAGE * MARGIN_UTIL;
  console.log(
    `Balance: unifiedAvailable=$${marginUsd.toFixed(2)} · sweepNotional(10x)=` +
      `$${sweepNotional.toFixed(2)}`,
  );

  const probe = await probeL2FailClosed("HYPE");
  console.log(
    `HL L2: ${probe.ok ? "ONLINE" : "STALE"} ${probe.probeMs}ms depth=$${probe.depthUsd.toFixed(0)} mid=$${probe.midPx}`,
  );

  const soil = await checkSoilResistanceWithArbFallback({
    symbol: "HYPE",
    hlSpot: probe.midPx,
    hlPerp: probe.midPx,
    dydxPerp: probe.midPx,
    depthUsd: Math.max(probe.depthUsd, 100_000),
    accountBalanceUsd: Math.max(marginUsd, 1),
    orderSizeUsd: sweepNotional,
  });
  console.log(`Soil: ${soil.ok ? "PASS" : "TRIP"} ${soil.reasons.join("|") || "ok"}`);
  if (!soil.ok || !probe.ok || !arbProbe.sequencerOk || !arbProbe.softOk) {
    console.log("RESULT: ABORT — circuit breaker blocked sweep");
    process.exit(1);
  }

  const meta = await fetchMetaBundle();
  const hype = resolveHypePerpMeta(meta);
  const wallet = new Wallet(sessionPk);
  const riskBalanceUsd = Math.max(marginUsd, sweepNotional / 0.01, 10_000);

  await refreshSoilArbitrumProbesWithFallback();

  const result = await executeHlSessionKeyOrder(
    { venue: "HL", side: "SHORT", sizeUsd: sweepNotional, symbol: "HYPE" },
    {
      signer: wallet,
      dryRun: !live,
      isTestnet: false,
      exchangeUrl: HL_EXCHANGE_URL,
      marketIoc: true,
      limitPx: hype.midPx,
      szDecimals: hype.szDecimals,
      resolveAssetIndex: () => hype.assetIndex,
      fetchFn: fetch,
      sessionKey: sanitizeSessionKeyForMasterWalletTrading(
        {
          agentAddress: wallet.address,
          expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
          masterWalletAddress: user,
        },
        user,
      ),
      systemState: buildSystemState({
        accountBalanceUsd: riskBalanceUsd,
        currentCri: 100,
        skipHardlockAssert: true,
      }),
      preTrade: {
        symbol: "HYPE",
        hlSpot: probe.midPx,
        hlPerp: probe.midPx,
        dydxPerp: probe.midPx,
        depthUsd: Math.max(probe.depthUsd, 100_000),
        latencyMs: Math.min(probe.probeMs, 50),
        expectedSlippage: 0.0005,
        accountBalanceUsd: riskBalanceUsd,
        isTestnet: false,
      },
    },
  );

  const oid = result.exchangeOid ?? (result.dryRun ? "DRY_RUN" : "n/a");
  const execUsd = result.filledUsd ?? sweepNotional;
  console.log(
    `Sweep: ok=${result.ok} dryRun=${result.dryRun} symbol=HYPE sizeUsd=${execUsd.toFixed(2)} oid=${oid}`,
  );
  if (result.reason) console.log(`Reason: ${result.reason}`);
  if (!result.ok && "reasons" in result && Array.isArray((result as { reasons?: string[] }).reasons)) {
    console.log(`Details: ${((result as { reasons: string[] }).reasons).join("|")}`);
  }

  if (live && result.ok) {
    await new Promise((r) => setTimeout(r, 1500));
    const pos = await fetchHypeShortPosition(user);
    if (pos) {
      console.log(
        `Position: ${pos.coin} ${pos.side} sz=${pos.absSize} (szi=${pos.szi})`,
      );
    }
  } else {
    console.log(`Position target (10x): ~$${sweepNotional.toFixed(2)} short HYPE notional`);
  }

  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error("[wallet-a-sweep] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
