/** On-chain Dune CSV rollup lane — independent from exomesh simulated totals. */
import { createHash } from "node:crypto";
import {
  ARBITRUM_ONE_CHAIN_ID,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  SLIVERVINE_GATE_DUAL_DEPLOY_ADDRESS,
  STYLUS_SOIL_COPROCESSOR_MAINNET,
  resolveGateAddressForChain,
} from "../../src/config/contract-deployments";
import {
  parseOnchainDuneCsv,
  type OnchainDuneTelemetryRow,
  type OnchainEventName,
  type VmExecution,
} from "./onchain-dune-telemetry";

export interface OnchainRollupRow {
  timestamp: string;
  timestampMs: number;
  block_number: string;
  tx_hash: string;
  log_index: number;
  chain_id: number;
  network: "mainnet" | "sepolia";
  vm_execution: VmExecution;
  event_name: OnchainEventName;
  venue: string;
  intercept_type: string;
  status: "FAIL_CLOSED" | "ALLOW";
  simulated_loss_prevented_usd: number;
  gas_burned: number;
  source: string;
}

export interface OnchainRollup {
  total_rows: number;
  fail_closed_count: number;
  allow_count: number;
  date_range: { earliest: string; latest: string };
  gates: { mainnet: string; sepolia: string; stylus_mainnet: string; sanctuary_mainnet: string };
  csv_sha256: string;
  rows: OnchainRollupRow[];
}

function toRollupRow(row: OnchainDuneTelemetryRow): OnchainRollupRow {
  return {
    timestamp: row.timestamp,
    timestampMs: row.timestampMs,
    block_number: row.block_number,
    tx_hash: row.tx_hash,
    log_index: row.log_index,
    chain_id: row.chain_id,
    network: row.network,
    vm_execution: row.vm_execution,
    event_name: row.event_name,
    venue: row.venue,
    intercept_type: row.intercept_type,
    status: row.status,
    simulated_loss_prevented_usd: row.simulated_loss_prevented_usd,
    gas_burned: row.gas_burned,
    source: row.source,
  };
}

export function rollupOnchainCsv(content: string): OnchainRollup | null {
  const rows = parseOnchainDuneCsv(content);
  if (rows.length === 0) return null;
  const sha256 = createHash("sha256").update(content).digest("hex");
  let failClosed = 0;
  let allow = 0;
  let earliestMs = rows[0]!.timestampMs;
  let latestMs = rows[0]!.timestampMs;
  const rollupRows = new Array<OnchainRollupRow>(rows.length);

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    if (row.status === "FAIL_CLOSED") failClosed++;
    else allow++;
    if (row.timestampMs < earliestMs) earliestMs = row.timestampMs;
    if (row.timestampMs > latestMs) latestMs = row.timestampMs;
    rollupRows[index] = toRollupRow(row);
  }

  return {
    total_rows: rows.length,
    fail_closed_count: failClosed,
    allow_count: allow,
    date_range: {
      earliest: new Date(earliestMs).toISOString(),
      latest: new Date(latestMs).toISOString(),
    },
    gates: {
      mainnet: resolveGateAddressForChain(ARBITRUM_ONE_CHAIN_ID),
      sepolia: resolveGateAddressForChain(ARBITRUM_SEPOLIA_CHAIN_ID),
      stylus_mainnet: STYLUS_SOIL_COPROCESSOR_MAINNET,
      sanctuary_mainnet: SLIVERVINE_GATE_DUAL_DEPLOY_ADDRESS,
    },
    csv_sha256: sha256,
    rows: rollupRows,
  };
}

export function validateOnchainRows(rows: OnchainDuneTelemetryRow[]): string[] {
  const violations: string[] = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    if (!row.source.startsWith("onchain:")) {
      violations.push(`onchain row ${index + 1}: source must start with onchain:`);
    }
    if (row.vm_execution === "stylus" && !row.source.includes(":stylus:")) {
      violations.push(`onchain row ${index + 1}: stylus row source must include :stylus:`);
    }
    if (row.vm_execution === "sanctuary" && !row.source.includes(":sanctuary:")) {
      violations.push(`onchain row ${index + 1}: sanctuary row source must include :sanctuary:`);
    }
    if (Number.isNaN(row.simulated_loss_prevented_usd) || Number.isNaN(row.gas_burned)) {
      violations.push(`onchain row ${index + 1}: NaN economics`);
    }
  }
  return violations;
}
