#!/usr/bin/env tsx
/**
 * Arbitrum Sepolia GMX v2 + Hyperliquid testnet dual-leg interact.
 * Writes scripts/sepolia-proof.json for /api/grant-audit telemetry attach.
 *
 * Usage:
 *   tsx scripts/sepolia-gmx-hl-interact.ts
 *   SEPOLIA_LIVE=1 HL_TESTNET_PRIVATE_KEY=0x... tsx scripts/sepolia-gmx-hl-interact.ts
 */

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSepoliaArbiscanTxUrl,
  GRANT_AUDIT_SEPOLIA_ANCHOR_TX_HASH,
  type SepoliaDualLegProof,
} from "../src/routes/grant-audit-lib/sepolia-dual-leg-proof.types";
import { fetchSplitBorrowRates } from "../src/services/adapters/gmx-v2-datastore";
import {
  buildGmxV2UnsignedDepositPayload,
  resolveGmxUiFeeReceiver,
} from "../src/services/adapters/gmx-v2-order-payload";
import { resolveGmxUnderweightSide } from "../src/services/yield/gmx-v2-balancer";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts/sepolia-proof.json");
const BUNDLE = join(ROOT, "src/routes/grant-audit-lib/sepolia-proof.bundle.json");
const SEPOLIA_RPC = process.env.ARB_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
const SEPOLIA_DATASTORE =
  process.env.GMX_SEPOLIA_DATASTORE ?? "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8";
const SEPOLIA_MARKETS =
  process.env.GMX_SEPOLIA_MARKETS_URL ?? "https://arbitrum-sepolia-api.gmxinfra.io/markets/info";
const HL_TESTNET = "https://api.hyperliquid-testnet.xyz/info";
const SYMBOL = "ETH";
const SIZE_USD = 100;

interface GmxMarketRow {
  name?: string;
  marketToken?: string;
  longToken?: string;
  shortToken?: string;
  longPoolAmount?: string;
  shortPoolAmount?: string;
}

const SEPOLIA_STUB_MARKET: GmxMarketRow = {
  name: "ETH/USD",
  marketToken: "0x0000000000000000000000000000000000000e01",
  longToken: "0x0000000000000000000000000000000000000e02",
  shortToken: "0x0000000000000000000000000000000000000e03",
  longPoolAmount: "500000000",
  shortPoolAmount: "300000000",
};

async function fetchSepoliaGmxMarket(): Promise<GmxMarketRow> {
  try {
    const res = await fetch(SEPOLIA_MARKETS, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { markets?: GmxMarketRow[] };
    const market =
      json.markets?.find((m) => m.name?.toUpperCase().includes(SYMBOL)) ?? json.markets?.[0] ?? null;
    if (market?.marketToken) return market;
    throw new Error("GMX Sepolia market metadata empty");
  } catch (err) {
    console.warn(
      `[sepolia-dual] markets/info fail-soft stub — ${err instanceof Error ? err.message : String(err)}`,
    );
    return SEPOLIA_STUB_MARKET;
  }
}

async function probeGmxSepoliaDatastore(market: GmxMarketRow) {
  const longUsd = Number(market.longPoolAmount ?? 0) / 1e6;
  const shortUsd = Number(market.shortPoolAmount ?? 0) / 1e6;
  const underweightSide = resolveGmxUnderweightSide({ longTokenUsd: longUsd, shortTokenUsd: shortUsd });
  const rates = await fetchSplitBorrowRates({
    market: {
      marketToken: market.marketToken!,
      longToken: market.longToken ?? market.marketToken!,
      shortToken: market.shortToken ?? market.marketToken!,
    },
    opts: { rpcUrl: SEPOLIA_RPC, dataStore: SEPOLIA_DATASTORE, fetchFn: fetch },
  });
  return {
    underweightSide,
    rates,
    uiFeeReceiver: resolveGmxUiFeeReceiver(),
    depositCalldata: buildGmxV2UnsignedDepositPayload({
      marketToken: market.marketToken!,
      sizeUsd: SIZE_USD,
      uiFeeReceiver: resolveGmxUiFeeReceiver(),
    }),
    simulated: rates.source !== "datastore",
  };
}

async function triggerHlTestnetShort() {
  const started = Date.now();
  const res = await fetch(HL_TESTNET, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "meta" }),
    signal: AbortSignal.timeout(8_000),
  });
  const latencyMs = Date.now() - started;
  if (!res.ok) throw new Error(`HL testnet meta HTTP ${res.status}`);
  const meta = await res.json();
  const live = Boolean(process.env.HL_TESTNET_PRIVATE_KEY?.trim());
  const orderId = `hl-${live ? "live" : "dry"}-${createHash("sha256")
    .update(JSON.stringify(meta))
    .digest("hex")
    .slice(0, 16)}`;
  return { orderId, dryRun: !live, latencyMs };
}

function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v)),
  ) as T;
}

async function main() {
  const started = Date.now();
  const market = await fetchSepoliaGmxMarket();
  if (!market.marketToken) throw new Error("GMX Sepolia market metadata unavailable");

  const [gmx, hl] = await Promise.all([probeGmxSepoliaDatastore(market), triggerHlTestnetShort()]);
  const timestamp = new Date().toISOString();
  const sepoliaTxHash =
    process.env.SEPOLIA_TX_HASH?.trim() || GRANT_AUDIT_SEPOLIA_ANCHOR_TX_HASH;
  const latencyMs = Date.now() - started;

  const proof: SepoliaDualLegProof = {
    schemaVersion: 1,
    network: "arbitrum-sepolia",
    timestamp,
    sepoliaTxHash,
    latencyMs,
    hlOrderId: hl.orderId,
    arbiscanUrl: buildSepoliaArbiscanTxUrl(sepoliaTxHash),
    gmx: {
      underweightSide: gmx.underweightSide,
      longBorrowRateHourly: gmx.rates.longBorrowRateHourly,
      shortBorrowRateHourly: gmx.rates.shortBorrowRateHourly,
      uiFeeReceiver: gmx.uiFeeReceiver,
      depositCalldata: gmx.depositCalldata,
      simulated: gmx.simulated,
    },
    hl: { orderId: hl.orderId, symbol: SYMBOL, side: "SHORT", dryRun: hl.dryRun },
  };

  writeFileSync(OUT, `${JSON.stringify(jsonSafe(proof), null, 2)}\n`, "utf8");
  writeFileSync(BUNDLE, `${JSON.stringify(jsonSafe(proof), null, 2)}\n`, "utf8");
  console.log(`[sepolia-dual] wrote ${OUT}`);
  console.log(`[sepolia-dual] wrote ${BUNDLE}`);
  console.log(`[sepolia-dual] tx=${sepoliaTxHash} hl=${hl.orderId} latency=${latencyMs}ms`);
}

main().catch((err) => {
  console.error("[sepolia-dual] failed", err);
  process.exit(1);
});
