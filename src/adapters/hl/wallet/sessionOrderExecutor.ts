import type { Eip712Signer } from "../eip712-signer";
import type { SessionKeyContext } from "../execution-types";
import type { SystemState } from "../../../core/state";
import type { LiveBookSoilAudit } from "../../../services/check-soil-resistance";
import {
  VERIFIED_5TX_ORDER_COUNT,
  aggregateVerifiedFills,
  type Verified5TxFillRecord,
  type Verified5TxResults,
} from "../../../data/verified-5tx";
import { fetchUserFills } from "./sessionOrderFillSync";
import { soilAuditSummary } from "./sessionOrderFallback";
import { submitSingleLive5TxOrder } from "./sessionOrderSingle";
import {
  LIVE_5TX_ORDER_SIDES,
  type BrowserLive5TxProgress,
} from "./sessionOrderTypes";

export interface ExecuteSequentialLive5TxOrdersInput {
  walletAddress: string;
  symbol: string;
  notionalUsd: number;
  soilAudit: LiveBookSoilAudit;
  masterSigner: Eip712Signer;
  agentSigner: Eip712Signer;
  sessionKeyCtx: SessionKeyContext;
  systemState: SystemState;
  walletChainIdHex: string;
  assetIndex: number;
  szDecimals: number;
  fetchFn: typeof fetch;
  progress: BrowserLive5TxProgress;
}

/** Sequential 5-TX IoC market orders — strict on-chain only, no telemetry fallback. */
export async function executeSequentialLive5TxOrders(
  input: ExecuteSequentialLive5TxOrdersInput,
): Promise<Verified5TxResults> {
  const fillsBefore = await fetchUserFills(input.walletAddress, input.fetchFn);
  const seenFillHashes = new Set(
    fillsBefore.map((f) => String(f.hash ?? "").trim()).filter(Boolean),
  );
  const records: Verified5TxFillRecord[] = [];

  for (let i = 0; i < VERIFIED_5TX_ORDER_COUNT; i += 1) {
    const side = LIVE_5TX_ORDER_SIDES[i] ?? "BUY";
    const result = await submitSingleLive5TxOrder({
      index: i + 1,
      side,
      walletAddress: input.walletAddress,
      symbol: input.symbol,
      notionalUsd: input.notionalUsd,
      soilAudit: input.soilAudit,
      masterSigner: input.masterSigner,
      agentSigner: input.agentSigner,
      sessionKeyCtx: input.sessionKeyCtx,
      systemState: input.systemState,
      walletChainIdHex: input.walletChainIdHex,
      assetIndex: input.assetIndex,
      szDecimals: input.szDecimals,
      fetchFn: input.fetchFn,
      seenFillHashes,
      progress: input.progress,
    });

    if (!result.ok) {
      throw result.error;
    }
    records.push(result.record);
  }

  input.progress.onLog({
    level: "SYSTEM",
    message: "LIVE_5TX: 5/5 market orders filled on Hyperliquid testnet",
  });
  return {
    event: "HL_TESTNET_5TX_VERIFY",
    network: "hyperliquid-testnet",
    dryRun: false,
    livePost: true,
    wallet: input.walletAddress,
    timestamp: new Date().toISOString(),
    soilAudit: soilAuditSummary(input.soilAudit),
    fills: records,
    aggregate: aggregateVerifiedFills(records, false),
  };
}
