import { HL_INFO_URL } from "../../src/config/constants";
import type {
  OpenOrderSnapshot,
  PositionLegSnapshot,
} from "../../src/services/risk/flash-unwind";

export async function postInfo(body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(HL_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`HL info HTTP ${res.status}`);
  return res.json();
}

export async function loadUniverseMaps(): Promise<{
  perpIndex: Map<string, { asset: number; szDecimals: number }>;
  spotIndex: Map<string, { asset: number; szDecimals: number }>;
  midByCoin: Map<string, number>;
}> {
  const [metaRaw, spotRaw] = await Promise.all([
    postInfo({ type: "metaAndAssetCtxs" }),
    postInfo({ type: "spotMetaAndAssetCtxs" }),
  ]);

  const meta = metaRaw as [
    { universe?: Array<{ name?: string; szDecimals?: number }> },
    Array<{ midPx?: string; markPx?: string }>,
  ];
  const perpIndex = new Map<string, { asset: number; szDecimals: number }>();
  const midByCoin = new Map<string, number>();
  (meta[0]?.universe ?? []).forEach((u, i) => {
    const name = (u.name ?? "").trim().toUpperCase();
    if (!name || name.includes(":")) return;
    perpIndex.set(name, { asset: i, szDecimals: u.szDecimals ?? 4 });
    const mid = parseFloat(meta[1]?.[i]?.midPx ?? meta[1]?.[i]?.markPx ?? "0");
    if (mid > 0) midByCoin.set(name, mid);
  });

  const spot = spotRaw as [
    {
      universe?: Array<{
        name?: string;
        index?: number;
        tokens?: number[];
      }>;
      tokens?: Array<{ name?: string; szDecimals?: number; index?: number }>;
    },
    Array<{ midPx?: string; markPx?: string }>,
  ];
  const spotIndex = new Map<string, { asset: number; szDecimals: number }>();
  const tokens = spot[0]?.tokens ?? [];
  for (const pair of spot[0]?.universe ?? []) {
    const name = (pair.name ?? "").trim().toUpperCase();
    if (!name || name === "USDC" || name === "USDT") continue;
    const tokenIdx = pair.tokens?.[0];
    const token =
      tokenIdx != null ? tokens.find((t) => t.index === tokenIdx) : undefined;
    const asset = 10_000 + (pair.index ?? 0);
    spotIndex.set(name, {
      asset,
      szDecimals: token?.szDecimals ?? 4,
    });
    const ctx = spot[1]?.[pair.index ?? -1];
    const mid = parseFloat(ctx?.midPx ?? ctx?.markPx ?? "0");
    if (mid > 0) midByCoin.set(name, mid);
  }

  return { perpIndex, spotIndex, midByCoin };
}

export async function snapshotPortfolio(user: string): Promise<{
  openOrders: OpenOrderSnapshot[];
  positions: PositionLegSnapshot[];
}> {
  const maps = await loadUniverseMaps();
  const [openRaw, chRaw, spotRaw] = await Promise.all([
    postInfo({ type: "openOrders", user }),
    postInfo({ type: "clearinghouseState", user }),
    postInfo({ type: "spotClearinghouseState", user }),
  ]);

  const openOrders: OpenOrderSnapshot[] = [];
  for (const row of (Array.isArray(openRaw) ? openRaw : []) as Array<{
    coin?: string;
    oid?: number;
  }>) {
    const coin = (row.coin ?? "").trim().toUpperCase();
    const oid = Number(row.oid);
    const perp = maps.perpIndex.get(coin);
    if (perp && Number.isFinite(oid)) {
      openOrders.push({ asset: perp.asset, oid, coin });
    }
  }

  const positions: PositionLegSnapshot[] = [];
  const ch = chRaw as {
    assetPositions?: Array<{
      position?: { coin?: string; szi?: string };
    }>;
  };
  for (const row of ch.assetPositions ?? []) {
    const coin = (row.position?.coin ?? "").trim().toUpperCase();
    const szi = parseFloat(row.position?.szi ?? "0") || 0;
    if (!(Math.abs(szi) > 0)) continue;
    const perp = maps.perpIndex.get(coin);
    const mid = maps.midByCoin.get(coin) ?? 0;
    if (!perp || !(mid > 0)) continue;
    positions.push({
      market: "perp",
      asset: perp.asset,
      szi,
      midPx: mid,
      szDecimals: perp.szDecimals,
      coin,
    });
  }

  const spot = spotRaw as {
    balances?: Array<{ coin?: string; total?: string }>;
  };
  for (const bal of spot.balances ?? []) {
    const coin = (bal.coin ?? "").trim().toUpperCase();
    if (!coin || coin === "USDC" || coin === "USDT") continue;
    const total = parseFloat(bal.total ?? "0") || 0;
    if (!(total > 0)) continue;
    const spotMeta = maps.spotIndex.get(coin);
    const mid = maps.midByCoin.get(coin) ?? 0;
    if (!spotMeta || !(mid > 0)) continue;
    positions.push({
      market: "spot",
      asset: spotMeta.asset,
      szi: total,
      midPx: mid,
      szDecimals: spotMeta.szDecimals,
      coin,
    });
  }

  return { openOrders, positions };
}
