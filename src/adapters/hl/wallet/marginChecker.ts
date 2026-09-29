import { HL_INFO_URL, HL_TESTNET_INFO_URL } from "../../../config/constants";

export interface HlClearinghouseState {
  marginSummary?: {
    accountValue?: string;
    totalMarginUsed?: string;
  };
  withdrawable?: string;
}

export interface HlPerpsMarginSnapshot {
  accountValueUsd: number;
  withdrawableUsd: number;
  /** False when HL info API errors or times out — caller should bypass block. */
  apiOk: boolean;
}

export function buildClearinghouseStateRequest(user: string): {
  type: "clearinghouseState";
  user: string;
} {
  return { type: "clearinghouseState", user };
}

const DEFAULT_PREFLIGHT_TIMEOUT_MS = 5_000;

export function parseHlPerpsMarginSnapshot(state: HlClearinghouseState): HlPerpsMarginSnapshot {
  const accountValueUsd = Number(state.marginSummary?.accountValue ?? NaN);
  const withdrawableUsd = Number(state.withdrawable ?? NaN);
  return {
    accountValueUsd:
      Number.isFinite(accountValueUsd) && accountValueUsd >= 0 ? accountValueUsd : 0,
    withdrawableUsd:
      Number.isFinite(withdrawableUsd) && withdrawableUsd >= 0 ? withdrawableUsd : 0,
    apiOk: true,
  };
}

async function fetchHlPerpsMarginAt(
  infoUrl: string,
  user: string,
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<HlPerpsMarginSnapshot> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetchFn(infoUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildClearinghouseStateRequest(user)),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { accountValueUsd: 0, withdrawableUsd: 0, apiOk: false };
    return parseHlPerpsMarginSnapshot((await res.json()) as HlClearinghouseState);
  } catch {
    return { accountValueUsd: 0, withdrawableUsd: 0, apiOk: false };
  }
}

/** Perps equity from HL clearinghouseState — never uses EVM eth_getBalance. */
export async function fetchHlTestnetPerpsMargin(
  user: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = DEFAULT_PREFLIGHT_TIMEOUT_MS,
): Promise<HlPerpsMarginSnapshot> {
  return fetchHlPerpsMarginAt(HL_TESTNET_INFO_URL, user, fetchFn, timeoutMs);
}

export async function fetchHlMainnetPerpsMargin(
  user: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = DEFAULT_PREFLIGHT_TIMEOUT_MS,
): Promise<HlPerpsMarginSnapshot> {
  return fetchHlPerpsMarginAt(HL_INFO_URL, user, fetchFn, timeoutMs);
}

export function isPerpsEquityFunded(snapshot: HlPerpsMarginSnapshot): boolean {
  return snapshot.accountValueUsd > 0;
}

export function shouldWarnMarginPreflight(snapshot: HlPerpsMarginSnapshot): boolean {
  return !snapshot.apiOk || !isPerpsEquityFunded(snapshot);
}

export function formatMarginLowProceedWarnLog(accountValueUsd: number): string {
  const label =
    accountValueUsd <= 0
      ? "0"
      : accountValueUsd.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `LIVE_5TX: Margin low (${label} USDC), proceeding with Session Key EIP-712 signature request...`;
}

export function formatMarginPreflightPassLog(snapshot: HlPerpsMarginSnapshot): string {
  return `MARGIN_PREFLIGHT: PASS · Perps equity $${snapshot.accountValueUsd.toFixed(2)} USDC · withdrawable $${snapshot.withdrawableUsd.toFixed(2)}`;
}

export function formatMarginPreflightBypassLog(): string {
  return "MARGIN_PREFLIGHT: BYPASS · HL clearinghouseState unavailable — proceeding to EIP-712 signing";
}

export interface MarginPreflightLogEntry {
  level: "INFO" | "WARN";
  message: string;
}

/** Non-blocking margin preflight — returns console log entries only. */
export async function runNonBlockingMarginPreflight(
  walletAddress: string,
  fetchFn: typeof fetch = fetch,
): Promise<MarginPreflightLogEntry[]> {
  const snapshot = await fetchHlTestnetPerpsMargin(walletAddress, fetchFn);
  if (shouldWarnMarginPreflight(snapshot)) {
    return [{ level: "WARN", message: formatMarginLowProceedWarnLog(snapshot.accountValueUsd) }];
  }
  return [{ level: "INFO", message: formatMarginPreflightPassLog(snapshot) }];
}
