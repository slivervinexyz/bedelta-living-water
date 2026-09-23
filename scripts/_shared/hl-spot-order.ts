/** Hyperliquid spot market sell helper — Wallet A liquidation path. */
import { Wallet } from "ethers";
import { HL_EXCHANGE_URL } from "../../src/config/constants";
import {
  buildMarketOrderWire,
  buildOrderAction,
  formatHlPerpPrice,
  formatHlSize,
} from "../../src/adapters/hl/execution-wire";
import { executeSignedAction } from "../../src/adapters/hl/execution-transport";
import type { ExecutionContext, PreTradeValidationInput } from "../../src/adapters/hl/execution-types";
import { parseHlOrderStatuses } from "../../src/adapters/hl/hl-order-response";
import { postHlInfoDirect } from "../mainnet-ignition/hl-account";
import { fetchSpotMeta, resolveSpotFromMeta } from "../mainnet-ignition/hl-meta-target";

export interface SpotSellFill {
  ok: boolean;
  coin: string;
  soldSize: number;
  usdcReceivedUsd: number;
  avgPx: number | null;
  oid: number | null;
  reason?: string;
}

async function fetchSpotMidPx(coin: string): Promise<number> {
  const spotMeta = await fetchSpotMeta();
  const spot = resolveSpotFromMeta(coin, spotMeta);
  if (!spot) throw new Error(`Spot meta missing for ${coin}`);
  const res = await postHlInfoDirect({ type: "spotMetaAndAssetCtxs" });
  if (!res.ok) throw new Error(`spotMetaAndAssetCtxs HTTP ${res.status}`);
  const raw = (await res.json()) as [
    { universe?: Array<{ name?: string; index?: number }> },
    Array<{ midPx?: string; markPx?: string }>,
  ];
  const pairIndex = spot.assetIndex - 10_000;
  const ctx = raw[1]?.[pairIndex];
  const mid = parseFloat(ctx?.midPx ?? ctx?.markPx ?? "0");
  if (mid > 0) return mid;
  throw new Error(`Spot mid missing for ${coin} (@${pairIndex})`);
}

export async function fetchSpotCoinBalance(user: string, coin: string): Promise<number> {
  const res = await postHlInfoDirect({ type: "spotClearinghouseState", user });
  if (!res.ok) throw new Error(`spotClearinghouseState HTTP ${res.status}`);
  const spot = (await res.json()) as {
    balances?: Array<{ coin?: string; total?: string }>;
  };
  const upper = coin.toUpperCase();
  for (const bal of spot.balances ?? []) {
    if ((bal.coin ?? "").toUpperCase() === upper) {
      return parseFloat(bal.total ?? "0") || 0;
    }
  }
  return 0;
}

export async function fetchSpotUsdcBalance(user: string): Promise<number> {
  return fetchSpotCoinBalance(user, "USDC");
}

export async function executeSpotMarketSell(input: {
  coin: string;
  size: number;
  sessionPk: string;
  userAddress: string;
  preTrade: PreTradeValidationInput;
}): Promise<SpotSellFill> {
  const coin = input.coin.toUpperCase();
  if (!(input.size > 0)) {
    return {
      ok: false,
      coin,
      soldSize: 0,
      usdcReceivedUsd: 0,
      avgPx: null,
      oid: null,
      reason: "SPOT_SIZE_ZERO",
    };
  }

  const spotMeta = await fetchSpotMeta();
  const spot = resolveSpotFromMeta(coin, spotMeta);
  if (!spot) throw new Error(`Spot meta missing for ${coin}`);
  const midPx = await fetchSpotMidPx(coin);
  const limitPx = formatHlPerpPrice(midPx * 0.9975, spot.szDecimals);
  const size = formatHlSize(input.size, spot.szDecimals);
  const wallet = new Wallet(input.sessionPk);
  const directFetch: typeof fetch = async (_url, init) => fetch(HL_EXCHANGE_URL, init);
  const ctx: ExecutionContext = {
    signer: {
      signTypedData: (domain, types, message) =>
        wallet.signTypedData(domain, types as never, message),
    },
    sessionKey: {
      agentAddress: wallet.address.toLowerCase(),
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
      masterWalletAddress: input.userAddress.toLowerCase(),
    },
    isTestnet: false,
    dryRun: false,
    exchangeUrl: "https://api.hyperliquid.xyz/exchange#direct",
    fetchFn: directFetch,
  };
  const wire = buildMarketOrderWire({
    asset: spot.assetIndex,
    isBuy: false,
    size,
    limitPx,
    reduceOnly: false,
  });
  const result = await executeSignedAction(buildOrderAction([wire]), ctx, {
    preTrade: input.preTrade,
    nonce: Date.now(),
  });
  const parsed = parseHlOrderStatuses(result.response);
  const soldSize = parsed.totalSz ? Number(parsed.totalSz) : size;
  const avgPx = parsed.avgPx ? Number(parsed.avgPx) : null;
  return {
    ok: parsed.filled,
    coin,
    soldSize,
    usdcReceivedUsd: avgPx != null ? soldSize * avgPx : soldSize * midPx,
    avgPx,
    oid: parsed.oid ?? null,
    reason: parsed.error,
  };
}
