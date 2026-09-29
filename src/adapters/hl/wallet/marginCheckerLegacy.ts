import type { HlClearinghouseState, HlPerpsMarginSnapshot } from "./marginChecker";
import {
  fetchHlTestnetPerpsMargin,
  parseHlPerpsMarginSnapshot,
} from "./marginChecker";

/** @deprecated Margin preflight is non-blocking — always returns false. */
export function shouldBlockLive5TxForMargin(_snapshot: HlPerpsMarginSnapshot): boolean {
  return false;
}

/** @deprecated Use fetchHlTestnetPerpsMargin */
export async function fetchHlTestnetMarginUsd(
  user: string,
  fetchFn: typeof fetch = fetch,
): Promise<number> {
  const snapshot = await fetchHlTestnetPerpsMargin(user, fetchFn);
  if (!snapshot.apiOk) return 0;
  return snapshot.accountValueUsd > 0
    ? snapshot.accountValueUsd
    : snapshot.withdrawableUsd;
}

/** @deprecated Use parseHlPerpsMarginSnapshot */
export function parseHlMarginUsd(state: HlClearinghouseState): number {
  return parseHlPerpsMarginSnapshot(state).accountValueUsd;
}

export function formatInsufficientTestnetMarginWarn(marginUsd: number): string {
  const label =
    marginUsd <= 0 ? "0" : marginUsd.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `LIVE_5TX: Insufficient Testnet Margin (${label} USDC). Please claim Faucet at app.hyperliquid-testnet.xyz.`;
}

/** @deprecated Use shouldBlockLive5TxForMargin */
export function hasInsufficientTestnetMargin(
  marginUsd: number,
  _requiredUsd: number,
): boolean {
  return marginUsd <= 0;
}

export class InsufficientTestnetMarginError extends Error {
  readonly code = "INSUFFICIENT_TESTNET_MARGIN" as const;

  constructor(marginUsd: number) {
    super(formatInsufficientTestnetMarginWarn(marginUsd));
    this.name = "InsufficientTestnetMarginError";
  }
}

export type { HlClearinghouseState, HlPerpsMarginSnapshot };
