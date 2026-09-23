/** Shared SliverVineGate RiskTripBlocked telemetry emit helpers. */
import {
  parseAbi,
  type GetLogsReturnType,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";

export const GATE_EVENTS_ABI = parseAbi([
  "event IntentAttested(bytes32 indexed intentHash, address indexed agent, uint8 action, uint256 shadowMarginUsd)",
  "event RiskTripBlocked(bytes32 indexed intentHash, address indexed agent, string reason)",
]);

export const GATE_TELEMETRY_ABI = parseAbi([
  "function halted() view returns (bool)",
  "function tryReportRiskTrip((bytes32 payloadHash,address subject,uint8 verdict,uint16 riskBps,uint64 issuedAt,uint64 expiresAt,uint256 nonce) att, bytes[] signatures, address agent, string reason) returns (bytes4)",
]);

type GateLog = GetLogsReturnType<typeof GATE_EVENTS_ABI>[number];

export async function probeRecentGateLogs(
  client: PublicClient,
  gate: Hex,
  lookbackBlocks = 8_000n,
): Promise<GateLog[]> {
  const latest = await client.getBlockNumber();
  const fromBlock = latest > lookbackBlocks ? latest - lookbackBlocks : 0n;
  return client.getLogs({
    address: gate,
    events: GATE_EVENTS_ABI,
    fromBlock,
    toBlock: latest,
  });
}

export async function emitRiskTripBlocked(
  wallet: WalletClient,
  gate: Hex,
  agent: `0x${string}`,
  reason: string,
): Promise<Hex> {
  const now = BigInt(Math.floor(Date.now() / 1000));
  return wallet.writeContract({
    address: gate,
    abi: GATE_TELEMETRY_ABI,
    functionName: "tryReportRiskTrip",
    args: [
      {
        payloadHash: `0x${"22".repeat(32)}`,
        subject: agent,
        verdict: 0,
        riskBps: 9900,
        issuedAt: now,
        expiresAt: now + 30n,
        nonce: now,
      },
      [],
      agent,
      reason,
    ],
  });
}
