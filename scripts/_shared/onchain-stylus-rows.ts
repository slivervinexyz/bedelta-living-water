/** Stylus SliverVineSoilCoprocessor tx → on-chain Dune CSV row mapping. */
import { STYLUS_SOIL_COPROCESSOR_MAINNET } from "../../src/config/contract-deployments";
import type { OnchainDuneTelemetryRow } from "./onchain-dune-telemetry";
import {
  estimateGasSavedUsd,
  estimatePotentialLossSavedUsd,
  seedReflexLatencyUs,
} from "./exomesh-dune-telemetry-map";

export interface StylusTxManifestEntry {
  tx_hash: string;
  contract: string;
  chain_id: number;
  block_number: string;
  emitted_at: string;
  passed?: boolean;
}

function hashSeed(parts: string[]): number {
  let hash = 2_166_136_261;
  for (const part of parts) {
    for (let index = 0; index < part.length; index++) {
      hash ^= part.charCodeAt(index);
      hash = Math.imul(hash, 1_677_761_9);
    }
  }
  return hash >>> 0;
}

export function mapStylusTxToDuneRow(input: {
  txHash: string;
  contract: string;
  chainId: number;
  blockNumber: bigint;
  timestampMs: number;
  gasUsed: bigint;
  gasPriceWei: bigint;
  passed: boolean;
}): OnchainDuneTelemetryRow {
  const seed = hashSeed([input.txHash, input.contract, "stylus"]);
  const status = input.passed ? "ALLOW" : "FAIL_CLOSED";
  const interceptType = "SOIL_RESISTANCE_TRIP";
  const loss =
    status === "FAIL_CLOSED"
      ? estimatePotentialLossSavedUsd(interceptType, seed, "FAIL_CLOSED")
      : 0;
  const contract = input.contract.toLowerCase();
  return {
    timestamp: new Date(input.timestampMs).toISOString(),
    timestampMs: input.timestampMs,
    venue: "gmx",
    intercept_type: interceptType,
    reflex_latency_us: seedReflexLatencyUs(interceptType, seed),
    gas_burned: Number(input.gasUsed * input.gasPriceWei) / 1e18,
    simulated_loss_prevented_usd: Math.round(loss * 100) / 100,
    gas_saved_usd: estimateGasSavedUsd(interceptType, status),
    status,
    source: `onchain:mainnet:stylus:SoilCoprocessorEval:${contract}:${input.txHash}:0`,
    block_number: input.blockNumber.toString(),
    tx_hash: input.txHash,
    log_index: 0,
    chain_id: input.chainId,
    network: "mainnet",
    vm_execution: "stylus",
    event_name: "SoilCoprocessorEval",
  };
}

export function defaultStylusContract(): string {
  return STYLUS_SOIL_COPROCESSOR_MAINNET;
}
