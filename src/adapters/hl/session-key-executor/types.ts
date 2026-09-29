import type { Eip712Signer } from "../eip712-signer";
import type { SessionKeyContext } from "../execution-types";
import type { SystemState } from "../../../core/state";

export interface HlSessionKeyExecutorOptions {
  signer: Eip712Signer;
  systemState?: SystemState;
  sessionKey?: SessionKeyContext;
  isTestnet?: boolean;
  dryRun?: boolean;
  fetchFn?: typeof fetch;
  exchangeUrl?: string;
  /** Wallet chain id hex — must match ApproveAgent domain for browser EIP-712. */
  signatureChainId?: string;
  /** HL universe asset index — default ETH=0 on testnet/mainnet may differ */
  resolveAssetIndex?: (symbol?: string) => number;
  /** Entry orders: IoC limit crossing spread (market-style fill). Default false = GTC limit. */
  marketIoc?: boolean;
  /** Asset szDecimals for HL tick/lot formatting (default 4 — ETH testnet). */
  szDecimals?: number;
  /** Smoke bypass: skip Pgate / soil assert on opening orders (SKIP_SOIL_CHECK). */
  skipPreTrade?: boolean;
}

export interface HlOrderExecutionResult {
  ok: boolean;
  dryRun: boolean;
  reason?: string;
  filledUsd?: number;
  reduceOnly: boolean;
  exchangeOid?: number;
}
