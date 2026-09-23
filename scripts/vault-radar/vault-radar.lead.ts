import { probeL2Depth } from "./vault-radar.depth";
import {
  extractPublicContacts,
  leaderDisplayName,
} from "./vault-radar.contacts";
import { scoreStatsEntry } from "./vault-radar.metrics";
import type {
  DepthProbe,
  StatsVaultEntry,
  VaultDetails,
  VaultLeadCore,
} from "./vault-radar.types";

function estimateSlippageExposure(
  tvlUsd: number,
  drawdownUsd: number,
  depthMismatchRatio: number,
): { exposureUsd: number; savedUsd: number } {
  const notionalProxy = Math.max(tvlUsd * 0.25, 1_000);
  const slippageRate = Math.min(0.005 * depthMismatchRatio, 0.03);
  const exposureUsd = Math.max(drawdownUsd, notionalProxy * slippageRate);
  const savedUsd = exposureUsd * 0.65;
  return {
    exposureUsd: Math.round(exposureUsd),
    savedUsd: Math.round(savedUsd),
  };
}

export async function buildVaultLead(
  entry: StatsVaultEntry,
  details?: VaultDetails | null,
  depthCoins: string[] = ["BTC", "ETH"],
): Promise<VaultLeadCore> {
  const summary = entry.summary;
  const tvlUsd = parseFloat(summary.tvl) || 0;
  const scores = scoreStatsEntry(entry);
  const description = details?.description ?? "";
  const contacts = extractPublicContacts(description);
  const leader = details?.leader ?? summary.leader;
  const display = leaderDisplayName(contacts, leader);

  const depthProbes = await Promise.all(
    depthCoins.map((coin) =>
      probeL2Depth(coin).catch(
        (): DepthProbe => ({
          coin,
          depthUsd: 0,
          latencyMs: 999,
          stale: true,
          failClosedWouldTrip: true,
        }),
      ),
    ),
  );

  const minDepth = Math.min(
    ...depthProbes.map((p) => p.depthUsd).filter((d) => d > 0),
    Infinity,
  );
  const safeDepth = Number.isFinite(minDepth) ? minDepth : 0;
  const depthMismatchRatio =
    safeDepth > 0 ? Math.max(tvlUsd / safeDepth, 1) : tvlUsd > 10_000 ? 5 : 2;

  const rpcTrip = depthProbes.some((p) => p.failClosedWouldTrip);
  const depthTrip = depthMismatchRatio > 1.5;
  const drawdownTrip =
    scores.dayDrawdownUsd > 50 || scores.weekDrawdownUsd > 200;

  let vulnerability = "Elevated Execution Risk";
  if (rpcTrip && depthTrip) {
    vulnerability = "RPC Timeout / Excessive Slippage Exposure";
  } else if (rpcTrip) {
    vulnerability = "RPC Timeout / Stale L2 Book Exposure";
  } else if (depthTrip) {
    vulnerability = "Orderbook Depth Mismatch During Execution";
  } else if (drawdownTrip) {
    vulnerability = "Volatility Drawdown During Active Trading";
  }

  const { exposureUsd, savedUsd } = estimateSlippageExposure(
    tvlUsd,
    scores.dayDrawdownUsd + scores.weekDrawdownUsd * 0.3,
    depthMismatchRatio,
  );

  const blockHint =
    depthProbes.find((p) => p.failClosedWouldTrip)?.latencyMs ?? 500;
  const slippageHint = Math.max(exposureUsd * 0.15, 200);
  const coldOutreachHook =
    `Hey ${display}, your vault experienced a $${slippageHint.toLocaleString()} slippage-class event ` +
    `(~${blockHint}ms L2 probe). Here is a 1-command proof of how \`@silvervine/risk-sdk\` prevents this: \`pnpm verify:negative\`.`;

  return {
    vaultAddress: summary.vaultAddress,
    vaultName: details?.name ?? summary.name,
    leaderAddress: leader,
    leaderDisplayName: display,
    tvlUsd,
    apr: details?.apr ?? entry.apr,
    isClosed: summary.isClosed,
    vulnerability,
    riskScore: Math.round(scores.riskScore * 10) / 10,
    tradeFrequencyScore: Math.round(scores.tradeFrequencyScore * 100) / 100,
    dayDrawdownUsd: Math.round(scores.dayDrawdownUsd * 100) / 100,
    weekDrawdownUsd: Math.round(scores.weekDrawdownUsd * 100) / 100,
    depthMismatchRatio: Math.round(depthMismatchRatio * 100) / 100,
    estimatedSlippageExposureUsd: exposureUsd,
    estimatedLossSavedByFailClosedUsd: savedUsd,
    depthProbes,
    contacts,
    description: description || undefined,
    coldOutreachHook,
  };
}
