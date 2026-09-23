import type { SystemState } from "../../../core/state";
import type { SessionKeyOrderPayload } from "../../../services/session-key-adapter";
import type { IntentLeg } from "../../../core/intent-ledger";
import { HL_TESTNET_EXCHANGE_URL } from "../../../config/constants";
import type { ExecutionContext } from "../execution-types";
import { sanitizeSessionKeyForMasterWalletTrading } from "../execution-types";
import type { HlSessionKeyExecutorOptions } from "./types";

const DEFAULT_ASSET_INDEX: Record<string, number> = {
  ETH: 0,
  BTC: 0,
};

export function resolveAssetIndex(
  symbol: string | undefined,
  resolver?: (s?: string) => number,
): number {
  if (resolver) return resolver(symbol);
  const key = (symbol ?? "ETH").toUpperCase();
  return DEFAULT_ASSET_INDEX[key] ?? 0;
}

export function legToSessionPayload(
  leg: IntentLeg,
  asset: number,
  limitPx: number,
  reduceOnly: boolean,
): SessionKeyOrderPayload {
  const isBuy = reduceOnly
    ? leg.side === "BUY" || leg.side === "LONG"
    : leg.side === "BUY" || leg.side === "LONG";
  const size = leg.sizeUsd / Math.max(limitPx, 1);
  return {
    asset,
    isBuy,
    limitPx: limitPx.toFixed(2),
    sz: size.toFixed(6),
    reduceOnly,
    orderType: { limit: { tif: reduceOnly ? "Ioc" : "Gtc" } },
  };
}

export function buildExecutionContext(
  opts: HlSessionKeyExecutorOptions,
  state: SystemState,
): ExecutionContext {
  const sessionKey = opts.sessionKey
    ? sanitizeSessionKeyForMasterWalletTrading(
        opts.sessionKey,
        opts.sessionKey.masterWalletAddress,
      )
    : undefined;
  return {
    signer: opts.signer,
    sessionKey,
    gate: {
      signingChannelOpen: state.signingChannelOpen,
      hardlock: state.hardlock,
      criHardlock: state.hardlock || state.currentCri <= 0,
    },
    isTestnet: opts.isTestnet ?? true,
    dryRun: opts.dryRun ?? true,
    fetchFn: opts.fetchFn,
    exchangeUrl:
      opts.exchangeUrl ??
      (opts.isTestnet !== false ? HL_TESTNET_EXCHANGE_URL : undefined),
    signatureChainId: opts.signatureChainId,
  };
}
