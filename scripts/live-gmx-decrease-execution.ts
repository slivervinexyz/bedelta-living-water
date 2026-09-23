#!/usr/bin/env tsx
/**
 * Arbitrum One (42161) — close micro-fill ETH/USD short via GMX v2 MarketDecrease.
 * ZeroDev AA when ZeroDev_projectId / ZERODEV_PROJECT_ID is set; EOA when FORCE_EOA_FALLBACK=1.
 * Dry-run default. Live: CONFIRM_GMX_MICRO_FILL=YES BROADCAST=1 WalletA_Pkey=0x…
 */
import { createPublicClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { GMX_MARKET_REGISTRY } from "../src/config/gmx-markets";
import { refreshArbitrumGasGuard } from "../src/services/risk/arbitrum-gas-guard";
import { refreshSequencerGuard } from "../src/services/risk/sequencer-guard";
import { buildGmxV2UnsignedOrderPayload } from "../src/services/adapters/gmx-v2-order-payload";
import { GMX_USDC_ARBITRUM } from "../src/services/adapters/gmx-v2-order-payload-constants";
import { MICRO_FILL_COLLATERAL_USD, MICRO_FILL_DECREASE_SLIPPAGE_BPS } from "../src/services/adapters/gmx-micro-fill-constants";
import {
  applyGmxDecreasePositionSizing,
  resolveGmxDecreasePositionPreflight,
} from "../src/services/adapters/gmx-position-reader";
import { GMX_ORDER_TYPE_INDEX } from "../src/services/adapters/gmx-v2-order-payload.types";
import { shouldBypassOracleLagDeadlock, shouldBypassSoftConfirmationProbe } from "../src/core/soil-resistance-core";
import { printGmxMicroFillError } from "../src/services/adapters/gmx-micro-fill-execution-errors";
import {
  isForceEoaFallbackActive,
  loadMainnetEnv,
  resolveMainnetPrivateKey,
  resolveZeroDevProjectId,
} from "./_shared/mainnet-env";
import { validateGmxExecutionGuards } from "./gmx-v2-execution-cli";
import { loadGmxMicroFillMarketSnapshot } from "./gmx-micro-fill-market-loader";
import { printLiveHarnessBypassBanner } from "./_shared/live-harness-warning";
import { executeGmxMicroFillDecreaseLive } from "./gmx-micro-fill-decrease-live";

const CHAIN_ID = 42161;
const DEFAULT_RPC = "https://arb1.arbitrum.io/rpc";

const allowStaleOracle = (): boolean =>
  process.env.ALLOW_STALE_ORACLE === "1" || process.env.ALLOW_STALE_ORACLE === "true";

function resolveRpc(): string { return (process.env.ARB_MAINNET_RPC_URL ?? DEFAULT_RPC).trim(); }
function armed(): boolean { return process.env.BROADCAST === "1" && process.env.CONFIRM_GMX_MICRO_FILL === "YES"; }

function resolveDispatchMode(forceEoa: boolean, projectId: string | null): "eoa" | "zerodev" {
  if (forceEoa || !projectId) return "eoa";
  return "zerodev";
}

async function main(): Promise<void> {
  loadMainnetEnv();
  const rpc = resolveRpc();
  const projectId = resolveZeroDevProjectId();
  const forceEoa = isForceEoaFallbackActive();
  const dispatchMode = resolveDispatchMode(forceEoa, projectId);
  const probeBypass = shouldBypassSoftConfirmationProbe();
  const staleOracleOk = allowStaleOracle() || shouldBypassOracleLagDeadlock() || probeBypass;
  if (staleOracleOk) process.env.ALLOW_STALE_ORACLE = "1";
  printLiveHarnessBypassBanner();
  const client = createPublicClient({ chain: arbitrum, transport: http(rpc) });
  if ((await client.getChainId()) !== CHAIN_ID) throw new Error(`refuse: expected chain ${CHAIN_ID}`);

  await Promise.all([refreshSequencerGuard(), refreshArbitrumGasGuard({ targetYieldUsd: MICRO_FILL_COLLATERAL_USD * 0.001 })]);
  const guardVerdict = validateGmxExecutionGuards(staleOracleOk);
  if (!guardVerdict.ok) throw new Error(`GUARD_BLOCKED:${guardVerdict.reasons.join("|")}`);
  if (staleOracleOk || probeBypass) {
    console.warn("[gmx-micro-fill-decrease] stale-oracle override armed via ALLOW_STALE_ORACLE (soil probe remains mandatory)");
  }

  const market = await loadGmxMicroFillMarketSnapshot("ETH");
  const registry = GMX_MARKET_REGISTRY["ETH/USDC"];
  const owner = privateKeyToAccount(resolveMainnetPrivateKey()).address;
  const position = await resolveGmxDecreasePositionPreflight(client, {
    account: owner,
    market: registry.marketToken as Hex,
    collateralToken: GMX_USDC_ARBITRUM as Hex,
    isLong: false,
  });
  const sizeUsd = Number(position.sizeInUsd) / 1e30;
  let orderPayload = buildGmxV2UnsignedOrderPayload({
    side: position.isLong ? "long" : "short",
    sizeUsd,
    reduceOnly: true,
    clientOrderId: `gmx-micro-decrease-${Date.now()}`,
    maxSlippageBps: MICRO_FILL_DECREASE_SLIPPAGE_BPS,
    marketToken: registry.marketToken,
    midPriceUsd: market.midPriceUsd,
    pool: market.pool,
    allowStaleOracle: staleOracleOk,
  });
  if (orderPayload.orderType !== GMX_ORDER_TYPE_INDEX.MarketDecrease) {
    throw new Error("GMX_MICRO_FILL_DECREASE: payload must be MarketDecrease");
  }
  orderPayload = applyGmxDecreasePositionSizing(orderPayload, position);
  console.log("[gmx-micro-fill-decrease] reader preflight", {
    owner,
    positionKey: position.positionKey,
    sizeInUsd30: position.sizeInUsd.toString(),
    collateralAmount: position.collateralAmount.toString(),
    isLong: position.isLong,
  });
  console.log("[gmx-micro-fill-decrease] preflight OK", {
    owner,
    sizeUsd,
    side: position.isLong ? "long" : "short",
    orderType: "MarketDecrease",
    sizeDeltaUsd30: orderPayload.numbers.sizeDeltaUsd,
    isLong: orderPayload.isLong,
    dispatchMode,
    zeroDevProjectId: projectId ? "set" : "missing",
    forceEoa,
    dryRun: !armed(),
  });

  if (!armed()) {
    console.log("[gmx-micro-fill-decrease] dry-run — set CONFIRM_GMX_MICRO_FILL=YES BROADCAST=1 (ZeroDev when ZeroDev_projectId set; EOA when FORCE_EOA_FALLBACK=1)");
    return;
  }

  await executeGmxMicroFillDecreaseLive({
    rpc,
    pk: resolveMainnetPrivateKey(),
    orderPayload,
    longToken: registry.longToken as Hex,
    midPriceUsd: market.midPriceUsd,
    sizeUsd,
    projectId,
    forceEoa,
  });
}

main().catch((err) => { printGmxMicroFillError(err, { step: "gmx-micro-fill-decrease main" }); process.exit(1); });
