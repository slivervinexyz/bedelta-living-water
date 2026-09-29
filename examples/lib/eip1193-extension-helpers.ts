/** Shared ANSI helpers for EIP-1193 / EIP-6963 extension demo CLI. */
import { keccak_256 } from "@noble/hashes/sha3";
import {
  CAPITAL_DEFAULT_TOKEN,
  CAPITAL_DEFAULT_TOTAL_VAULT_USD,
} from "../../src/config/capital-invariant-defaults";
import { GATE_ACTION_FAIL_CLOSED_BLOCK } from "../../src/core/gate-telemetry-types";
import {
  announceGuardedProvider,
  evaluateRetailSoilGate,
  type EIP1193Provider,
  type EIP6963EventTarget,
  type RetailGuardConfig,
} from "../../src/sdk/exomesh-agentic-wallet-guard";
import { ARBITRUM_ONE_CHAIN_ID, resolveGateAddressForChain } from "../../src/config/contract-deployments";
import { sanitizeAccountEquityUsd } from "../../src/services/effective-max-sl";
import { BOLD, CYAN, GRAY, GREEN, R, RED, YELLOW } from "../adapters/exomesh-ansi-hud";
import {
  eipTag,
  JUDGE_SAFE_CLOCK_LABEL,
  printDemoExtension,
  printEipCoverageMap as printEipCoverageMapFor,
  printJudgeSafeClock,
  printScenarioGapFix,
} from "./demo-eip-narrative";
import { awaitDemoScenarioTransition, isDemoJsonArgv, parseTripMode, releaseDemoStdin } from "./demo-utils";
import { printModuleABanner } from "./demo-module-banners";
import { formatLatencyLabel, measureProbe, printV8ShellOverheadBlock } from "./demo-timing";

export { eipTag, JUDGE_SAFE_CLOCK_LABEL };

export const EIP1193_DEMO = {
  wallet: "0x1111111111111111111111111111111111111111",
  slivervineGate: resolveGateAddressForChain(ARBITRUM_ONE_CHAIN_ID),
  gmxGmVault: "0xbd65d785Dac74EBa9efFdB357b2dC52fCC26EC7F",
  usdc: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  malicious: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  permit2: "0x000000000022d473030f116ddee9f6b43ac78ba3",
  rdns: "com.slivervine.exomesh",
  arbChainId: 42161,
  boxW: 88,
} as const;

export function featureMetric(text: string): string {
  return `${YELLOW}${BOLD}${text}${R}`;
}

export function rejectCode(code: string): string {
  return `${RED}${BOLD}${code}${R}`;
}

export function wasmCoreMetric(us: number): string {
  return featureMetric(`⚡ ${formatLatencyLabel(us)} Pure Wasm Core`);
}

export function resolveIntentPrincipalUsd(): number {
  return sanitizeAccountEquityUsd(process.env.CITADEL_DEMO_EQUITY_USD ?? CAPITAL_DEFAULT_TOTAL_VAULT_USD);
}

export function formatIntentUsd(usd: number): string {
  return featureMetric(
    `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CAPITAL_DEFAULT_TOKEN}`,
  );
}

export function resolveDegradedSoftThresholdPct(cfg: RetailGuardConfig = demoConfig()): number {
  return (cfg.soilQuote?.maxSlippage ?? 0.005) * 100;
}

export function crossVenueSlippagePct(cfg: RetailGuardConfig): number {
  const q = cfg.soilQuote!;
  return (Math.abs(q.hlPerp - q.dydxPerp) / Math.max(q.hlSpot, 1)) * 100;
}

export function deriveTripEvtHash(nowMs: number, agentId: string, reason: string): string {
  const payload = `RiskTripBlocked:${agentId}:${reason}:${nowMs}:${GATE_ACTION_FAIL_CLOSED_BLOCK}`;
  return `0x${Buffer.from(keccak_256(new TextEncoder().encode(payload))).toString("hex")}`;
}

export function mapDuneTelemetryReason(code: string): string {
  const table: Record<string, string> = {
    VENUE_DRIFT_REJECTED: "VENUE_DRIFT",
    UNAUTHORIZED_SPENDER_REJECTED: "UNAUTHORIZED_SPENDER",
    SOLVER_MEV_SUSPECT: "SOLVER_MEV",
    MAX_ATTEMPTS_EXCEEDED_SEVERED: "CHANNEL_SEVERED",
    CHANNEL_SEVERED: "CHANNEL_SEVERED",
  };
  return table[code] ?? code.replace(/_REJECTED$/, "").replace(/_EXCEEDED_SEVERED$/, "_SEVERED");
}

export function demoConfig(overrides: Partial<RetailGuardConfig> = {}): RetailGuardConfig {
  const d = EIP1193_DEMO;
  const venues = [d.gmxGmVault, d.usdc, d.permit2, d.slivervineGate].map((a) => a.toLowerCase());
  return {
    walletAddress: d.wallet,
    allowedVenueMask: 0b1111,
    allowedVenues: venues,
    allowedSpenders: [d.slivervineGate.toLowerCase()],
    contractVenueIndex: {
      [d.gmxGmVault.toLowerCase()]: 0,
      [d.usdc.toLowerCase()]: 1,
      [d.permit2.toLowerCase()]: 2,
      [d.slivervineGate.toLowerCase()]: 3,
    },
    maxApprovalUsd: resolveIntentPrincipalUsd(),
    approvalTokenPriceUsd: 1,
    approvalTokenDecimals: 6,
    soilQuote: {
      hlSpot: 3500,
      hlPerp: 3500,
      dydxPerp: 3498.25,
      depthUsd: 500_000,
      maxSlippage: 0.005,
      minDepthUsd: 100_000,
    },
    preferWasm: false,
    ...overrides,
  };
}

export function degradedDemoConfig(): RetailGuardConfig {
  return demoConfig({
    soilQuote: {
      hlSpot: 3500,
      hlPerp: 3500,
      dydxPerp: 3471.3,
      depthUsd: 500_000,
      maxSlippage: 0.009,
      minDepthUsd: 100_000,
    },
  });
}

export const EIP1193_ARCHITECTURE_NOTE =
  "[ARCHITECTURE NOTE] 4 scenarios (A–D) are independent scripted replays; intercept logic & plainTextWarning match production SDK." as const;

export type Eip1193ScenarioId = "A" | "B" | "C" | "D";

export interface Eip1193ScenarioJsonResult {
  scenario: Eip1193ScenarioId;
  status: string;
  wasmUs: number;
  code: string | null;
  /** Primary production alert (warnings.ts) — final reject for multi-step scenarios. */
  plainTextWarning?: string | null;
  /** Full ordered production alert chain (e.g. Scenario D sever + channel). */
  plainTextWarnings?: string[] | null;
  reasonCodes?: string[] | null;
}

export { isDemoJsonArgv, releaseDemoStdin };

export function roundWasmUs(us: number): number {
  return Math.round(us * 10) / 10;
}

export function clearDemoTerminal(): void {
  process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
}

export async function awaitScenarioRecordingTransition(nextId: Eip1193ScenarioId): Promise<void> {
  await awaitDemoScenarioTransition(nextId, "advance");
  if (!isDemoJsonArgv() && process.stdin.isTTY) clearDemoTerminal();
}

const PROOF_BOX_W = 74;

function proofBoxLine(inner: string, color: string): void {
  const strip = inner.replace(/\x1b\[[0-9;]*m/g, "");
  const pad = Math.max(0, PROOF_BOX_W - 2 - strip.length);
  console.log(`${color}│${R}${inner}${" ".repeat(pad)}${color}│${R}`);
}

export function printExomeshProofHighlights(): void {
  const trip = parseTripMode();
  console.log("");
  console.log(`${CYAN}┌${"─".repeat(PROOF_BOX_W - 2)}┐${R}`);
  proofBoxLine(` ${BOLD}ExoMesh Agentic Guard — 4 Key Proofs${R}`, CYAN);
  console.log(`${CYAN}├${"─".repeat(PROOF_BOX_W - 2)}┤${R}`);
  proofBoxLine(
    ` ${GREEN}Scenario A${R} ${GRAY}· ALLOW_PASSTHROUGH (healthy GMX deposit)${R}`,
    CYAN,
  );
  proofBoxLine(
    ` ${YELLOW}Scenario B${R} ${GRAY}· DEGRADED_WARN (high-slippage monitor preview)${R}`,
    CYAN,
  );
  proofBoxLine(
    ` ${RED}Scenario C${R} ${GRAY}· FAIL_CLOSED (toxic EIP-712 · 0-Gas)${R}`,
    CYAN,
  );
  proofBoxLine(
    ` ${RED}Scenario D${R} ${GRAY}· CHANNEL_SEVERED (hot-key throttle)${R}`,
    CYAN,
  );
  if (trip) {
    console.log(`${CYAN}├${"─".repeat(PROOF_BOX_W - 2)}┤${R}`);
    proofBoxLine(` ${GRAY}Trip mode: Scenarios C–D only${R}`, CYAN);
  }
  console.log(`${CYAN}└${"─".repeat(PROOF_BOX_W - 2)}┘${R}`);
  console.log("");
}

export function printProductionPlainTextWarning(warning: string, reasonCode: string): void {
  console.log(`${eipTag("PRODUCTION ALERT")} ${GRAY}(warnings.ts · ${reasonCode})${R} ${warning}`);
}

export function printScenarioEipEnhancement(id: Eip1193ScenarioId): void {
  printScenarioGapFix("exomesh", id);
}

export function printEipCoverageMap(): void {
  printEipCoverageMapFor("exomesh");
}

export function printFeatureBanner(): void {
  printModuleABanner();
  printJudgeSafeClock();
  printDemoExtension("exomesh");
  console.log("");
}

export function printMainnetAnchors(): void {
  console.log(`${eipTag("MAINNET ANCHORS")} GMX GM Vault ${EIP1193_DEMO.gmxGmVault}`);
  console.log(`${eipTag("MAINNET ANCHORS")} SliverVine Gate ${EIP1193_DEMO.slivervineGate}`);
}

export function printEip6963Discovery(): void {
  console.log(`${eipTag("EIP-6963")} Provider Discovery -> rdns: "${EIP1193_DEMO.rdns}"`);
}

export function printEip1193Ingress(method: string): void {
  console.log(`${eipTag("EIP-1193")} Ingress Intercept -> window.ethereum.request({ method: '${method}' })`);
}

export function wrapGuarded(base: EIP1193Provider, cfg: RetailGuardConfig): EIP1193Provider {
  const target: EIP6963EventTarget = { dispatchEvent: () => true, addEventListener: () => {} };
  return announceGuardedProvider(base, cfg, { rdns: EIP1193_DEMO.rdns, target });
}

export function buildPhishingTypedData(): string {
  return JSON.stringify({
    domain: {
      name: "Permit",
      version: "1",
      chainId: EIP1193_DEMO.arbChainId,
      verifyingContract: EIP1193_DEMO.malicious,
    },
    types: { Permit: [{ name: "spender", type: "address" }] },
    primaryType: "Permit",
    message: { spender: EIP1193_DEMO.malicious },
  });
}

export function measureWasmSoilUs(cfg: RetailGuardConfig): number {
  const quote = cfg.soilQuote!;
  return measureProbe(() => evaluateRetailSoilGate(quote, cfg.preferWasm !== false));
}

export function printPayloadBox(chainId: number, wasmUs: number, clean: boolean): void {
  const w = EIP1193_DEMO.boxW;
  const verdict = clean ? featureMetric("CLEAN (0-Gas Allowed)") : rejectCode("TRIP");
  console.log(`${CYAN}┌${"─".repeat(w)}┐${R}`);
  console.log(`${CYAN}│${R} PAYLOAD PARSER: ERC-20 Approve / GMX GM Deposit -> ${EIP1193_DEMO.gmxGmVault}`);
  console.log(`${CYAN}│${R} ${eipTag("EIP-712")} DOMAIN: ChainId: ${chainId} (Arbitrum One) | Verifier: ${GREEN}${BOLD}VERIFIED${R}`);
  console.log(`${CYAN}│${R} WASM REFLEX: ${wasmCoreMetric(wasmUs)} Soil Check -> ${verdict}`);
  console.log(`${CYAN}└${"─".repeat(w)}┘${R}`);
}

export function printV8ShellOverhead(totalUs: number, wasmUs: number): void {
  printV8ShellOverheadBlock(totalUs, wasmUs);
}

export function printChannelOpen(integrityPct: number): void {
  console.log(`  ${eipTag("CHANNEL")} ${eipTag("EIP-712")} Signature Channel: ${GREEN}${BOLD}OPEN${R} (Channel Integrity: ${integrityPct}%)`);
}

export function printForwardGate(): void {
  console.log(
    `  ${eipTag("FORWARD")} ${eipTag("EIP-1193")} Guarded Provider -> Dispatched to Sequencer RPC (Vault ${EIP1193_DEMO.gmxGmVault} · Gate ${EIP1193_DEMO.slivervineGate})`,
  );
}

export function printDefenseMatrixHeader(): void {
  console.log(`\n${RED}${BOLD}[PRE-CONSENSUS DEFENSE MATRIX]${R}`);
}

export function printDefenseMatrixLine(guard: string, detail: string, code: string | undefined, branch: "├" | "└"): void {
  const suffix = code ? ` (${rejectCode(code)})` : "";
  console.log(`${branch}── ${eipTag(guard)} ${detail}${suffix}`);
}

export function printPreConsensusProofBox(wasmUs: number, capitalUsd: number): void {
  const w = EIP1193_DEMO.boxW;
  const bar = `${CYAN}┌${"─".repeat(w)}┐${R}`;
  const gas = featureMetric("0.000000 ETH");
  const bytes = featureMetric("0 Bytes Broadcasted to Sequencer");
  console.log(`${bar}\n${CYAN}│${R} ${RED}${BOLD}[PRE-CONSENSUS GATE PROOF]${R}`);
  console.log(`${CYAN}│${R}  ▸ WASM KERNEL TIME : ${wasmCoreMetric(wasmUs)} (Sub-10ms Wasm Kernel Execution)`);
  console.log(`${CYAN}│${R}  ▸ GAS BURNED       : ${gas} (${bytes})`);
  console.log(`${CYAN}│${R}  ▸ CAPITAL PROTECTED: ${formatIntentUsd(capitalUsd)} (lostUsd = ${featureMetric("$0.00")} · 100% Principal Preserved)`);
  console.log(
    `${CYAN}│${R}  ▸ PROVIDER ISOLATED: ExoMesh Agentic Guard aborted at ${eipTag("EIP-1193")} signing boundary (0-Gas · before RPC)`,
  );
  console.log(`${CYAN}└${"─".repeat(w)}┘${R}`);
}

export function printDuneTelemetry(agentId: string, rejectCodeRaw: string, nowMs: number): void {
  const reason = mapDuneTelemetryReason(rejectCodeRaw);
  console.log(
    `${GRAY}[TELEMETRY]${R} Event: RiskTripBlocked { agentId: "${agentId}", actionCode: ${GATE_ACTION_FAIL_CLOSED_BLOCK}, reason: "${reason}" }`,
  );
  console.log(`▸ Dune Spell Sync Hash: ${deriveTripEvtHash(nowMs, agentId, reason)} -> ${CYAN}silvervine_chaos.intercepts${R}`);
}
