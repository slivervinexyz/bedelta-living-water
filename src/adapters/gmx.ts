/** GMX v2 Arbitrum — DataStore vault RPC + markets/info APY (Workers-safe fetch). */

import { fetchAllowlisted } from "../services/defense/rpc-whitelist";
import type {
  AdapterDepthSnapshot,
  AdapterFetchOptions,
  AdapterHealthResult,
  IExchangeAdapter,
} from "./types";

export const GMX_MARKETS_INFO_URL = "https://arbitrum-api.gmxinfra.io/markets/info";
export const ARBITRUM_RPC_URL = "https://arb1.arbitrum.io/rpc";
export const GMX_V2_DATASTORE = "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8";
export const GMX_V2_READER_ARBITRUM = "0xfA26cBb46e2614609406de08CA1Dc7f70a684184";
export const GMX_MARKET_LIST_CALL =
  "0xf3903b9fcdac201abd09598973b1365dbbaeb65ff0f370d30bb5c7440dc3341f570b2e38";
export const GMX_ALLOWED_HOSTS = ["arbitrum-api.gmxinfra.io", "arb1.arbitrum.io"] as const;

export interface GmxMarketInfo {
  name?: string;
  isDisabled?: boolean;
  longPoolAmount?: string;
  shortPoolAmount?: string;
  poolValueMax?: string;
  poolValueMin?: string;
  borrowingFactorPerSecondForLongs?: string;
  fundingFactorPerSecond?: string;
}

export interface GmxAdapterOptions extends AdapterFetchOptions {
  marketsUrl?: string;
  rpcUrl?: string;
  dataStore?: string;
}

const pickMarket = (markets: GmxMarketInfo[], symbol: string) =>
  markets.find((m) => m.name?.toUpperCase().includes(symbol.toUpperCase()));

function poolDepthUsd(market: GmxMarketInfo): number {
  const max = parseFloat(market.poolValueMax ?? "0");
  const min = parseFloat(market.poolValueMin ?? "0");
  if (max > 0) return max;
  if (min > 0) return min;
  return Math.max(parseFloat(market.longPoolAmount ?? "0"), parseFloat(market.shortPoolAmount ?? "0")) / 1e6;
}

function referencePx(symbol: string): number {
  const key = symbol.toUpperCase();
  if (key.includes("BTC")) return 65_000;
  if (key.includes("ETH")) return 3_500;
  return 150;
}

async function rpcPost(opts: GmxAdapterOptions, body: Record<string, unknown>): Promise<unknown> {
  const rpc = opts.rpcUrl ?? ARBITRUM_RPC_URL;
  const init = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } as RequestInit;
  const res = opts.fetchFn ? await opts.fetchFn(rpc, init) : await fetchAllowlisted(rpc, init, GMX_ALLOWED_HOSTS);
  if (!res.ok) throw new Error(`Arbitrum RPC HTTP ${res.status}`);
  const json = (await res.json()) as { result?: string; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "Arbitrum RPC error");
  return json.result;
}

async function readVaultMarketCount(opts: GmxAdapterOptions): Promise<number> {
  const result = await rpcPost(opts, {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [{ to: opts.dataStore ?? GMX_V2_DATASTORE, data: GMX_MARKET_LIST_CALL }, "latest"],
  });
  return typeof result === "string" && result.startsWith("0x") ? parseInt(result, 16) : 0;
}

async function fetchMarketsInfo(opts: GmxAdapterOptions): Promise<GmxMarketInfo[]> {
  const url = opts.marketsUrl ?? GMX_MARKETS_INFO_URL;
  const res = opts.fetchFn ? await opts.fetchFn(url) : await fetchAllowlisted(url, undefined, GMX_ALLOWED_HOSTS);
  if (!res.ok) throw new Error(`GMX markets/info HTTP ${res.status}`);
  const body = (await res.json()) as { markets?: GmxMarketInfo[] } | GmxMarketInfo[];
  return Array.isArray(body) ? body : (body.markets ?? []);
}

export class GmxAdapter implements IExchangeAdapter {
  readonly id = "gmx" as const;
  constructor(private readonly opts: GmxAdapterOptions = {}) {}

  async getDepth(symbol: string): Promise<AdapterDepthSnapshot> {
    const [markets, vaultMarkets] = await Promise.all([fetchMarketsInfo(this.opts), readVaultMarketCount(this.opts)]);
    const market = pickMarket(markets, symbol) ?? markets[0];
    if (!market || market.isDisabled || vaultMarkets <= 0) throw new Error(`GMX vault/market unavailable: ${symbol}`);
    const px = referencePx(symbol);
    return {
      venue: "gmx",
      symbol: symbol.toUpperCase(),
      depthUsd: poolDepthUsd(market),
      spotPrice: px,
      perpPrice: px,
      fetchedAt: new Date().toISOString(),
    };
  }

  async getAPY(symbol?: string): Promise<number> {
    const markets = await fetchMarketsInfo(this.opts);
    const market = pickMarket(markets, symbol ?? "ETH") ?? markets[0];
    if (!market) return 0;
    const borrow = parseFloat(market.borrowingFactorPerSecondForLongs ?? "0");
    const funding = parseFloat(market.fundingFactorPerSecond ?? "0");
    return Math.min(Math.abs(borrow + funding) * 31_536_000, 2);
  }

  async checkHealth(): Promise<AdapterHealthResult> {
    const t0 = performance.now();
    try {
      const [markets, vaultMarkets, blockHex] = await Promise.all([
        fetchMarketsInfo(this.opts),
        readVaultMarketCount(this.opts),
        rpcPost(this.opts, { jsonrpc: "2.0", id: 2, method: "eth_blockNumber", params: [] }),
      ]);
      const reasons: string[] = [];
      if (markets.length === 0) reasons.push("GMX_MARKETS_EMPTY");
      if (vaultMarkets <= 0) reasons.push("GMX_VAULT_EMPTY");
      if (typeof blockHex !== "string" || !blockHex.startsWith("0x")) reasons.push("ARBITRUM_RPC_UNREACHABLE");
      return { ok: reasons.length === 0, latencyMs: performance.now() - t0, reasons };
    } catch (err) {
      return { ok: false, latencyMs: performance.now() - t0, reasons: [err instanceof Error ? err.message : String(err)] };
    }
  }
}

export const gmxAdapter = new GmxAdapter();
