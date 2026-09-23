/**
 * Hyperliquid Vault Risk Radar — shared fetch + scoring for B2B lead gen.
 */

export {
  HL_STATS_VAULTS_URL,
  type PublicContactTags,
  type DepthProbe,
  type VaultLeadCore,
  type StatsVaultEntry,
  type VaultDetails,
} from "./vault-radar.types";

export { fetchStatsVaults, fetchVaultDetails } from "./vault-radar.fetch";
export {
  computeDrawdownUsd,
  computeTradeFrequencyScore,
  scoreStatsEntry,
} from "./vault-radar.metrics";
export { probeL2Depth } from "./vault-radar.depth";
export {
  extractPublicContacts,
  leaderDisplayName,
} from "./vault-radar.contacts";
export { buildVaultLead } from "./vault-radar.lead";
export { formatLeadMarkdown } from "./vault-radar.format";
