/** HL mainnet micro perp hedge — dry-run / broadcast helper. */
import { Wallet } from "ethers";
import { HL_EXCHANGE_URL } from "../../src/config/constants";
import { placeMarketOrder } from "../../src/adapters/hl/execution-orders";
import type { ExecutionContext, PreTradeValidationInput } from "../../src/adapters/hl/execution-types";
import { formatHlPerpPrice, formatHlSize } from "../../src/adapters/hl/execution-wire";
import { fetchMetaBundle } from "../mainnet-ignition/hl-meta-target";

export interface HlMicroHedgePlan {
  assetIndex: number;
  symbol: string;
  size: number;
  limitPx: string;
  szDecimals: number;
  midPx: number;
}

export async function buildHlMicroHedgePlan(sizeUsd: number): Promise<HlMicroHedgePlan> {
  const meta = await fetchMetaBundle();
  const idx = meta.universe.findIndex((u) => (u.name ?? "").toUpperCase() === "ETH");
  if (idx < 0) throw new Error("HL_ETH_PERP_NOT_FOUND");
  const asset = meta.universe[idx]!;
  const ctx = meta.ctxs[idx] ?? {};
  const midPx = parseFloat(ctx.midPx ?? ctx.markPx ?? ctx.oraclePx ?? "0");
  if (!(midPx > 0)) throw new Error("HL_ETH_MID_MISSING");
  const szDecimals = asset.szDecimals ?? 4;
  const size = Math.max(sizeUsd / midPx, 0.0001);
  const limitPx = formatHlPerpPrice(midPx * 1.002, szDecimals);
  return {
    assetIndex: idx,
    symbol: asset.name ?? "ETH",
    size: Number(formatHlSize(size, szDecimals)),
    limitPx,
    szDecimals,
    midPx,
  };
}

export function buildHlExecutionContext(sessionPk: string, masterAddress: string, dryRun: boolean): ExecutionContext {
  const wallet = new Wallet(sessionPk);
  const directFetch: typeof fetch = async (_url, init) => fetch(HL_EXCHANGE_URL, init);
  return {
    signer: {
      signTypedData: (domain, types, message) =>
        wallet.signTypedData(domain, types as never, message),
    },
    sessionKey: {
      agentAddress: wallet.address.toLowerCase(),
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
      masterWalletAddress: masterAddress.toLowerCase(),
    },
    isTestnet: false,
    dryRun,
    exchangeUrl: "https://api.hyperliquid.xyz/exchange#direct",
    fetchFn: directFetch,
  };
}

export function healthyHlPreTrade(sizeUsd: number): PreTradeValidationInput {
  return {
    symbol: "ETH",
    hlSpot: 3500,
    hlPerp: 3500,
    dydxPerp: 3500,
    depthUsd: 500_000,
    disableThresholdJitter: true,
    accountBalanceUsd: Math.max(sizeUsd * 100, 100),
    latencyMs: 5,
    expectedSlippage: 0.001,
  };
}

export async function runHlMicroHedgeDryOrLive(
  plan: HlMicroHedgePlan,
  ctx: ExecutionContext,
  preTrade: PreTradeValidationInput,
): Promise<{ dryRun: boolean; response?: unknown }> {
  const result = await placeMarketOrder(
    {
      asset: plan.assetIndex,
      isBuy: true,
      size: plan.size,
      limitPx: Number(plan.limitPx),
      reduceOnly: false,
      preTrade,
    },
    ctx,
  );
  return { dryRun: result.dryRun ?? ctx.dryRun ?? false, response: result.response };
}
