/** SSOT EIP extension narrative — Extension banner · GAP→Fix · cross-demo EIP MAP. */
import { BOLD, CYAN, GRAY, GREEN, R, YELLOW } from "../adapters/exomesh-ansi-hud";

export type DemoEipKind = "exomesh" | "sanctuary" | "ingress";

export const JUDGE_SAFE_CLOCK_LABEL =
  "Clock: JUDGE_SAFE (Deterministic Audit Epoch) · Network: Arbitrum One 42161" as const;

interface ExtensionLine {
  tag: string;
  headline: string;
  detail: string;
}

interface GapFix {
  gap: string;
  fix: string;
}

interface EipRoute {
  key: string;
  cmd: string;
  owner: DemoEipKind | "fw12";
}

const PRODUCT: Record<DemoEipKind, string> = {
  exomesh: "ExoMesh",
  sanctuary: "Sanctuary",
  ingress: "Ingress",
};

const EXTENSIONS: Record<DemoEipKind, ExtensionLine> = {
  exomesh: {
    tag: "EXOMESH EXTENSION",
    headline: "🛡️ 0-Gas pre-consensus guard at EIP-1193+ signing boundary",
    detail: "blocks toxic signatures BEFORE Sequencer · lostUsd ≡ $0",
  },
  sanctuary: {
    tag: "SANCTUARY EXTENSION",
    headline: "🛡️ 0-Gas async vault escort at ERC-7540+ signing boundary",
    detail: "Pending→Claimable drift fuse · operator whitelist · lostUsd ≡ $0",
  },
  ingress: {
    tag: "INGRESS EXTENSION",
    headline: "🛡️ ERC-7683/7579 treasury ingress escort + AML shield",
    detail: "IN_FLIGHT→SETTLED lock · route topology · inbound AML fail-closed",
  },
};

const SCENARIO_GAPS: Record<DemoEipKind, Record<string, GapFix>> = {
  exomesh: {
    A: { gap: "EIP-1193 provider forwards blindly", fix: "soil + venue verify before Sequencer dispatch" },
    B: { gap: "EIP-1193 has no soft slippage monitor", fix: "high-slippage WARN logged (fail-closed · vitest 35/35)" },
    C: {
      gap: "EIP-712 has no wallet venue policy",
      fix: "pre-consensus structural guard + optional session-scoped venues",
    },
    D: { gap: "EIP-1193 has no retry throttle", fix: "Hot-Key channel SEVERED after max attempts" },
  },
  sanctuary: {
    A: { gap: "ERC-7540 no pre-sign drift guard", fix: "Wasm escort on requestDeposit · drift fuse ≤50 bps" },
    B: { gap: "setOperator has no wallet whitelist", fix: "malicious operator blocked 0-Gas before broadcast" },
    C: { gap: "Pending→Claimable slip unchecked", fix: "FAIL_CLOSED when async drift > erc7540MaxSlippageBps" },
  },
  ingress: {
    A: {
      gap: "ERC-7683 in-flight capital unlocked",
      fix: "IN_FLIGHT→SETTLED bridge escort · lostUsd ≡ $0 · venue deposit not in this step",
    },
    B: { gap: "bridge route topology unguarded", fix: "direct RH→HL blocked · Arb escort plane required" },
    C: { gap: "no inbound AML at wallet boundary", fix: "AML_INBOUND_TO_ROBINHOOD_BLOCKED pre-broadcast" },
  },
};

const EIP_ROUTES: readonly EipRoute[] = [
  { key: "1193+6963", cmd: "pnpm demo:exomesh", owner: "exomesh" },
  { key: "7540", cmd: "pnpm demo:sanctuary", owner: "sanctuary" },
  { key: "7683", cmd: "pnpm demo:ingress", owner: "ingress" },
  { key: "5792", cmd: "pnpm demo:FW-12", owner: "fw12" },
];

export function eipTag(label: string): string {
  return `${CYAN}${BOLD}[${label}]${R}`;
}

export function printJudgeSafeClock(): void {
  console.log(`${GRAY}${JUDGE_SAFE_CLOCK_LABEL}${R}`);
}

export function printDemoExtension(kind: DemoEipKind): void {
  const ext = EXTENSIONS[kind];
  console.log(
    `${eipTag(ext.tag)} ${GREEN}${BOLD}${ext.headline}${R} ${GRAY}(${ext.detail})${R}`,
  );
}

export function printScenarioGapFix(kind: DemoEipKind, scenarioId: string): void {
  const row = SCENARIO_GAPS[kind][scenarioId];
  if (!row) return;
  const product = PRODUCT[kind];
  console.log(
    `${YELLOW}${BOLD}⚠️ GAP:${R} ${GRAY}${row.gap}${R}  ` +
      `${GREEN}${BOLD}→ 🛡️ ${product}:${R} ${GRAY}${row.fix}${R}\n`,
  );
}

function formatEipRoute(route: EipRoute, active: DemoEipKind): string {
  const label = route.owner === active ? "this demo" : route.cmd;
  const text = `${route.key}: ${label}`;
  return route.owner === active ? `${GREEN}${BOLD}${text}${R}` : `${GRAY}${text}${R}`;
}

export function printEipCoverageMap(active: DemoEipKind): void {
  const body = EIP_ROUTES.map((r) => formatEipRoute(r, active)).join(`${GRAY} · ${R}`);
  console.log(`${eipTag("EIP MAP")} ${GRAY}📋 ${R}${body}`);
}
