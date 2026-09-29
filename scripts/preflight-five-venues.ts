#!/usr/bin/env tsx
/** Standalone 5-venue Wallet×Token preflight CLI. */
import type { CoreVenueId } from "../src/core/venue-execution-matrix";
import { loadMainnetEnv } from "./_shared/mainnet-env";
import { runAllVenuePreflights } from "./_shared/venue-preflight-report";

const VENUES: CoreVenueId[] = ["gmx", "pendle", "usdai", "hyperliquid", "variational"];

function parseVenue(argv: string[]): CoreVenueId | undefined {
  const flag = argv.find((a) => a.startsWith("--venue="));
  if (!flag) return undefined;
  const id = flag.split("=")[1]?.trim() as CoreVenueId;
  if (!VENUES.includes(id)) throw new Error(`UNKNOWN_VENUE: ${id}`);
  return id;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const jsonOnly = argv.includes("--json");
  if (!jsonOnly) loadMainnetEnv();
  const venue = parseVenue(argv);
  const rpc = (process.env.ARB_MAINNET_RPC_URL ?? "https://arb1.arbitrum.io/rpc").trim();
  const { ok } = await runAllVenuePreflights({ venue, rpc, jsonOnly });
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("[preflight:venues] fatal", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
