#!/usr/bin/env tsx
/**
 * Hyperliquid Vault Risk Radar — automated B2B lead finder.
 *
 * Usage:
 *   pnpm radar:scan
 *   pnpm radar:scan --min-tvl=50000 --limit=25
 */

import {
  buildVaultLead,
  fetchStatsVaults,
  fetchVaultDetails,
  HL_STATS_VAULTS_URL,
  scoreStatsEntry,
  type StatsVaultEntry,
  type VaultLeadCore,
} from "./hl-vault-radar-lib";

interface ScanOptions {
  minTvl: number;
  limit: number;
  includeClosed: boolean;
  enrichTop: number;
}

function parseArgs(argv: string[]): ScanOptions {
  let minTvl = 5_000;
  let limit = 20;
  let includeClosed = false;
  let enrichTop = 15;

  for (const arg of argv) {
    if (arg.startsWith("--min-tvl=")) minTvl = Number(arg.slice("--min-tvl=".length));
    else if (arg.startsWith("--limit=")) limit = Number(arg.slice("--limit=".length));
    else if (arg.startsWith("--enrich=")) enrichTop = Number(arg.slice("--enrich=".length));
    else if (arg === "--include-closed") includeClosed = true;
  }

  return {
    minTvl: Number.isFinite(minTvl) ? minTvl : 5_000,
    limit: Number.isFinite(limit) ? limit : 20,
    includeClosed,
    enrichTop: Number.isFinite(enrichTop) ? enrichTop : 15,
  };
}

function filterCandidates(
  vaults: StatsVaultEntry[],
  opts: ScanOptions,
): StatsVaultEntry[] {
  return vaults
    .filter((v) => {
      const tvl = parseFloat(v.summary.tvl) || 0;
      if (!opts.includeClosed && v.summary.isClosed) return false;
      if (tvl < opts.minTvl) return false;
      const { riskScore } = scoreStatsEntry(v);
      return riskScore >= 5 || tvl >= opts.minTvl * 2;
    })
    .sort((a, b) => scoreStatsEntry(b).riskScore - scoreStatsEntry(a).riskScore)
    .slice(0, opts.limit);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();

  console.error("[radar:scan] Fetching Hyperliquid vault stats…");
  const vaults = await fetchStatsVaults();
  const candidates = filterCandidates(vaults, opts);

  console.error(
    `[radar:scan] ${vaults.length} vaults indexed · ${candidates.length} candidates (min TVL $${opts.minTvl.toLocaleString()})`,
  );

  const leads: VaultLeadCore[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const entry = candidates[i]!;
    const enrich = i < opts.enrichTop;
    let details = null;
    if (enrich) {
      try {
        details = await fetchVaultDetails(entry.summary.vaultAddress);
      } catch {
        /* optional enrichment */
      }
    }
    leads.push(await buildVaultLead(entry, details));
    if (enrich) {
      console.error(
        `[radar:scan] enriched ${i + 1}/${Math.min(opts.enrichTop, candidates.length)}: ${entry.summary.name}`,
      );
    }
  }

  const report = {
    schema: "silvervine.vault-lead-radar.v1",
    generatedAt,
    source: {
      vaultIndex: HL_STATS_VAULTS_URL,
      infoEndpoint: "https://api.hyperliquid.xyz/info",
    },
    scanOptions: opts,
    totalVaultsIndexed: vaults.length,
    candidatesMatched: candidates.length,
    leadsReturned: leads.length,
    leads,
    nextStep: "pnpm radar:report <vaultAddress>",
  };

  console.log(JSON.stringify(report, null, 2));
  console.error(`[radar:scan] complete — ${leads.length} leads`);
}

main().catch((err) => {
  console.error("[radar:scan] fatal:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
