import { HL_INFO_URL } from "../../src/config/constants";
import type { StatsVaultEntry, VaultDetails } from "./vault-radar.types";
import { HL_STATS_VAULTS_URL } from "./vault-radar.types";

async function postInfo<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(HL_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HL info HTTP ${res.status} (${body.type})`);
  return (await res.json()) as T;
}

export async function fetchStatsVaults(): Promise<StatsVaultEntry[]> {
  const res = await fetch(HL_STATS_VAULTS_URL);
  if (!res.ok) throw new Error(`HL stats vaults HTTP ${res.status}`);
  return (await res.json()) as StatsVaultEntry[];
}

export async function fetchVaultDetails(
  vaultAddress: string,
): Promise<VaultDetails | null> {
  return postInfo<VaultDetails | null>({
    type: "vaultDetails",
    vaultAddress,
  });
}

export { postInfo };
