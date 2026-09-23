/** Stylus SliverVineSoilCoprocessor live telemetry emit + manifest SSOT. */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAbi, type Hex, type PublicClient, type WalletClient } from "viem";
import { STYLUS_SOIL_COPROCESSOR_MAINNET } from "../../src/config/contract-deployments";
import type { StylusTxManifestEntry } from "./onchain-stylus-rows";

export const STYLUS_ONCHAIN_TX_MANIFEST_PATH = "docs/audit/stylus-onchain-tx-manifest.jsonl";

export const STYLUS_TRIP_SPREAD_BPS = 100n;
export const STYLUS_TRIP_DEPTH_USD = 100_000n;
export const STYLUS_TRIP_SLIPPAGE_BPS = 10n;

export const STYLUS_TELEMETRY_ABI = parseAbi([
  "function evaluateSoilCoprocessor(uint256 spread_bps, uint256 depth_usd, uint256 slippage_bps) external returns (bool, uint256)",
]);

export function loadStylusTxManifest(root: string): StylusTxManifestEntry[] {
  const path = join(root, STYLUS_ONCHAIN_TX_MANIFEST_PATH);
  if (!existsSync(path)) return [];
  const entries: StylusTxManifestEntry[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    entries.push(JSON.parse(trimmed) as StylusTxManifestEntry);
  }
  return entries;
}

export function appendStylusTxManifest(root: string, entry: StylusTxManifestEntry): void {
  const path = join(root, STYLUS_ONCHAIN_TX_MANIFEST_PATH);
  appendFileSync(path, `${JSON.stringify(entry)}\n`);
}

export async function emitStylusSoilCoprocessorEval(
  wallet: WalletClient,
  contract: Hex,
): Promise<Hex> {
  return wallet.writeContract({
    address: contract,
    abi: STYLUS_TELEMETRY_ABI,
    functionName: "evaluateSoilCoprocessor",
    args: [STYLUS_TRIP_SPREAD_BPS, STYLUS_TRIP_DEPTH_USD, STYLUS_TRIP_SLIPPAGE_BPS],
  });
}

export async function probeStylusDryRun(
  client: PublicClient,
  contract: Hex,
): Promise<{ passed: boolean; score: bigint }> {
  const [passed, score] = await client.readContract({
    address: contract,
    abi: STYLUS_TELEMETRY_ABI,
    functionName: "evaluateSoilCoprocessor",
    args: [STYLUS_TRIP_SPREAD_BPS, STYLUS_TRIP_DEPTH_USD, STYLUS_TRIP_SLIPPAGE_BPS],
  });
  return { passed, score };
}

export function resolveStylusContractAddress(env: Record<string, string>): Hex {
  const raw = (env.STYLUS_COPROCESSOR_ADDRESS ?? STYLUS_SOIL_COPROCESSOR_MAINNET).trim();
  return raw as Hex;
}
