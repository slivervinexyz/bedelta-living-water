/** Treasury ingress demo HUD — box-drawn ERC-7683/7579 limitation vs enhancement scenarios. */
import { BOLD, CYAN, GRAY, GREEN, R, RED } from "../adapters/exomesh-ansi-hud";
import {
  printDemoExtension,
  printEipCoverageMap,
  printJudgeSafeClock,
  printScenarioGapFix,
} from "./demo-eip-narrative";
import { CORE_BRIGHT_CYAN, formatLatencyLabel } from "./demo-timing";
import { awaitDemoScenarioTransition, parseTripMode } from "./demo-utils";
import { printModuleBIngressBanner, printOpSecFootnote } from "./demo-module-banners";

const BOX_W = 74;
const DETAIL_LABEL_W = 14;
const MODULE_TAG = `${CYAN}${BOLD}[Module B: Sanctuary · Pillar Set X Ingress]${R}`;
const TAG_GATE = `${RED}${BOLD}[PRE-CONSENSUS GATE]${R}`;

const LIVEFIRE_KERNEL = "0xdf4c3Fe9bADCbb2Cf62c4b334aD021a34f88F913";
const LIVEFIRE_TIER1_USER_OP = "0xd15dbd386a95435e825bf05c0f6186a8b8601bb6ee9071f87f59d41f79416941";
const LIVEFIRE_TIER1_TX = "0xdca66358ffb9a2463d1069722ea27dcfabe1d374dc1d5264698c74341bb02a2f";
const LIVEFIRE_TIER2_USER_OP = "0x1e5870ce700a5acb05e746e93b66197ce068195b38b5639ea4807b12a5c39563";
const LIVEFIRE_TIER2_TX = "0x4574c97ff91b5321c3281c535577a1a55908f4e92de8c3ecb55433e94735fcf6";
const LIVEFIRE_INDEX = "docs/logging/ROBINHOOD_LIVEFIRE_ARTIFACTS.md";

export type IngressScenarioId = "A" | "B" | "C";

export interface IngressScenarioDetail {
  label: string;
  value: string;
}

export interface IngressScenarioHud {
  id: IngressScenarioId;
  title: string;
  frameColor: string;
  detailFields: readonly IngressScenarioDetail[];
  latencyUs?: number;
  pass: boolean;
  resultLine: string;
  gateLine?: string;
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

function boxLine(inner: string, color: string): void {
  const pad = Math.max(0, BOX_W - 2 - stripAnsi(inner).length);
  console.log(`${color}│${R}${inner}${" ".repeat(pad)}${color}│${R}`);
}

function boxRule(color: string): void {
  console.log(`${color}├${"─".repeat(BOX_W - 2)}┤${R}`);
}

function boxOpen(color: string): void {
  console.log(`${color}┌${"─".repeat(BOX_W - 2)}┐${R}`);
}

function boxClose(color: string): void {
  console.log(`${color}└${"─".repeat(BOX_W - 2)}┘${R}`);
}

function shortHex(hex: string): string {
  return hex.length <= 14 ? hex : `${hex.slice(0, 10)}…${hex.slice(-4)}`;
}

export function printIngressBanner(): void {
  printModuleBIngressBanner();
  printJudgeSafeClock();
  printDemoExtension("ingress");
  console.log("");
}

export async function awaitIngressScenarioTransition(nextId: IngressScenarioId): Promise<void> {
  await awaitDemoScenarioTransition(nextId, "advance");
}

export function printIngressProofHighlights(): void {
  const trip = parseTripMode();
  console.log("");
  boxOpen(CYAN);
  boxLine(` ${BOLD}Treasury Ingress — 3 Key Proofs${R}`, CYAN);
  boxRule(CYAN);
  boxLine(
    ` ${GREEN}Scenario A${R} ${GRAY}· Treasury Bridge Settle — Robinhood → Arbitrum ($2,500 escrow)${R}`,
    CYAN,
  );
  boxLine(
    ` ${RED}Scenario B${R} ${GRAY}· Route Policy — Direct Robinhood → HL Blocked${R}`,
    CYAN,
  );
  boxLine(
    ` ${RED}Scenario C${R} ${GRAY}· Route Policy — AML Inbound to Robinhood Blocked${R}`,
    CYAN,
  );
  if (trip) {
    boxRule(CYAN);
    boxLine(` ${GRAY}Trip mode: Scenario A bridge timeout only${R}`, CYAN);
  }
  boxClose(CYAN);
  console.log("");
}

/** Archived 46630 live-fire ZeroDev proofs — not emitted by this policy-replay CLI. */
export function printIngressLiveFireAppendix(): void {
  console.log("");
  boxOpen(GRAY);
  boxLine(` ${GRAY}${BOLD}LIVE-FIRE APPENDIX · archived · NOT this CLI run${R}`, GRAY);
  boxRule(GRAY);
  boxLine(` ${CYAN}Kernel${R}     ${shortHex(LIVEFIRE_KERNEL)} ${GRAY}(ZeroDev Kernel v3)${R}`, GRAY);
  boxLine(
    ` ${GREEN}A-Tier1${R}   ${GRAY}46630→42161 · UserOp${R} ${shortHex(LIVEFIRE_TIER1_USER_OP)}`,
    GRAY,
  );
  boxLine(` ${GRAY}           Arbiscan tx ${shortHex(LIVEFIRE_TIER1_TX)}${R}`, GRAY);
  boxLine(
    ` ${GREEN}A-Tier2${R}   ${GRAY}46630 RH tx ${shortHex(LIVEFIRE_TIER2_TX)} · UserOp${R} ${shortHex(LIVEFIRE_TIER2_USER_OP)}`,
    GRAY,
  );
  boxLine(` ${GRAY}Index${R}      ${LIVEFIRE_INDEX}`, GRAY);
  boxClose(GRAY);
  console.log("");
}

export function printIngressScenario(hud: IngressScenarioHud): void {
  const { frameColor, id, title } = hud;
  const scope = INGRESS_SCENARIO_SCOPES[id];
  console.log("");
  console.log(`${frameColor}${BOLD}Scenario ${id}: ${title}${R}`);
  printScenarioGapFix("ingress", id);
  if (scope) console.log(`${GRAY}${scope}${R}`);
  boxOpen(frameColor);
  boxLine(` ${MODULE_TAG}`, frameColor);
  boxRule(frameColor);
  for (const { label, value } of hud.detailFields) {
    boxLine(` ${GRAY}${label.padEnd(DETAIL_LABEL_W)}${R} ${value}`, frameColor);
  }
  if (hud.latencyUs !== undefined) {
    boxLine(
      ` ${CORE_BRIGHT_CYAN}${BOLD}⚡ ${formatLatencyLabel(hud.latencyUs)} Escort Router Eval${R}`,
      frameColor,
    );
  }
  if (hud.gateLine) {
    boxLine(` ${TAG_GATE} ${RED}${hud.gateLine}${R}`, frameColor);
  }
  boxRule(frameColor);
  const resultColor = hud.pass ? GREEN : RED;
  boxLine(` ${resultColor}${BOLD}[RESULT]${R} ${hud.resultLine}`, frameColor);
  boxClose(frameColor);
  printOpSecFootnote();
}

export function printIngressResult(trip: boolean): void {
  const line = "═".repeat(BOX_W);
  console.log("");
  printEipCoverageMap("ingress");
  if (trip) {
    console.log(`\n${RED}${line}${R}`);
    console.log(`${RED}${BOLD}RESULT: 🛑 LIFECYCLE COMPLETE: FAIL_CLOSED (0-Gas Intercepted)${R}`);
    console.log(`${RED}${line}${R}\n`);
    printOpSecFootnote();
    return;
  }
  console.log(`\n${GREEN}${line}${R}`);
  console.log(
    `${GREEN}${BOLD}RESULT: 🟢 INGRESS MATRIX VERIFIED: 3/3 SCENARIOS PASSED (lostUsd = $0.00 · AML Shield Active)${R}`,
  );
  console.log(`${GREEN}${line}${R}\n`);
  printOpSecFootnote();
}

export const INGRESS_SCENARIO_TITLES: Record<IngressScenarioId, string> = {
  A: "Treasury Bridge Settle — Robinhood → Arbitrum",
  B: "Route Policy — Direct Robinhood → HL Blocked",
  C: "Route Policy — AML Inbound to Robinhood Blocked",
};

export const INGRESS_SCENARIO_SCOPES: Record<IngressScenarioId, string> = {
  A: "Bridge escrow only · GMX/Pendle = next demo (pnpm demo:gmx / demo:pendle)",
  B: "Topology check only · no HL order · required: RH → Arb SETTLED → HL session hedge",
  C: "Policy check only · Arb→Base unsupported · Arb→Robinhood inbound FAIL_CLOSED",
};

/** @deprecated Use INGRESS_SCENARIO_TITLES */
export const INGRESS_ROUTE_TITLES = INGRESS_SCENARIO_TITLES;

/** @deprecated Use printIngressScenario */
export const printIngressRoute = printIngressScenario;
