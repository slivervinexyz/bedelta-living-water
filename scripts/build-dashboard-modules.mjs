#!/usr/bin/env node
/** Generates modular dashboard components from monolithic dashboard source. */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const legacyMonolith = path.join(root, "legacy_ref/monolith_dashboard.ts");
const monolithPath = path.join(root, ".dashboard-monolith.ts");

if (fs.existsSync(legacyMonolith)) {
  fs.copyFileSync(legacyMonolith, monolithPath);
} else if (!fs.existsSync(monolithPath)) {
  execSync("git show HEAD:src/ui/dashboard.ts > .dashboard-monolith.ts", {
    cwd: root,
    stdio: "inherit",
  });
}

const lines = fs.readFileSync(monolithPath, "utf8").split("\n");
const out = path.join(root, "src/ui/components");
fs.mkdirSync(out, { recursive: true });

function slice(a, b) {
  if (a > b || a < 1) return "";
  return lines.slice(a - 1, b).join("\n");
}

function rangesText(ranges) {
  return ranges
    .map(([a, b]) => slice(a, b))
    .filter(Boolean)
    .join("\n\n");
}

function exportConst(name, content) {
  return `export const ${name} = ${JSON.stringify(content)};\n`;
}

function sanitizeClientScript(content) {
  return content
    .replace(/\\\\'/g, "\\'")
    .replace(
      /\$\{JSON\.stringify\(GATEKEEPER_AUTH_STORAGE_KEY\)\}/g,
      "__SV_GATEKEEPER_AUTH_KEY__",
    )
    .replace(
      /\$\{JSON\.stringify\(\[\.\.\.GATEKEEPER_REF_WHITELIST\]\)\}/g,
      "__SV_GATEKEEPER_WHITELIST__",
    );
}

function exportScriptConst(name, content) {
  return exportConst(name, sanitizeClientScript(content));
}

function inferCtxVars(content, candidateVars) {
  return candidateVars.filter((v) => {
    if (new RegExp(`\\$\\{${v}(\\.|}|\\[)`).test(content)) return true;
    return new RegExp(`[^a-zA-Z0-9_]${v}[^a-zA-Z0-9_]`).test(content);
  });
}

function exportHtmlRenderer(name, content, candidateVars) {
  const escaped = content.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
  const used = inferCtxVars(content, candidateVars);
  const destruct = used.length
    ? `  const { ${used.join(", ")} } = ctx;\n`
    : "";
  const param = used.length ? "ctx" : "_ctx";
  return `export function ${name}(${param}: DashboardBuildContext): string {
${destruct}  return \`${escaped}\`;
}
`;
}

function write(name, content) {
  fs.writeFileSync(path.join(out, name), content);
}

const fnLine = (name) =>
  lines.findIndex((l) => l.match(new RegExp(`function ${name}\\(`))) + 1;

const fnEnd = (startLine) => {
  let depth = 0;
  let started = false;
  for (let i = startLine - 1; i < lines.length; i++) {
    const line = lines[i];
    depth += (line.match(/{/g) || []).length;
    depth -= (line.match(/}/g) || []).length;
    if (line.includes("{")) started = true;
    if (started && depth <= 0) return i + 1;
  }
  return startLine;
};

const idx = (needle, from = 0) => {
  const i = lines.findIndex((l, n) => n >= from && l.includes(needle));
  return i;
};
const idxFrom = (needle, fromLine) => idx(needle, fromLine - 1);

const renderDashboardLine = idx("export function renderDashboard") + 1;
const scriptStart = idxFrom("let globalData = [];", renderDashboardLine) + 1;
const bootIfLine = idxFrom("if (document.readyState === 'loading')", scriptStart) + 1;
const scriptEnd = fnEnd(bootIfLine);

let styleStart = 0;
let styleEnd = 0;
for (let i = renderDashboardLine - 1; i < lines.length; i++) {
  if (!styleStart && lines[i].includes("<style>")) styleStart = i + 2;
  if (styleStart && lines[i].includes("</style>")) {
    styleEnd = i;
    break;
  }
}

const headerStart = idxFrom('<header class="terminal-header">', renderDashboardLine) + 1;
const toxicStart = idxFrom('id="toxicModeBackdrop"', renderDashboardLine);
const walletStart = idxFrom('id="walletModalBackdrop"', renderDashboardLine);
const masterStart = idxFrom('id="masterRiskConsole"', renderDashboardLine);
const debugStart = idxFrom('class="debug-drawer"', renderDashboardLine);
const bodyOpen = idxFrom('<body class="terminal-body', renderDashboardLine) + 1;

const uiHelperRanges = [
  [fnLine("jsOnclickArg"), fnEnd(fnLine("applySvTip"))],
  [fnLine("setDashboardModalOpen"), fnEnd(fnLine("bindDashboardModalEscapeDismiss"))],
];

const headerHudFns = [
  "recomputeRootDefenseMatrixState",
  "getRootDefenseMatrixScore",
  "getToxicityRiskScore",
  "resolveRootDefenseMatrixFillColor",
  "applyRootDefenseMatrixBarFill",
  "getEffectiveRiskScore",
  "clearDonDonTransient",
  "resolveDonDonBaseState",
  "applyDonDonIpDisplay",
  "triggerDonDonTransient",
  "triggerDonDonOrangeTarget",
  "triggerDonDonLevelUp",
  "applyDonDonAvatarForRisk",
  "appendStep1CondensedLog",
  "resolveClientVectorEquilibriumContext",
  "syncTaijiBaguaOnSystemState",
  "refreshTaijiBaguaHud",
  "refreshCriAndStatusHud",
  "triggerGrowthHudBurst",
];

const demoDrawerFns = [
  "applyShieldDemoUI",
  "toggleShieldDemo",
  "applySettlementLockdownDemoUI",
  "toggleSettlementLockdownDemo",
  "syncDemoHubLamps",
  "toggleDefcon1Demo",
  "openDemoControlHub",
  "closeDemoControlHub",
  "toggleFundingExtremeDemo",
  "toggleGatekeeperDemo",
  "resetDemoRootStatuses",
  "applyDemoRootTrips",
  "setDemoCriPreset",
  "resetToxicLockAndCooldown",
  "normalizeDevRootStatus",
  "setDevRootStatus",
  "cycleDevRootStatus",
  "collectRootStatusesForCri",
  "collectTrippedRootsForCri",
  "triggerToxicModeCircuitBreaker",
  "acknowledgeToxicModeModal",
  "syncDemoPersonaRoleUI",
  "setDemoPersonaRole",
  "canMutateDemoRiskControls",
  "syncDemoHubMirrorReadouts",
  "injectFaultPreset",
  "syncDemoXpUI",
  "onDemoXpInputChange",
  "adjustDemoXp",
  "resetDemoXp",
  "syncDemoWalletTxLevelUI",
  "setDemoWalletTxLevel",
  "setDemoHubTab",
];

const orderEntryFns = [
  "resolveAccountEquityUsd",
  "resolveEffectiveMaxSlUsd",
  "formatDynSlLockTagHtml",
  "formatMaxSlWeldLabel",
  "formatMaxSlWeldDesc",
  "sanitizeCapitalUsd",
  "resolveOrderSizeMaxUsd",
  "clampOrderSizeUsd",
  "dynamicMaxSlPctLocal",
  "exceedsMaxRiskBoundaryLocal",
  "collectAutoGuards",
  "formatAutoGuardBannerLocal",
  "isStep3UnlockedFromGuards",
  "isStep3Unlocked",
  "refreshAutoGuardBanner",
  "assertFlashHardLocksLocal",
  "syncOrderSizeUi",
  "syncStep3CapitalUi",
  "getStep3FrictionRate",
  "getStep3FixedCost",
  "updateStep3BlockEconomics",
  "resolveAttackButtonState",
  "updateMasterConsoleSlippage",
  "executeAttackOrder",
  "onCapitalInputChange",
  "onCapitalInputBlur",
  "setCapitalPreset",
  "setCapitalVaultPct",
  "applyCapitalUsd",
  "onMasterOrderSizeChange",
  "onStep3FrictionChange",
  "renderStep2MarketPanels",
];

const telemetryFns = [
  "renderDemoRootToggleGrid",
  "toggleDemoRootTrip",
  "refreshGatekeeperDefenseMatrix",
  "renderRootTelemetry",
  "pushExecLog",
];

function fnRanges(names) {
  return names
    .map((n) => {
      const start = fnLine(n);
      if (start <= 0) {
        console.warn("skip missing function:", n);
        return null;
      }
      return [start, fnEnd(start)];
    })
    .filter(Boolean)
    .sort((a, b) => a[0] - b[0]);
}

function collectVars(start, end) {
  const block = slice(start, end);
  return block
    .split("\n")
    .filter((l) => /^\s+(let |const |window\.)/.test(l))
    .join("\n\n");
}

const headerScriptRanges = fnRanges(headerHudFns);
const demoScriptRanges = fnRanges(demoDrawerFns);
const orderScriptRanges = fnRanges(orderEntryFns);
const telemetryScriptRanges = fnRanges(telemetryFns);

const demoVarStart = fnLine("demoPersonaRole");
const demoVarEnd = fnLine("toxicModeCooldownUntil");
const dondonConstStart = lines.findIndex((l) => l.includes("const DONDON_IP")) + 1;
const dondonConstEnd = fnEnd(dondonConstStart);
const criHudLet = fnLine("refreshCriAndStatusHud") - 1;
const rootTeleLet = fnLine("renderRootTelemetry") - 1;
const orderVarStart = fnLine("selectedConsoleAsset");
const orderVarEnd = fnLine("cachedBestAprPct");

const claimed = new Set();
function mark(ranges) {
  for (const [a, b] of ranges) {
    for (let i = a; i <= b; i++) claimed.add(i);
  }
}
mark(uiHelperRanges);
mark(headerScriptRanges);
mark(demoScriptRanges);
mark(orderScriptRanges);
mark(telemetryScriptRanges);
if (dondonConstStart > 0) mark([[dondonConstStart, dondonConstEnd]]);
if (criHudLet > 0) mark([[criHudLet, criHudLet]]);
if (rootTeleLet > 0) mark([[rootTeleLet, rootTeleLet]]);
if (demoVarStart > 0 && demoVarEnd >= demoVarStart)
  mark([[demoVarStart, demoVarEnd]]);
if (orderVarStart > 0) mark([[orderVarStart, orderVarEnd]]);

const shellRanges = [];
let runStart = scriptStart;
for (let line = scriptStart; line <= scriptEnd; line++) {
  if (claimed.has(line)) {
    if (line > runStart) shellRanges.push([runStart, line - 1]);
    while (line <= scriptEnd && claimed.has(line)) line++;
    runStart = line;
    line--;
  }
}
if (runStart <= scriptEnd) shellRanges.push([runStart, scriptEnd]);

const shellHeadEnd = fnLine("isExecutionDisabled") - 1;
const shellHead = shellRanges.filter(([a]) => a <= shellHeadEnd);
const shellTail = shellRanges.filter(([b]) => b > shellHeadEnd);

write("dashboard-styles.ts", `/** Inline dashboard styles (SSR fallback alongside /assets/dashboard.css) */\n${exportConst("DASHBOARD_INLINE_STYLES", slice(styleStart, styleEnd - 1))}`);

write(
  "ui-helpers.ts",
  `import {
  STATUS_DICTIONARY,
  STRATEGY_DICTIONARY,
  METRICS_DICTIONARY,
} from "../../config/statusDictionary";
import { normalizeTriggeredRoots } from "../../services/cri-engine";

export { normalizeTriggeredRoots };

const BRAND_FAVICON_SRC = "/brand/favicon.webp";

export interface DashboardBuildContext {
  versionLabel: string;
  sheetHref: string;
  escAttr: (value: string) => string;
  brandShield: (cls?: string, size?: number) => string;
  brandShieldImg: (cls?: string, size?: number) => string;
  STATUS_DICTIONARY: typeof STATUS_DICTIONARY;
  STRATEGY_DICTIONARY: typeof STRATEGY_DICTIONARY;
  METRICS_DICTIONARY: typeof METRICS_DICTIONARY;
  ROOT_DEFENSE_MATRIX_TOOLTIP_DESC: string;
  ROOT_DEFENSE_MATRIX_TOOLTIP_LABEL: string;
  EQUILIBRIUM_MODE_UI: typeof import("../../services/vector-equilibrium").EQUILIBRIUM_MODE_UI;
  TOPOLOGY_NODE_UI: typeof import("../../services/vector-equilibrium").TOPOLOGY_NODE_UI;
  BRAND_LOGO_DATA_URI: string;
  BRAND_BANNER_DATA_URI: string;
  initialMaxSlUsd: number;
  initialDynSlPct: number;
}

export function escAttr(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function brandShield(cls = "brand-shield-icon", size = 16): string {
  return \`<img src="\${BRAND_FAVICON_SRC}" alt="" class="\${cls}" width="\${size}" height="\${size}" decoding="async" />\`;
}

export function brandShieldImg(cls = "brand-shield-icon", size = 16): string {
  return brandShield(cls, size);
}

/** Shared DOM formatters, sv-tip helpers, modal utilities */
${exportScriptConst("UI_HELPERS_SCRIPT", rangesText(uiHelperRanges))}`,
);

const headerHtmlCtx = [
  "escAttr",
  "BRAND_LOGO_DATA_URI",
  "versionLabel",
  "ROOT_DEFENSE_MATRIX_TOOLTIP_DESC",
  "ROOT_DEFENSE_MATRIX_TOOLTIP_LABEL",
  "EQUILIBRIUM_MODE_UI",
  "TOPOLOGY_NODE_UI",
];
const demoHtmlCtx = [
  "escAttr",
  "brandShield",
  "STATUS_DICTIONARY",
  "ROOT_DEFENSE_MATRIX_TOOLTIP_DESC",
  "ROOT_DEFENSE_MATRIX_TOOLTIP_LABEL",
];
const orderHtmlCtx = [
  "escAttr",
  "STATUS_DICTIONARY",
  "STRATEGY_DICTIONARY",
  "initialMaxSlUsd",
  "initialDynSlPct",
  "brandShield",
];
const shellHtmlCtx = ["BRAND_LOGO_DATA_URI", "versionLabel", "escAttr", "brandShield", "STATUS_DICTIONARY", "STRATEGY_DICTIONARY", "METRICS_DICTIONARY"];

write(
  "header-hud.ts",
  `import type { DashboardBuildContext } from "./ui-helpers";

/** ROOT DEFENSE MATRIX bar, status badges, DonDon IP cat HUD */
${exportHtmlRenderer("renderHeaderHudHtml", slice(headerStart, toxicStart - 1), headerHtmlCtx)}
${exportScriptConst(
  "HEADER_HUD_SCRIPT",
  [
    collectVars(demoVarStart, demoVarEnd),
    slice(dondonConstStart, dondonConstEnd),
    rangesText(headerScriptRanges),
    slice(criHudLet, criHudLet),
  ]
    .filter(Boolean)
    .join("\n\n"),
)}`,
);

write(
  "demo-drawer.ts",
  `import type { DashboardBuildContext } from "./ui-helpers";

/** RHS Demo Control Hub drawer, persona roles, preset triggers */
${exportHtmlRenderer("renderDemoDrawerHtml", slice(toxicStart, walletStart - 1), demoHtmlCtx)}
${exportScriptConst("DEMO_DRAWER_SCRIPT", rangesText(demoScriptRanges))}`,
);

write(
  "order-entry.ts",
  `import type { DashboardBuildContext } from "./ui-helpers";

/** Step 3 master console — capital, friction, attack / execute zone */
${exportHtmlRenderer("renderOrderEntryHtml", slice(masterStart, debugStart - 1), orderHtmlCtx)}
${exportScriptConst(
  "ORDER_ENTRY_SCRIPT",
  [collectVars(orderVarStart, orderVarEnd), rangesText(orderScriptRanges)]
    .filter(Boolean)
    .join("\n\n"),
)}`,
);

write(
  "telemetry-matrix.ts",
  `import type { DashboardBuildContext } from "./ui-helpers";

/** 20-Root telemetry pane — LED toggle grid + audit log stream */
export function renderTelemetryMatrixHtml(_ctx: DashboardBuildContext): string {
  return "";
}

${exportScriptConst(
  "TELEMETRY_MATRIX_SCRIPT",
  [slice(rootTeleLet, rootTeleLet), rangesText(telemetryScriptRanges)]
    .filter(Boolean)
    .join("\n\n"),
)}`,
);

write(
  "dashboard-shell.ts",
  `import type { DashboardBuildContext } from "./ui-helpers";

/** Main layout shell — steps 1–4, matrix, modals, footer */
${exportHtmlRenderer("renderDashboardShellHtml", slice(bodyOpen, headerStart - 1), ["BRAND_LOGO_DATA_URI"])}
${exportHtmlRenderer("renderDashboardShellMidHtml", slice(walletStart, masterStart - 1), shellHtmlCtx)}
${exportHtmlRenderer("renderDashboardShellTailHtml", slice(debugStart, idx('id="svTooltipRoot"') - 1), ["BRAND_LOGO_DATA_URI"])}

${exportScriptConst("DASHBOARD_SHELL_HEAD_SCRIPT", rangesText(shellHead))}
${exportScriptConst("DASHBOARD_SHELL_TAIL_SCRIPT", rangesText(shellTail))}`,
);

console.log("Generated dashboard modules from", monolithPath);
console.log("Script lines:", scriptEnd - scriptStart + 1);
console.log("Shell ranges:", shellRanges.length);
