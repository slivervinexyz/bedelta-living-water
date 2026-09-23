import { HL_TESTNET_INFO_URL } from "../../../config/constants";
import { keccak256Hex } from "../crypto";
import { HL_SESSION_KEY_AGENT_NAME } from "../auth";
import type { HlUserFill } from "../../../data/verified-5tx";
import { OnChainFillFailedError } from "./on-chain-fill-errors";

export const L2_FILL_POLL_INTERVAL_MS = 500;
export const L2_FILL_POLL_MAX_ATTEMPTS = 20;
export const L2_FILL_POLL_TIMEOUT_MS =
  L2_FILL_POLL_INTERVAL_MS * L2_FILL_POLL_MAX_ATTEMPTS;

/** @deprecated Use createBrowserSessionKeyMaterial — hash-derived address has no private key. */
export function deriveBrowserSessionKeyAgentAddress(masterWallet: string): string {
  const normalized = masterWallet.toLowerCase();
  const hash = keccak256Hex(
    new TextEncoder().encode(`${normalized}:${HL_SESSION_KEY_AGENT_NAME}`),
  );
  return `0x${hash.slice(-40)}`;
}

export function formatOrderSizeLabel(size: number, szDecimals: number): string {
  return size.toFixed(szDecimals).replace(/\.?0+$/, "");
}

export async function fetchUserFills(
  user: string,
  fetchFn: typeof fetch,
): Promise<HlUserFill[]> {
  try {
    const res = await fetchFn(HL_TESTNET_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "userFills", user }),
    });
    if (!res.ok) return [];
    const data: unknown = await res.json().catch(() => null);
    return Array.isArray(data) ? (data as HlUserFill[]) : [];
  } catch (err) {
    console.warn(
      "[HL] Network connection lost — userFills poll suppressed",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

export async function resolveTestnetAssetMeta(
  symbol: string,
  fetchFn: typeof fetch,
): Promise<{ assetIndex: number; szDecimals: number }> {
  let res: Response;
  try {
    res = await fetchFn(HL_TESTNET_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "meta" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[HL] Network connection lost — meta fetch failed: ${message}`,
    );
    throw new Error(`Network connection lost: ${message}`);
  }
  if (!res.ok) throw new Error(`HL testnet meta fetch failed: HTTP ${res.status}`);
  const data = (await res.json()) as {
    universe?: Array<{ name: string; szDecimals?: number }>;
  };
  const idx =
    data.universe?.findIndex((a) => a.name.toUpperCase() === symbol.toUpperCase()) ??
    -1;
  if (idx < 0) throw new Error(`Asset ${symbol} not found on HL testnet universe`);
  return {
    assetIndex: idx,
    szDecimals: data.universe?.[idx]?.szDecimals ?? 4,
  };
}

export function isRealFillHash(hash: string): boolean {
  return /^0x[0-9a-f]{64}$/i.test(hash) && !/^0x0{20,}/i.test(hash);
}

export async function waitForNewFill(
  wallet: string,
  symbol: string,
  seenHashes: Set<string>,
  fetchFn: typeof fetch,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<HlUserFill> {
  const maxAttempts = options?.maxAttempts ?? L2_FILL_POLL_MAX_ATTEMPTS;
  const intervalMs = options?.intervalMs ?? L2_FILL_POLL_INTERVAL_MS;
  const upperSymbol = symbol.toUpperCase();

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const fills = await fetchUserFills(wallet, fetchFn);
    const match = fills.find((f) => {
      const hash = String(f.hash ?? "").trim();
      const coin = String(f.coin ?? "").toUpperCase();
      return (
        isRealFillHash(hash) &&
        !seenHashes.has(hash) &&
        coin === upperSymbol
      );
    });
    if (match) return match;

    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  throw new OnChainFillFailedError(
    `L2 fill poll timed out after ${maxAttempts} attempts (${intervalMs * maxAttempts}ms)`,
  );
}
