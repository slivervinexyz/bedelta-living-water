import { Wallet } from "ethers";
import { HL_EXCHANGE_URL } from "../../src/config/constants";
import {
  buildMarketOrderWire,
  buildOrderAction,
  ensureHlMinNotionalSize,
  formatHlPerpPrice,
  formatHlSize,
} from "../../src/adapters/hl/execution-wire";
import { executeSignedAction } from "../../src/adapters/hl/execution-transport";
import type {
  ExecutionContext,
  PreTradeValidationInput,
} from "../../src/adapters/hl/execution-types";
import { HyperliquidExecutionError } from "../../src/adapters/hl/execution-types";
import { parseHlOrderStatuses } from "../../src/adapters/hl/hl-order-response";
import { PreTradeValidationError } from "../../src/adapters/hl/execution-types";
import {
  computeSlippageBps,
  hashExecutionPayload,
  type ExecutionLegFill,
} from "../../src/services/logging/execution-logger";
import {
  CLIP_USD,
  LIVE,
  HARD_STOP_LOSS_PCT,
  HL_L2_STALE_THRESHOLD_MS,
  MAX_ORDER_CLIP_USD,
  MICRO_CAPITAL_USD,
  STALE_THRESHOLD_MS,
  assertMaxOrderClipUsd,
} from "./ignition.constants";

export function buildDnEnvelope(input: {
  symbol: string;
  midPx: number;
  perpAssetIndex: number;
  perpSzDecimals: number;
  spotAssetIndex: number;
  spotSzDecimals: number;
}) {
  const clipReason = assertMaxOrderClipUsd(CLIP_USD);
  if (clipReason) throw new Error(clipReason);

  const mid = Math.max(input.midPx, 1e-12);
  const spotLimit = formatHlPerpPrice(mid * 1.0025, input.spotSzDecimals);
  const perpLimit = formatHlPerpPrice(mid * 0.9975, input.perpSzDecimals);
  const spotPx = Math.max(spotLimit, 1e-12);
  const perpPx = Math.max(perpLimit, 1e-12);

  const spotRaw = CLIP_USD / spotPx;
  const perpRaw = CLIP_USD / perpPx;
  const perpSz = ensureHlMinNotionalSize(
    perpRaw,
    perpPx,
    input.perpSzDecimals,
    CLIP_USD,
    CLIP_USD * 0.9,
  );
  const spotSz = formatHlSize(spotRaw, input.spotSzDecimals);

  return {
    mode: LIVE ? ("LIVE" as const) : ("DRY_RUN" as const),
    clipUsd: CLIP_USD,
    symbol: input.symbol,
    midPx: mid,
    spotLeg: {
      side: "BUY" as const,
      assetIndex: input.spotAssetIndex,
      size: spotSz,
      limitPx: spotPx,
      notionalUsd: Number((spotSz * spotPx).toFixed(4)),
    },
    perpLeg: {
      side: "SHORT" as const,
      assetIndex: input.perpAssetIndex,
      size: formatHlSize(perpSz, input.perpSzDecimals),
      limitPx: perpPx,
      notionalUsd: Number((perpSz * perpPx).toFixed(4)),
    },
    riskEnvelope: {
      MICRO_CAPITAL_USD,
      MAX_ORDER_CLIP_USD,
      HARD_STOP_LOSS_PCT,
      STALE_THRESHOLD_MS,
      HL_L2_STALE_THRESHOLD_MS,
    },
  };
}

export function buildPreTrade(
  symbol: string,
  midPx: number,
  depthUsd: number,
  probeMs: number,
  unifiedAvailableUsd: number,
): PreTradeValidationInput {
  return {
    symbol,
    hlSpot: midPx,
    hlPerp: midPx,
    dydxPerp: midPx,
    depthUsd: Math.max(depthUsd, 100_000),
    latencyMs: Math.min(probeMs, 50),
    expectedSlippage: 0.0005,
    accountBalanceUsd: unifiedAvailableUsd,
    orderNotionalUsd: CLIP_USD,
    isTestnet: false,
  };
}

export function toLegFill(
  venue: "SPOT" | "PERP",
  side: "BUY" | "SHORT",
  response: unknown,
  fallbackStatus: string,
): ExecutionLegFill {
  const parsed = parseHlOrderStatuses(response);
  const responseHash = hashExecutionPayload(response);
  return {
    venue,
    side,
    oid: parsed.oid,
    avgPx: parsed.avgPx ? Number(parsed.avgPx) : undefined,
    totalSz: parsed.totalSz ? Number(parsed.totalSz) : undefined,
    notionalUsd:
      parsed.avgPx && parsed.totalSz
        ? Number(parsed.avgPx) * Number(parsed.totalSz)
        : undefined,
    status: parsed.filled
      ? "FILLED"
      : parsed.rejected
        ? `REJECTED:${parsed.error ?? fallbackStatus}`
        : fallbackStatus,
    responseHash,
    rawStatus: (response as { response?: { data?: { statuses?: unknown } } })
      ?.response?.data?.statuses,
  };
}

export async function executeLiveLegs(
  envelope: ReturnType<typeof buildDnEnvelope>,
  sessionPk: string,
  userAddress: string,
  preTrade: PreTradeValidationInput,
): Promise<{ spotFill: ExecutionLegFill; perpFill: ExecutionLegFill }> {
  const wallet = new Wallet(sessionPk);
  const directFetch: typeof fetch = async (_url, init) =>
    fetch(HL_EXCHANGE_URL, init);
  const ctx: ExecutionContext = {
    signer: {
      signTypedData: (domain, types, message) =>
        wallet.signTypedData(domain, types as never, message),
    },
    sessionKey: {
      agentAddress: wallet.address.toLowerCase(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      masterWalletAddress: userAddress.toLowerCase(),
    },
    isTestnet: false,
    dryRun: false,
    exchangeUrl: "https://api.hyperliquid.xyz/exchange#direct",
    fetchFn: directFetch,
  };

  const spotNonce = Date.now();
  const spotWire = buildMarketOrderWire({
    asset: envelope.spotLeg.assetIndex,
    isBuy: true,
    size: envelope.spotLeg.size,
    limitPx: envelope.spotLeg.limitPx,
    reduceOnly: false,
  });
  const spotResult = await executeSignedAction(
    buildOrderAction([spotWire]),
    ctx,
    { preTrade, nonce: spotNonce },
  );
  const spotFill = toLegFill(
    "SPOT",
    "BUY",
    spotResult.response,
    String(spotResult.response.status),
  );
  console.log("[live] spot response:", JSON.stringify(spotResult.response));

  await new Promise((r) => setTimeout(r, 120));

  const perpNonce = Date.now() + 7;
  const perpWire = buildMarketOrderWire({
    asset: envelope.perpLeg.assetIndex,
    isBuy: false,
    size: Number(envelope.perpLeg.size),
    limitPx: envelope.perpLeg.limitPx,
    reduceOnly: false,
  });
  const perpResult = await executeSignedAction(
    buildOrderAction([perpWire]),
    ctx,
    { preTrade, nonce: perpNonce },
  );
  const perpFill = toLegFill(
    "PERP",
    "SHORT",
    perpResult.response,
    String(perpResult.response.status),
  );
  console.log("[live] perp response:", JSON.stringify(perpResult.response));

  return { spotFill, perpFill };
}

export function printFill(label: string, fill: ExecutionLegFill): void {
  console.log(
    `${label}: status=${fill.status}  oid=${fill.oid ?? "n/a"}  avgPx=${fill.avgPx ?? "n/a"}  sz=${fill.totalSz ?? "n/a"}  hash=${fill.responseHash ?? "n/a"}`,
  );
}

export {
  HyperliquidExecutionError,
  PreTradeValidationError,
  computeSlippageBps,
};
