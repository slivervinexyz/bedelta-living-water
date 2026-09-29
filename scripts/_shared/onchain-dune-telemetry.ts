/** On-chain SliverVineGate logs → Dune CSV row mapping SSOT. */
import {
  GATE_ACTION_EMERGENCY_DELEVERAGE,
  GATE_ACTION_FAIL_CLOSED_BLOCK,
  GATE_ACTION_PASS_GREENLIGHT,
} from "../../src/core/gate-telemetry-types";
import {
  ARBITRUM_ONE_CHAIN_ID,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  SLIVERVINE_GATE_DUAL_DEPLOY_ADDRESS,
  resolveGateAddressForChain,
} from "../../src/config/contract-deployments";
import {
  DUNE_TELEMETRY_CSV_COMMENT,
  type DuneInterceptStatus,
  type DuneInterceptType,
  type DuneVenue,
  type ExomeshDuneTelemetryRow,
} from "./exomesh-dune-telemetry-types";
import {
  estimateGasSavedUsd,
  estimatePotentialLossSavedUsd,
  mapReasonToInterceptType,
  resolveVenueFromSignal,
  seedReflexLatencyUs,
} from "./exomesh-dune-telemetry-map";

export const ONCHAIN_DUNE_CSV_PATH = "docs/audit/onchain-dune-telemetry.csv";
export const ONCHAIN_DUNE_CSV_COMMENT =
  `${DUNE_TELEMETRY_CSV_COMMENT} | on-chain SliverVineGate mainnet ${resolveGateAddressForChain(ARBITRUM_ONE_CHAIN_ID)} sepolia ${resolveGateAddressForChain(ARBITRUM_SEPOLIA_CHAIN_ID)} sanctuary_gate ${SLIVERVINE_GATE_DUAL_DEPLOY_ADDRESS} | RiskTripBlocked≡SoilResistanceTripped`;

export const GATE_MAINNET_DEPLOY_BLOCK = 506_040_846n;
export const DEFAULT_LOG_CHUNK_BLOCKS = 50_000n;
export const DEFAULT_SEPOLIA_LOOKBACK_BLOCKS = 2_500_000n;

export type VmExecution = "solidity" | "stylus" | "sanctuary";
export type OnchainEventName = "IntentAttested" | "RiskTripBlocked" | "SoilCoprocessorEval";

export const ONCHAIN_DUNE_CSV_HEADER =
  "timestamp,venue,intercept_type,reflex_latency_us,gas_burned,simulated_loss_prevented_usd,gas_saved_usd,status,block_number,tx_hash,log_index,chain_id,network,vm_execution,event_name,source";

export interface ParsedOnchainGateLog {
  chainId: number;
  network: "mainnet" | "sepolia";
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
  timestampMs: number;
  gasUsed: bigint;
  gasPriceWei: bigint;
  eventName: "IntentAttested" | "RiskTripBlocked";
  intentHash: string;
  agent: string;
  action?: number;
  shadowMarginUsd?: bigint;
  reason?: string;
}

export interface OnchainDuneTelemetryRow extends ExomeshDuneTelemetryRow {
  block_number: string;
  tx_hash: string;
  log_index: number;
  chain_id: number;
  network: "mainnet" | "sepolia";
  vm_execution: VmExecution;
  event_name: OnchainEventName;
}

export function resolveGateForNetwork(network: "mainnet" | "sepolia"): `0x${string}` {
  return resolveGateAddressForChain(
    network === "mainnet" ? ARBITRUM_ONE_CHAIN_ID : ARBITRUM_SEPOLIA_CHAIN_ID,
  ) as `0x${string}`;
}

export function resolveSanctuaryGate(): `0x${string}` {
  return SLIVERVINE_GATE_DUAL_DEPLOY_ADDRESS;
}

export interface MapOnchainLogOptions {
  vmExecution?: VmExecution;
  sourceLane?: string;
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

function mapIntentAction(action: number): {
  status: DuneInterceptStatus;
  interceptType: DuneInterceptType;
} {
  if (action === GATE_ACTION_PASS_GREENLIGHT) {
    return { status: "ALLOW", interceptType: "SOIL_RESISTANCE_TRIP" };
  }
  if (action === GATE_ACTION_EMERGENCY_DELEVERAGE) {
    return { status: "FAIL_CLOSED", interceptType: "OBSERVATORY_HAIRCUT" };
  }
  return { status: "FAIL_CLOSED", interceptType: "SOIL_RESISTANCE_TRIP" };
}

export function mapOnchainLogToDuneRow(
  log: ParsedOnchainGateLog,
  opts: MapOnchainLogOptions = {},
): OnchainDuneTelemetryRow {
  const seed = hashSeed([log.transactionHash, String(log.logIndex), log.intentHash]);
  let status: DuneInterceptStatus = "FAIL_CLOSED";
  let interceptType: DuneInterceptType = "SOIL_RESISTANCE_TRIP";
  let venue: DuneVenue = "gmx";
  let simulatedLossPreventedUsd = 0;

  if (log.eventName === "IntentAttested") {
    const mapped = mapIntentAction(log.action ?? GATE_ACTION_FAIL_CLOSED_BLOCK);
    status = mapped.status;
    interceptType = mapped.interceptType;
    venue = "pendle";
    if (log.shadowMarginUsd !== undefined) {
      simulatedLossPreventedUsd = Number(log.shadowMarginUsd) / 1_000_000;
      if (status === "ALLOW") simulatedLossPreventedUsd = 0;
    }
  } else {
    const reason = log.reason ?? "SOIL_RESISTANCE_TRIP";
    interceptType = mapReasonToInterceptType(reason);
    venue = resolveVenueFromSignal(reason);
    simulatedLossPreventedUsd = estimatePotentialLossSavedUsd(interceptType, seed, "FAIL_CLOSED");
  }

  const gasBurnedEth = Number(log.gasUsed * log.gasPriceWei) / 1e18;
  const vmExecution = opts.vmExecution ?? "solidity";
  const lane = opts.sourceLane ?? log.network;
  const source = `onchain:${lane}:${log.eventName}:${log.transactionHash}:${log.logIndex}`;
  return {
    timestamp: new Date(log.timestampMs).toISOString(),
    timestampMs: log.timestampMs,
    venue,
    intercept_type: interceptType,
    reflex_latency_us: seedReflexLatencyUs(interceptType, seed),
    gas_burned: gasBurnedEth,
    simulated_loss_prevented_usd: Math.round(simulatedLossPreventedUsd * 100) / 100,
    gas_saved_usd: estimateGasSavedUsd(interceptType, status),
    status,
    source,
    reason: log.reason,
    block_number: log.blockNumber.toString(),
    tx_hash: log.transactionHash,
    log_index: log.logIndex,
    chain_id: log.chainId,
    network: log.network,
    vm_execution: vmExecution,
    event_name: log.eventName,
  };
}

function rowToOnchainCsvLine(row: OnchainDuneTelemetryRow): string {
  return [
    row.timestamp,
    row.venue,
    row.intercept_type,
    row.reflex_latency_us.toFixed(1),
    row.gas_burned.toFixed(6),
    row.simulated_loss_prevented_usd.toFixed(2),
    row.gas_saved_usd.toFixed(2),
    row.status,
    row.block_number,
    row.tx_hash,
    String(row.log_index),
    String(row.chain_id),
    row.network,
    row.vm_execution,
    row.event_name,
    row.source,
  ].join(",");
}

export function formatOnchainDuneCsv(rows: readonly OnchainDuneTelemetryRow[]): string {
  const lines = new Array<string>(rows.length + 1);
  lines[0] = ONCHAIN_DUNE_CSV_HEADER;
  for (let index = 0; index < rows.length; index++) {
    lines[index + 1] = rowToOnchainCsvLine(rows[index]!);
  }
  return `${lines.join("\n")}\n`;
}

function parseRowFromCols(cols: string[]): OnchainDuneTelemetryRow {
  const legacy = cols.length === 15;
  const timestampMs = Date.parse(cols[0]!);
  const network = cols[legacy ? 12 : 12]! as "mainnet" | "sepolia";
  const vmExecution = (legacy ? "solidity" : cols[13]!) as VmExecution;
  const eventName = (legacy ? cols[13] : cols[14]!) as OnchainEventName;
  const source = legacy ? cols[14]! : cols[15]!;
  return {
    timestamp: cols[0]!,
    timestampMs,
    venue: cols[1] as DuneVenue,
    intercept_type: cols[2] as DuneInterceptType,
    reflex_latency_us: Number.parseFloat(cols[3]!),
    gas_burned: Number.parseFloat(cols[4]!),
    simulated_loss_prevented_usd: Number.parseFloat(cols[5]!),
    gas_saved_usd: Number.parseFloat(cols[6]!),
    status: cols[7] as DuneInterceptStatus,
    block_number: cols[8]!,
    tx_hash: cols[9]!,
    log_index: Number.parseInt(cols[10]!, 10),
    chain_id: Number.parseInt(cols[11]!, 10),
    network,
    vm_execution: vmExecution,
    event_name: eventName,
    source,
  };
}

export function parseOnchainDuneCsv(content: string): OnchainDuneTelemetryRow[] {
  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  if (lines.length <= 1) return [];
  const rows = new Array<OnchainDuneTelemetryRow>(lines.length - 1);
  for (let index = 1; index < lines.length; index++) {
    rows[index - 1] = parseRowFromCols(lines[index]!.split(","));
  }
  return rows;
}
