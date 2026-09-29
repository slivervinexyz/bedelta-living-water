#!/usr/bin/env tsx
/** Fetch live Gate logs + Stylus manifest txs → Dune on-chain CSV. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  http,
  parseAbi,
  type GetLogsReturnType,
  type Hex,
  type PublicClient,
} from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import { MAINNET_IGNITION_TX } from "../src/config/contract-deployments";
import {
  DEFAULT_LOG_CHUNK_BLOCKS,
  DEFAULT_SEPOLIA_LOOKBACK_BLOCKS,
  GATE_MAINNET_DEPLOY_BLOCK,
  ONCHAIN_DUNE_CSV_PATH,
  type OnchainDuneTelemetryRow,
  type ParsedOnchainGateLog,
  formatOnchainDuneCsv,
  mapOnchainLogToDuneRow,
  resolveSanctuaryGate,
  resolveGateForNetwork,
} from "./_shared/onchain-dune-telemetry";
import { mapStylusTxToDuneRow } from "./_shared/onchain-stylus-rows";
import { loadStylusTxManifest } from "./_shared/stylus-telemetry-emit";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let sanctuaryDeployBlock: bigint | null = null;
const gateEventsAbi = parseAbi([
  "event IntentAttested(bytes32 indexed intentHash, address indexed agent, uint8 action, uint256 shadowMarginUsd)",
  "event RiskTripBlocked(bytes32 indexed intentHash, address indexed agent, string reason)",
]);

type GateLog = GetLogsReturnType<typeof gateEventsAbi>[number];

function resolveMainnetRpc(): string {
  return (process.env.ARB_MAINNET_RPC_URL ?? "https://arb1.arbitrum.io/rpc").trim();
}

function resolveSepoliaRpc(): string {
  return (process.env.ARB_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc").trim();
}

async function fetchLogsChunked(
  client: PublicClient,
  gateAddress: Hex,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<GateLog[]> {
  const chunk = DEFAULT_LOG_CHUNK_BLOCKS;
  const logs: GateLog[] = [];
  for (let start = fromBlock; start <= toBlock; start += chunk) {
    const end = start + chunk - 1n > toBlock ? toBlock : start + chunk - 1n;
    const batch = await client.getLogs({
      address: gateAddress,
      events: gateEventsAbi,
      fromBlock: start,
      toBlock: end,
    });
    logs.push(...batch);
  }
  return logs;
}

async function enrichLogs(
  client: PublicClient,
  chainId: number,
  network: "mainnet" | "sepolia",
  logs: GateLog[],
): Promise<ParsedOnchainGateLog[]> {
  const blockNums = [...new Set(logs.map((log) => log.blockNumber))];
  const txHashes = [...new Set(logs.map((log) => log.transactionHash))];
  const blockTs = new Map<bigint, number>();
  const receiptGas = new Map<string, { gasUsed: bigint; gasPriceWei: bigint }>();

  await Promise.all(
    blockNums.map(async (blockNumber) => {
      const block = await client.getBlock({ blockNumber });
      blockTs.set(blockNumber, Number(block.timestamp) * 1000);
    }),
  );

  await Promise.all(
    txHashes.map(async (hash) => {
      const [receipt, tx] = await Promise.all([
        client.getTransactionReceipt({ hash }),
        client.getTransaction({ hash }),
      ]);
      const gasPriceWei = tx.gasPrice ?? receipt.effectiveGasPrice ?? 0n;
      receiptGas.set(hash, { gasUsed: receipt.gasUsed, gasPriceWei });
    }),
  );

  return logs.map((log) => {
    const gas = receiptGas.get(log.transactionHash) ?? { gasUsed: 0n, gasPriceWei: 0n };
    const base = {
      chainId,
      network,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
      timestampMs: blockTs.get(log.blockNumber) ?? 0,
      gasUsed: gas.gasUsed,
      gasPriceWei: gas.gasPriceWei,
      intentHash: String(log.args.intentHash),
      agent: String(log.args.agent),
    };
    if (log.eventName === "IntentAttested") {
      return {
        ...base,
        eventName: "IntentAttested",
        action: Number(log.args.action),
        shadowMarginUsd: log.args.shadowMarginUsd,
      };
    }
    return { ...base, eventName: "RiskTripBlocked", reason: log.args.reason };
  });
}

async function fetchNetwork(
  network: "mainnet" | "sepolia",
): Promise<ParsedOnchainGateLog[]> {
  const isMainnet = network === "mainnet";
  const gateAddress = resolveGateForNetwork(network) as Hex;
  const client = createPublicClient({
    chain: isMainnet ? arbitrum : arbitrumSepolia,
    transport: http(isMainnet ? resolveMainnetRpc() : resolveSepoliaRpc()),
  });
  const latest = await client.getBlockNumber();
  const fromBlock = isMainnet
    ? GATE_MAINNET_DEPLOY_BLOCK
    : latest > DEFAULT_SEPOLIA_LOOKBACK_BLOCKS
      ? latest - DEFAULT_SEPOLIA_LOOKBACK_BLOCKS
      : 0n;
  const logs = await fetchLogsChunked(client, gateAddress, fromBlock, latest);
  return enrichLogs(client, isMainnet ? arbitrum.id : arbitrumSepolia.id, network, logs);
}

async function resolveSanctuaryDeployBlock(client: PublicClient): Promise<bigint> {
  if (sanctuaryDeployBlock !== null) return sanctuaryDeployBlock;
  const receipt = await client.getTransactionReceipt({ hash: MAINNET_IGNITION_TX });
  sanctuaryDeployBlock = receipt.blockNumber;
  return sanctuaryDeployBlock;
}

async function fetchSanctuaryGateLogs(): Promise<ParsedOnchainGateLog[]> {
  const gateAddress = resolveSanctuaryGate() as Hex;
  const client = createPublicClient({ chain: arbitrum, transport: http(resolveMainnetRpc()) });
  const [latest, fromBlock] = await Promise.all([
    client.getBlockNumber(),
    resolveSanctuaryDeployBlock(client),
  ]);
  const logs = await fetchLogsChunked(client, gateAddress, fromBlock, latest);
  return enrichLogs(client, arbitrum.id, "mainnet", logs);
}

async function fetchStylusRows(): Promise<OnchainDuneTelemetryRow[]> {
  const manifest = loadStylusTxManifest(ROOT);
  if (manifest.length === 0) return [];
  const client = createPublicClient({ chain: arbitrum, transport: http(resolveMainnetRpc()) });
  const rows: OnchainDuneTelemetryRow[] = [];
  for (const entry of manifest) {
    const hash = entry.tx_hash as Hex;
    const [receipt, tx, block] = await Promise.all([
      client.getTransactionReceipt({ hash }),
      client.getTransaction({ hash }),
      client.getBlock({ blockNumber: BigInt(entry.block_number) }),
    ]);
    const gasPriceWei = tx.gasPrice ?? receipt.effectiveGasPrice ?? 0n;
    rows.push(
      mapStylusTxToDuneRow({
        txHash: entry.tx_hash,
        contract: entry.contract,
        chainId: entry.chain_id,
        blockNumber: receipt.blockNumber,
        timestampMs: Number(block.timestamp) * 1000,
        gasUsed: receipt.gasUsed,
        gasPriceWei,
        passed: entry.passed ?? false,
      }),
    );
  }
  return rows;
}

async function main(): Promise<void> {
  const mainnetGate = resolveGateForNetwork("mainnet");
  const sepoliaGate = resolveGateForNetwork("sepolia");
  const sanctuaryGate = resolveSanctuaryGate();
  const [mainnetLogs, sepoliaLogs, sanctuaryLogs, stylusRows] = await Promise.all([
    fetchNetwork("mainnet"),
    fetchNetwork("sepolia"),
    fetchSanctuaryGateLogs(),
    fetchStylusRows(),
  ]);
  const solidityRows = [...mainnetLogs, ...sepoliaLogs].map(mapOnchainLogToDuneRow);
  const sanctuaryRows = sanctuaryLogs.map((log) =>
    mapOnchainLogToDuneRow(log, { vmExecution: "sanctuary", sourceLane: "mainnet:sanctuary" }),
  );
  const rows = [...solidityRows, ...sanctuaryRows, ...stylusRows].sort(
    (a, b) => a.timestampMs - b.timestampMs,
  );
  const outPath = join(ROOT, ONCHAIN_DUNE_CSV_PATH);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, formatOnchainDuneCsv(rows));
  console.error(
    `[onchain-dune] mainnet_gate=${mainnetGate} sepolia_gate=${sepoliaGate} sanctuary_gate=${sanctuaryGate} solidity_logs=${solidityRows.length} sanctuary_logs=${sanctuaryRows.length} stylus_txs=${stylusRows.length} rows=${rows.length} -> ${outPath}`,
  );
}

main().catch((error) => {
  console.error("[onchain-dune] fail-closed", error);
  process.exit(1);
});
