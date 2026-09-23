/** Mirror src/config/contract-deployments.ts → SYSTEM_METRICS_SSOT.json (read-only JSON mirror). */
/// <reference types="node" />
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  ARBITRUM_ONE_CHAIN_ID,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  MAINNET_DEPLOYMENTS,
  MAINNET_IGNITION_TX,
  MAINNET_SUPERSEDED_DEPLOYMENTS,
  SEPOLIA_ONLY_DEPLOYMENTS,
  SEPOLIA_SUPERSEDED_DEPLOYMENTS,
  SLIVERVINE_GATE_MAINNET_EXOMESH_ADDRESS,
  SLIVERVINE_GATE_MAINNET_EXOMESH_DOMAIN_SEPARATOR,
  SLIVERVINE_GATE_SEPOLIA_EXOMESH_ADDRESS,
  SLIVERVINE_GATE_SEPOLIA_EXOMESH_DOMAIN_SEPARATOR,
  STYLUS_SOIL_COPROCESSOR_MAINNET,
  type ContractDeployment,
} from "../../src/config/contract-deployments";
import { GATE_EIP712_DOMAIN_EXOMESH_WIRE } from "../../src/sdk/constants";

export const SYSTEM_METRICS_SSOT_PATH = "docs/audit/SYSTEM_METRICS_SSOT.json";

export interface DeploymentMirrorEntry {
  name: string;
  address: string;
  network: string;
  chain_ids: number[];
  role: string;
  source?: string;
}

export interface ChainDeploymentsMirror {
  chain_id: number;
  network: string;
  gate_address: string;
  domain_separator: string;
  live: DeploymentMirrorEntry[];
  superseded: DeploymentMirrorEntry[];
}

export interface DeploymentsMirror {
  ssot_source: "src/config/contract-deployments.ts";
  eip712_domain: string;
  synced_at: string;
  mainnet_ignition_tx: string;
  stylus_coprocessor_mainnet: string;
  chains: {
    arbitrum_one: ChainDeploymentsMirror;
    arbitrum_sepolia: ChainDeploymentsMirror;
  };
}

function toMirrorEntry(d: ContractDeployment): DeploymentMirrorEntry {
  const entry: DeploymentMirrorEntry = {
    name: d.name,
    address: d.address,
    network: d.network,
    chain_ids: [...d.chainIds],
    role: d.role,
  };
  if (d.source) entry.source = d.source;
  return entry;
}

export function buildDeploymentsMirror(): DeploymentsMirror {
  return {
    ssot_source: "src/config/contract-deployments.ts",
    eip712_domain: GATE_EIP712_DOMAIN_EXOMESH_WIRE,
    synced_at: new Date().toISOString(),
    mainnet_ignition_tx: MAINNET_IGNITION_TX,
    stylus_coprocessor_mainnet: STYLUS_SOIL_COPROCESSOR_MAINNET,
    chains: {
      arbitrum_one: {
        chain_id: ARBITRUM_ONE_CHAIN_ID,
        network: "mainnet",
        gate_address: SLIVERVINE_GATE_MAINNET_EXOMESH_ADDRESS,
        domain_separator: SLIVERVINE_GATE_MAINNET_EXOMESH_DOMAIN_SEPARATOR,
        live: MAINNET_DEPLOYMENTS.map(toMirrorEntry),
        superseded: MAINNET_SUPERSEDED_DEPLOYMENTS.map(toMirrorEntry),
      },
      arbitrum_sepolia: {
        chain_id: ARBITRUM_SEPOLIA_CHAIN_ID,
        network: "sepolia",
        gate_address: SLIVERVINE_GATE_SEPOLIA_EXOMESH_ADDRESS,
        domain_separator: SLIVERVINE_GATE_SEPOLIA_EXOMESH_DOMAIN_SEPARATOR,
        live: SEPOLIA_ONLY_DEPLOYMENTS.map(toMirrorEntry),
        superseded: SEPOLIA_SUPERSEDED_DEPLOYMENTS.map(toMirrorEntry),
      },
    },
  };
}

export function gateAddressShort(address: string): string {
  const a = address.toLowerCase();
  if (a.length < 10) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function syncDeploymentsToSystemMetricsSsot(root: string): DeploymentsMirror {
  const path = join(root, SYSTEM_METRICS_SSOT_PATH);
  const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const mirror = buildDeploymentsMirror();
  raw.deployments = mirror;
  const pipeline = (raw.onchain_indexer_pipeline ?? {}) as Record<string, unknown>;
  pipeline.gate_contract = mirror.chains.arbitrum_one.gate_address;
  pipeline.gate_contracts = {
    [String(ARBITRUM_ONE_CHAIN_ID)]: mirror.chains.arbitrum_one.gate_address,
    [String(ARBITRUM_SEPOLIA_CHAIN_ID)]: mirror.chains.arbitrum_sepolia.gate_address,
  };
  raw.onchain_indexer_pipeline = pipeline;
  writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`);
  return mirror;
}
