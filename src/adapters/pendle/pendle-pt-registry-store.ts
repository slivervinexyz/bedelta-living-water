/** Runtime Pendle PT registry overlay — static SSOT + API discovery merge. */
import type { PendlePtRegistryEntry } from "./pendle-pt-registry-types";

const DISCOVERY_BY_KEY = new Map<string, PendlePtRegistryEntry>();
const DISCOVERY_BY_ADDRESS = new Map<string, PendlePtRegistryEntry>();

export function mergePendleDiscoveryEntries(entries: readonly PendlePtRegistryEntry[]): void {
  for (const entry of entries) {
    DISCOVERY_BY_KEY.set(entry.key, entry);
    DISCOVERY_BY_ADDRESS.set(entry.marketAddress.toLowerCase(), entry);
  }
}

export function clearPendleDiscoveryForTests(): void {
  DISCOVERY_BY_KEY.clear();
  DISCOVERY_BY_ADDRESS.clear();
}

export function resolvePendleDiscoveryEntry(
  keyOrAddress: string,
): PendlePtRegistryEntry | null {
  const direct = DISCOVERY_BY_KEY.get(keyOrAddress);
  if (direct) return direct;
  const addr = keyOrAddress.trim().toLowerCase();
  return DISCOVERY_BY_ADDRESS.get(addr) ?? null;
}

export function listPendleDiscoveryEntries(): PendlePtRegistryEntry[] {
  return [...DISCOVERY_BY_KEY.values()];
}

export function overlayDiscoveryOnStatic(
  staticEntries: readonly PendlePtRegistryEntry[],
): PendlePtRegistryEntry[] {
  const merged = new Map<string, PendlePtRegistryEntry>();
  for (const entry of staticEntries) merged.set(entry.key, entry);
  for (const entry of DISCOVERY_BY_KEY.values()) merged.set(entry.key, entry);
  return [...merged.values()];
}

export type { PendlePtRegistryEntry } from "./pendle-pt-registry-types";
