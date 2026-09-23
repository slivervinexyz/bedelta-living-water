/** E2E grant demo ANSI HUD — step blocks, RESULT lines, capital balance sheet. */
import {
  AML_INBOUND_TO_ROBINHOOD_BLOCKED,
  ARBITRUM_ONE_CHAIN_ID,
  ROBINHOOD_TESTNET_CHAIN_ID,
} from "../../src/sdk";
import { computeE2eFinancialLedger } from "./e2e-financial-accounting";
import {
  BOLD,
  BOLD_CYAN,
  BOLD_GREEN,
  BOLD_RED,
  BRIGHT_CYAN,
  BRIGHT_GREEN,
  BRIGHT_MAGENTA,
  CYAN,
  GREEN,
  ORANGE,
  RED_BOLD,
  RESET,
  YELLOW,
  e2eLogColored,
  useColor,
  wrap,
} from "./e2e-hud-ansi";
import { e2eBoxStepBlock } from "./e2e-hud-box";
import { e2eStepThemeColor } from "./e2e-hud-step-theme";

export {
  logE2eHeaderClock,
  logE2eHeaderMode,
  logE2ePipelineRoadmap,
  paintE2eBanner,
} from "./e2e-hud-header";
export { printE2eSummaryHud } from "./e2e-hud-summary";

const ROBINHOOD_CHAIN_LABEL = `ROBINHOOD Chain (Chain ${ROBINHOOD_TESTNET_CHAIN_ID})`;
const ARBITRUM_CHAIN_LABEL = `ARBITRUM ONE (Chain ${ARBITRUM_ONE_CHAIN_ID})`;
const STEP2_OUTBOUND_ARROW = "===( Across Fast Intent )===>";
const STEP2_INBOUND_ARROW = "───( Reversal Blocked )───x";

function highlight(line: string): string {
  if (!useColor) return line;
  let out = line;
  for (const kw of ["PHYSICAL_DEADLOCK_TRIGGERED", "SOIL_TRIPPED", AML_INBOUND_TO_ROBINHOOD_BLOCKED, "[ ALERT ]"]) {
    out = out.split(kw).join(`${RED_BOLD}${kw}${RESET}`);
  }
  out = out.replace(/\[Wallet A\]/g, `${BRIGHT_CYAN}[Wallet A]${RESET}`);
  out = out.replace(/\[Wallet B\]/g, `${BRIGHT_MAGENTA}[Wallet B]${RESET}`);
  out = out.replace(/\+\s*10\s*bps/gi, `${YELLOW}+10 bps${RESET}`);
  out = out.replace(/0-Gas Sponsored|0-Gas Verified/g, `${YELLOW}$&${RESET}`);
  out = out.replace(/\[ ACTIVE \]|\[ PASSED \]|\[ ALLOWED \]|\[ VERIFIED \]/g, `${GREEN}$&${RESET}`);
  out = out.replace(/\[ REJECTED \]/g, `${RED_BOLD}[ REJECTED ]${RESET}`);
  out = out.replace(/Step [1345].*PASS|Pillar Set X Ingress PASS/g, `${GREEN}$&${RESET}`);
  out = out.replace(/Pillar Set [XY]/g, (m) => `${BRIGHT_CYAN}${m}${RESET}`);
  out = out.replace(/Architecture:/g, `${CYAN}Architecture:${RESET}`);
  out = out.replace(/\b(IN_BAND|FAST_LOCAL|SETTLED)\b/g, `${GREEN}$&${RESET}`);
  out = out.replace(/\bOUT_OF_BAND\b/g, `${RED_BOLD}OUT_OF_BAND${RESET}`);
  out = out.replace(/\d+\.?\d*\s*µs/g, (m) => `${CYAN}${m.trim()}${RESET}`);
  out = out.replace(/Δnet\s*≡\s*0|lostUsd\s*≡\s*\$0\.00/g, `${BOLD_GREEN}$&${RESET}`);
  out = out.replace(/\bPASS\b/g, `${GREEN}PASS${RESET}`);
  out = out.replace(/E2E OK \(\d+\/\d+\)/g, `${GREEN}$&${RESET}`);
  return out;
}

export function e2eLog(line: string): void {
  console.log(highlight(line));
}

function paintRobinhoodChain(): string {
  return useColor ? `${BOLD}${BRIGHT_MAGENTA}${ROBINHOOD_CHAIN_LABEL}${RESET}` : ROBINHOOD_CHAIN_LABEL;
}

function paintArbitrumChain(): string {
  return useColor ? `${BOLD_CYAN}${ARBITRUM_CHAIN_LABEL}${RESET}` : ARBITRUM_CHAIN_LABEL;
}

function paintStep2OutboundArrow(): string {
  return useColor ? `${BOLD_GREEN}${STEP2_OUTBOUND_ARROW}${RESET}` : STEP2_OUTBOUND_ARROW;
}

function paintStep2InboundArrow(): string {
  return useColor ? `${BOLD_RED}${STEP2_INBOUND_ARROW}${RESET}` : STEP2_INBOUND_ARROW;
}

export function logE2eStep2OutboundEscortLine(): void {
  e2eLogColored(
    `[ OUTBOUND ESCORT ]   ${paintRobinhoodChain()} ${paintStep2OutboundArrow()} ${paintArbitrumChain()}`,
  );
}

export function logE2eStep2InboundAmlBlockLine(): void {
  e2eLogColored(
    `[ INBOUND AML BLOCK ] ${paintArbitrumChain()} ${paintStep2InboundArrow()} ${paintRobinhoodChain()}`,
  );
}

export function fmtE2eUsd(amount: number, decimals = 2): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function logE2eStep(
  n: number,
  title: string,
  moduleTag: string,
  pillarLines: string | readonly string[],
): void {
  e2eLogColored("");
  const lines = Array.isArray(pillarLines) ? pillarLines : [pillarLines];
  e2eBoxStepBlock(n, title, moduleTag, lines, e2eStepThemeColor(n));
}

export function e2eLogHlSession(line: string, tone: "live" | "fallback"): void {
  if (!useColor) {
    console.log(line);
    return;
  }
  console.log(`${tone === "live" ? BRIGHT_GREEN : ORANGE}${line}${RESET}`);
}

export function printHlEnvMissingNotice(): void {
  e2eLog("[ NOTICE: .env.production missing for live Hyperliquid L1 Broadcast ]");
  e2eLog("└─ Falling back deterministically to Hyperliquid Session Key Live Sandbox Simulator");
}

export function emitStep4PassResult(): void {
  const ledger = computeE2eFinancialLedger();
  e2eLog(
    `RESULT: 🟢 [Wallet A] Step 4 Hyperliquid Hedge PASS — ${ledger.hlHedgeEthSize} ETH (${fmtE2eUsd(ledger.hlHedgeShortUsd)} USD) Short Active · Δnet ≡ ${ledger.deltaNetEthFormatted} ETH vs [Wallet B] GMX long · lostUsd ≡ $0.00`,
  );
}
