/** Venue preflight orchestrator — probe, hint, print. */
import { createPublicClient, http, type Hex, type PublicClient } from "viem";
import { arbitrum } from "viem/chains";
import {
  formatVenueMatrixJson,
  getVenueMatrixRows,
  getVenueRequirement,
  getVenueRowsByVenue,
  type CoreVenueId,
} from "../../src/core/venue-execution-matrix";
import { probeVenueBalances, type VenueBalanceProbeResult } from "./venue-balance-preflight";
import { isWalletBIsolationAddress } from "../../src/core/wallet-isolation-guard";
import {
  buildVenuePreflightFailPayload,
  type VenuePreflightFailPayload,
} from "./venue-preflight-hints";
import { printVenuePreflightSummary } from "./venue-preflight-pass";
import { getAddress, type Hex } from "viem";

const DEFAULT_RPC = "https://arb1.arbitrum.io/rpc";

export interface RunVenuePreflightInput {
  matrixId: string;
  signer?: `0x${string}`;
  amountUsd?: number;
  rpc?: string;
  client?: PublicClient;
  fetchFn?: typeof fetch;
  skipProbe?: boolean;
}

export interface VenuePreflightReport {
  ok: boolean;
  matrixId: string;
  probe: VenueBalanceProbeResult | null;
  failPayload?: VenuePreflightFailPayload;
}

function resolveClient(rpc?: string, client?: PublicClient): PublicClient {
  if (client) return client;
  return createPublicClient({ chain: arbitrum, transport: http((rpc ?? DEFAULT_RPC).trim()) });
}

export async function runVenuePreflight(
  input: RunVenuePreflightInput,
): Promise<VenuePreflightReport> {
  const row = getVenueRequirement(input.matrixId);
  if (!row) {
    return {
      ok: false,
      matrixId: input.matrixId,
      probe: null,
      failPayload: {
        event: "VENUE_PREFLIGHT_FAIL",
        venue: "unknown",
        matrixId: input.matrixId,
        walletRole: "?",
        wallet: input.signer ?? "0x0",
        required: { token: "?", minUsd: 0, gasEth: 0 },
        actual: {},
        hint: `Unknown venue matrix id: ${input.matrixId}`,
        ssotRef: "venue-execution-matrix",
        seeAlso: "pnpm preflight:venues",
      },
    };
  }
  if (input.skipProbe || row.probeKind === "intent_only") {
    return { ok: true, matrixId: input.matrixId, probe: null };
  }
  if (input.signer && row.walletRole === "B") {
    try {
      const expected = getAddress(row.walletAddress as Hex);
      const got = getAddress(input.signer as Hex);
      if (expected !== got) {
        const probe = {
          ok: false,
          row,
          wallet: row.walletAddress,
          requiredMinUsd: input.amountUsd ?? row.primaryToken.minUsdDefault,
          actual: { eth: "0" },
          shortfalls: [{ field: "signer", required: expected, actual: got }],
        };
        return {
          ok: false,
          matrixId: input.matrixId,
          probe,
          failPayload: buildVenuePreflightFailPayload(probe, input.signer),
        };
      }
    } catch {
      /* ignore */
    }
  }
  if (
    input.signer &&
    row.walletRole === "A" &&
    (row.venue === "gmx" || row.venue === "pendle") &&
    isWalletBIsolationAddress(input.signer)
  ) {
    const probe = {
      ok: false,
      row,
      wallet: row.walletAddress,
      requiredMinUsd: input.amountUsd ?? row.primaryToken.minUsdDefault,
      actual: { eth: "0" },
      shortfalls: [{ field: "signer", required: row.walletAddress, actual: input.signer }],
    };
    return {
      ok: false,
      matrixId: input.matrixId,
      probe,
      failPayload: buildVenuePreflightFailPayload(probe, input.signer),
    };
  }
  const client = resolveClient(input.rpc, input.client);
  const probe = await probeVenueBalances(client, input.matrixId, {
    wallet: input.signer,
    amountUsd: input.amountUsd,
    fetchFn: input.fetchFn,
  });
  if (!probe || probe.ok) {
    return { ok: true, matrixId: input.matrixId, probe };
  }
  return {
    ok: false,
    matrixId: input.matrixId,
    probe,
    failPayload: buildVenuePreflightFailPayload(probe, input.signer),
  };
}

export function printVenuePreflightFail(report: VenuePreflightReport): void {
  if (report.failPayload) {
    console.error(JSON.stringify(report.failPayload, null, 2));
    console.error(`[preflight] FAIL: ${report.failPayload.hint}`);
    console.error(`[preflight] seeAlso: ${report.failPayload.seeAlso}`);
  } else {
    console.error(`[preflight] FAIL: ${report.matrixId}`);
  }
}

export function printVenueMatrixSsot(): void {
  console.log(formatVenueMatrixJson());
}

export function resolveMatrixIdsForVenue(venue?: CoreVenueId): string[] {
  if (!venue) return getVenueMatrixRows().map((r) => r.id);
  return getVenueRowsByVenue(venue).map((r) => r.id);
}

export async function runAllVenuePreflights(opts: {
  venue?: CoreVenueId;
  rpc?: string;
  jsonOnly?: boolean;
}): Promise<{ ok: boolean; reports: VenuePreflightReport[] }> {
  printVenueMatrixSsot();
  if (opts.jsonOnly) return { ok: true, reports: [] };
  const ids = resolveMatrixIdsForVenue(opts.venue);
  const reports: VenuePreflightReport[] = [];
  for (const id of ids) {
    reports.push(await runVenuePreflight({ matrixId: id, rpc: opts.rpc }));
  }
  const ok = reports.every((r) => r.ok);
  for (const r of reports) {
    if (!r.ok) printVenuePreflightFail(r);
  }
  if (ok) printVenuePreflightSummary(reports, ok);
  return { ok, reports };
}

export { printVenuePreflightPass } from "./venue-preflight-pass";
