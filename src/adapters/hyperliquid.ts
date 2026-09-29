/**
 * Hyperliquid L1 yield adapter — info API · HL Lend / perp depth probe.
 */

import { fetchAllowlisted } from "../services/defense/rpc-whitelist";
import type {
  AdapterDepthSnapshot,
  AdapterFetchOptions,
  AdapterHealthResult,
  IExchangeAdapter,
} from "./types";

export const HL_INFO_URL = "https://api.hyperliquid.xyz/info";

export interface HyperliquidAdapterOptions extends AdapterFetchOptions {
  infoUrl?: string;
  /** Default HL Lend / vault yield proxy */
  defaultApy?: number;
}

interface HlVaultSummary {
  apr?: string;
  name?: string;
}

async function postInfo<T>(
  body: Record<string, unknown>,
  opts: HyperliquidAdapterOptions,
): Promise<T> {
  const url = opts.infoUrl ?? HL_INFO_URL;
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
  const res = opts.fetchFn
    ? await opts.fetchFn(url, init)
    : await fetchAllowlisted(url, init);
  if (!res.ok) throw new Error(`HL info HTTP ${res.status}`);
  return (await res.json()) as T;
}

function findVault(
  vaults: HlVaultSummary[],
  symbol: string,
): HlVaultSummary | undefined {
  const key = symbol.toUpperCase();
  return vaults.find((v) => v.name?.toUpperCase().includes(key));
}

export class HyperliquidYieldAdapter implements IExchangeAdapter {
  readonly id = "hyperliquid" as const;

  constructor(private readonly opts: HyperliquidAdapterOptions = {}) {}

  async getDepth(symbol: string): Promise<AdapterDepthSnapshot> {
    const data = await postInfo<
      [{ universe: Array<{ name: string; dayNtlVlm?: string }> }, Array<{ markPx?: string; midPx?: string; oraclePx?: string; dayNtlVlm?: string }>]
    >({ type: "metaAndAssetCtxs" }, this.opts);
    const universe = data[0]?.universe ?? [];
    const ctxs = data[1] ?? [];
    const idx = universe.findIndex((a) => a.name.toUpperCase() === symbol.toUpperCase());
    const asset = idx >= 0 ? universe[idx] : universe[0];
    const ctx = idx >= 0 ? ctxs[idx] : ctxs[0];
    const mark = parseFloat(ctx?.markPx ?? ctx?.oraclePx ?? ctx?.midPx ?? "0");
    const mid = parseFloat(ctx?.midPx ?? ctx?.oraclePx ?? String(mark));
    const dayVol = parseFloat(ctx?.dayNtlVlm ?? asset?.dayNtlVlm ?? "0");
    const depthUsd = dayVol > 0 ? dayVol * 0.05 : 500_000;
    return {
      venue: "hyperliquid",
      symbol: symbol.toUpperCase(),
      depthUsd,
      spotPrice: mid || mark,
      perpPrice: mark || mid,
      fetchedAt: new Date().toISOString(),
    };
  }

  async getAPY(symbol?: string): Promise<number> {
    const funding = await this.getFundingApy(symbol);
    const vault = await this.getVaultApy(symbol);
    const best = Math.max(funding, vault);
    if (best > 0) return best;
    return this.opts.defaultApy ?? 0.08;
  }

  /** Hourly funding rate annualized (absolute) */
  async getFundingApy(symbol?: string): Promise<number> {
    try {
      const sym = (symbol ?? "ETH").toUpperCase();
      const data = await postInfo<
        [
          { universe: Array<{ name: string }> },
          Array<{ funding?: string }>,
        ]
      >({ type: "metaAndAssetCtxs" }, this.opts);
      const idx = data[0]?.universe.findIndex(
        (a) => a.name.toUpperCase() === sym,
      );
      const ctx = idx !== undefined && idx >= 0 ? data[1]?.[idx] : data[1]?.[0];
      const funding = parseFloat(ctx?.funding ?? "0");
      if (Number.isFinite(funding)) {
        return Math.abs(funding) * 24 * 365;
      }
    } catch {
      /* funding read optional */
    }
    return 0;
  }

  /** HL Lend / vault APR */
  async getVaultApy(symbol?: string): Promise<number> {
    try {
      const vaults = await postInfo<HlVaultSummary[]>({ type: "vaultSummaries" }, this.opts);
      const target = symbol ? findVault(vaults, symbol) : vaults[0];
      const vaultApr = parseFloat(target?.apr ?? "0");
      return Number.isFinite(vaultApr) ? vaultApr : 0;
    } catch {
      return 0;
    }
  }

  async checkHealth(): Promise<AdapterHealthResult> {
    const t0 = performance.now();
    try {
      await postInfo({ type: "metaAndAssetCtxs" }, this.opts);
      return { ok: true, latencyMs: performance.now() - t0, reasons: [] };
    } catch (err) {
      return {
        ok: false,
        latencyMs: performance.now() - t0,
        reasons: [err instanceof Error ? err.message : String(err)],
      };
    }
  }
}

export const hyperliquidYieldAdapter = new HyperliquidYieldAdapter();
