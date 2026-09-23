import { FUNDING_ANOMALY_THRESHOLD } from "../../src/config/constants";
import { postHlInfoDirect } from "./hl-account";
import {
  PREFERRED_DUAL_LISTED,
  type DualTarget,
  type MetaBundle,
  type SpotMeta,
} from "./ignition.types";

export async function fetchMetaBundle(): Promise<MetaBundle> {
  const res = await postHlInfoDirect({ type: "metaAndAssetCtxs" });
  if (!res.ok) throw new Error(`metaAndAssetCtxs HTTP ${res.status}`);
  const raw = (await res.json()) as [
    { universe?: MetaBundle["universe"] },
    MetaBundle["ctxs"],
  ];
  return {
    universe: raw[0]?.universe ?? [],
    ctxs: raw[1] ?? [],
  };
}

export async function fetchSpotMeta(): Promise<SpotMeta> {
  const res = await postHlInfoDirect({ type: "spotMeta" });
  if (!res.ok) throw new Error(`spotMeta HTTP ${res.status}`);
  const meta = (await res.json()) as SpotMeta;
  return {
    universe: meta.universe ?? [],
    tokens: meta.tokens ?? [],
  };
}

export function resolveSpotFromMeta(
  symbol: string,
  spotMeta: SpotMeta,
): { assetIndex: number; szDecimals: number } | null {
  const upper = symbol.toUpperCase();
  const aliases = new Set([upper, `U${upper}`, `${upper}C`]);
  const { universe, tokens } = spotMeta;

  const baseToken = tokens.find((t) =>
    aliases.has((t.name ?? "").toUpperCase()),
  );

  if (!baseToken) {
    for (let i = 0; i < universe.length; i++) {
      const pair = universe[i]!;
      const name = (pair.name ?? "").toUpperCase();
      if (!name.startsWith(`${upper}/`) && name !== upper) continue;
      const tokenIdx = pair.tokens?.[0];
      const tok =
        tokenIdx !== undefined
          ? (tokens.find((t) => t.index === tokenIdx) ?? tokens[tokenIdx])
          : undefined;
      return {
        assetIndex: 10_000 + (pair.index ?? i),
        szDecimals: tok?.szDecimals ?? 5,
      };
    }
    return null;
  }

  const baseIdx = baseToken.index ?? tokens.indexOf(baseToken);
  const usdcIdx =
    tokens.find((t) => (t.name ?? "").toUpperCase() === "USDC")?.index ?? 0;

  for (let i = 0; i < universe.length; i++) {
    const pair = universe[i]!;
    const [a, b] = pair.tokens ?? [];
    if (a === baseIdx && (b === usdcIdx || b === 0)) {
      return {
        assetIndex: 10_000 + (pair.index ?? i),
        szDecimals: baseToken.szDecimals ?? 5,
      };
    }
  }
  return null;
}

/** Strict dual-listed: active Perp + Spot. Prefer HYPE/SOL/ETH, then high funding. */
export function pickDualListedTarget(
  meta: MetaBundle,
  spotMeta: SpotMeta,
): DualTarget {
  type Cand = DualTarget & { preferred: boolean };
  const cands: Cand[] = [];

  meta.universe.forEach((asset, index) => {
    const name = (asset.name ?? "").trim().toUpperCase();
    if (!name || name.includes(":")) return;
    const spot = resolveSpotFromMeta(name, spotMeta);
    if (!spot) return;

    const ctx = meta.ctxs[index] ?? {};
    const midPx = parseFloat(ctx.midPx ?? ctx.oraclePx ?? ctx.markPx ?? "0");
    if (!(midPx > 0)) return;

    cands.push({
      symbol: name,
      assetIndex: index,
      szDecimals: asset.szDecimals ?? 4,
      fundingRateHourly: parseFloat(ctx.funding ?? "0") || 0,
      midPx,
      dayNtlVlm: parseFloat(ctx.dayNtlVlm ?? "0") || 0,
      spotAssetIndex: spot.assetIndex,
      spotSzDecimals: spot.szDecimals,
      preferred: (PREFERRED_DUAL_LISTED as readonly string[]).includes(name),
    });
  });

  if (cands.length === 0) {
    throw new Error("No dual-listed Spot+Perp targets available on HL mainnet");
  }

  const preferred = cands.filter((c) => c.preferred);
  const pool = preferred.length > 0 ? preferred : cands;

  const withFunding = pool.filter(
    (c) => Math.abs(c.fundingRateHourly) >= FUNDING_ANOMALY_THRESHOLD,
  );
  const rank = (withFunding.length > 0 ? withFunding : pool).slice();
  rank.sort((a, b) => {
    const ai = (PREFERRED_DUAL_LISTED as readonly string[]).indexOf(a.symbol);
    const bi = (PREFERRED_DUAL_LISTED as readonly string[]).indexOf(b.symbol);
    const aOrd = ai >= 0 ? ai : 999;
    const bOrd = bi >= 0 ? bi : 999;
    if (aOrd !== bOrd) return aOrd - bOrd;
    return Math.abs(b.fundingRateHourly) - Math.abs(a.fundingRateHourly);
  });

  return rank[0]!;
}
